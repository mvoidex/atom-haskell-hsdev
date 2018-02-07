import { Directory, Emitter, CompositeDisposable } from 'atom'
import { InteractiveProcess } from './interactive-process'
import * as Util from '../util'
const { debug, withTempFile, EOT } = Util
import { EOL } from 'os'
import * as net from 'net'
import * as _ from 'underscore'

export interface RunArgs {
  interactive?: boolean
  command: string
  text?: string
  uri?: string
  dashArgs?: string[]
  args?: string[]
  suppressErrors?: boolean
  ghcOptions?: string[]
  ghcModOptions?: string[]
  builder: string | undefined
}

export interface RunOptions {
  port?: number
  db?: string
  logFile?: string
  logLevel?: 'trace' | 'debug' | 'info' | 'warning' | 'error' | 'fatal'
}

export interface IErrorCallbackArgs {
  runArgs?: RunArgs
  err: Error
}

export interface Callbacks {
  onError?: (error: string, details: any) => void
  onNotify?: (notification: any) => void
  onResponse?: (response: any) => void
}

export type SearchType = 'exact' | 'prefix' | 'infix' | 'suffix'

export interface Query {
  query: string,
  searchType?: SearchType,
  header?: boolean,
}

export interface QueryFilters {
  project?: string,
  file?: string,
  module?: string,
  package?: string,
  installed?: boolean,
  sourced?: boolean,
  standalone?: boolean,
}

export class HsDevProcessReal {
  private disposables: CompositeDisposable
  private emitter: Emitter<{
    'did-destroy': void
  },{
    'warning': string
    'error': IErrorCallbackArgs
  }>
  private proc: InteractiveProcess | undefined
  private sock: net.Socket | undefined
  private asyncSocket: Promise<net.Socket | undefined> | undefined
  private buffer: string = ''
  private id: number = 0
  private callbacks: {[id: string]: Callbacks} = {}

  constructor(
    private options: RunOptions = {},
  ) {
    this.disposables = new CompositeDisposable()
    this.emitter = new Emitter()
    this.disposables.add(this.emitter)
  }

  public async run(
    runArgs: RunArgs,
  ) {
    const { command } = runArgs

    try {
      this.call(command)
    } catch (err) {
      debug(err)
      // tslint:disable-next-line: no-unsafe-any
      this.emitter.emit('error', { runArgs, err })
    }
  }

  public killProcess() {
    debug(`Killing hsdev process`)
    this.proc && this.proc.kill()
  }

  public destroy() {
    debug('HsDevProcessBase destroying')
    this.killProcess()
    this.emitter.emit('did-destroy')
    this.disposables.dispose()
  }

  public onDidDestroy(callback: () => void) {
    return this.emitter.on('did-destroy', callback)
  }

  public onWarning(callback: (warning: string) => void) {
    return this.emitter.on('warning', callback)
  }

  public onError(callback: (error: IErrorCallbackArgs) => void) {
    return this.emitter.on('error', callback)
  }

  private async startServer(): Promise<InteractiveProcess | undefined> {
    if (this.proc) {
      return this.proc
    }
    debug(`Spawning new hsdev instance for with`, this.options)
    const modPath = atom.config.get('atom-haskell-hsdev.hsdevPath')
    const dbPath = atom.config.get('atom-haskell-hsdev.hsdevDb')
    const hsdevPort: number | undefined = atom.config.get('atom-haskell-hsdev.hsdevPort')
    const runOpts: string[] = []
    runOpts.push('run')
    if (this.options.port) {
      runOpts.push('--port', this.options.port.toString())
    }
    else if (hsdevPort) {
      runOpts.push('--port', hsdevPort.toString())
    }
    if (this.options.db) {
      runOpts.push('--db', this.options.db)
    }
    else if (dbPath) {
      runOpts.push('--db', dbPath)
    }
    if (this.options.logFile) {
      runOpts.push('--log', this.options.logFile)
    }
    if (this.options.logLevel) {
      runOpts.push('--log-level', this.options.logLevel)
    }

    this.proc = new InteractiveProcess(modPath, runOpts)
    this.proc.onceExit((code) => {
      debug(`hsdev ended with ${code}`)
      this.proc = undefined
    })
    const { stdout } = await this.proc.readLine()
    const started = /Server started at port (.*)$/.exec(stdout[0])
    if (started) {
      debug('Started hsdev')
      return this.proc
    }
    return
  }

  public async connectHsDev(): Promise<net.Socket | undefined> {
    if (this.sock) {
      return this.sock
    }
    this.id = 0
    this.sock = new net.Socket()
    this.sock.setEncoding('utf-8')
    this.sock.on('data', (data: string) => {
      const lines = data.split('\n')
      if (lines.length == 1) {
        this.buffer = this.buffer + (lines.pop() || '')
      }
      else {
        lines[0] = this.buffer + lines[0]
        this.buffer = lines.pop() || ''
      }
      for (const line of lines) {
        const resp = JSON.parse(line)
        const id = resp['id']
        if (id) {
          if (this.callbacks[id]) {
            const { onError, onNotify, onResponse } = this.callbacks[id]
            if (resp['error'] && onError) {
              onError(resp['error'], resp)
              delete this.callbacks[id]
            }
            else if (resp['notify'] && onNotify) {
              onNotify(resp['notify'])
            }
            else if (resp['result'] && onResponse) {
              onResponse(resp['result'])
              delete this.callbacks[id]
            }
          }
        }
      }
    })
    this.sock.connect({port: 4567})
    return this.sock
  }

  public async initProcess(): Promise<net.Socket | undefined> {
    const proc = await this.startServer()
    if (!proc) {
      throw 'Error spawning process'
    }
    return this.connectHsDev()
  }

  public async socket(): Promise<net.Socket | undefined> {
    if (!this.asyncSocket) {
      this.asyncSocket = this.initProcess()
    }
    return await this.asyncSocket
  }

  public async call(
    command: string,
    opts: {[name: string]: any} = {},
    callbacks?: Callbacks
  ): Promise<any> {
    // debug(`Running hsdev command ${command} with opts: ${opts}`)
    const sock = await this.socket()
    if (!sock) {
      throw('Error getting socket')
    }
    let cmd = opts
    const id = this.id.toString()
    ++this.id
    opts['command'] = command
    opts['no-file'] = true
    opts['id'] = id
    return await new Promise<any>((resolve, reject) => {
      const calls: Callbacks = {
        onError: (error: string, details: any) => {
          reject(`Error returned: ${error}`)
          if (callbacks && callbacks.onError) {
            callbacks.onError(error, details)
          }
        },
        onNotify: callbacks ? callbacks.onNotify : undefined,
        onResponse: (response: any) => {
          resolve(response)
          if (callbacks && callbacks.onResponse) {
            callbacks.onResponse(response)
          }
        }
      }
      this.callbacks[id] = calls
      sock.write(JSON.stringify(cmd) + '\n')
    })
  }

  public async ping(callbacks?: Callbacks) {
    return await this.call('ping', {}, callbacks)
  }

  public async setFileContents(
    file: string,
    contents: string,
    callbacks?: Callbacks
  ) {
    return await this.call('set-file-contents', {'file': file, 'contents': contents}, callbacks)
  }

  public async whoat(
    file: string,
    line: number,
    column: number,
    callbacks?: Callbacks
  ) {
    return await this.call('whoat', {'file': file, 'line': line, 'column': column}, callbacks)
  }

  public async whois(
    file: string,
    name: string,
    callbacks?: Callbacks
  ) {
    return await this.call('whois', {'file': file, 'name': name}, callbacks)
  }

  public async lookup(
    file: string,
    name: string,
    callbacks?: Callbacks
  ) {
    return await this.call('lookup', {'file': file, 'name': name}, callbacks)
  }

  public async symbol(
    opts: Query & QueryFilters & { localNames?: boolean },
    callbacks?: Callbacks
  ) {
    const params = {
      'query': {
        'input': opts.query,
        'type': opts.searchType || 'prefix',
      },
      'locals': opts.localNames == true,
      'header': opts.header == true,
    }
    const filters: any[] = []
    if (opts.project) { filters.push({'project': opts.project}) }
    if (opts.file) { filters.push({'file': opts.file}) }
    if (opts.module) { filters.push({'module': opts.module}) }
    if (opts.package) { filters.push({'package': opts.package}) }
    if (opts.installed) { filters.push('installed') }
    if (opts.sourced) { filters.push('sourced') }
    if (opts.standalone) { filters.push('standalone') }
    params['filters'] = filters
    return await this.call('symbol', params, callbacks)
  }

  public async module(
    opts: Query & QueryFilters,
    callbacks?: Callbacks
  ) {
    const params = {
      'query': {
        'input': opts.query,
        'type': opts.searchType || 'prefix',
      },
      'header': opts.header == true,
    }

    const filters: any[] = []
    if (opts.project) { filters.push({'project': opts.project}) }
    if (opts.file) { filters.push({'file': opts.file}) }
    if (opts.module) { filters.push({'module': opts.module}) }
    if (opts.package) { filters.push({'package': opts.package}) }
    if (opts.installed) { filters.push('installed') }
    if (opts.sourced) { filters.push('sourced') }
    if (opts.standalone) { filters.push('standalone') }
    params['filters'] = filters
    return await this.call('module', params, callbacks)
  }

  public async complete(
    prefix: string,
    file: string,
    wide: boolean = false,
    callbacks?: Callbacks
  ) {
    return await this.call('complete', {
      'prefix': prefix,
      'file': file,
      'wide': wide,
    }, callbacks)
  }

  public async scope(
    opts: Query & { file: string },
    callbacks?: Callbacks
  ) {
    return await this.call('scope', {
      'query': {
        'input': opts.query,
        'type': opts.searchType || 'prefix',
      },
      'file': opts.file,
    }, callbacks)
  }

  public async scopeModules(
    opts: Query & { file: string },
    callbacks?: Callbacks
  ) {
    return await this.call('scope modules', {
      'query': {
        'input': opts.query,
        'type': opts.searchType || 'prefix',
      },
      'file': opts.file,
    }, callbacks)
  }

  public async infer(
    files: string[],
    callbacks?: Callbacks
  ) {
    return await this.call('infer', {'projects': [], 'files': files}, callbacks)
  }

  public async check(
    files: string[],
    ghcOpts: string[] = [],
    callbacks?: Callbacks
  ) {
    return await this.call('check', {
      'files': files.map((value, _index, _array) => {
        return {'file': value, 'contents': null}
      }),
      'ghc-opts': ghcOpts
    }, callbacks)
  }

  public async lint(
    files: string[],
    lintOpts: string[] = [],
    callbacks?: Callbacks
  ) {
    return await this.call('lint', {
      'files': files.map((value, _index, _array) => {
        return {'file': value, 'contents': null}
      }),
      'lint-opts': lintOpts
    }, callbacks)
  }

  public async checkLint(
    files: string[],
    ghcOpts: string[] = [],
    lintOpts: string[] = [],
    callbacks?: Callbacks
  ) {
    return await this.call('check-lint', {
      'files': files.map((value, _index, _array) => {
        return {'file': value, 'contents': null}
      }),
      'ghc-opts': ghcOpts,
      'lint-opts': lintOpts
    }, callbacks)
  }

  public async scanFile(
    opts: {
      file: string,
      buildTool?: 'cabal' | 'stack',
      scanProject?: boolean,
      scanDeps?: boolean
    },
    callbacks?: Callbacks
  ) {
    const tool = atom.config.get('atom-haskell-hsdev.buildTool')
    return await this.call('scan file', {
      'file': opts.file,
      'build-tool': opts.buildTool || tool,
      'scan-project': opts.scanProject != false,
      'scan-deps': opts.scanDeps != false
    }, callbacks)
  }

  public async scanCabal(callbacks?: Callbacks) {
    return await this.call('scan', {'cabal': true}, callbacks)
  }

  public async langs(callbacks?: Callbacks) {
    return await this.call('langs', {}, callbacks)
  }

  public async flags(callbacks?: Callbacks) {
    return await this.call('flags', {}, callbacks)
  }
}
