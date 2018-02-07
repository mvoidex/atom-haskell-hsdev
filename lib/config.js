"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tooltipActions = [
    { value: '', description: 'Nothing' },
    { value: 'whoat', description: 'Whoat' },
];
exports.config = {
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
    hsdevPort: {
        type: 'integer',
        default: 4567,
        description: 'Port of hsdev server',
        order: 0,
    },
    buildTool: {
        type: 'string',
        default: 'cabal',
        description: 'build tool to use when scanning projects',
        enum: [
            { value: 'cabal', description: 'Cabal' },
            { value: 'stack', description: 'Stack' },
        ],
        order: 0
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
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLE1BQU0sY0FBYyxHQUNsQjtJQUNFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFO0lBQ3JDLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFO0NBQ3pDLENBQUE7QUFFVSxRQUFBLE1BQU0sR0FBRztJQUNwQixTQUFTLEVBQUU7UUFDVCxJQUFJLEVBQUUsUUFBUTtRQUNkLE9BQU8sRUFBRSxPQUFPO1FBQ2hCLFdBQVcsRUFBRSxlQUFlO1FBQzVCLEtBQUssRUFBRSxDQUFDO0tBQ1Q7SUFDRCxPQUFPLEVBQUU7UUFDUCxJQUFJLEVBQUUsUUFBUTtRQUNkLE9BQU8sRUFBRSxFQUFFO1FBQ1gsV0FBVyxFQUFFLHdCQUF3QjtRQUNyQyxLQUFLLEVBQUUsQ0FBQztLQUNUO0lBQ0QsU0FBUyxFQUFFO1FBQ1QsSUFBSSxFQUFFLFNBQVM7UUFDZixPQUFPLEVBQUUsSUFBSTtRQUNiLFdBQVcsRUFBRSxzQkFBc0I7UUFDbkMsS0FBSyxFQUFFLENBQUM7S0FDVDtJQUNELFNBQVMsRUFBRTtRQUNULElBQUksRUFBRSxRQUFRO1FBQ2QsT0FBTyxFQUFFLE9BQU87UUFDaEIsV0FBVyxFQUFFLDBDQUEwQztRQUN2RCxJQUFJLEVBQUU7WUFDSixFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRTtZQUN4QyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRTtTQUN6QztRQUNELEtBQUssRUFBRSxDQUFDO0tBQ1Q7SUFDRCxLQUFLLEVBQUU7UUFDTCxJQUFJLEVBQUUsU0FBUztRQUNmLE9BQU8sRUFBRSxLQUFLO1FBQ2QsS0FBSyxFQUFFLEdBQUc7S0FDWDtJQUNELHlCQUF5QixFQUFFO1FBQ3pCLElBQUks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biAgICB7IHZhbHVlOiAnJywgZGVzY3JpcHRpb246ICdOb3RoaW5nJyB9LFxyXG4gICAgeyB2YWx1ZTogJ3dob2F0JywgZGVzY3JpcHRpb246ICdXaG9hdCcgfSxcclxuICBdXHJcblxyXG5leHBvcnQgY29uc3QgY29uZmlnID0ge1xyXG4gIGhzZGV2UGF0aDoge1xyXG4gICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICBkZWZhdWx0OiAnaHNkZXYnLFxyXG4gICAgZGVzY3JpcHRpb246ICdQYXRoIHRvIGhzZGV2JyxcclxuICAgIG9yZGVyOiAwLFxyXG4gIH0sXHJcbiAgaHNkZXZEYjoge1xyXG4gICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICBkZWZhdWx0OiAnJyxcclxuICAgIGRlc2NyaXB0aW9uOiAnUGF0aCB0byBoc2RldiBkYXRhYmFzZScsXHJcbiAgICBvcmRlcjogMCxcclxuICB9LFxyXG4gIGhzZGV2UG9ydDoge1xyXG4gICAgdHlwZTogJ2ludGVnZXInLFxyXG4gICAgZGVmYXVsdDogNDU2NyxcclxuICAgIGRlc2NyaXB0aW9uOiAnUG9ydCBvZiBoc2RldiBzZXJ2ZXInLFxyXG4gICAgb3JkZXI6IDAsXHJcbiAgfSxcclxuICBidWlsZFRvb2w6IHtcclxuICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgZGVmYXVsdDogJ2NhYmFsJyxcclxuICAgIGRlc2NyaXB0aW9uOiAnYnVpbGQgdG9vbCB0byB1c2Ugd2hlbiBzY2FubmluZyBwcm9qZWN0cycsXHJcbiAgICBlbnVtOiBbXHJcbiAgICAgIHsgdmFsdWU6ICdjYWJhbCcsIGRlc2NyaXB0aW9uOiAnQ2FiYWwnIH0sXHJcbiAgICAgIHsgdmFsdWU6ICdzdGFjaycsIGRlc2NyaXB0aW9uOiAnU3RhY2snIH0sXHJcbiAgICBdLFxyXG4gICAgb3JkZXI6IDBcclxuICB9LFxyXG4gIGRlYnVnOiB7XHJcbiAgICB0eXBlOiAnYm9vbGVhbicsXHJcbiAgICBkZWZhdWx0OiBmYWxzZSxcclxuICAgIG9yZGVyOiA5OTksXHJcbiAgfSxcclxuICBhZGRpdGlvbmFsUGF0aERpcmVjdG9yaWVzOiB7XHJcbiAgICB0eXBlOiAnYXJyYXknLFxyXG4gICAgZGVmYXVsdDogW10sXHJcbiAgICBkZXNjcmlwdGlvbjogYEFkZCB0aGlzIGRpcmVjdG9yaWVzIHRvIFBBVEggd2hlbiBpbnZva2luZyBnaGMtbW9kLiBcXFxyXG5Zb3UgbWlnaHQgd2FudCB0byBhZGQgcGF0aCB0byBhIGRpcmVjdG9yeSB3aXRoIFxcXHJcbmdoYywgY2FiYWwsIGV0YyBiaW5hcmllcyBoZXJlLiBcXFxyXG5TZXBhcmF0ZSB3aXRoIGNvbW1hLmAsXHJcbiAgICBpdGVtczoge1xyXG4gICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgIH0sXHJcbiAgICBvcmRlcjogMCxcclxuICB9LFxyXG4gIGluaXRUaW1lb3V0OiB7XHJcbiAgICB0eXBlOiAnaW50ZWdlcicsXHJcbiAgICBkZXNjcmlwdGlvbjogYEhvdyBsb25nIHRvIHdhaXQgZm9yIGluaXRpYWxpemF0aW9uIGNvbW1hbmRzIChjaGVja2luZyBcXFxyXG5HSEMgYW5kIGdoYy1tb2QgdmVyc2lvbnMsIGdldHRpbmcgc3RhY2sgc2FuZGJveCkgdW50aWwgXFxcclxuYXNzdW1pbmcgdGhvc2UgaGFuZ2VkIGFuZCBiYWlsaW5nLiBJbiBzZWNvbmRzLmAsXHJcbiAgICBkZWZhdWx0OiA2MCxcclxuICAgIG1pbmltdW06IDEsXHJcbiAgICBvcmRlcjogNTAsXHJcbiAgfSxcclxuICBvblNhdmVDaGVjazoge1xyXG4gICAgdHlwZTogJ2Jvb2xlYW4nLFxyXG4gICAgZGVmYXVsdDogdHJ1ZSxcclxuICAgIGRlc2NyaXB0aW9uOiAnQ2hlY2sgZmlsZSBvbiBzYXZlJyxcclxuICAgIG9yZGVyOiAyNSxcclxuICB9LFxyXG4gIG9uU2F2ZUxpbnQ6IHtcclxuICAgIHR5cGU6ICdib29sZWFuJyxcclxuICAgIGRlZmF1bHQ6IHRydWUsXHJcbiAgICBkZXNjcmlwdGlvbjogJ0xpbnQgZmlsZSBvbiBzYXZlJyxcclxuICAgIG9yZGVyOiAyNSxcclxuICB9LFxyXG4gIG9uQ2hhbmdlQ2hlY2s6IHtcclxuICAgIHR5cGU6ICdib29sZWFuJyxcclxuICAgIGRlZmF1bHQ6IGZhbHNlLFxyXG4gICAgZGVzY3JpcHRpb246ICdDaGVjayBmaWxlIG9uIGNoYW5nZScsXHJcbiAgICBvcmRlcjogMjUsXHJcbiAgfSxcclxuICBvbkNoYW5nZUxpbnQ6IHtcclxuICAgIHR5cGU6ICdib29sZWFuJyxcclxuICAgIGRlZmF1bHQ6IGZhbHNlLFxyXG4gICAgZGVzY3JpcHRpb246ICdMaW50IGZpbGUgb24gY2hhbmdlJyxcclxuICAgIG9yZGVyOiAyNSxcclxuICB9LFxyXG4gIG9uTW91c2VIb3ZlclNob3c6IHtcclxuICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgZGVzY3JpcHRpb246ICdDb250ZW50cyBvZiB0b29sdGlwIG9uIG1vdXNlIGhvdmVyJyxcclxuICAgIGRlZmF1bHQ6ICd3aG9hdCcsXHJcbiAgICBlbnVtOiB0b29sdGlwQWN0aW9ucyxcclxuICAgIG9yZGVyOiAzMCxcclxuICB9LFxyXG4gIG9uU2VsZWN0aW9uU2hvdzoge1xyXG4gICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICBkZXNjcmlwdGlvbjogJ0NvbnRlbnRzIG9mIHRvb2x0aXAgb24gc2VsZWN0aW9uJyxcclxuICAgIGRlZmF1bHQ6ICcnLFxyXG4gICAgZW51bTogdG9vbHRpcEFjdGlvbnMsXHJcbiAgICBvcmRlcjogMzAsXHJcbiAgfSxcclxuICBoaWdobGlnaHRUb29sdGlwczoge1xyXG4gICAgdHlwZTogJ2Jvb2xlYW4nLFxyXG4gICAgZGVmYXVsdDogdHJ1ZSxcclxuICAgIGRlc2NyaXB0aW9uOiAnU2hvdyBoaWdobGlnaHRpbmcgZm9yIHR5cGUvaW5mbyB0b29sdGlwcycsXHJcbiAgICBvcmRlcjogNDAsXHJcbiAgfSxcclxuICBoaWdobGlnaHRNZXNzYWdlczoge1xyXG4gICAgdHlwZTogJ2Jvb2xlYW4nLFxyXG4gICAgZGVmYXVsdDogdHJ1ZSxcclxuICAgIGRlc2NyaXB0aW9uOiAnU2hvdyBoaWdobGlnaHRpbmcgZm9yIG91dHB1dCBwYW5lbCBtZXNzYWdlcycsXHJcbiAgICBvcmRlcjogNDAsXHJcbiAgfSxcclxuICBobGludE9wdGlvbnM6IHtcclxuICAgIHR5cGU6ICdhcnJheScsXHJcbiAgICBkZWZhdWx0OiBbXSxcclxuICAgIGRlc2NyaXB0aW9uOiAnQ29tbWFuZCBsaW5lIG9wdGlvbnMgdG8gcGFzcyB0byBobGludCAoY29tbWEtc2VwYXJhdGVkKScsXHJcbiAgICBvcmRlcjogNDUsXHJcbiAgfSxcclxuICBleHBlcmltZW50YWw6IHtcclxuICAgIHR5cGU6ICdib29sZWFuJyxcclxuICAgIGRlZmF1bHQ6IGZhbHNlLFxyXG4gICAgZGVzY3JpcHRpb246IGBFbmFibGUgZXhwZXJpbWVudGFsIGZlYXR1cmVzLCB3aGljaCBhcmUgZXhwZWN0ZWQgdG8gbGFuZCBpbiBcXFxyXG5uZXh0IHJlbGVhc2Ugb2YgZ2hjLW1vZC4gRU5BQkxFIE9OTFkgSUYgWU9VIEtOT1cgV0hBVCBZT1UgXFxcclxuQVJFIERPSU5HYCxcclxuICAgIG9yZGVyOiA5OTksXHJcbiAgfSxcclxuICBnaGNNb2RNZXNzYWdlczoge1xyXG4gICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICBkZXNjcmlwdGlvbjogJ0hvdyB0byBzaG93IHdhcm5pbmdzL2Vycm9ycyByZXBvcnRlZCBieSBnaGMtbW9kIChyZXF1aXJlcyByZXN0YXJ0KScsXHJcbiAgICBkZWZhdWx0OiAnY29uc29sZScsXHJcbiAgICBlbnVtOiBbXHJcbiAgICAgIHsgdmFsdWU6ICdjb25zb2xlJywgZGVzY3JpcHRpb246ICdEZXZlbG9wZXIgQ29uc29sZScgfSxcclxuICAgICAgeyB2YWx1ZTogJ3VwaScsIGRlc2NyaXB0aW9uOiAnT3V0cHV0IFBhbmVsJyB9LFxyXG4gICAgICB7IHZhbHVlOiAncG9wdXAnLCBkZXNjcmlwdGlvbjogJ0Vycm9yL1dhcm5pbmcgUG9wdXBzJyB9LFxyXG4gICAgXSxcclxuICAgIG9yZGVyOiA0MixcclxuICB9LFxyXG4gIG1heE1lbU1lZ3M6IHtcclxuICAgIHR5cGU6ICdpbnRlZ2VyJyxcclxuICAgIGRlc2NyaXRpb246ICdNYXhpbXVtIGdoYy1tb2QgaW50ZXJhY3RpdmUgbW9kZSBtZW1vcnkgdXNhZ2UgKGluIG1lZ2FieXRlcyknLFxyXG4gICAgZGVmYXVsdDogNCAqIDEwMjQsXHJcbiAgICBtaW5pbXVtOiAxMDI0LFxyXG4gICAgb3JkZXI6IDUwLFxyXG4gIH0sXHJcbn1cclxuIl19