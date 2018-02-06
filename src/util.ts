import { Range, Point, TextBuffer, TextEditor } from 'atom'
import { delimiter, sep, extname } from 'path'
import * as Temp from 'temp'
import * as FS from 'fs'
import * as CP from 'child_process'
import { EOL } from 'os'
import { getRootDirFallback, getRootDir, isDirectory } from 'atom-haskell-utils'
import { RunOptions, IErrorCallbackArgs } from './hsdev/hsdev-process-real'
import { HsDevVersion } from './hsdev/hsdev-process-real-factory'
import * as UPI from 'atom-haskell-upi'

type ExecOpts = CP.ExecFileOptionsWithStringEncoding
export { getRootDirFallback, getRootDir, isDirectory, ExecOpts }

let debuglog: Array<{ timestamp: number, messages: string[] }> = []
const logKeep = 30000 // ms

function savelog(...messages: string[]) {
  const ts = Date.now()
  debuglog.push({
    timestamp: ts,
    messages,
  })
  let ks = 0
  for (const v of debuglog) {
    if ((ts - v.timestamp) >= logKeep) {
      break
    }
    ks++
  }
  debuglog.splice(0, ks)
}

function joinPath(ds: string[]) {
  const set = new Set(ds)
  return Array.from(set).join(delimiter)
}

export const EOT = `${EOL}\x04${EOL}`

export function debug(...messages: any[]) {
  if (atom.config.get('atom-haskell-hsdev.debug')) {
    // tslint:disable-next-line: no-console
    console.log('atom-haskell-hsdev debug:', ...messages)
  }
  savelog(...messages.map((v) => JSON.stringify(v)))
}

export function warn(...messages: any[]) {
  // tslint:disable-next-line: no-console
  console.warn('atom-haskell-hsdev warning:', ...messages)
  savelog(...messages.map((v) => JSON.stringify(v)))
}

export function error(...messages: any[]) {
  // tslint:disable-next-line: no-console
  console.error('atom-haskell-hsdev error:', ...messages)
  savelog(...messages.map((v) => JSON.stringify(v)))
}

export function getDebugLog() {
  const ts = Date.now()
  debuglog = debuglog.filter(({ timestamp }) => (ts - timestamp) < logKeep)
  return debuglog.map(({ timestamp, messages }) => `${(timestamp - ts) / 1000}s: ${messages.join(',')}`).join(EOL)
}

export async function execPromise(cmd: string, args: string[], opts: ExecOpts, stdin?: string) {
  return new Promise<{ stdout: string, stderr: string }>((resolve, reject) => {
    debug(`Running ${cmd} ${args} with opts = `, opts)
    const child = CP.execFile(cmd, args, opts, (error, stdout: string, stderr: string) => {
      if (stderr.trim().length > 0) { warn(stderr) }
      if (error) {
        warn(`Running ${cmd} ${args} failed with `, error)
        if (stdout) { warn(stdout) }
        error.stack = (new Error()).stack
        reject(error)
      } else {
        debug(`Got response from ${cmd} ${args}`, { stdout, stderr })
        resolve({ stdout, stderr })
      }
    })
    if (stdin) {
      debug(`sending stdin text to ${cmd} ${args}`)
      child.stdin.write(stdin)
    }
  })
}

export async function getCabalSandbox(rootPath: string): Promise<string | undefined> {
  debug('Looking for cabal sandbox...')
  const sbc = await parseSandboxConfig(`${rootPath}${sep}cabal.sandbox.config`)
  // tslint:disable: no-string-literal
  if (sbc && sbc['install-dirs'] && sbc['install-dirs']['bindir']) {
    // tslint:disable-next-line: no-unsafe-any
    const sandbox: string = sbc['install-dirs']['bindir']
    debug('Found cabal sandbox: ', sandbox)
    if (isDirectory(sandbox)) {
      return sandbox
    } else {
      warn('Cabal sandbox ', sandbox, ' is not a directory')
      return undefined
    }
  } else {
    warn('No cabal sandbox found')
    return undefined
  }
  // tslint:enable: no-string-literal
}

export async function getStackSandbox(rootPath: string, apd: string[], env: { [key: string]: string | undefined }) {
  debug('Looking for stack sandbox...')
  env.PATH = joinPath(apd)
  debug('Running stack with PATH ', env.PATH)
  try {
    const out = await execPromise('stack', ['path', '--snapshot-install-root', '--local-install-root', '--bin-path'], {
      encoding: 'utf8',
      cwd: rootPath,
      env,
      timeout: atom.config.get('atom-haskell-hsdev.initTimeout') * 1000,
    })

    const lines = out.stdout.split(EOL)
    const sir = lines.filter((l) => l.startsWith('snapshot-install-root: '))[0].slice(23) + `${sep}bin`
    const lir = lines.filter((l) => l.startsWith('local-install-root: '))[0].slice(20) + `${sep}bin`
    const bp =
      lines.filter((l) =>
        l.startsWith('bin-path: '))[0].slice(10).split(delimiter).filter((p) =>
          !((p === sir) || (p === lir) || (apd.includes(p))))
    debug('Found stack sandbox ', lir, sir, ...bp)
    return [lir, sir, ...bp]
  } catch (err) {
    warn('No stack sandbox found because ', err)
    return undefined
  }
}

export async function getProcessOptions(rootPath?: string): Promise<RunOptions> {
  if (!rootPath) {
    // tslint:disable-next-line: no-null-keyword no-unsafe-any
    rootPath = getRootDirFallback(null).getPath()
  }

  const res: RunOptions = {
  }
  return res
}

export function getSymbolAtPoint(
  editor: TextEditor, point: Point,
) {
  const [scope] = editor.scopeDescriptorForBufferPosition(point).getScopesArray().slice(-1)
  if (scope) {
    const range = editor.bufferRangeForScopeAtPosition(scope, point)
    if (range && !range.isEmpty()) {
      const symbol = editor.getTextInBufferRange(range)
      return { scope, range, symbol }
    }
  }
  return undefined
}

export function getSymbolInRange(editor: TextEditor, crange: Range) {
  const buffer = editor.getBuffer()
  if (crange.isEmpty()) {
    return getSymbolAtPoint(editor, crange.start)
  } else {
    return {
      symbol: buffer.getTextInRange(crange),
      range: crange,
    }
  }
}

export async function withTempFile<T>(contents: string, uri: string, gen: (path: string) => Promise<T>): Promise<T> {
  const info = await new Promise<Temp.OpenFile>(
    (resolve, reject) =>
      Temp.open(
        { prefix: 'atom-haskell-hsdev', suffix: extname(uri || '.hs') },
        (err, info2) => {
          if (err) {
            reject(err)
          } else {
            resolve(info2)
          }
        }))
  return new Promise<T>((resolve, reject) =>
    FS.write(info.fd, contents, async (err) => {
      if (err) {
        reject(err)
      } else {
        resolve(await gen(info.path))
        FS.close(info.fd, () => FS.unlink(info.path, () => { /*noop*/ }))
      }
    }))
}

export type KnownErrorName =
  'GHCModStdoutError'
  | 'InteractiveActionTimeout'
  | 'GHCModInteractiveCrash'

export function mkError(name: KnownErrorName, message: string) {
  const err = new Error(message)
  err.name = name
  return err
}

export interface SandboxConfigTree { [k: string]: SandboxConfigTree | string }

export async function parseSandboxConfig(file: string) {
  try {
    const sbc = await new Promise<string>((resolve, reject) =>
      FS.readFile(file, { encoding: 'utf-8' }, (err, sbc2) => {
        if (err) {
          reject(err)
        } else {
          resolve(sbc2)
        }
      }))
    const vars: SandboxConfigTree = {}
    let scope = vars
    const rv = (v: string) => {
      for (const k1 of Object.keys(scope)) {
        const v1 = scope[k1]
        if (typeof v1 === 'string') {
          v = v.split(`$${k1}`).join(v1)
        }
      }
      return v
    }
    for (const line of sbc.split(/\r?\n|\r/)) {
      if (!line.match(/^\s*--/) && !line.match(/^\s*$/)) {
        const [l] = line.split(/--/)
        const m = l.match(/^\s*([\w-]+):\s*(.*)\s*$/)
        if (m) {
          const [, name, val] = m
          scope[name] = rv(val)
        } else {
          const newscope = {}
          scope[line] = newscope
          scope = newscope
        }
      }
    }
    return vars
  } catch (err) {
    warn('Reading cabal sandbox config failed with ', err)
    return undefined
  }
}

export function isUpperCase(ch: string): boolean {
  return ch.toUpperCase() === ch
}

export function getErrorDetail({ err, runArgs }: IErrorCallbackArgs) {
  return `Args:
${JSON.stringify(runArgs, undefined, 2)}
message:
${err.message}
log:
${getDebugLog()}`
}

export function formatError({ err, runArgs }: IErrorCallbackArgs) {
  if (err.name === 'InteractiveActionTimeout' && runArgs) {
    return `\
Haskell-ghc-mod: ghc-mod \
${runArgs.interactive ? 'interactive ' : ''}command ${runArgs.command} \
timed out. You can try to fix it by raising 'Interactive Action \
Timeout' setting in atom-haskell-hsdev settings.`
  } else if (runArgs) {
    return `\
Haskell-ghc-mod: ghc-mod \
${runArgs.interactive ? 'interactive ' : ''}command ${runArgs.command} \
failed with error ${err.name}`
  } else {
    return `There was an unexpected error ${err.name}`
  }
}

export function defaultErrorHandler(args: IErrorCallbackArgs) {
  const { err, runArgs } = args
  const suppressErrors = runArgs && runArgs.suppressErrors

  if (!suppressErrors) {
    atom.notifications.addError(
      formatError(args),
      {
        detail: getErrorDetail(args),
        stack: err.stack,
        dismissable: true,
      },
    )
  } else {
    error(runArgs, err)
  }
}

export function warnGHCPackagePath() {
  atom.notifications.addWarning(
    'atom-haskell-hsdev: You have GHC_PACKAGE_PATH environment variable set!',
    {
      dismissable: true,
      detail: `\
This configuration is not supported, and can break arbitrarily. You can try to band-aid it by adding

delete process.env.GHC_PACKAGE_PATH

to your Atom init script (Edit → Init Script...)

You can suppress this warning in atom-haskell-hsdev settings.`,
    },
  )
}

function filterEnv(env: { [name: string]: string | undefined }) {
  const fenv = {}
  // tslint:disable-next-line: forin
  for (const evar in env) {
    const evarU = evar.toUpperCase()
    if (
      evarU === 'PATH'
      || evarU.startsWith('GHC_')
      || evarU.startsWith('STACK_')
      || evarU.startsWith('CABAL_')
    ) {
      fenv[evar] = env[evar]
    }
  }
  return fenv
}

export interface SpawnFailArgs {
  err: Error & {code?: any}
  opts?: RunOptions
  vers?: HsDevVersion
}

export function notifySpawnFail(args: Readonly<SpawnFailArgs>) {
  const debugInfo: SpawnFailArgs = Object.assign({}, args)
  if (args.opts) {
    const optsclone: RunOptions = Object.assign({}, args.opts)
    debugInfo.opts = optsclone
  }
  atom.notifications.addFatalError(
    `Haskell-ghc-mod: ghc-mod failed to launch.
It is probably missing or misconfigured. ${args.err.code}`,
    {
      detail: `\
Error was: ${debugInfo.err.name}
${debugInfo.err.message}
Debug information:
${JSON.stringify(debugInfo, undefined, 2)}
Config:
${JSON.stringify(atom.config.get('atom-haskell-hsdev'),undefined,2)}
`,
      stack: debugInfo.err.stack,
      dismissable: true,
    },
  )
}

export function handleException<T>(
  _target: { upi: UPI.IUPIInstance | Promise<UPI.IUPIInstance> }, _key: string,
  desc: TypedPropertyDescriptor<(...args: any[]) => Promise<T>>,
): TypedPropertyDescriptor<(...args: any[]) => Promise<T>> {
  return {
    ...desc,
    async value(...args: any[]) {
      try {
        // tslint:disable-next-line: no-non-null-assertion no-unsafe-any
        return await desc.value!.call(this, ...args)
      } catch (e) {
        debug(e)
        // tslint:disable-next-line: no-unsafe-any
        const upi: UPI.IUPIInstance = await (this as any).upi
        upi.setStatus({
          status: 'warning',
          // tslint:disable-next-line: no-unsafe-any
          detail: e.toString(),
        })
        // TODO: returning a promise that never resolves... ugly, but works?
        return new Promise(() => { /* noop */ })
      }
    },
  }
}

export function versAtLeast(vers: { [key: number]: number | undefined }, b: number[]) {
  for (let i = 0; i < b.length; i++) {
    const v = b[i]
    const t = vers[i]
    const vv = t !== undefined ? t : 0
    if (vv > v) {
      return true
    } else if (vv < v) {
      return false
    }
  }
  return true
}
