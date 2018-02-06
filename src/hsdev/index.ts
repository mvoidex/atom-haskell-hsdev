import { Range, Point, Emitter, CompositeDisposable,
TextBuffer, Directory, TextEditor } from 'atom'
import * as Util from '../util'
import { extname } from 'path'
import Queue = require('promise-queue')
import { unlit } from 'atom-haskell-utils'
import * as CompletionBackend from 'atom-haskell-upi/completion-backend'
import * as UPI from 'atom-haskell-upi'

import { HsDevProcessReal, RunArgs, IErrorCallbackArgs } from './hsdev-process-real'
import { createHsDevProcessReal } from './hsdev-process-real-factory'

export { IErrorCallbackArgs, RunArgs }

type Commands = 'checklint' | 'browse' | 'typeinfo' | 'find' | 'init' | 'list' | 'lowmem'

export interface SymbolDesc {
  name: string,
  symbolType: CompletionBackend.SymbolType,
  typeSignature?: string,
  parent?: string
}

export class HsDevProcess {
  public backend: HsDevProcessReal
  private disposables: CompositeDisposable
  private emitter: Emitter<{
    'did-destroy': undefined
    'backend-active': undefined
    'backend-idle': undefined
  }, {
    'warning': string
    'error': IErrorCallbackArgs
    'queue-idle': { queue: Commands }
  }>
  private bufferDirMap: WeakMap<TextBuffer, Directory>

  constructor(private upiPromise: Promise<UPI.IUPIInstance>) {
    this.disposables = new CompositeDisposable()
    this.emitter = new Emitter()
    this.disposables.add(this.emitter)
    this.bufferDirMap = new WeakMap()
    this.backend = this.startBackend()
  }

  public async getRootDir(buffer: TextBuffer): Promise<Directory> {
    let dir
    dir = this.bufferDirMap.get(buffer)
    if (dir) {
      return dir
    }
    dir = await Util.getRootDir(buffer)
    this.bufferDirMap.set(buffer, dir)
    return dir
  }

  public killProcess() {
    this.backend.killProcess()
  }

  public destroy() {
    this.backend.destroy()
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

  public onBackendActive(callback: () => void) {
    return this.emitter.on('backend-active', callback)
  }

  public onBackendIdle(callback: () => void) {
    return this.emitter.on('backend-idle', callback)
  }

  public onQueueIdle(callback: () => void) {
    return this.emitter.on('queue-idle', callback)
  }

  public async whoat(
    buffer: TextBuffer, crange: Range
  ) {
    const file = buffer.getUri()
    const line = crange.start.row + 1
    const column = crange.start.column + 1
    const symbols: any[] = await this.backend.whoat(file, line, column)
    if (symbols.length == 0) {
      Util.debug(`No info found for symbol at ${file} ${line} ${column}`)
      throw Error(`No info found for symbol at ${file} ${line} ${column}`)
    }
    else {
      const sym = symbols[0]
      const what = sym.info.what
      const lines = []
      switch (what) {
        case 'function':
        case 'method':
        case 'constructor':
          lines.push(`${sym.id.name} :: ${sym.info.type ? sym.info.type : '?'}`)
          break
        case 'data':
        case 'type':
        case 'class':
        case 'newtype':
          lines.push(`${what} ${sym.id.name}`)
          break
        default:
          lines.push(`${sym.id.name}`)
      }

      if (sym.docs) {
        lines.push('', `{- ${sym.docs} -}`)
      }

      if (sym.id.module.location.file && sym.pos) {
        lines.push('', `-- Defined in ${sym.id.module.location.file}:${sym.pos.line}:${sym.pos.column}`)
      }
      return {range: crange, info: lines.join('\n')}
    }
  }

  public async doPing() {
    this.backend.call('ping', undefined, {
      onResponse: (response: any) => {
        Util.debug(`response to ping: ${JSON.stringify(response)}`)
      }
    })
  }

  private async getUPI() {
    return Promise.race([this.upiPromise, Promise.resolve(undefined)])
  }

  private startBackend(): HsDevProcessReal {
    const backend = new HsDevProcessReal()
    backend.scanCabal({
      onNotify: async (_notification: any) => {
        const upi = await this.getUPI()
        if (upi) {
          upi.setStatus({
            status: 'progress',
            detail: 'scanning global-db/user-db'
          })
        }
      },
      onError: async (error: string, _details: any) => {
        const upi = await this.getUPI()
        if (upi) {
          upi.setStatus({
            status: 'error',
            detail: `scanning global-db/user-db failed: ${error}`
          })
        }
      },
      onResponse: async (_response: any) => {
        const upi = await this.getUPI()
        if (upi) {
          upi.setStatus({
            status: 'ready',
            detail: 'scanned global-db/user-db'
          })
        }
      }
    })
    return backend
  }

  private async initBackend(): Promise<HsDevProcessReal> {
    if (!this.backend) {
      this.backend = await this.createBackend()
    }
    return this.backend
  }

  private async createBackend(): Promise<HsDevProcessReal> {
    const backend = await createHsDevProcessReal()
    this.disposables.add(
      backend.onError((arg) => this.emitter.emit('error', arg)),
      backend.onWarning((arg) => this.emitter.emit('warning', arg)),
    )
    return backend
  }
}
