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
        { label: 'Check', command: 'atom-haskell-hsdev:check-file' },
        { label: 'Lint', command: 'atom-haskell-hsdev:lint-file' },
        { label: 'Check & Lint', command: 'atom-haskell-hsdev:check-lint-file' },
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
        this.globalCommands = Object.assign({ 'atom-haskell-hsdev:check-file': this.checkCommand.bind(this), 'atom-haskell-hsdev:lint-file': this.lintCommand.bind(this), 'atom-haskell-hsdev:check-lint-file': this.checkLintCommand.bind(this), 'atom-haskell-hsdev:ping': this.pingCommand.bind(this) }, this.contextCommands);
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
            events: {
                onDidSaveBuffer: async (buffer) => this.checkLint(buffer, 'Save'),
            },
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
        const editor = currentTarget.getModel();
        const messages = await this.process.check(editor.getBuffer());
        this.setMessages(messages);
    }
    async lintCommand({ currentTarget }) {
        const editor = currentTarget.getModel();
        const messages = await this.process.lint(editor.getBuffer());
        this.setMessages(messages);
    }
    async checkLintCommand({ currentTarget }) {
        const editor = currentTarget.getModel();
        const messages = await this.process.checkAndLint(editor.getBuffer());
        this.setMessages(messages);
    }
    async pingCommand({ _currentTarget }) {
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
        const file = e.getBuffer().getUri();
        this.process.backend.scanFile({ file }, this.statusCallbacks(`Inspecting ${file} with dependencies`, (error, details) => `Error inspecting ${file}: ${error}, details: ${JSON.stringify(details)}`, `File ${file} inspected`, () => {
            this.process.backend.infer([e.getBuffer().getUri()], this.statusCallbacks(`Inferring types for ${file}`, (error, details) => `Error inferring types for ${file}: ${error}, details: ${JSON.stringify(details)}`, `Types for ${file} inferred`));
        }));
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
    async checkLint(buffer, opt) {
        const check = atom.config.get(`atom-haskell-hsdev.on${opt}Check`);
        const lint = atom.config.get(`atom-haskell-hsdev.on${opt}Lint`);
        let res;
        if (check && lint) {
            res = await this.process.checkAndLint(buffer);
        }
        else if (check) {
            res = await this.process.check(buffer);
        }
        else if (lint) {
            res = await this.process.lint(buffer);
        }
        if (res) {
            this.setMessages(res);
        }
    }
    statusCallbacks(progress, failure, success, onSuccess) {
        return {
            onNotify: (_notification) => {
                this.upi.setStatus({ status: 'progress', detail: progress });
            },
            onError: (error, details) => {
                this.upi.setStatus({ status: 'error', detail: failure(error, details) });
            },
            onResponse: (_response) => {
                this.upi.setStatus({ status: 'ready', detail: success });
                if (onSuccess) {
                    onSuccess();
                }
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
], UPIConsumer.prototype, "checkLintCommand", null);
tslib_1.__decorate([
    handleException,
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_d = typeof TECommandEvent !== "undefined" && TECommandEvent) === "function" && _d || Object]),
    tslib_1.__metadata("design:returntype", Promise)
], UPIConsumer.prototype, "goToDeclCommand", null);
exports.UPIConsumer = UPIConsumer;
var _a, _b, _c, _d;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBpLWNvbnN1bWVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3VwaS1jb25zdW1lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwrQkFBaUg7QUFHakgsK0JBQThCO0FBRTlCLE1BQU0sRUFBRSxlQUFlLEVBQUUsR0FBRyxJQUFJLENBQUE7QUFFaEMsTUFBTSxZQUFZLEdBQUc7SUFDbkIsS0FBSyxFQUFFLEVBQUU7SUFDVCxPQUFPLEVBQUUsRUFBRTtJQUNYLElBQUksRUFBRSxFQUFFO0NBQ1QsQ0FBQTtBQUVELE1BQU0sV0FBVyxHQUFHO0lBQ2xCLE9BQU8sRUFBRTtRQUNQLFNBQVMsRUFBRSxLQUFLO1FBQ2hCLFVBQVUsRUFBRSxJQUFJO0tBQ2pCO0NBQ0YsQ0FBQTtBQUVELE1BQU0sWUFBWSxHQUFHLDJDQUEyQyxDQUFBO0FBRWhFLE1BQU0sUUFBUSxHQUFHO0lBQ2YsS0FBSyxFQUFFLE9BQU87SUFDZCxJQUFJLEVBQUU7UUFDSixFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFO1FBQ3JELEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsK0JBQStCLEVBQUU7UUFDNUQsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRTtRQUMxRCxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsT0FBTyxFQUFFLG9DQUFvQyxFQUFFO0tBQ3pFO0NBQ0YsQ0FBQTtBQUlEO0lBK0JFLFlBQVksUUFBOEIsRUFBVSxPQUFxQjtRQUFyQixZQUFPLEdBQVAsT0FBTyxDQUFjO1FBN0JqRSxnQkFBVyxHQUF3QixJQUFJLDBCQUFtQixFQUFFLENBQUE7UUFDNUQsb0JBQWUsR0FBc0IsRUFBRSxDQUFBO1FBQ3ZDLGlCQUFZLEdBQXNCLEVBQUUsQ0FBQTtRQUNwQyxlQUFVLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLENBQUMsQ0FB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LElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLEtBQUssS0FBSztnQkFDUixJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQztvQkFDeEIsT0FBTyxFQUFFLE9BQU87b0JBQ2hCLFFBQVEsRUFBRSxPQUFPO2lCQUNsQixDQUFDLENBQUE7Z0JBQ0YsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDbEIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO2dCQUNuQixLQUFLLENBQUE7WUFDUCxLQUFLLFNBQVM7Z0JBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDbEIsS0FBSyxDQUFBO1lBQ1AsS0FBSyxPQUFPO2dCQUNWLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7Z0JBQ2xCLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRTtvQkFDckMsV0FBVyxFQUFFLEtBQUs7aUJBQ25CLENBQUMsQ0FBQTtnQkFDRixLQUFLLENBQUE7UUFDVCxDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBM05DO0lBREMsZUFBZTs7aUVBQzhCLGNBQWMsb0JBQWQsY0FBYzs7K0NBSTNEO0FBR0Q7SUFEQyxlQUFlOztpRUFDNkIsY0FBYyxvQkFBZCxjQUFjOzs4Q0FJMUQ7QUFHRDtJQURDLGVBQWU7O2lFQUNrQyxjQUFjLG9CQUFkLGNBQWM7O21EQUkvRDtBQWtCRDtJQURDLGVBQWU7O2lFQUN5QyxjQUFjLG9CQUFkLGNBQWM7O2tEQWV0RTtBQXRJSCxrQ0E4U0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21tYW5kRXZlbnQsIENvbXBvc2l0ZURpc3Bvc2FibGUsIFJhbmdlLCBUZXh0QnVmZmVyLCBUZXh0RWRpdG9yLCBQb2ludCwgVGV4dEVkaXRvckVsZW1lbnQgfSBmcm9tICdhdG9tJ1xyXG5pbXBvcnQgeyBIc0RldlByb2Nlc3MsIElFcnJvckNhbGxiYWNrQXJncywgQ2FsbGJhY2tzIH0gZnJvbSAnLi9oc2RldidcclxuaW1wb3J0IHsgaW1wb3J0TGlzdFZpZXcgfSBmcm9tICcuL3ZpZXdzL2ltcG9ydC1saXN0LXZpZXcnXHJcbmltcG9ydCAqIGFzIFV0aWwgZnJvbSAnLi91dGlsJ1xyXG5pbXBvcnQgKiBhcyBVUEkgZnJvbSAnYXRvbS1oYXNrZWxsLXVwaSdcclxuY29uc3QgeyBoYW5kbGVFeGNlcHRpb24gfSA9IFV0aWxcclxuXHJcbmNvbnN0IG1lc3NhZ2VUeXBlcyA9IHtcclxuICBlcnJvcjoge30sXHJcbiAgd2FybmluZzoge30sXHJcbiAgbGludDoge30sXHJcbn1cclxuXHJcbmNvbnN0IGFkZE1zZ1R5cGVzID0ge1xyXG4gICdoc2Rldic6IHtcclxuICAgIHVyaUZpbHRlcjogZmFsc2UsXHJcbiAgICBhdXRvU2Nyb2xsOiB0cnVlLFxyXG4gIH0sXHJcbn1cclxuXHJcbmNvbnN0IGNvbnRleHRTY29wZSA9ICdhdG9tLXRleHQtZWRpdG9yW2RhdGEtZ3JhbW1hcn49XCJoYXNrZWxsXCJdJ1xyXG5cclxuY29uc3QgbWFpbk1lbnUgPSB7XHJcbiAgbGFiZWw6ICdoc2RldicsXHJcbiAgbWVudTogW1xyXG4gICAgeyBsYWJlbDogJ1BpbmcnLCBjb21tYW5kOiAnYXRvbS1oYXNrZWxsLWhzZGV2OnBpbmcnIH0sXHJcbiAgICB7IGxhYmVsOiAnQ2hlY2snLCBjb21tYW5kOiAnYXRvbS1oYXNrZWxsLWhzZGV2OmNoZWNrLWZpbGUnIH0sXHJcbiAgICB7IGxhYmVsOiAnTGludCcsIGNvbW1hbmQ6ICdhdG9tLWhhc2tlbGwtaHNkZXY6bGludC1maWxlJyB9LFxyXG4gICAgeyBsYWJlbDogJ0NoZWNrICYgTGludCcsIGNvbW1hbmQ6ICdhdG9tLWhhc2tlbGwtaHNkZXY6Y2hlY2stbGludC1maWxlJyB9LFxyXG4gIF0sXHJcbn1cclxuXHJcbnR5cGUgVEVDb21tYW5kRXZlbnQgPSBDb21tYW5kRXZlbnQ8VGV4dEVkaXRvckVsZW1lbnQ+XHJcblxyXG5leHBvcnQgY2xhc3MgVVBJQ29uc3VtZXIge1xyXG4gIHB1YmxpYyB1cGk6IFVQSS5JVVBJSW5zdGFuY2VcclxuICBwcml2YXRlIGRpc3Bvc2FibGVzOiBDb21wb3NpdGVEaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKVxyXG4gIHByaXZhdGUgcHJvY2Vzc01lc3NhZ2VzOiBVUEkuSVJlc3VsdEl0ZW1bXSA9IFtdXHJcbiAgcHJpdmF0ZSBsYXN0TWVzc2FnZXM6IFVQSS5JUmVzdWx0SXRlbVtdID0gW11cclxuICBwcml2YXRlIG1zZ0JhY2tlbmQgPSBhdG9tLmNvbmZpZy5nZXQoJ2F0b20taGFza2VsbC1oc2Rldi5naGNNb2RNZXNzYWdlcycpXHJcblxyXG4gIHByaXZhdGUgY29udGV4dENvbW1hbmRzID0ge1xyXG4gICAgJ2F0b20taGFza2VsbC1oc2Rldjp3aG9hdCc6IHRoaXMudG9vbHRpcENvbW1hbmQodGhpcy53aG9hdFRvb2x0aXAuYmluZCh0aGlzKSksXHJcbiAgICAnYXRvbS1oYXNrZWxsLWhzZGV2OmdvLXRvLWRlY2xhcmF0aW9uJzogdGhpcy5nb1RvRGVjbENvbW1hbmQuYmluZCh0aGlzKSxcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZ2xvYmFsQ29tbWFuZHMgPSB7XHJcbiAgICAnYXRvbS1oYXNrZWxsLWhzZGV2OmNoZWNrLWZpbGUnOiB0aGlzLmNoZWNrQ29tbWFuZC5iaW5kKHRoaXMpLFxyXG4gICAgJ2F0b20taGFza2VsbC1oc2RldjpsaW50LWZpbGUnOiB0aGlzLmxpbnRDb21tYW5kLmJpbmQodGhpcyksXHJcbiAgICAnYXRvbS1oYXNrZWxsLWhzZGV2OmNoZWNrLWxpbnQtZmlsZSc6IHRoaXMuY2hlY2tMaW50Q29tbWFuZC5iaW5kKHRoaXMpLFxyXG4gICAgJ2F0b20taGFza2VsbC1oc2RldjpwaW5nJzogdGhpcy5waW5nQ29tbWFuZC5iaW5kKHRoaXMpLFxyXG4gICAgLi4udGhpcy5jb250ZXh0Q29tbWFuZHMsXHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNvbnRleHRNZW51OiB7XHJcbiAgICBsYWJlbDogc3RyaW5nLCBzdWJtZW51OiBBcnJheTx7IGxhYmVsOiBzdHJpbmcsIGNvbW1hbmQ6IGtleW9mIFVQSUNvbnN1bWVyWydjb250ZXh0Q29tbWFuZHMnXSB9PlxyXG4gIH0gPSB7XHJcbiAgICBsYWJlbDogJ2hzZGV2JyxcclxuICAgIHN1Ym1lbnU6XHJcbiAgICBbXHJcbiAgICAgIHsgbGFiZWw6ICdXaG9hdCcsIGNvbW1hbmQ6ICdhdG9tLWhhc2tlbGwtaHNkZXY6d2hvYXQnIH0sXHJcbiAgICAgIHsgbGFiZWw6ICdHbyBUbyBEZWNsYXJhdGlvbicsIGNvbW1hbmQ6ICdhdG9tLWhhc2tlbGwtaHNkZXY6Z28tdG8tZGVjbGFyYXRpb24nIH0sXHJcbiAgICBdLFxyXG4gIH1cclxuXHJcbiAgY29uc3RydWN0b3IocmVnaXN0ZXI6IFVQSS5JVVBJUmVnaXN0cmF0aW9uLCBwcml2YXRlIHByb2Nlc3M6IEhzRGV2UHJvY2Vzcykge1xyXG4gICAgdGhpcy5kaXNwb3NhYmxlcy5hZGQoXHJcbiAgICAgIHRoaXMucHJvY2Vzcy5vbkVycm9yKHRoaXMuaGFuZGxlUHJvY2Vzc0Vycm9yLmJpbmQodGhpcykpLFxyXG4gICAgICB0aGlzLnByb2Nlc3Mub25XYXJuaW5nKHRoaXMuaGFuZGxlUHJvY2Vzc1dhcm5pbmcuYmluZCh0aGlzKSksXHJcbiAgICApXHJcblxyXG4gICAgY29uc3QgbXNnVHlwZXMgPVxyXG4gICAgICB0aGlzLm1zZ0JhY2tlbmQgPT09ICd1cGknXHJcbiAgICAgICAgPyB7IC4uLm1lc3NhZ2VUeXBlcywgLi4uYWRkTXNnVHlwZXMgfVxyXG4gICAgICAgIDogbWVzc2FnZVR5cGVzXHJcblxyXG4gICAgdGhpcy51cGkgPSByZWdpc3Rlcih7XHJcbiAgICAgIG5hbWU6ICdhdG9tLWhhc2tlbGwtaHNkZXYnLFxyXG4gICAgICBtZW51OiBtYWluTWVudSxcclxuICAgICAgbWVzc2FnZVR5cGVzOiBtc2dUeXBlcyxcclxuICAgICAgdG9vbHRpcDogdGhpcy5zaG91bGRTaG93VG9vbHRpcC5iaW5kKHRoaXMpLFxyXG4gICAgICBldmVudHM6IHtcclxuICAgICAgICBvbkRpZFNhdmVCdWZmZXI6IGFzeW5jIChidWZmZXIpID0+XHJcbiAgICAgICAgICB0aGlzLmNoZWNrTGludChidWZmZXIsICdTYXZlJyksXHJcbiAgICAgICAgLy8gb25EaWRTdG9wQ2hhbmdpbmc6IGFzeW5jIChidWZmZXIpID0+XHJcbiAgICAgICAgLy8gICB0aGlzLmNoZWNrTGludChidWZmZXIsICdDaGFuZ2UnLCB0cnVlKSxcclxuICAgICAgfSxcclxuICAgIH0pXHJcblxyXG4gICAgdGhpcy5kaXNwb3NhYmxlcy5hZGQoXHJcbiAgICAgIHRoaXMudXBpLFxyXG4gICAgICB0aGlzLnByb2Nlc3Mub25CYWNrZW5kQWN0aXZlKCgpID0+IHRoaXMudXBpLnNldFN0YXR1cyh7IHN0YXR1czogJ3Byb2dyZXNzJywgZGV0YWlsOiAnJyB9KSksXHJcbiAgICAgIHRoaXMucHJvY2Vzcy5vbkJhY2tlbmRJZGxlKCgpID0+IHRoaXMudXBpLnNldFN0YXR1cyh7IHN0YXR1czogJ3JlYWR5JywgZGV0YWlsOiAnJyB9KSksXHJcbiAgICAgIGF0b20uY29tbWFuZHMuYWRkKGNvbnRleHRTY29wZSwgdGhpcy5nbG9iYWxDb21tYW5kcyksXHJcbiAgICApXHJcbiAgICBjb25zdCBjbSA9IHt9XHJcbiAgICBjbVtjb250ZXh0U2NvcGVdID0gW3RoaXMuY29udGV4dE1lbnVdXHJcbiAgICB0aGlzLmRpc3Bvc2FibGVzLmFkZChhdG9tLmNvbnRleHRNZW51LmFkZChjbSkpXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgZGlzcG9zZSgpIHtcclxuICAgIHRoaXMuZGlzcG9zYWJsZXMuZGlzcG9zZSgpXHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHNob3VsZFNob3dUb29sdGlwKFxyXG4gICAgZWRpdG9yOiBUZXh0RWRpdG9yLCBjcmFuZ2U6IFJhbmdlLCB0eXBlOiBVUEkuVEV2ZW50UmFuZ2VUeXBlLFxyXG4gICk6IFByb21pc2U8VVBJLklUb29sdGlwRGF0YSB8IHVuZGVmaW5lZD4ge1xyXG4gICAgY29uc3QgbiA9IHR5cGUgPT09ICdtb3VzZScgPyAnYXRvbS1oYXNrZWxsLWhzZGV2Lm9uTW91c2VIb3ZlclNob3cnXHJcbiAgICAgICAgICAgIDogdHlwZSA9PT0gJ3NlbGVjdGlvbicgPyAnYXRvbS1oYXNrZWxsLWhzZGV2Lm9uU2VsZWN0aW9uU2hvdydcclxuICAgICAgICAgICAgOiB1bmRlZmluZWRcclxuICAgIGNvbnN0IHQgPSBuICYmIGF0b20uY29uZmlnLmdldChuKVxyXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLXVuc2FmZS1hbnlcclxuICAgIGlmICh0KSByZXR1cm4gdGhpc1tgJHt0fVRvb2x0aXBgXShlZGl0b3IsIGNyYW5nZSlcclxuICAgIGVsc2UgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH1cclxuXHJcbiAgQGhhbmRsZUV4Y2VwdGlvblxyXG4gIHByaXZhdGUgYXN5bmMgY2hlY2tDb21tYW5kKHsgY3VycmVudFRhcmdldCB9OiBURUNvbW1hbmRFdmVudCkge1xyXG4gICAgY29uc3QgZWRpdG9yID0gY3VycmVudFRhcmdldC5nZXRNb2RlbCgpXHJcbiAgICBjb25zdCBtZXNzYWdlcyA9IGF3YWl0IHRoaXMucHJvY2Vzcy5jaGVjayhlZGl0b3IuZ2V0QnVmZmVyKCkpXHJcbiAgICB0aGlzLnNldE1lc3NhZ2VzKG1lc3NhZ2VzKVxyXG4gIH1cclxuXHJcbiAgQGhhbmRsZUV4Y2VwdGlvblxyXG4gIHByaXZhdGUgYXN5bmMgbGludENvbW1hbmQoeyBjdXJyZW50VGFyZ2V0IH06IFRFQ29tbWFuZEV2ZW50KSB7XHJcbiAgICBjb25zdCBlZGl0b3IgPSBjdXJyZW50VGFyZ2V0LmdldE1vZGVsKClcclxuICAgIGNvbnN0IG1lc3NhZ2VzID0gYXdhaXQgdGhpcy5wcm9jZXNzLmxpbnQoZWRpdG9yLmdldEJ1ZmZlcigpKVxyXG4gICAgdGhpcy5zZXRNZXNzYWdlcyhtZXNzYWdlcylcclxuICB9XHJcblxyXG4gIEBoYW5kbGVFeGNlcHRpb25cclxuICBwcml2YXRlIGFzeW5jIGNoZWNrTGludENvbW1hbmQoeyBjdXJyZW50VGFyZ2V0IH06IFRFQ29tbWFuZEV2ZW50KSB7XHJcbiAgICBjb25zdCBlZGl0b3IgPSBjdXJyZW50VGFyZ2V0LmdldE1vZGVsKClcclxuICAgIGNvbnN0IG1lc3NhZ2VzID0gYXdhaXQgdGhpcy5wcm9jZXNzLmNoZWNrQW5kTGludChlZGl0b3IuZ2V0QnVmZmVyKCkpXHJcbiAgICB0aGlzLnNldE1lc3NhZ2VzKG1lc3NhZ2VzKVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBwaW5nQ29tbWFuZCh7IF9jdXJyZW50VGFyZ2V0IH06IFRFQ29tbWFuZEV2ZW50KSB7XHJcbiAgICB0aGlzLnByb2Nlc3MuZG9QaW5nKClcclxuICB9XHJcblxyXG4gIHByaXZhdGUgdG9vbHRpcENvbW1hbmQodG9vbHRpcGZ1bjogKGU6IFRleHRFZGl0b3IsIHA6IFJhbmdlKSA9PiBQcm9taXNlPFVQSS5JVG9vbHRpcERhdGE+KSB7XHJcbiAgICByZXR1cm4gYXN5bmMgKHsgY3VycmVudFRhcmdldCwgZGV0YWlsIH06IFRFQ29tbWFuZEV2ZW50KSA9PlxyXG4gICAgICB0aGlzLnVwaS5zaG93VG9vbHRpcCh7XHJcbiAgICAgICAgZWRpdG9yOiBjdXJyZW50VGFyZ2V0LmdldE1vZGVsKCksXHJcbiAgICAgICAgZGV0YWlsLFxyXG4gICAgICAgIGFzeW5jIHRvb2x0aXAoY3JhbmdlKSB7XHJcbiAgICAgICAgICByZXR1cm4gdG9vbHRpcGZ1bihjdXJyZW50VGFyZ2V0LmdldE1vZGVsKCksIGNyYW5nZSlcclxuICAgICAgICB9LFxyXG4gICAgICB9KVxyXG4gIH1cclxuXHJcbiAgQGhhbmRsZUV4Y2VwdGlvblxyXG4gIHByaXZhdGUgYXN5bmMgZ29Ub0RlY2xDb21tYW5kKHsgY3VycmVudFRhcmdldCwgZGV0YWlsIH06IFRFQ29tbWFuZEV2ZW50KSB7XHJcbiAgICBjb25zdCBlZGl0b3IgPSBjdXJyZW50VGFyZ2V0LmdldE1vZGVsKClcclxuICAgIGNvbnN0IGV2ciA9IHRoaXMudXBpLmdldEV2ZW50UmFuZ2UoZWRpdG9yLCBkZXRhaWwpXHJcbiAgICBpZiAoIWV2cikgeyByZXR1cm4gfVxyXG4gICAgY29uc3QgeyBjcmFuZ2UgfSA9IGV2clxyXG4gICAgY29uc3Qgc3ltYm9sczogYW55W10gPSBhd2FpdCB0aGlzLnByb2Nlc3MuYmFja2VuZC53aG9hdChlZGl0b3IuZ2V0QnVmZmVyKCkuZ2V0VXJpKCksIGNyYW5nZS5zdGFydC5yb3cgKyAxLCBjcmFuZ2Uuc3RhcnQuY29sdW1uICsgMSlcclxuICAgIGlmIChzeW1ib2xzLmxlbmd0aCA+IDApIHtcclxuICAgICAgY29uc3Qgc3ltID0gc3ltYm9sc1swXVxyXG4gICAgICBpZiAoc3ltLnBvcyAmJiBzeW0uaWQubW9kdWxlLmxvY2F0aW9uLmZpbGUpIHtcclxuICAgICAgICBhd2FpdCBhdG9tLndvcmtzcGFjZS5vcGVuKHN5bS5pZC5tb2R1bGUubG9jYXRpb24uZmlsZSwge1xyXG4gICAgICAgICAgaW5pdGlhbExpbmU6IHN5bS5wb3MubGluZSAtIDEsXHJcbiAgICAgICAgICBpbml0aWFsQ29sdW1uOiBzeW0ucG9zLmNvbHVtbiAtIDEsXHJcbiAgICAgICAgfSlcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyB3aG9hdFRvb2x0aXAoZTogVGV4dEVkaXRvciwgcDogUmFuZ2UpIHtcclxuICAgIC8vIEZJWE1FOiBEb24ndCBzY2FuIGhlcmVcclxuICAgIGNvbnN0IGZpbGUgPSBlLmdldEJ1ZmZlcigpLmdldFVyaSgpXHJcbiAgICB0aGlzLnByb2Nlc3MuYmFja2VuZC5zY2FuRmlsZSh7IGZpbGUgfSwgdGhpcy5zdGF0dXNDYWxsYmFja3MoXHJcbiAgICAgIGBJbnNwZWN0aW5nICR7ZmlsZX0gd2l0aCBkZXBlbmRlbmNpZXNgLFxyXG4gICAgICAoZXJyb3IsIGRldGFpbHMpID0+IGBFcnJvciBpbnNwZWN0aW5nICR7ZmlsZX06ICR7ZXJyb3J9LCBkZXRhaWxzOiAke0pTT04uc3RyaW5naWZ5KGRldGFpbHMpfWAsXHJcbiAgICAgIGBGaWxlICR7ZmlsZX0gaW5zcGVjdGVkYCxcclxuICAgICAgKCkgPT4ge1xyXG4gICAgICAgIHRoaXMucHJvY2Vzcy5iYWNrZW5kLmluZmVyKFtlLmdldEJ1ZmZlcigpLmdldFVyaSgpXSwgdGhpcy5zdGF0dXNDYWxsYmFja3MoXHJcbiAgICAgICAgICBgSW5mZXJyaW5nIHR5cGVzIGZvciAke2ZpbGV9YCxcclxuICAgICAgICAgIChlcnJvciwgZGV0YWlscykgPT4gYEVycm9yIGluZmVycmluZyB0eXBlcyBmb3IgJHtmaWxlfTogJHtlcnJvcn0sIGRldGFpbHM6ICR7SlNPTi5zdHJpbmdpZnkoZGV0YWlscyl9YCxcclxuICAgICAgICAgIGBUeXBlcyBmb3IgJHtmaWxlfSBpbmZlcnJlZGBcclxuICAgICAgICApKVxyXG4gICAgICB9XHJcbiAgICApKVxyXG4gICAgbGV0IGlyYW5nZTogUmFuZ2UgPSBwXHJcbiAgICBsZXQgaW5mbzogc3RyaW5nID0gJydcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IHRoaXMucHJvY2Vzcy53aG9hdChlLmdldEJ1ZmZlcigpLCBwKVxyXG4gICAgICBpcmFuZ2UgPSByZXMucmFuZ2VcclxuICAgICAgaW5mbyA9IHJlcy5pbmZvXHJcbiAgICB9XHJcbiAgICBjYXRjaCAoX2Vycikge1xyXG4gICAgICBsZXQgd29yZDogc3RyaW5nIHwgdW5kZWZpbmVkXHJcbiAgICAgIFV0aWwuZGVidWcoYHJhbmdlOiAke3B9YClcclxuICAgICAgVXRpbC5kZWJ1ZyhgbGluZSByYW5nZTogJHtlLnJhbmdlRm9yUm93KHAuc3RhcnQucm93LCBmYWxzZSl9YClcclxuICAgICAgZS5zY2FuSW5SYW5nZSgvXFx3Ky8sIGUucmFuZ2VGb3JSb3cocC5zdGFydC5yb3cpLCB1bmRlZmluZWQsIChfbWF0Y2g6IFJlZ0V4cCwgbWF0Y2hUZXh0OiBzdHJpbmcsIHJhbmdlOiBSYW5nZSwgX3N0b3A6ICgpID0+IHZvaWQsIF9yZXBsYWNlOiAoX3dpdGg6IHN0cmluZykgPT4gdm9pZCwgX2xlYWRpbmdDb250ZXh0TGluZXMsIF90cmFpbGluZ0NvbnRleHRMaW5lcykgPT4ge1xyXG4gICAgICAgIFV0aWwuZGVidWcoYG1hdGNoZWQgJHttYXRjaFRleHR9IGF0ICR7cmFuZ2V9YClcclxuICAgICAgICBpZiAocmFuZ2UuY29udGFpbnNSYW5nZShwKSkge1xyXG4gICAgICAgICAgc3RvcCgpXHJcbiAgICAgICAgICB3b3JkID0gbWF0Y2hUZXh0XHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgICBpZiAod29yZCkge1xyXG4gICAgICAgIFV0aWwuZGVidWcoYHdvcmQgdW5kZXIgY3Vyc29yOiAke3dvcmR9YClcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmFuZ2U6IGlyYW5nZSxcclxuICAgICAgdGV4dDoge1xyXG4gICAgICAgIHRleHQ6IGluZm8sXHJcbiAgICAgICAgaGlnaGxpZ2h0ZXI6IGF0b20uY29uZmlnLmdldCgnYXRvbS1oYXNrZWxsLWhzZGV2LmhpZ2hsaWdodFRvb2x0aXBzJykgP1xyXG4gICAgICAgICAgJ3NvdXJjZS5oYXNrZWxsJyA6IHVuZGVmaW5lZCxcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBjaGVja0xpbnQoYnVmZmVyOiBUZXh0QnVmZmVyLCBvcHQ6ICdTYXZlJyB8ICdDaGFuZ2UnKSB7XHJcbiAgICBjb25zdCBjaGVjayA9IGF0b20uY29uZmlnLmdldChcclxuICAgICAgYGF0b20taGFza2VsbC1oc2Rldi5vbiR7b3B0fUNoZWNrYCBhcyAnYXRvbS1oYXNrZWxsLWhzZGV2Lm9uU2F2ZUNoZWNrJyB8ICdhdG9tLWhhc2tlbGwtaHNkZXYub25DaGFuZ2VDaGVjaycsXHJcbiAgICApXHJcbiAgICBjb25zdCBsaW50ID0gYXRvbS5jb25maWcuZ2V0KFxyXG4gICAgICBgYXRvbS1oYXNrZWxsLWhzZGV2Lm9uJHtvcHR9TGludGAgYXMgJ2F0b20taGFza2VsbC1oc2Rldi5vblNhdmVMaW50JyB8ICdhdG9tLWhhc2tlbGwtaHNkZXYub25DaGFuZ2VMaW50JyxcclxuICAgIClcclxuICAgIGxldCByZXNcclxuICAgIGlmIChjaGVjayAmJiBsaW50KSB7XHJcbiAgICAgIHJlcyA9IGF3YWl0IHRoaXMucHJvY2Vzcy5jaGVja0FuZExpbnQoYnVmZmVyKVxyXG4gICAgfSBlbHNlIGlmIChjaGVjaykge1xyXG4gICAgICByZXMgPSBhd2FpdCB0aGlzLnByb2Nlc3MuY2hlY2soYnVmZmVyKVxyXG4gICAgfSBlbHNlIGlmIChsaW50KSB7XHJcbiAgICAgIHJlcyA9IGF3YWl0IHRoaXMucHJvY2Vzcy5saW50KGJ1ZmZlcilcclxuICAgIH1cclxuICAgIGlmIChyZXMpIHtcclxuICAgICAgdGhpcy5zZXRNZXNzYWdlcyhyZXMpXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHN0YXR1c0NhbGxiYWNrcyhcclxuICAgIHByb2dyZXNzOiBzdHJpbmcsXHJcbiAgICBmYWlsdXJlOiAoZXJyb3I6IHN0cmluZywgZGV0YWlsczogYW55KSA9PiBzdHJpbmcsXHJcbiAgICBzdWNjZXNzOiBzdHJpbmcsXHJcbiAgICBvblN1Y2Nlc3M/OiAoKSA9PiB2b2lkXHJcbiAgKTogQ2FsbGJhY2tzIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIG9uTm90aWZ5OiAoX25vdGlmaWNhdGlvbjogYW55KSA9PiB7XHJcbiAgICAgICAgdGhpcy51cGkuc2V0U3RhdHVzKHtzdGF0dXM6ICdwcm9ncmVzcycsIGRldGFpbDogcHJvZ3Jlc3N9KVxyXG4gICAgICB9LFxyXG4gICAgICBvbkVycm9yOiAoZXJyb3I6IHN0cmluZywgZGV0YWlsczogYW55KSA9PiB7XHJcbiAgICAgICAgdGhpcy51cGkuc2V0U3RhdHVzKHtzdGF0dXM6ICdlcnJvcicsIGRldGFpbDogZmFpbHVyZShlcnJvciwgZGV0YWlscyl9KVxyXG4gICAgICB9LFxyXG4gICAgICBvblJlc3BvbnNlOiAoX3Jlc3BvbnNlOiBhbnkpID0+IHtcclxuICAgICAgICB0aGlzLnVwaS5zZXRTdGF0dXMoe3N0YXR1czogJ3JlYWR5JywgZGV0YWlsOiBzdWNjZXNzfSlcclxuICAgICAgICBpZiAob25TdWNjZXNzKSB7XHJcbiAgICAgICAgICBvblN1Y2Nlc3MoKVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBzZXRIaWdobGlnaHRlcigpIHtcclxuICAgIGlmIChhdG9tLmNvbmZpZy5nZXQoJ2F0b20taGFza2VsbC1oc2Rldi5oaWdobGlnaHRNZXNzYWdlcycpKSB7XHJcbiAgICAgIHJldHVybiAobTogVVBJLklSZXN1bHRJdGVtKTogVVBJLklSZXN1bHRJdGVtID0+IHtcclxuICAgICAgICBpZiAodHlwZW9mIG0ubWVzc2FnZSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgIGNvbnN0IG1lc3NhZ2U6IFVQSS5JTWVzc2FnZVRleHQgPSB7XHJcbiAgICAgICAgICAgIHRleHQ6IG0ubWVzc2FnZSxcclxuICAgICAgICAgICAgaGlnaGxpZ2h0ZXI6ICdoaW50Lm1lc3NhZ2UuaGFza2VsbCcsXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4geyAuLi5tLCBtZXNzYWdlIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgcmV0dXJuIG1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiAobTogVVBJLklSZXN1bHRJdGVtKSA9PiBtXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHNldE1lc3NhZ2VzKG1lc3NhZ2VzOiBVUEkuSVJlc3VsdEl0ZW1bXSkge1xyXG4gICAgdGhpcy5sYXN0TWVzc2FnZXMgPSBtZXNzYWdlcy5tYXAodGhpcy5zZXRIaWdobGlnaHRlcigpKVxyXG4gICAgdGhpcy5zZW5kTWVzc2FnZXMoKVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBzZW5kTWVzc2FnZXMoKSB7XHJcbiAgICB0aGlzLnVwaS5zZXRNZXNzYWdlcyh0aGlzLnByb2Nlc3NNZXNzYWdlcy5jb25jYXQodGhpcy5sYXN0TWVzc2FnZXMpKVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjb25zb2xlUmVwb3J0KGFyZzogSUVycm9yQ2FsbGJhY2tBcmdzKSB7XHJcbiAgICAvLyB0c2xpbnQ6ZGlzYmFsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcclxuICAgIGNvbnNvbGUuZXJyb3IoVXRpbC5mb3JtYXRFcnJvcihhcmcpLCBVdGlsLmdldEVycm9yRGV0YWlsKGFyZykpXHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGhhbmRsZVByb2Nlc3NFcnJvcihhcmc6IElFcnJvckNhbGxiYWNrQXJncykge1xyXG4gICAgc3dpdGNoICh0aGlzLm1zZ0JhY2tlbmQpIHtcclxuICAgICAgY2FzZSAndXBpJzpcclxuICAgICAgICB0aGlzLnByb2Nlc3NNZXNzYWdlcy5wdXNoKHtcclxuICAgICAgICAgIG1lc3NhZ2U6IFV0aWwuZm9ybWF0RXJyb3IoYXJnKVxyXG4gICAgICAgICAgKyAnXFxuXFxuU2VlIGNvbnNvbGUgKFZpZXcg4oaSIERldmVsb3BlciDihpIgVG9nZ2xlIERldmVsb3BlciBUb29scyDihpIgQ29uc29sZSB0YWIpIGZvciBkZXRhaWxzLicsXHJcbiAgICAgICAgICBzZXZlcml0eTogJ2hzZGV2JyxcclxuICAgICAgICB9KVxyXG4gICAgICAgIHRoaXMuY29uc29sZVJlcG9ydChhcmcpXHJcbiAgICAgICAgdGhpcy5zZW5kTWVzc2FnZXMoKVxyXG4gICAgICAgIGJyZWFrXHJcbiAgICAgIGNhc2UgJ2NvbnNvbGUnOlxyXG4gICAgICAgIHRoaXMuY29uc29sZVJlcG9ydChhcmcpXHJcbiAgICAgICAgYnJlYWtcclxuICAgICAgY2FzZSAncG9wdXAnOlxyXG4gICAgICAgIHRoaXMuY29uc29sZVJlcG9ydChhcmcpXHJcbiAgICAgICAgYXRvbS5ub3RpZmljYXRpb25zLmFkZEVycm9yKFV0aWwuZm9ybWF0RXJyb3IoYXJnKSwge1xyXG4gICAgICAgICAgZGV0YWlsOiBVdGlsLmdldEVycm9yRGV0YWlsKGFyZyksXHJcbiAgICAgICAgICBkaXNtaXNzYWJsZTogdHJ1ZSxcclxuICAgICAgICB9KVxyXG4gICAgICAgIGJyZWFrXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGhhbmRsZVByb2Nlc3NXYXJuaW5nKHdhcm5pbmc6IHN0cmluZykge1xyXG4gICAgc3dpdGNoICh0aGlzLm1zZ0JhY2tlbmQpIHtcclxuICAgICAgY2FzZSAndXBpJzpcclxuICAgICAgICB0aGlzLnByb2Nlc3NNZXNzYWdlcy5wdXNoKHtcclxuICAgICAgICAgIG1lc3NhZ2U6IHdhcm5pbmcsXHJcbiAgICAgICAgICBzZXZlcml0eTogJ2hzZGV2JyxcclxuICAgICAgICB9KVxyXG4gICAgICAgIFV0aWwud2Fybih3YXJuaW5nKVxyXG4gICAgICAgIHRoaXMuc2VuZE1lc3NhZ2VzKClcclxuICAgICAgICBicmVha1xyXG4gICAgICBjYXNlICdjb25zb2xlJzpcclxuICAgICAgICBVdGlsLndhcm4od2FybmluZylcclxuICAgICAgICBicmVha1xyXG4gICAgICBjYXNlICdwb3B1cCc6XHJcbiAgICAgICAgVXRpbC53YXJuKHdhcm5pbmcpXHJcbiAgICAgICAgYXRvbS5ub3RpZmljYXRpb25zLmFkZFdhcm5pbmcod2FybmluZywge1xyXG4gICAgICAgICAgZGlzbWlzc2FibGU6IGZhbHNlLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgYnJlYWtcclxuICAgIH1cclxuICB9XHJcbn1cclxuIl19