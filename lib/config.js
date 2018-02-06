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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLE1BQU0sY0FBYyxHQUNsQjtJQUNFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFO0lBQ3JDLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFO0NBQ3pDLENBQUE7QUFFVSxRQUFBLE1BQU0sR0FBRztJQUNwQixTQUFTLEVBQUU7UUFDVCxJQUFJLEVBQUUsUUFBUTtRQUNkLE9BQU8sRUFBRSxPQUFPO1FBQ2hCLFdBQVcsRUFBRSxlQUFlO1FBQzVCLEtBQUssRUFBRSxDQUFDO0tBQ1Q7SUFDRCxPQUFPLEVBQUU7UUFDUCxJQUFJLEVBQUUsUUFBUTtRQUNkLE9BQU8sRUFBRSxFQUFFO1FBQ1gsV0FBVyxFQUFFLHdCQUF3QjtRQUNyQyxLQUFLLEVBQUUsQ0FBQztLQUNUO0lBQ0QsS0FBSyxFQUFFO1FBQ0wsSUFBSSxFQUFFLFNBQVM7UUFDZixPQUFPLEVBQUUsS0FBSztRQUNkLEtBQUssRUFBRSxHQUFHO0tBQ1g7SUFDRCx5QkFBeUIsRUFBRTtRQUN6QixJQUFJLEVBQUUsT0FBTztRQUNiLE9BQU8sRUFBRSxFQUFFO1FBQ1gsV0FBVyxFQUFFOzs7cUJBR0k7UUFDakIsS0FBSyxFQUFFO1lBQ0wsSUFBSSxFQUFFLFFBQVE7U0FDZjtRQUNELEtBQUssRUFBRSxDQUFDO0tBQ1Q7SUFDRCxXQUFXLEVBQUU7UUFDWCxJQUFJLEVBQUUsU0FBUztRQUNmLFdBQVcsRUFBRTs7K0NBRThCO1FBQzNDLE9BQU8sRUFBRSxFQUFFO1FBQ1gsT0FBTyxFQUFFLENBQUM7UUFDVixLQUFLLEVBQUUsRUFBRTtLQUNWO0lBQ0QsV0FBVyxFQUFFO1FBQ1gsSUFBSSxFQUFFLFNBQVM7UUFDZixPQUFPLEVBQUUsSUFBSTtRQUNiLFdBQVcsRUFBRSxvQkFBb0I7UUFDakMsS0FBSyxFQUFFLEVBQUU7S0FDVjtJQUNELFVBQVUsRUFBRTtRQUNWLElBQUksRUFBRSxTQUFTO1FBQ2YsT0FBTyxFQUFFLElBQUk7UUFDYixXQUFXLEVBQUUsbUJBQW1CO1FBQ2hDLEtBQUssRUFBRSxFQUFFO0tBQ1Y7SUFDRCxhQUFhLEVBQUU7UUFDYixJQUFJLEVBQUUsU0FBUztRQUNmLE9BQU8sRUFBRSxLQUFLO1FBQ2QsV0FBVyxFQUFFLHNCQUFzQjtRQUNuQyxLQUFLLEVBQUUsRUFBRTtLQUNWO0lBQ0QsWUFBWSxFQUFFO1FBQ1osSUFBSSxFQUFFLFNBQVM7UUFDZixPQUFPLEVBQUUsS0FBSztRQUNkLFdBQVcsRUFBRSxxQkFBcUI7UUFDbEMsS0FBSyxFQUFFLEVBQUU7S0FDVjtJQUNELGdCQUFnQixFQUFFO1FBQ2hCLElBQUksRUFBRSxRQUFRO1FBQ2QsV0FBVyxFQUFFLG9DQUFvQztRQUNqRCxPQUFPLEVBQUUsT0FBTztRQUNoQixJQUFJLEVBQUUsY0FBYztRQUNwQixLQUFLLEVBQUUsRUFBRTtLQUNWO0lBQ0QsZUFBZSxFQUFFO1FBQ2YsSUFBSSxFQUFFLFFBQVE7UUFDZCxXQUFXLEVBQUUsa0NBQWtDO1FBQy9DLE9BQU8sRUFBRSxFQUFFO1FBQ1gsSUFBSSxFQUFFLGNBQWM7UUFDcEIsS0FBSyxFQUFFLEVBQUU7S0FDVjtJQUNELGlCQUFpQixFQUFFO1FBQ2pCLElBQUksRUFBRSxTQUFTO1FBQ2YsT0FBTyxFQUFFLElBQUk7UUFDYixXQUFXLEVBQUUsMENBQTBDO1FBQ3ZELEtBQUssRUFBRSxFQUFFO0tBQ1Y7SUFDRCxpQkFBaUIsRUFBRTtRQUNqQixJQUFJLEVBQUUsU0FBUztRQUNmLE9BQU8sRUFBRSxJQUFJO1FBQ2IsV0FBVyxFQUFFLDZDQUE2QztRQUMxRCxLQUFLLEVBQUUsRUFBRTtLQUNWO0lBQ0QsWUFBWSxFQUFFO1FBQ1osSUFBSSxFQUFFLE9BQU87UUFDYixPQUFPLEVBQUUsRUFBRTtRQUNYLFdBQVcsRUFBRSx5REFBeUQ7UUFDdEUsS0FBSyxFQUFFLEVBQUU7S0FDVjtJQUNELFlBQVksRUFBRTtRQUNaLElBQUksRUFBRSxTQUFTO1FBQ2YsT0FBTyxFQUFFLEtBQUs7UUFDZCxXQUFXLEVBQUU7O1VBRVA7UUFDTixLQUFLLEVBQUUsR0FBRztLQUNYO0lBQ0QsY0FBYyxFQUFFO1FBQ2QsSUFBSSxFQUFFLFFBQVE7UUFDZCxXQUFXLEVBQUUsb0VBQW9FO1FBQ2pGLE9BQU8sRUFBRSxTQUFTO1FBQ2xCLElBQUksRUFBRTtZQUNKLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsbUJBQW1CLEVBQUU7WUFDdEQsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUU7WUFDN0MsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxzQkFBc0IsRUFBRTtTQUN4RDtRQUNELEtBQUssRUFBRSxFQUFFO0tBQ1Y7SUFDRCxVQUFVLEVBQUU7UUFDVixJQUFJLEVBQUUsU0FBUztRQUNmLFVBQVUsRUFBRSw4REFBOEQ7UUFDMUUsT0FBTyxFQUFFLENBQUMsR0FBRyxJQUFJO1FBQ2pCLE9BQU8sRUFBRSxJQUFJO1FBQ2IsS0FBSyxFQUFFLEVBQUU7S0FDVjtDQUNGLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCB0b29sdGlwQWN0aW9ucyA9XHJcbiAgW1xyXG4gICAgeyB2YWx1ZTogJycsIGRlc2NyaXB0aW9uOiAnTm90aGluZycgfSxcclxuICAgIHsgdmFsdWU6ICd3aG9hdCcsIGRlc2NyaXB0aW9uOiAnV2hvYXQnIH0sXHJcbiAgXVxyXG5cclxuZXhwb3J0IGNvbnN0IGNvbmZpZyA9IHtcclxuICBoc2RldlBhdGg6IHtcclxuICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgZGVmYXVsdDogJ2hzZGV2JyxcclxuICAgIGRlc2NyaXB0aW9uOiAnUGF0aCB0byBoc2RldicsXHJcbiAgICBvcmRlcjogMCxcclxuICB9LFxyXG4gIGhzZGV2RGI6IHtcclxuICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgZGVmYXVsdDogJycsXHJcbiAgICBkZXNjcmlwdGlvbjogJ1BhdGggdG8gaHNkZXYgZGF0YWJhc2UnLFxyXG4gICAgb3JkZXI6IDAsXHJcbiAgfSxcclxuICBkZWJ1Zzoge1xyXG4gICAgdHlwZTogJ2Jvb2xlYW4nLFxyXG4gICAgZGVmYXVsdDogZmFsc2UsXHJcbiAgICBvcmRlcjogOTk5LFxyXG4gIH0sXHJcbiAgYWRkaXRpb25hbFBhdGhEaXJlY3Rvcmllczoge1xyXG4gICAgdHlwZTogJ2FycmF5JyxcclxuICAgIGRlZmF1bHQ6IFtdLFxyXG4gICAgZGVzY3JpcHRpb246IGBBZGQgdGhpcyBkaXJlY3RvcmllcyB0byBQQVRIIHdoZW4gaW52b2tpbmcgZ2hjLW1vZC4gXFxcclxuWW91IG1pZ2h0IHdhbnQgdG8gYWRkIHBhdGggdG8gYSBkaXJlY3Rvcnkgd2l0aCBcXFxyXG5naGMsIGNhYmFsLCBldGMgYmluYXJpZXMgaGVyZS4gXFxcclxuU2VwYXJhdGUgd2l0aCBjb21tYS5gLFxyXG4gICAgaXRlbXM6IHtcclxuICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICB9LFxyXG4gICAgb3JkZXI6IDAsXHJcbiAgfSxcclxuICBpbml0VGltZW91dDoge1xyXG4gICAgdHlwZTogJ2ludGVnZXInLFxyXG4gICAgZGVzY3JpcHRpb246IGBIb3cgbG9uZyB0byB3YWl0IGZvciBpbml0aWFsaXphdGlvbiBjb21tYW5kcyAoY2hlY2tpbmcgXFxcclxuR0hDIGFuZCBnaGMtbW9kIHZlcnNpb25zLCBnZXR0aW5nIHN0YWNrIHNhbmRib3gpIHVudGlsIFxcXHJcbmFzc3VtaW5nIHRob3NlIGhhbmdlZCBhbmQgYmFpbGluZy4gSW4gc2Vjb25kcy5gLFxyXG4gICAgZGVmYXVsdDogNjAsXHJcbiAgICBtaW5pbXVtOiAxLFxyXG4gICAgb3JkZXI6IDUwLFxyXG4gIH0sXHJcbiAgb25TYXZlQ2hlY2s6IHtcclxuICAgIHR5cGU6ICdib29sZWFuJyxcclxuICAgIGRlZmF1bHQ6IHRydWUsXHJcbiAgICBkZXNjcmlwdGlvbjogJ0NoZWNrIGZpbGUgb24gc2F2ZScsXHJcbiAgICBvcmRlcjogMjUsXHJcbiAgfSxcclxuICBvblNhdmVMaW50OiB7XHJcbiAgICB0eXBlOiAnYm9vbGVhbicsXHJcbiAgICBkZWZhdWx0OiB0cnVlLFxyXG4gICAgZGVzY3JpcHRpb246ICdMaW50IGZpbGUgb24gc2F2ZScsXHJcbiAgICBvcmRlcjogMjUsXHJcbiAgfSxcclxuICBvbkNoYW5nZUNoZWNrOiB7XHJcbiAgICB0eXBlOiAnYm9vbGVhbicsXHJcbiAgICBkZWZhdWx0OiBmYWxzZSxcclxuICAgIGRlc2NyaXB0aW9uOiAnQ2hlY2sgZmlsZSBvbiBjaGFuZ2UnLFxyXG4gICAgb3JkZXI6IDI1LFxyXG4gIH0sXHJcbiAgb25DaGFuZ2VMaW50OiB7XHJcbiAgICB0eXBlOiAnYm9vbGVhbicsXHJcbiAgICBkZWZhdWx0OiBmYWxzZSxcclxuICAgIGRlc2NyaXB0aW9uOiAnTGludCBmaWxlIG9uIGNoYW5nZScsXHJcbiAgICBvcmRlcjogMjUsXHJcbiAgfSxcclxuICBvbk1vdXNlSG92ZXJTaG93OiB7XHJcbiAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgIGRlc2NyaXB0aW9uOiAnQ29udGVudHMgb2YgdG9vbHRpcCBvbiBtb3VzZSBob3ZlcicsXHJcbiAgICBkZWZhdWx0OiAnd2hvYXQnLFxyXG4gICAgZW51bTogdG9vbHRpcEFjdGlvbnMsXHJcbiAgICBvcmRlcjogMzAsXHJcbiAgfSxcclxuICBvblNlbGVjdGlvblNob3c6IHtcclxuICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgZGVzY3JpcHRpb246ICdDb250ZW50cyBvZiB0b29sdGlwIG9uIHNlbGVjdGlvbicsXHJcbiAgICBkZWZhdWx0OiAnJyxcclxuICAgIGVudW06IHRvb2x0aXBBY3Rpb25zLFxyXG4gICAgb3JkZXI6IDMwLFxyXG4gIH0sXHJcbiAgaGlnaGxpZ2h0VG9vbHRpcHM6IHtcclxuICAgIHR5cGU6ICdib29sZWFuJyxcclxuICAgIGRlZmF1bHQ6IHRydWUsXHJcbiAgICBkZXNjcmlwdGlvbjogJ1Nob3cgaGlnaGxpZ2h0aW5nIGZvciB0eXBlL2luZm8gdG9vbHRpcHMnLFxyXG4gICAgb3JkZXI6IDQwLFxyXG4gIH0sXHJcbiAgaGlnaGxpZ2h0TWVzc2FnZXM6IHtcclxuICAgIHR5cGU6ICdib29sZWFuJyxcclxuICAgIGRlZmF1bHQ6IHRydWUsXHJcbiAgICBkZXNjcmlwdGlvbjogJ1Nob3cgaGlnaGxpZ2h0aW5nIGZvciBvdXRwdXQgcGFuZWwgbWVzc2FnZXMnLFxyXG4gICAgb3JkZXI6IDQwLFxyXG4gIH0sXHJcbiAgaGxpbnRPcHRpb25zOiB7XHJcbiAgICB0eXBlOiAnYXJyYXknLFxyXG4gICAgZGVmYXVsdDogW10sXHJcbiAgICBkZXNjcmlwdGlvbjogJ0NvbW1hbmQgbGluZSBvcHRpb25zIHRvIHBhc3MgdG8gaGxpbnQgKGNvbW1hLXNlcGFyYXRlZCknLFxyXG4gICAgb3JkZXI6IDQ1LFxyXG4gIH0sXHJcbiAgZXhwZXJpbWVudGFsOiB7XHJcbiAgICB0eXBlOiAnYm9vbGVhbicsXHJcbiAgICBkZWZhdWx0OiBmYWxzZSxcclxuICAgIGRlc2NyaXB0aW9uOiBgRW5hYmxlIGV4cGVyaW1lbnRhbCBmZWF0dXJlcywgd2hpY2ggYXJlIGV4cGVjdGVkIHRvIGxhbmQgaW4gXFxcclxubmV4dCByZWxlYXNlIG9mIGdoYy1tb2QuIEVOQUJMRSBPTkxZIElGIFlPVSBLTk9XIFdIQVQgWU9VIFxcXHJcbkFSRSBET0lOR2AsXHJcbiAgICBvcmRlcjogOTk5LFxyXG4gIH0sXHJcbiAgZ2hjTW9kTWVzc2FnZXM6IHtcclxuICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgZGVzY3JpcHRpb246ICdIb3cgdG8gc2hvdyB3YXJuaW5ncy9lcnJvcnMgcmVwb3J0ZWQgYnkgZ2hjLW1vZCAocmVxdWlyZXMgcmVzdGFydCknLFxyXG4gICAgZGVmYXVsdDogJ2NvbnNvbGUnLFxyXG4gICAgZW51bTogW1xyXG4gICAgICB7IHZhbHVlOiAnY29uc29sZScsIGRlc2NyaXB0aW9uOiAnRGV2ZWxvcGVyIENvbnNvbGUnIH0sXHJcbiAgICAgIHsgdmFsdWU6ICd1cGknLCBkZXNjcmlwdGlvbjogJ091dHB1dCBQYW5lbCcgfSxcclxuICAgICAgeyB2YWx1ZTogJ3BvcHVwJywgZGVzY3JpcHRpb246ICdFcnJvci9XYXJuaW5nIFBvcHVwcycgfSxcclxuICAgIF0sXHJcbiAgICBvcmRlcjogNDIsXHJcbiAgfSxcclxuICBtYXhNZW1NZWdzOiB7XHJcbiAgICB0eXBlOiAnaW50ZWdlcicsXHJcbiAgICBkZXNjcml0aW9uOiAnTWF4aW11bSBnaGMtbW9kIGludGVyYWN0aXZlIG1vZGUgbWVtb3J5IHVzYWdlIChpbiBtZWdhYnl0ZXMpJyxcclxuICAgIGRlZmF1bHQ6IDQgKiAxMDI0LFxyXG4gICAgbWluaW11bTogMTAyNCxcclxuICAgIG9yZGVyOiA1MCxcclxuICB9LFxyXG59XHJcbiJdfQ==