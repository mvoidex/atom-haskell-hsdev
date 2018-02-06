"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const atom_1 = require("atom");
const Util = require("./util");
const { handleException } = Util;
const messageTypes = {
    error: {},
    warning: {},
    lint: {},
};
const addMsgTypes = {
    'hsdev': {
        uriFilter: false,
        autoScroll: true,
    },
};
const contextScope = 'atom-text-editor[data-grammar~="haskell"]';
const mainMenu = {
    label: 'hsdev',
    menu: [
        { label: 'Ping', command: 'atom-haskell-hsdev:ping' },
    ],
};
class UPIConsumer {
    constructor(register, process) {
        this.process = process;
        this.disposables = new atom_1.CompositeDisposable();
        this.processMessages = [];
        this.lastMessages = [];
        this.msgBackend = atom.config.get('atom-haskell-hsdev.ghcModMessages');
        this.contextCommands = {
            'atom-haskell-hsdev:whoat': this.tooltipCommand(this.whoatTooltip.bind(this)),
            'atom-haskell-hsdev:go-to-declaration': this.goToDeclCommand.bind(this),
        };
        this.globalCommands = Object.assign({ 'atom-haskell-hsdev:check-file': this.checkCommand.bind(this), 'atom-haskell-hsdev:lint-file': this.lintCommand.bind(this), 'atom-haskell-hsdev:ping': this.pingCommand.bind(this) }, this.contextCommands);
        this.contextMenu = {
            label: 'hsdev',
            submenu: [
                { label: 'Whoat', command: 'atom-haskell-hsdev:whoat' },
                { label: 'Go To Declaration', command: 'atom-haskell-hsdev:go-to-declaration' },
            ],
        };
        this.disposables.add(this.process.onError(this.handleProcessError.bind(this)), this.process.onWarning(this.handleProcessWarning.bind(this)));
        const msgTypes = this.msgBackend === 'upi'
            ? Object.assign({}, messageTypes, addMsgTypes) : messageTypes;
        this.upi = register({
            name: 'atom-haskell-hsdev',
            menu: mainMenu,
            messageTypes: msgTypes,
            tooltip: this.shouldShowTooltip.bind(this),
            events: {},
        });
        this.disposables.add(this.upi, this.process.onBackendActive(() => this.upi.setStatus({ status: 'progress', detail: '' })), this.process.onBackendIdle(() => this.upi.setStatus({ status: 'ready', detail: '' })), atom.commands.add(contextScope, this.globalCommands));
        const cm = {};
        cm[contextScope] = [this.contextMenu];
        this.disposables.add(atom.contextMenu.add(cm));
    }
    dispose() {
        this.disposables.dispose();
    }
    async shouldShowTooltip(editor, crange, type) {
        const n = type === 'mouse' ? 'atom-haskell-hsdev.onMouseHoverShow'
            : type === 'selection' ? 'atom-haskell-hsdev.onSelectionShow'
                : undefined;
        const t = n && atom.config.get(n);
        if (t)
            return this[`${t}Tooltip`](editor, crange);
        else
            return undefined;
    }
    async checkCommand({ currentTarget }) {
    }
    async lintCommand({ currentTarget }) {
    }
    async pingCommand({ currentTarget }) {
        this.process.doPing();
    }
    tooltipCommand(tooltipfun) {
        return async ({ currentTarget, detail }) => this.upi.showTooltip({
            editor: currentTarget.getModel(),
            detail,
            async tooltip(crange) {
                return tooltipfun(currentTarget.getModel(), crange);
            },
        });
    }
    async goToDeclCommand({ currentTarget, detail }) {
        const editor = currentTarget.getModel();
        const evr = this.upi.getEventRange(editor, detail);
        if (!evr) {
            return;
        }
        const { crange } = evr;
        const symbols = await this.process.backend.whoat(editor.getBuffer().getUri(), crange.start.row + 1, crange.start.column + 1);
        if (symbols.length > 0) {
            const sym = symbols[0];
            if (sym.pos && sym.id.module.location.file) {
                await atom.workspace.open(sym.id.module.location.file, {
                    initialLine: sym.pos.line - 1,
                    initialColumn: sym.pos.column - 1,
                });
            }
        }
    }
    async whoatTooltip(e, p) {
        await this.process.backend.scanFile(e.getBuffer().getUri());
        this.process.backend.infer([e.getBuffer().getUri()]);
        let irange = p;
        let info = '';
        try {
            const res = await this.process.whoat(e.getBuffer(), p);
            irange = res.range;
            info = res.info;
        }
        catch (_err) {
            let word;
            Util.debug(`range: ${p}`);
            Util.debug(`line range: ${e.rangeForRow(p.start.row, false)}`);
            e.scanInRange(/\w+/, e.rangeForRow(p.start.row), undefined, (_match, matchText, range, _stop, _replace, _leadingContextLines, _trailingContextLines) => {
                Util.debug(`matched ${matchText} at ${range}`);
                if (range.containsRange(p)) {
                    stop();
                    word = matchText;
                }
            });
            if (word) {
                Util.debug(`word under cursor: ${word}`);
            }
        }
        return {
            range: irange,
            text: {
                text: info,
                highlighter: atom.config.get('atom-haskell-hsdev.highlightTooltips') ?
                    'source.haskell' : undefined,
            }
        };
    }
    setHighlighter() {
        if (atom.config.get('atom-haskell-hsdev.highlightMessages')) {
            return (m) => {
                if (typeof m.message === 'string') {
                    const message = {
                        text: m.message,
                        highlighter: 'hint.message.haskell',
                    };
                    return Object.assign({}, m, { message });
                }
                else {
                    return m;
                }
            };
        }
        else {
            return (m) => m;
        }
    }
    setMessages(messages) {
        this.lastMessages = messages.map(this.setHighlighter());
        this.sendMessages();
    }
    sendMessages() {
        this.upi.setMessages(this.processMessages.concat(this.lastMessages));
    }
    consoleReport(arg) {
        console.error(Util.formatError(arg), Util.getErrorDetail(arg));
    }
    handleProcessError(arg) {
        switch (this.msgBackend) {
            case 'upi':
                this.processMessages.push({
                    message: Util.formatError(arg)
                        + '\n\nSee console (View → Developer → Toggle Developer Tools → Console tab) for details.',
                    severity: 'hsdev',
                });
                this.consoleReport(arg);
                this.sendMessages();
                break;
            case 'console':
                this.consoleReport(arg);
                break;
            case 'popup':
                this.consoleReport(arg);
                atom.notifications.addError(Util.formatError(arg), {
                    detail: Util.getErrorDetail(arg),
                    dismissable: true,
                });
                break;
        }
    }
    handleProcessWarning(warning) {
        switch (this.msgBackend) {
            case 'upi':
                this.processMessages.push({
                    message: warning,
                    severity: 'hsdev',
                });
                Util.warn(warning);
                this.sendMessages();
                break;
            case 'console':
                Util.warn(warning);
                break;
            case 'popup':
                Util.warn(warning);
                atom.notifications.addWarning(warning, {
                    dismissable: false,
                });
                break;
        }
    }
}
tslib_1.__decorate([
    handleException,
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof TECommandEvent !== "undefined" && TECommandEvent) === "function" && _a || Object]),
    tslib_1.__metadata("design:returntype", Promise)
], UPIConsumer.prototype, "checkCommand", null);
tslib_1.__decorate([
    handleException,
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_b = typeof TECommandEvent !== "undefined" && TECommandEvent) === "function" && _b || Object]),
    tslib_1.__metadata("design:returntype", Promise)
], UPIConsumer.prototype, "lintCommand", null);
tslib_1.__decorate([
    handleException,
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_c = typeof TECommandEvent !== "undefined" && TECommandEvent) === "function" && _c || Object]),
    tslib_1.__metadata("design:returntype", Promise)
], UPIConsumer.prototype, "goToDeclCommand", null);
exports.UPIConsumer = UPIConsumer;
var _a, _b, _c;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBpLWNvbnN1bWVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3VwaS1jb25zdW1lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwrQkFBaUg7QUFHakgsK0JBQThCO0FBRTlCLE1BQU0sRUFBRSxlQUFlLEVBQUUsR0FBRyxJQUFJLENBQUE7QUFFaEMsTUFBTSxZQUFZLEdBQUc7SUFDbkIsS0FBSyxFQUFFLEVBQUU7SUFDVCxPQUFPLEVBQUUsRUFBRTtJQUNYLElBQUksRUFBRSxFQUFFO0NBQ1QsQ0FBQTtBQUVELE1BQU0sV0FBVyxHQUFHO0lBQ2xCLE9BQU8sRUFBRTtRQUNQLFNBQVMsRUFBRSxLQUFLO1FBQ2hCLFVBQVUsRUFBRSxJQUFJO0tBQ2pCO0NBQ0YsQ0FBQTtBQUVELE1BQU0sWUFBWSxHQUFHLDJDQUEyQyxDQUFBO0FBRWhFLE1BQU0sUUFBUSxHQUFHO0lBQ2YsS0FBSyxFQUFFLE9BQU87SUFDZCxJQUFJLEVBQUU7UUFDSixFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFO0tBQ3REO0NBQ0YsQ0FBQTtBQUlEO0lBOEJFLFlBQVksUUFBOEIsRUFBVSxPQUFxQjtRQUFyQixZQUFPLEdBQVAsT0FBTyxDQUFjO1FBNUJqRSxnQkFBVyxHQUF3QixJQUFJLDBCQUFtQixFQUFFLENBQUE7UUFDNUQsb0JBQWUsR0FBc0IsRUFBRSxDQUFBO1FBQ3ZDLGlCQUFZLEdBQXNCLEVBQUUsQ0FBQTtRQUNwQyxlQUFVLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLENBQUMsQ0FBQTtRQUVqRSxvQkFBZSxHQUFHO1lBQ3hCLDBCQUEwQixFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0Usc0NBQXNDLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFD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aUJBQ2xCLENBQUMsQ0FBQTtnQkFDRixLQUFLLENBQUE7UUFDVCxDQUFDO0lBQ0gsQ0FBQztJQUVPLG9CQUFvQixDQUFDLE9BQWU7UUFDMUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDeEIsS0FBSyxLQUFLO2dCQUNSLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDO29CQUN4QixPQUFPLEVBQUUsT0FBTztvQkFDaEIsUUFBUSxFQUFFLE9BQU87aUJBQ2xCLENBQUMsQ0FBQTtnQkFDRixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUNsQixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7Z0JBQ25CLEtBQUssQ0FBQTtZQUNQLEtBQUssU0FBUztnQkFDWixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUNsQixLQUFLLENBQUE7WUFDUCxLQUFLLE9BQU87Z0JBQ1YsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDbEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFO29CQUNyQyxXQUFXLEVBQUUsS0FBSztpQkFDbkIsQ0FBQyxDQUFBO2dCQUNGLEtBQUssQ0FBQTtRQUNULENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUF6SkM7SUFEQyxlQUFlOztpRUFDOEIsY0FBYyxvQkFBZCxjQUFjOzsrQ0FDM0Q7QUFHRDtJQURDLGVBQWU7O2lFQUM2QixjQUFjLG9CQUFkLGNBQWM7OzhDQUMxRDtBQWtCRDtJQURDLGVBQWU7O2lFQUN5QyxjQUFjLG9CQUFkLGNBQWM7O2tEQWV0RTtBQXhISCxrQ0EyT0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21tYW5kRXZlbnQsIENvbXBvc2l0ZURpc3Bvc2FibGUsIFJhbmdlLCBUZXh0QnVmZmVyLCBUZXh0RWRpdG9yLCBQb2ludCwgVGV4dEVkaXRvckVsZW1lbnQgfSBmcm9tICdhdG9tJ1xyXG5pbXBvcnQgeyBIc0RldlByb2Nlc3MsIElFcnJvckNhbGxiYWNrQXJncywgQ2FsbGJhY2tzIH0gZnJvbSAnLi9oc2RldidcclxuaW1wb3J0IHsgaW1wb3J0TGlzdFZpZXcgfSBmcm9tICcuL3ZpZXdzL2ltcG9ydC1saXN0LXZpZXcnXHJcbmltcG9ydCAqIGFzIFV0aWwgZnJvbSAnLi91dGlsJ1xyXG5pbXBvcnQgKiBhcyBVUEkgZnJvbSAnYXRvbS1oYXNrZWxsLXVwaSdcclxuY29uc3QgeyBoYW5kbGVFeGNlcHRpb24gfSA9IFV0aWxcclxuXHJcbmNvbnN0IG1lc3NhZ2VUeXBlcyA9IHtcclxuICBlcnJvcjoge30sXHJcbiAgd2FybmluZzoge30sXHJcbiAgbGludDoge30sXHJcbn1cclxuXHJcbmNvbnN0IGFkZE1zZ1R5cGVzID0ge1xyXG4gICdoc2Rldic6IHtcclxuICAgIHVyaUZpbHRlcjogZmFsc2UsXHJcbiAgICBhdXRvU2Nyb2xsOiB0cnVlLFxyXG4gIH0sXHJcbn1cclxuXHJcbmNvbnN0IGNvbnRleHRTY29wZSA9ICdhdG9tLXRleHQtZWRpdG9yW2RhdGEtZ3JhbW1hcn49XCJoYXNrZWxsXCJdJ1xyXG5cclxuY29uc3QgbWFpbk1lbnUgPSB7XHJcbiAgbGFiZWw6ICdoc2RldicsXHJcbiAgbWVudTogW1xyXG4gICAgeyBsYWJlbDogJ1BpbmcnLCBjb21tYW5kOiAnYXRvbS1oYXNrZWxsLWhzZGV2OnBpbmcnIH0sXHJcbiAgXSxcclxufVxyXG5cclxudHlwZSBURUNvbW1hbmRFdmVudCA9IENvbW1hbmRFdmVudDxUZXh0RWRpdG9yRWxlbWVudD5cclxuXHJcbmV4cG9ydCBjbGFzcyBVUElDb25zdW1lciB7XHJcbiAgcHVibGljIHVwaTogVVBJLklVUElJbnN0YW5jZVxyXG4gIHByaXZhdGUgZGlzcG9zYWJsZXM6IENvbXBvc2l0ZURpc3Bvc2FibGUgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpXHJcbiAgcHJpdmF0ZSBwcm9jZXNzTWVzc2FnZXM6IFVQSS5JUmVzdWx0SXRlbVtdID0gW11cclxuICBwcml2YXRlIGxhc3RNZXNzYWdlczogVVBJLklSZXN1bHRJdGVtW10gPSBbXVxyXG4gIHByaXZhdGUgbXNnQmFja2VuZCA9IGF0b20uY29uZmlnLmdldCgnYXRvbS1oYXNrZWxsLWhzZGV2LmdoY01vZE1lc3NhZ2VzJylcclxuXHJcbiAgcHJpdmF0ZSBjb250ZXh0Q29tbWFuZHMgPSB7XHJcbiAgICAnYXRvbS1oYXNrZWxsLWhzZGV2Ondob2F0JzogdGhpcy50b29sdGlwQ29tbWFuZCh0aGlzLndob2F0VG9vbHRpcC5iaW5kKHRoaXMpKSxcclxuICAgICdhdG9tLWhhc2tlbGwtaHNkZXY6Z28tdG8tZGVjbGFyYXRpb24nOiB0aGlzLmdvVG9EZWNsQ29tbWFuZC5iaW5kKHRoaXMpLFxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBnbG9iYWxDb21tYW5kcyA9IHtcclxuICAgICdhdG9tLWhhc2tlbGwtaHNkZXY6Y2hlY2stZmlsZSc6IHRoaXMuY2hlY2tDb21tYW5kLmJpbmQodGhpcyksXHJcbiAgICAnYXRvbS1oYXNrZWxsLWhzZGV2OmxpbnQtZmlsZSc6IHRoaXMubGludENvbW1hbmQuYmluZCh0aGlzKSxcclxuICAgICdhdG9tLWhhc2tlbGwtaHNkZXY6cGluZyc6IHRoaXMucGluZ0NvbW1hbmQuYmluZCh0aGlzKSxcclxuICAgIC4uLnRoaXMuY29udGV4dENvbW1hbmRzLFxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjb250ZXh0TWVudToge1xyXG4gICAgbGFiZWw6IHN0cmluZywgc3VibWVudTogQXJyYXk8eyBsYWJlbDogc3RyaW5nLCBjb21tYW5kOiBrZXlvZiBVUElDb25zdW1lclsnY29udGV4dENvbW1hbmRzJ10gfT5cclxuICB9ID0ge1xyXG4gICAgbGFiZWw6ICdoc2RldicsXHJcbiAgICBzdWJtZW51OlxyXG4gICAgW1xyXG4gICAgICB7IGxhYmVsOiAnV2hvYXQnLCBjb21tYW5kOiAnYXRvbS1oYXNrZWxsLWhzZGV2Ondob2F0JyB9LFxyXG4gICAgICB7IGxhYmVsOiAnR28gVG8gRGVjbGFyYXRpb24nLCBjb21tYW5kOiAnYXRvbS1oYXNrZWxsLWhzZGV2OmdvLXRvLWRlY2xhcmF0aW9uJyB9LFxyXG4gICAgXSxcclxuICB9XHJcblxyXG4gIGNvbnN0cnVjdG9yKHJlZ2lzdGVyOiBVUEkuSVVQSVJlZ2lzdHJhdGlvbiwgcHJpdmF0ZSBwcm9jZXNzOiBIc0RldlByb2Nlc3MpIHtcclxuICAgIHRoaXMuZGlzcG9zYWJsZXMuYWRkKFxyXG4gICAgICB0aGlzLnByb2Nlc3Mub25FcnJvcih0aGlzLmhhbmRsZVByb2Nlc3NFcnJvci5iaW5kKHRoaXMpKSxcclxuICAgICAgdGhpcy5wcm9jZXNzLm9uV2FybmluZyh0aGlzLmhhbmRsZVByb2Nlc3NXYXJuaW5nLmJpbmQodGhpcykpLFxyXG4gICAgKVxyXG5cclxuICAgIGNvbnN0IG1zZ1R5cGVzID1cclxuICAgICAgdGhpcy5tc2dCYWNrZW5kID09PSAndXBpJ1xyXG4gICAgICAgID8geyAuLi5tZXNzYWdlVHlwZXMsIC4uLmFkZE1zZ1R5cGVzIH1cclxuICAgICAgICA6IG1lc3NhZ2VUeXBlc1xyXG5cclxuICAgIHRoaXMudXBpID0gcmVnaXN0ZXIoe1xyXG4gICAgICBuYW1lOiAnYXRvbS1oYXNrZWxsLWhzZGV2JyxcclxuICAgICAgbWVudTogbWFpbk1lbnUsXHJcbiAgICAgIG1lc3NhZ2VUeXBlczogbXNnVHlwZXMsXHJcbiAgICAgIHRvb2x0aXA6IHRoaXMuc2hvdWxkU2hvd1Rvb2x0aXAuYmluZCh0aGlzKSxcclxuICAgICAgZXZlbnRzOiB7XHJcbiAgICAgICAgLy8gb25EaWRTYXZlQnVmZmVyOiBhc3luYyAoYnVmZmVyKSA9PlxyXG4gICAgICAgIC8vICAgdGhpcy5jaGVja0xpbnQoYnVmZmVyLCAnU2F2ZScsIGF0b20uY29uZmlnLmdldCgnYXRvbS1oYXNrZWxsLWhzZGV2LmFsd2F5c0ludGVyYWN0aXZlQ2hlY2snKSksXHJcbiAgICAgICAgLy8gb25EaWRTdG9wQ2hhbmdpbmc6IGFzeW5jIChidWZmZXIpID0+XHJcbiAgICAgICAgLy8gICB0aGlzLmNoZWNrTGludChidWZmZXIsICdDaGFuZ2UnLCB0cnVlKSxcclxuICAgICAgfSxcclxuICAgIH0pXHJcblxyXG4gICAgdGhpcy5kaXNwb3NhYmxlcy5hZGQoXHJcbiAgICAgIHRoaXMudXBpLFxyXG4gICAgICB0aGlzLnByb2Nlc3Mub25CYWNrZW5kQWN0aXZlKCgpID0+IHRoaXMudXBpLnNldFN0YXR1cyh7IHN0YXR1czogJ3Byb2dyZXNzJywgZGV0YWlsOiAnJyB9KSksXHJcbiAgICAgIHRoaXMucHJvY2Vzcy5vbkJhY2tlbmRJZGxlKCgpID0+IHRoaXMudXBpLnNldFN0YXR1cyh7IHN0YXR1czogJ3JlYWR5JywgZGV0YWlsOiAnJyB9KSksXHJcbiAgICAgIGF0b20uY29tbWFuZHMuYWRkKGNvbnRleHRTY29wZSwgdGhpcy5nbG9iYWxDb21tYW5kcyksXHJcbiAgICApXHJcbiAgICBjb25zdCBjbSA9IHt9XHJcbiAgICBjbVtjb250ZXh0U2NvcGVdID0gW3RoaXMuY29udGV4dE1lbnVdXHJcbiAgICB0aGlzLmRpc3Bvc2FibGVzLmFkZChhdG9tLmNvbnRleHRNZW51LmFkZChjbSkpXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgZGlzcG9zZSgpIHtcclxuICAgIHRoaXMuZGlzcG9zYWJsZXMuZGlzcG9zZSgpXHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHNob3VsZFNob3dUb29sdGlwKFxyXG4gICAgZWRpdG9yOiBUZXh0RWRpdG9yLCBjcmFuZ2U6IFJhbmdlLCB0eXBlOiBVUEkuVEV2ZW50UmFuZ2VUeXBlLFxyXG4gICk6IFByb21pc2U8VVBJLklUb29sdGlwRGF0YSB8IHVuZGVmaW5lZD4ge1xyXG4gICAgY29uc3QgbiA9IHR5cGUgPT09ICdtb3VzZScgPyAnYXRvbS1oYXNrZWxsLWhzZGV2Lm9uTW91c2VIb3ZlclNob3cnXHJcbiAgICAgICAgICAgIDogdHlwZSA9PT0gJ3NlbGVjdGlvbicgPyAnYXRvbS1oYXNrZWxsLWhzZGV2Lm9uU2VsZWN0aW9uU2hvdydcclxuICAgICAgICAgICAgOiB1bmRlZmluZWRcclxuICAgIGNvbnN0IHQgPSBuICYmIGF0b20uY29uZmlnLmdldChuKVxyXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLXVuc2FmZS1hbnlcclxuICAgIGlmICh0KSByZXR1cm4gdGhpc1tgJHt0fVRvb2x0aXBgXShlZGl0b3IsIGNyYW5nZSlcclxuICAgIGVsc2UgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH1cclxuXHJcbiAgQGhhbmRsZUV4Y2VwdGlvblxyXG4gIHByaXZhdGUgYXN5bmMgY2hlY2tDb21tYW5kKHsgY3VycmVudFRhcmdldCB9OiBURUNvbW1hbmRFdmVudCkge1xyXG4gIH1cclxuXHJcbiAgQGhhbmRsZUV4Y2VwdGlvblxyXG4gIHByaXZhdGUgYXN5bmMgbGludENvbW1hbmQoeyBjdXJyZW50VGFyZ2V0IH06IFRFQ29tbWFuZEV2ZW50KSB7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHBpbmdDb21tYW5kKHsgY3VycmVudFRhcmdldCB9OiBURUNvbW1hbmRFdmVudCkge1xyXG4gICAgdGhpcy5wcm9jZXNzLmRvUGluZygpXHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHRvb2x0aXBDb21tYW5kKHRvb2x0aXBmdW46IChlOiBUZXh0RWRpdG9yLCBwOiBSYW5nZSkgPT4gUHJvbWlzZTxVUEkuSVRvb2x0aXBEYXRhPikge1xyXG4gICAgcmV0dXJuIGFzeW5jICh7IGN1cnJlbnRUYXJnZXQsIGRldGFpbCB9OiBURUNvbW1hbmRFdmVudCkgPT5cclxuICAgICAgdGhpcy51cGkuc2hvd1Rvb2x0aXAoe1xyXG4gICAgICAgIGVkaXRvcjogY3VycmVudFRhcmdldC5nZXRNb2RlbCgpLFxyXG4gICAgICAgIGRldGFpbCxcclxuICAgICAgICBhc3luYyB0b29sdGlwKGNyYW5nZSkge1xyXG4gICAgICAgICAgcmV0dXJuIHRvb2x0aXBmdW4oY3VycmVudFRhcmdldC5nZXRNb2RlbCgpLCBjcmFuZ2UpXHJcbiAgICAgICAgfSxcclxuICAgICAgfSlcclxuICB9XHJcblxyXG4gIEBoYW5kbGVFeGNlcHRpb25cclxuICBwcml2YXRlIGFzeW5jIGdvVG9EZWNsQ29tbWFuZCh7IGN1cnJlbnRUYXJnZXQsIGRldGFpbCB9OiBURUNvbW1hbmRFdmVudCkge1xyXG4gICAgY29uc3QgZWRpdG9yID0gY3VycmVudFRhcmdldC5nZXRNb2RlbCgpXHJcbiAgICBjb25zdCBldnIgPSB0aGlzLnVwaS5nZXRFdmVudFJhbmdlKGVkaXRvciwgZGV0YWlsKVxyXG4gICAgaWYgKCFldnIpIHsgcmV0dXJuIH1cclxuICAgIGNvbnN0IHsgY3JhbmdlIH0gPSBldnJcclxuICAgIGNvbnN0IHN5bWJvbHM6IGFueVtdID0gYXdhaXQgdGhpcy5wcm9jZXNzLmJhY2tlbmQud2hvYXQoZWRpdG9yLmdldEJ1ZmZlcigpLmdldFVyaSgpLCBjcmFuZ2Uuc3RhcnQucm93ICsgMSwgY3JhbmdlLnN0YXJ0LmNvbHVtbiArIDEpXHJcbiAgICBpZiAoc3ltYm9scy5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGNvbnN0IHN5bSA9IHN5bWJvbHNbMF1cclxuICAgICAgaWYgKHN5bS5wb3MgJiYgc3ltLmlkLm1vZHVsZS5sb2NhdGlvbi5maWxlKSB7XHJcbiAgICAgICAgYXdhaXQgYXRvbS53b3Jrc3BhY2Uub3BlbihzeW0uaWQubW9kdWxlLmxvY2F0aW9uLmZpbGUsIHtcclxuICAgICAgICAgIGluaXRpYWxMaW5lOiBzeW0ucG9zLmxpbmUgLSAxLFxyXG4gICAgICAgICAgaW5pdGlhbENvbHVtbjogc3ltLnBvcy5jb2x1bW4gLSAxLFxyXG4gICAgICAgIH0pXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgd2hvYXRUb29sdGlwKGU6IFRleHRFZGl0b3IsIHA6IFJhbmdlKSB7XHJcbiAgICAvLyBGSVhNRTogRG9uJ3Qgc2NhbiBoZXJlXHJcbiAgICBhd2FpdCB0aGlzLnByb2Nlc3MuYmFja2VuZC5zY2FuRmlsZShlLmdldEJ1ZmZlcigpLmdldFVyaSgpKVxyXG4gICAgdGhpcy5wcm9jZXNzLmJhY2tlbmQuaW5mZXIoW2UuZ2V0QnVmZmVyKCkuZ2V0VXJpKCldKVxyXG4gICAgbGV0IGlyYW5nZTogUmFuZ2UgPSBwXHJcbiAgICBsZXQgaW5mbzogc3RyaW5nID0gJydcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IHRoaXMucHJvY2Vzcy53aG9hdChlLmdldEJ1ZmZlcigpLCBwKVxyXG4gICAgICBpcmFuZ2UgPSByZXMucmFuZ2VcclxuICAgICAgaW5mbyA9IHJlcy5pbmZvXHJcbiAgICB9XHJcbiAgICBjYXRjaCAoX2Vycikge1xyXG4gICAgICBsZXQgd29yZDogc3RyaW5nIHwgdW5kZWZpbmVkXHJcbiAgICAgIFV0aWwuZGVidWcoYHJhbmdlOiAke3B9YClcclxuICAgICAgVXRpbC5kZWJ1ZyhgbGluZSByYW5nZTogJHtlLnJhbmdlRm9yUm93KHAuc3RhcnQucm93LCBmYWxzZSl9YClcclxuICAgICAgZS5zY2FuSW5SYW5nZSgvXFx3Ky8sIGUucmFuZ2VGb3JSb3cocC5zdGFydC5yb3cpLCB1bmRlZmluZWQsIChfbWF0Y2g6IFJlZ0V4cCwgbWF0Y2hUZXh0OiBzdHJpbmcsIHJhbmdlOiBSYW5nZSwgX3N0b3A6ICgpID0+IHZvaWQsIF9yZXBsYWNlOiAoX3dpdGg6IHN0cmluZykgPT4gdm9pZCwgX2xlYWRpbmdDb250ZXh0TGluZXMsIF90cmFpbGluZ0NvbnRleHRMaW5lcykgPT4ge1xyXG4gICAgICAgIFV0aWwuZGVidWcoYG1hdGNoZWQgJHttYXRjaFRleHR9IGF0ICR7cmFuZ2V9YClcclxuICAgICAgICBpZiAocmFuZ2UuY29udGFpbnNSYW5nZShwKSkge1xyXG4gICAgICAgICAgc3RvcCgpXHJcbiAgICAgICAgICB3b3JkID0gbWF0Y2hUZXh0XHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgICBpZiAod29yZCkge1xyXG4gICAgICAgIFV0aWwuZGVidWcoYHdvcmQgdW5kZXIgY3Vyc29yOiAke3dvcmR9YClcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmFuZ2U6IGlyYW5nZSxcclxuICAgICAgdGV4dDoge1xyXG4gICAgICAgIHRleHQ6IGluZm8sXHJcbiAgICAgICAgaGlnaGxpZ2h0ZXI6IGF0b20uY29uZmlnLmdldCgnYXRvbS1oYXNrZWxsLWhzZGV2LmhpZ2hsaWdodFRvb2x0aXBzJykgP1xyXG4gICAgICAgICAgJ3NvdXJjZS5oYXNrZWxsJyA6IHVuZGVmaW5lZCxcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBzZXRIaWdobGlnaHRlcigpIHtcclxuICAgIGlmIChhdG9tLmNvbmZpZy5nZXQoJ2F0b20taGFza2VsbC1oc2Rldi5oaWdobGlnaHRNZXNzYWdlcycpKSB7XHJcbiAgICAgIHJldHVybiAobTogVVBJLklSZXN1bHRJdGVtKTogVVBJLklSZXN1bHRJdGVtID0+IHtcclxuICAgICAgICBpZiAodHlwZW9mIG0ubWVzc2FnZSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgIGNvbnN0IG1lc3NhZ2U6IFVQSS5JTWVzc2FnZVRleHQgPSB7XHJcbiAgICAgICAgICAgIHRleHQ6IG0ubWVzc2FnZSxcclxuICAgICAgICAgICAgaGlnaGxpZ2h0ZXI6ICdoaW50Lm1lc3NhZ2UuaGFza2VsbCcsXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4geyAuLi5tLCBtZXNzYWdlIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgcmV0dXJuIG1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiAobTogVVBJLklSZXN1bHRJdGVtKSA9PiBtXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHNldE1lc3NhZ2VzKG1lc3NhZ2VzOiBVUEkuSVJlc3VsdEl0ZW1bXSkge1xyXG4gICAgdGhpcy5sYXN0TWVzc2FnZXMgPSBtZXNzYWdlcy5tYXAodGhpcy5zZXRIaWdobGlnaHRlcigpKVxyXG4gICAgdGhpcy5zZW5kTWVzc2FnZXMoKVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBzZW5kTWVzc2FnZXMoKSB7XHJcbiAgICB0aGlzLnVwaS5zZXRNZXNzYWdlcyh0aGlzLnByb2Nlc3NNZXNzYWdlcy5jb25jYXQodGhpcy5sYXN0TWVzc2FnZXMpKVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjb25zb2xlUmVwb3J0KGFyZzogSUVycm9yQ2FsbGJhY2tBcmdzKSB7XHJcbiAgICAvLyB0c2xpbnQ6ZGlzYmFsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcclxuICAgIGNvbnNvbGUuZXJyb3IoVXRpbC5mb3JtYXRFcnJvcihhcmcpLCBVdGlsLmdldEVycm9yRGV0YWlsKGFyZykpXHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGhhbmRsZVByb2Nlc3NFcnJvcihhcmc6IElFcnJvckNhbGxiYWNrQXJncykge1xyXG4gICAgc3dpdGNoICh0aGlzLm1zZ0JhY2tlbmQpIHtcclxuICAgICAgY2FzZSAndXBpJzpcclxuICAgICAgICB0aGlzLnByb2Nlc3NNZXNzYWdlcy5wdXNoKHtcclxuICAgICAgICAgIG1lc3NhZ2U6IFV0aWwuZm9ybWF0RXJyb3IoYXJnKVxyXG4gICAgICAgICAgKyAnXFxuXFxuU2VlIGNvbnNvbGUgKFZpZXcg4oaSIERldmVsb3BlciDihpIgVG9nZ2xlIERldmVsb3BlciBUb29scyDihpIgQ29uc29sZSB0YWIpIGZvciBkZXRhaWxzLicsXHJcbiAgICAgICAgICBzZXZlcml0eTogJ2hzZGV2JyxcclxuICAgICAgICB9KVxyXG4gICAgICAgIHRoaXMuY29uc29sZVJlcG9ydChhcmcpXHJcbiAgICAgICAgdGhpcy5zZW5kTWVzc2FnZXMoKVxyXG4gICAgICAgIGJyZWFrXHJcbiAgICAgIGNhc2UgJ2NvbnNvbGUnOlxyXG4gICAgICAgIHRoaXMuY29uc29sZVJlcG9ydChhcmcpXHJcbiAgICAgICAgYnJlYWtcclxuICAgICAgY2FzZSAncG9wdXAnOlxyXG4gICAgICAgIHRoaXMuY29uc29sZVJlcG9ydChhcmcpXHJcbiAgICAgICAgYXRvbS5ub3RpZmljYXRpb25zLmFkZEVycm9yKFV0aWwuZm9ybWF0RXJyb3IoYXJnKSwge1xyXG4gICAgICAgICAgZGV0YWlsOiBVdGlsLmdldEVycm9yRGV0YWlsKGFyZyksXHJcbiAgICAgICAgICBkaXNtaXNzYWJsZTogdHJ1ZSxcclxuICAgICAgICB9KVxyXG4gICAgICAgIGJyZWFrXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGhhbmRsZVByb2Nlc3NXYXJuaW5nKHdhcm5pbmc6IHN0cmluZykge1xyXG4gICAgc3dpdGNoICh0aGlzLm1zZ0JhY2tlbmQpIHtcclxuICAgICAgY2FzZSAndXBpJzpcclxuICAgICAgICB0aGlzLnByb2Nlc3NNZXNzYWdlcy5wdXNoKHtcclxuICAgICAgICAgIG1lc3NhZ2U6IHdhcm5pbmcsXHJcbiAgICAgICAgICBzZXZlcml0eTogJ2hzZGV2JyxcclxuICAgICAgICB9KVxyXG4gICAgICAgIFV0aWwud2Fybih3YXJuaW5nKVxyXG4gICAgICAgIHRoaXMuc2VuZE1lc3NhZ2VzKClcclxuICAgICAgICBicmVha1xyXG4gICAgICBjYXNlICdjb25zb2xlJzpcclxuICAgICAgICBVdGlsLndhcm4od2FybmluZylcclxuICAgICAgICBicmVha1xyXG4gICAgICBjYXNlICdwb3B1cCc6XHJcbiAgICAgICAgVXRpbC53YXJuKHdhcm5pbmcpXHJcbiAgICAgICAgYXRvbS5ub3RpZmljYXRpb25zLmFkZFdhcm5pbmcod2FybmluZywge1xyXG4gICAgICAgICAgZGlzbWlzc2FibGU6IGZhbHNlLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgYnJlYWtcclxuICAgIH1cclxuICB9XHJcbn1cclxuIl19