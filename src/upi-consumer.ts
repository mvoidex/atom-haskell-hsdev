import { CommandEvent, CompositeDisposable, Range, TextBuffer, TextEditor, Point, TextEditorElement } from 'atom'
import { HsDevProcess, IErrorCallbackArgs, Callbacks } from './hsdev'
import { importListView } from './views/import-list-view'
import * as Util from './util'
import * as UPI from 'atom-haskell-upi'
const { handleException } = Util

const messageTypes = {
  error: {},
  warning: {},
  lint: {},
}

const addMsgTypes = {
  'hsdev': {
    uriFilter: false,
    autoScroll: true,
  },
}

const contextScope = 'atom-text-editor[data-grammar~="haskell"]'

const mainMenu = {
  label: 'hsdev',
  menu: [
    { label: 'Ping', command: 'atom-haskell-hsdev:ping' },
  ],
}

type TECommandEvent = CommandEvent<TextEditorElement>

export class UPIConsumer {
  public upi: UPI.IUPIInstance
  private disposables: CompositeDisposable = new CompositeDisposable()
  private processMessages: UPI.IResultItem[] = []
  private lastMessages: UPI.IResultItem[] = []
  private msgBackend = atom.config.get('atom-haskell-hsdev.ghcModMessages')

  private contextCommands = {
    'atom-haskell-hsdev:whoat': this.tooltipCommand(this.whoatTooltip.bind(this)),
    'atom-haskell-hsdev:go-to-declaration': this.goToDeclCommand.bind(this),
  }

  private globalCommands = {
    'atom-haskell-hsdev:check-file': this.checkCommand.bind(this),
    'atom-haskell-hsdev:lint-file': this.lintCommand.bind(this),
    'atom-haskell-hsdev:ping': this.pingCommand.bind(this),
    ...this.contextCommands,
  }

  private contextMenu: {
    label: string, submenu: Array<{ label: string, command: keyof UPIConsumer['contextCommands'] }>
  } = {
    label: 'hsdev',
    submenu:
    [
      { label: 'Whoat', command: 'atom-haskell-hsdev:whoat' },
      { label: 'Go To Declaration', command: 'atom-haskell-hsdev:go-to-declaration' },
    ],
  }

  constructor(register: UPI.IUPIRegistration, private process: HsDevProcess) {
    this.disposables.add(
      this.process.onError(this.handleProcessError.bind(this)),
      this.process.onWarning(this.handleProcessWarning.bind(this)),
    )

    const msgTypes =
      this.msgBackend === 'upi'
        ? { ...messageTypes, ...addMsgTypes }
        : messageTypes

    this.upi = register({
      name: 'atom-haskell-hsdev',
      menu: mainMenu,
      messageTypes: msgTypes,
      tooltip: this.shouldShowTooltip.bind(this),
      events: {
        // onDidSaveBuffer: async (buffer) =>
        //   this.checkLint(buffer, 'Save', atom.config.get('atom-haskell-hsdev.alwaysInteractiveCheck')),
        // onDidStopChanging: async (buffer) =>
        //   this.checkLint(buffer, 'Change', true),
      },
    })

    this.disposables.add(
      this.upi,
      this.process.onBackendActive(() => this.upi.setStatus({ status: 'progress', detail: '' })),
      this.process.onBackendIdle(() => this.upi.setStatus({ status: 'ready', detail: '' })),
      atom.commands.add(contextScope, this.globalCommands),
    )
    const cm = {}
    cm[contextScope] = [this.contextMenu]
    this.disposables.add(atom.contextMenu.add(cm))
  }

  public dispose() {
    this.disposables.dispose()
  }

  private async shouldShowTooltip(
    editor: TextEditor, crange: Range, type: UPI.TEventRangeType,
  ): Promise<UPI.ITooltipData | undefined> {
    const n = type === 'mouse' ? 'atom-haskell-hsdev.onMouseHoverShow'
            : type === 'selection' ? 'atom-haskell-hsdev.onSelectionShow'
            : undefined
    const t = n && atom.config.get(n)
    // tslint:disable-next-line:no-unsafe-any
    if (t) return this[`${t}Tooltip`](editor, crange)
    else return undefined
  }

  @handleException
  private async checkCommand({ currentTarget }: TECommandEvent) {
  }

  @handleException
  private async lintCommand({ currentTarget }: TECommandEvent) {
  }

  private async pingCommand({ currentTarget }: TECommandEvent) {
    this.process.doPing()
  }

  private tooltipCommand(tooltipfun: (e: TextEditor, p: Range) => Promise<UPI.ITooltipData>) {
    return async ({ currentTarget, detail }: TECommandEvent) =>
      this.upi.showTooltip({
        editor: currentTarget.getModel(),
        detail,
        async tooltip(crange) {
          return tooltipfun(currentTarget.getModel(), crange)
        },
      })
  }

  @handleException
  private async goToDeclCommand({ currentTarget, detail }: TECommandEvent) {
    const editor = currentTarget.getModel()
    const evr = this.upi.getEventRange(editor, detail)
    if (!evr) { return }
    const { crange } = evr
    const symbols: any[] = await this.process.backend.whoat(editor.getBuffer().getUri(), crange.start.row + 1, crange.start.column + 1)
    if (symbols.length > 0) {
      const sym = symbols[0]
      if (sym.pos && sym.id.module.location.file) {
        await atom.workspace.open(sym.id.module.location.file, {
          initialLine: sym.pos.line - 1,
          initialColumn: sym.pos.column - 1,
        })
      }
    }
  }

  private async whoatTooltip(e: TextEditor, p: Range) {
    // FIXME: Don't scan here
    await this.process.backend.scanFile(e.getBuffer().getUri())
    this.process.backend.infer([e.getBuffer().getUri()])
    let irange: Range = p
    let info: string = ''
    try {
      const res = await this.process.whoat(e.getBuffer(), p)
      irange = res.range
      info = res.info
    }
    catch (_err) {
      let word: string | undefined
      Util.debug(`range: ${p}`)
      Util.debug(`line range: ${e.rangeForRow(p.start.row, false)}`)
      e.scanInRange(/\w+/, e.rangeForRow(p.start.row), undefined, (_match: RegExp, matchText: string, range: Range, _stop: () => void, _replace: (_with: string) => void, _leadingContextLines, _trailingContextLines) => {
        Util.debug(`matched ${matchText} at ${range}`)
        if (range.containsRange(p)) {
          stop()
          word = matchText
        }
      })
      if (word) {
        Util.debug(`word under cursor: ${word}`)
      }
    }
    return {
      range: irange,
      text: {
        text: info,
        highlighter: atom.config.get('atom-haskell-hsdev.highlightTooltips') ?
          'source.haskell' : undefined,
      }
    }
  }

  private setHighlighter() {
    if (atom.config.get('atom-haskell-hsdev.highlightMessages')) {
      return (m: UPI.IResultItem): UPI.IResultItem => {
        if (typeof m.message === 'string') {
          const message: UPI.IMessageText = {
            text: m.message,
            highlighter: 'hint.message.haskell',
          }
          return { ...m, message }
        } else {
          return m
        }
      }
    } else {
      return (m: UPI.IResultItem) => m
    }
  }

  private setMessages(messages: UPI.IResultItem[]) {
    this.lastMessages = messages.map(this.setHighlighter())
    this.sendMessages()
  }

  private sendMessages() {
    this.upi.setMessages(this.processMessages.concat(this.lastMessages))
  }

  private consoleReport(arg: IErrorCallbackArgs) {
    // tslint:disbale-next-line: no-console
    console.error(Util.formatError(arg), Util.getErrorDetail(arg))
  }

  private handleProcessError(arg: IErrorCallbackArgs) {
    switch (this.msgBackend) {
      case 'upi':
        this.processMessages.push({
          message: Util.formatError(arg)
          + '\n\nSee console (View → Developer → Toggle Developer Tools → Console tab) for details.',
          severity: 'hsdev',
        })
        this.consoleReport(arg)
        this.sendMessages()
        break
      case 'console':
        this.consoleReport(arg)
        break
      case 'popup':
        this.consoleReport(arg)
        atom.notifications.addError(Util.formatError(arg), {
          detail: Util.getErrorDetail(arg),
          dismissable: true,
        })
        break
    }
  }

  private handleProcessWarning(warning: string) {
    switch (this.msgBackend) {
      case 'upi':
        this.processMessages.push({
          message: warning,
          severity: 'hsdev',
        })
        Util.warn(warning)
        this.sendMessages()
        break
      case 'console':
        Util.warn(warning)
        break
      case 'popup':
        Util.warn(warning)
        atom.notifications.addWarning(warning, {
          dismissable: false,
        })
        break
    }
  }
}
