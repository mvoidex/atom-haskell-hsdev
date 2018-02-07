import * as FZ from 'fuzzaldrin'
import {
  TextBuffer, Point, Disposable, Range, Directory
} from 'atom'
import { BufferInfo } from './buffer-info'
import { ModuleInfo } from './module-info'
import { HsDevProcess } from '../hsdev'
import * as Util from '../util'
import * as UPI from 'atom-haskell-upi'
import * as CB from 'atom-haskell-upi/completion-backend'

const { handleException } = Util

// tslint:disable-next-line:no-unsafe-any
export class CompletionBackend implements CB.ICompletionBackend {
  private bufferMap: WeakMap<TextBuffer, BufferInfo>
  private isActive: boolean

  constructor(private process: HsDevProcess, public upi: Promise<UPI.IUPIInstance>) {
    this.bufferMap = new WeakMap()

    // compatibility with old clients
    this.name = this.name.bind(this)
    this.onDidDestroy = this.onDidDestroy.bind(this)
    this.registerCompletionBuffer = this.registerCompletionBuffer.bind(this)
    this.unregisterCompletionBuffer = this.unregisterCompletionBuffer.bind(this)
    this.getCompletionsForSymbol = this.getCompletionsForSymbol.bind(this)
    this.getCompletionsForType = this.getCompletionsForType.bind(this)
    this.getCompletionsForClass = this.getCompletionsForClass.bind(this)
    this.getCompletionsForModule = this.getCompletionsForModule.bind(this)
    this.getCompletionsForSymbolInModule = this.getCompletionsForSymbolInModule.bind(this)
    this.getCompletionsForLanguagePragmas = this.getCompletionsForLanguagePragmas.bind(this)
    this.getCompletionsForCompilerOptions = this.getCompletionsForCompilerOptions.bind(this)
    this.getCompletionsForHole = this.getCompletionsForHole.bind(this)

    this.process = process
    this.isActive = true
    this.process.onDidDestroy(() => { this.isActive = false })
  }

  /* Public interface below */

  /*
  name()
  Get backend name

  Returns String, unique string describing a given backend
  */
  public name() { return 'atom-haskell-hsdev' }

  /*
  onDidDestroy(callback)
  Destruction event subscription. Usually should be called only on
  package deactivation.
  callback: () ->
  */
  public onDidDestroy(callback: () => void) {
    if (!this.isActive) { throw new Error('Backend inactive') }
    return this.process.onDidDestroy(callback)
  }

  /*
  registerCompletionBuffer(buffer)
  Every buffer that would be used with autocompletion functions has to
  be registered with this function.

  buffer: TextBuffer, buffer to be used in autocompletion

  Returns: Disposable, which will remove buffer from autocompletion
  */
  public registerCompletionBuffer(buffer: TextBuffer) {
    if (!this.isActive) { throw new Error('Backend inactive') }

    if (this.bufferMap.has(buffer)) {
      return new Disposable(() => { /* void */ })
    }

    this.bufferMap.set(buffer, new BufferInfo(buffer))

    const file = buffer.getUri()
    buffer.onDidSave(async (_event) => {
      const buf: BufferInfo | undefined = this.bufferMap.get(buffer)
      if (buf) {
        delete buf.completions
      }
      const contents: string = buffer.getText()
      await this.process.backend.setFileContents(file, contents)
      await this.process.backend.scanFile({ file, scanProject: false, scanDeps: false })
    })

    setImmediate(async () => {
      this.process.backend.scanFile({ file })
    })

    return new Disposable(() =>
      this.unregisterCompletionBuffer(buffer))
  }

  /*
  unregisterCompletionBuffer(buffer)
  buffer: TextBuffer, buffer to be removed from autocompletion
  */
  public unregisterCompletionBuffer(buffer: TextBuffer) {
    const x = this.bufferMap.get(buffer)
    if (x) {
      x.destroy()
    }
  }

  /*
  getCompletionsForSymbol(buffer,prefix,position)
  buffer: TextBuffer, current buffer
  prefix: String, completion prefix
  position: Point, current cursor position

  Returns: Promise([symbol])
  symbol: Object, a completion symbol
    name: String, symbol name
    qname: String, qualified name, if module is qualified.
           Otherwise, same as name
    typeSignature: String, type signature
    symbolType: String, one of ['type', 'class', 'function']
    module: Object, symbol module information
      qualified: Boolean, true if module is imported as qualified
      name: String, module name
      alias: String, module alias
      hiding: Boolean, true if module is imported with hiding clause
      importList: [String], array of explicit imports/hidden imports
  */
  @handleException
  public async getCompletionsForSymbol(
    buffer: TextBuffer, prefix: string, _position: Point,
  ): Promise<CB.ISymbol[]> {
    if (!this.isActive) { throw new Error('Backend inactive') }

    const symbols = await this.getCompletionsForBuffer(buffer)
    return this.filter(symbols, prefix, ['qname', 'qparent'])
  }

  /*
  getCompletionsForType(buffer,prefix,position)
  buffer: TextBuffer, current buffer
  prefix: String, completion prefix
  position: Point, current cursor position

  Returns: Promise([symbol])
  symbol: Same as getCompletionsForSymbol, except
          symbolType is one of ['type', 'class']
  */
  @handleException
  public async getCompletionsForType(
    buffer: TextBuffer, prefix: string, _position: Point,
  ): Promise<CB.ISymbol[]> {
    if (!this.isActive) { throw new Error('Backend inactive') }

    const symbols = await this.getCompletionsForBuffer(buffer, ['type', 'class'])
    return FZ.filter(symbols, prefix, { key: 'qname' })
  }

  /*
  getCompletionsForClass(buffer,prefix,position)
  buffer: TextBuffer, current buffer
  prefix: String, completion prefix
  position: Point, current cursor position

  Returns: Promise([symbol])
  symbol: Same as getCompletionsForSymbol, except
          symbolType is one of ['class']
  */
  public async getCompletionsForClass(
    buffer: TextBuffer, prefix: string, _position: Point,
  ): Promise<CB.ISymbol[]> {
    if (!this.isActive) { throw new Error('Backend inactive') }

    const symbols = await this.getCompletionsForBuffer(buffer, ['class'])
    return FZ.filter(symbols, prefix, { key: 'qname' })
  }

  /*
  getCompletionsForModule(buffer,prefix,position)
  buffer: TextBuffer, current buffer
  prefix: String, completion prefix
  position: Point, current cursor position

  Returns: Promise([module])
  module: String, module name
  */
  public async getCompletionsForModule(
    buffer: TextBuffer, prefix: string, _position: Point,
  ): Promise<string[]> {
    if (!this.isActive) { throw new Error('Backend inactive') }
    const modules = await this.process.backend.scopeModules({
      query: prefix,
      searchType: 'prefix',
      file: buffer.getUri(),
    })
    const parts: number = prefix.split('.').length
    const names: string[] = []
    for (const m of modules) {
      if (m.name.split('.').length == parts) {
        names.push(m.name)
      }
    }
    return names
  }

  /*
  getCompletionsForSymbolInModule(buffer,prefix,position,{module})
  Used in import hiding/list completions

  buffer: TextBuffer, current buffer
  prefix: String, completion prefix
  position: Point, current cursor position
  module: String, module name (optional). If undefined, function
          will attempt to infer module name from position and buffer.

  Returns: Promise([symbol])
  symbol: Object, symbol in given module
    name: String, symbol name
    typeSignature: String, type signature
    symbolType: String, one of ['type', 'class', 'function']
  */
  public async getCompletionsForSymbolInModule(
    buffer: TextBuffer, prefix: string, position: Point,
    opts?: { module: string },
  ): Promise<CB.ISymbol[]> {
    if (!this.isActive) { throw new Error('Backend inactive') }
    let moduleName = opts ? opts.module : undefined
    if (!moduleName) {
      const lineRange = new Range([0, position.row], position)
      buffer.backwardsScanInRange(
        /^import\s+([\w.]+)/,
        lineRange, ({ match }) => moduleName = match[1],
      )
    }

    return [] // TODO: Implement
    // tslint:enable: no-null-keyword
    // return FZ.filter(symbols, prefix, { key: 'name' })
  }

  /*
  getCompletionsForLanguagePragmas(buffer,prefix,position)
  buffer: TextBuffer, current buffer
  prefix: String, completion prefix
  position: Point, current cursor position

  Returns: Promise([pragma])
  pragma: String, language option
  */
  public async getCompletionsForLanguagePragmas(
    _buffer: TextBuffer, prefix: string, _position: Point,
  ): Promise<string[]> {
    if (!this.isActive) { throw new Error('Backend inactive') }
    const ps: string[] = await this.process.backend.langs()
    return FZ.filter(ps, prefix)
  }

  /*
  getCompletionsForCompilerOptions(buffer,prefix,position)
  buffer: TextBuffer, current buffer
  prefix: String, completion prefix
  position: Point, current cursor position

  Returns: Promise([ghcopt])
  ghcopt: String, compiler option (starts with '-f')
  */
  public async getCompletionsForCompilerOptions(
    _buffer: TextBuffer, prefix: string, _position: Point,
  ): Promise<string[]> {
    if (!this.isActive) { throw new Error('Backend inactive') }
    const co: string[] = await this.process.backend.flags()
    return FZ.filter(co, prefix)
  }

  /*
  getCompletionsForHole(buffer,prefix,position)
  Get completions based on expression type.
  It is assumed that `prefix` starts with '_'

  buffer: TextBuffer, current buffer
  prefix: String, completion prefix
  position: Point, current cursor position

  Returns: Promise([symbol])
  symbol: Same as getCompletionsForSymbol
  */
  @handleException
  public async getCompletionsForHole(
    _buffer: TextBuffer, _prefix: string, _position: Point,
  ): Promise<CB.ISymbol[]> {
    if (!this.isActive) { throw new Error('Backend inactive') }
    return [] // TODO: Implement
  }

  private async getCompletionsForBuffer(
    buffer: TextBuffer, symbolTypes?: CB.SymbolType[],
  ): Promise<CB.ISymbol[]> {
    let symbols: CB.ISymbol[] = []

    const buf: BufferInfo | undefined = this.bufferMap.get(buffer)
    if (buf && buf.completions) {
      symbols = buf.completions
    }
    else {
      const comps: any[] = await this.process.backend.complete(
        '',
        buffer.getUri(),
      )
      for (const comp of comps) {
        let symType: CB.SymbolType = 'function'
        switch (comp.info.what) {
          case 'function':
          case 'method':
          case 'selector':
          case 'pat-selector':
          case 'pat-constructor':
          case 'constructor':
            symType = 'function'
            break
          case 'type':
          case 'newtype':
          case 'data':
          case 'type-family':
          case 'data-family':
            symType = 'type'
            break
          case 'class':
            symType = 'class'
            break
          default:
            break
        }
        if (symbolTypes && !(symType in symbolTypes)) {
          continue
        }

        symbols.push({
          qparent: comp.qualifier,
          qname: comp.qualifier ? `${comp.qualifier}.${comp.id.name}` : comp.id.name,
          name: comp.id.name,
          symbolType: symType,
          typeSignature: comp.info.type,
          // FIXME: Use import module
          module: {
            name: comp.id.module.name,
            hiding: false,
            qualified: false,
            alias: null,
            importList: null,
          }
        })
      }
      if (buf) {
        Util.debug(`Caching ${symbols.length} completions for ${buffer.getUri()}`)
        buf.completions = symbols
      }
    }
    if (!symbolTypes) {
      return symbols
    }
    const result: CB.ISymbol[] = []
    for (const sym of symbols) {
      if (sym.symbolType in symbolTypes) {
        result.push(sym)
      }
    }
    return result
  }

  private filter<T, K extends keyof T>(candidates: T[], prefix: string, keys: K[]): T[] {
    if (!prefix) {
      return candidates
    }
    const list = []
    for (const candidate of candidates) {
      const scores = keys.map((key) => {
        const ck = candidate[key]
        if (ck) {
          return FZ.score(ck.toString(), prefix)
        } else {
          return 0
        }
      })
      const score = Math.max(...scores)
      if (score > 0) {
        list.push({
          score,
          scoreN: scores.indexOf(score),
          data: candidate,
        })
      }
    }
    return list.sort((a, b) => {
      const s = b.score - a.score
      if (s === 0) {
        return a.scoreN - b.scoreN
      }
      return s
    }).map(({ data }) => data)
  }
}
