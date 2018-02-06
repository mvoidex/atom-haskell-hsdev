export {}
declare module "atom" {
  interface ConfigValues {
    'atom-haskell-hsdev': Object
    'atom-haskell-hsdev.hsdevPath': string
    'atom-haskell-hsdev.hsdevDb': string
    'atom-haskell-hsdev.debug': boolean
    'atom-haskell-hsdev.additionalPathDirectories': Array<string>
    'atom-haskell-hsdev.initTimeout': number
    'atom-haskell-hsdev.onSaveCheck': boolean
    'atom-haskell-hsdev.onSaveLint': boolean
    'atom-haskell-hsdev.onChangeCheck': boolean
    'atom-haskell-hsdev.onChangeLint': boolean
    'atom-haskell-hsdev.onMouseHoverShow': '' | 'type' | 'info' | 'infoType' | 'typeInfo' | 'typeAndInfo'
    'atom-haskell-hsdev.onSelectionShow': '' | 'type' | 'info' | 'infoType' | 'typeInfo' | 'typeAndInfo'
    'atom-haskell-hsdev.highlightTooltips': boolean
    'atom-haskell-hsdev.highlightMessages': boolean
    'atom-haskell-hsdev.hlintOptions': string[]
    'atom-haskell-hsdev.experimental': boolean
    'atom-haskell-hsdev.ghcModMessages': 'console' | 'upi' | 'popup'
    'atom-haskell-hsdev.maxMemMegs': number
  }
}
