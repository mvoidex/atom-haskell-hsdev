AtomHaskellHsdevView = require './atom-haskell-hsdev-view'
{CompositeDisposable} = require 'atom'

module.exports = AtomHaskellHsdev =
  atomHaskellHsdevView: null
  modalPanel: null
  subscriptions: null

  activate: (state) ->
    @atomHaskellHsdevView = new AtomHaskellHsdevView(state.atomHaskellHsdevViewState)
    @modalPanel = atom.workspace.addModalPanel(item: @atomHaskellHsdevView.getElement(), visible: false)

    # Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    @subscriptions = new CompositeDisposable

    # Register command that toggles this view
    @subscriptions.add atom.commands.add 'atom-workspace', 'atom-haskell-hsdev:toggle': => @toggle()

  deactivate: ->
    @modalPanel.destroy()
    @subscriptions.dispose()
    @atomHaskellHsdevView.destroy()

  serialize: ->
    atomHaskellHsdevViewState: @atomHaskellHsdevView.serialize()

  toggle: ->
    console.log 'AtomHaskellHsdev was toggled!'

    if @modalPanel.isVisible()
      @modalPanel.hide()
    else
      @modalPanel.show()
