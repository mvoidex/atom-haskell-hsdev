const tooltipActions =
  [
    { value: '', description: 'Nothing' },
    { value: 'whoat', description: 'Whoat' },
  ]

export const config = {
  hsdevPath: {
    type: 'string',
    default: 'hsdev',
    description: 'Path to hsdev',
    order: 0,
  },
  hsdevDb: {
    type: 'string',
    default: '',
    description: 'Path to hsdev database',
    order: 0,
  },
  debug: {
    type: 'boolean',
    default: false,
    order: 999,
  },
  additionalPathDirectories: {
    type: 'array',
    default: [],
    description: `Add this directories to PATH when invoking ghc-mod. \
You might want to add path to a directory with \
ghc, cabal, etc binaries here. \
Separate with comma.`,
    items: {
      type: 'string',
    },
    order: 0,
  },
  initTimeout: {
    type: 'integer',
    description: `How long to wait for initialization commands (checking \
GHC and ghc-mod versions, getting stack sandbox) until \
assuming those hanged and bailing. In seconds.`,
    default: 60,
    minimum: 1,
    order: 50,
  },
  onSaveCheck: {
    type: 'boolean',
    default: true,
    description: 'Check file on save',
    order: 25,
  },
  onSaveLint: {
    type: 'boolean',
    default: true,
    description: 'Lint file on save',
    order: 25,
  },
  onChangeCheck: {
    type: 'boolean',
    default: false,
    description: 'Check file on change',
    order: 25,
  },
  onChangeLint: {
    type: 'boolean',
    default: false,
    description: 'Lint file on change',
    order: 25,
  },
  onMouseHoverShow: {
    type: 'string',
    description: 'Contents of tooltip on mouse hover',
    default: 'whoat',
    enum: tooltipActions,
    order: 30,
  },
  onSelectionShow: {
    type: 'string',
    description: 'Contents of tooltip on selection',
    default: '',
    enum: tooltipActions,
    order: 30,
  },
  highlightTooltips: {
    type: 'boolean',
    default: true,
    description: 'Show highlighting for type/info tooltips',
    order: 40,
  },
  highlightMessages: {
    type: 'boolean',
    default: true,
    description: 'Show highlighting for output panel messages',
    order: 40,
  },
  hlintOptions: {
    type: 'array',
    default: [],
    description: 'Command line options to pass to hlint (comma-separated)',
    order: 45,
  },
  experimental: {
    type: 'boolean',
    default: false,
    description: `Enable experimental features, which are expected to land in \
next release of ghc-mod. ENABLE ONLY IF YOU KNOW WHAT YOU \
ARE DOING`,
    order: 999,
  },
  ghcModMessages: {
    type: 'string',
    description: 'How to show warnings/errors reported by ghc-mod (requires restart)',
    default: 'console',
    enum: [
      { value: 'console', description: 'Developer Console' },
      { value: 'upi', description: 'Output Panel' },
      { value: 'popup', description: 'Error/Warning Popups' },
    ],
    order: 42,
  },
  maxMemMegs: {
    type: 'integer',
    descrition: 'Maximum ghc-mod interactive mode memory usage (in megabytes)',
    default: 4 * 1024,
    minimum: 1024,
    order: 50,
  },
}
