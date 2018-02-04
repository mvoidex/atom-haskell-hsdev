AtomHaskellHsdevView = require './atom-haskell-hsdev-view'
{CompositeDisposable} = require 'atom'
HsDevAgent = require './hsdev-agent'

module.exports = AtomHaskellHsdev =
  atomHaskellHsdevView: null
  modalPanel: null
  subscriptions: null

  activate: (state) ->
    @atomHaskellHsdevView = new AtomHaskellHsdevView(state.atomHaskellHsdevViewState)
    @modalPanel = atom.workspace.addModalPanel(item: @atomHaskellHsdevView.getElement(), visible: false)

    @agent = new HsDevAgent(port=1234)

    # Events subscribed to in atom's sys
    @subscriptions = new CompositeDisposable

    # Register command that toggles this view
    @subscriptions.add atom.commands.add 'atom-workspace', 'atom-haskell-hsdev:restart': => @restart()
    @subscriptions.add atom.commands.add 'atom-workspace', 'atom-haskell-hsdev:toggle': => @toggle()
    @subscriptions.add atom.commands.add 'atom-workspace', 'atom-haskell-hsdev:ping': => @ping()
    @subscriptions.add atom.commands.add 'atom-workspace', 'atom-haskell-hsdev:test': => @test()

  deactivate: ->
    @modalPanel.destroy()
    @subscriptions.dispose()
    @atomHaskellHsdevView.destroy()

  serialize: ->
    atomHaskellHsdevViewState: @atomHaskellHsdevView.serialize()

  restart: ->
    console.log 'AtomHaskellHsdev restarting'

    @agent.destroy()
    @agent = new HsDevAgent(port=1234)

  toggle: ->
    console.log 'AtomHaskellHsdev was toggled!'

    if @modalPanel.isVisible()
      @modalPanel.hide()
    else
      @modalPanel.show()

  ping: ->
    @agent.call 'ping'

  test: ->
    @agent.ping (resp) ->
        console.log "response: #{JSON.stringify(resp)}"
    @agent.call 'scan', {'projects': ['d:\\users\\voidex\\Documents\\Projects\\hsdev'], 'cabal': true},
      response = (resp) ->
        console.log "response: #{JSON.stringify(resp)}",
      notify = (n) ->
        console.log "notify: #{JSON.stringify(n)}",
      error = (e, ds) ->
        console.log "error: #{e}, #{JSON.stringify(ds)}"
