"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const atom_1 = require("atom");
const util_1 = require("../util");
const os_1 = require("os");
const CP = require("child_process");
const Queue = require("promise-queue");
const pidusage = require("pidusage");
Symbol.asyncIterator = Symbol.asyncIterator || Symbol.for('Symbol.asyncIterator');
class InteractiveProcess {
    constructor(path, cmd, options) {
        this.disposables = new atom_1.CompositeDisposable();
        this.emitter = new atom_1.Emitter();
        this.disposables.add(this.emitter);
        this.requestQueue = new Queue(1, 100);
        util_1.debug(`Spawning new hsdev instance with options = `, options);
        this.proc = CP.spawn(path, cmd, options);
        this.proc.stdout.setEncoding('utf-8');
        this.proc.stderr.setEncoding('utf-8');
        this.proc.setMaxListeners(100);
        this.proc.stdout.setMaxListeners(100);
        this.proc.stderr.setMaxListeners(100);
        this.resetTimer();
        this.proc.once('exit', (code) => {
            this.timer && window.clearTimeout(this.timer);
            util_1.debug(`hsdev ended with ${code}`);
            this.emitter.emit('did-exit', code);
            this.disposables.dispose();
        });
    }
    onceExit(action) {
        return this.emitter.once('did-exit', action);
    }
    async kill() {
        this.proc.stdin.end();
        this.proc.kill();
        return new Promise((resolve) => {
            this.proc.once('exit', (code) => resolve(code));
        });
    }
    async interact(command, args, data) {
        return this.requestQueue.add(async () => {
            this.proc.stdout.pause();
            this.proc.stderr.pause();
            pidusage.stat(this.proc.pid, (err, stat) => {
                if (err) {
                    util_1.warn(err);
                    return;
                }
                if (stat.memory > atom.config.get('atom-haskell-hsdev.maxMemMegs') * 1024 * 1024) {
                    this.proc.kill();
                }
            });
            util_1.debug(`Started interactive action block`);
            util_1.debug(`Running interactive command ${command} ${args} ${data ? 'with' : 'without'} additional data`);
            let ended = false;
            try {
                const isEnded = () => ended;
                const stderr = [];
                const stdout = [];
                setImmediate(async () => {
                    try {
                        for (var _a = tslib_1.__asyncValues(this.readgen(this.proc.stderr, isEnded)), _b; _b = await _a.next(), !_b.done;) {
                            const line = await _b.value;
                            stderr.push(line);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_b && !_b.done && (_c = _a.return)) await _c.call(_a);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    var e_1, _c;
                });
                const readOutput = async () => {
                    try {
                        for (var _a = tslib_1.__asyncValues(this.readgen(this.proc.stdout, isEnded)), _b; _b = await _a.next(), !_b.done;) {
                            const line = await _b.value;
                            util_1.debug(`Got response from hsdev: ${line}`);
                            if (line === 'OK') {
                                ended = true;
                            }
                            else {
                                stdout.push(line);
                            }
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_b && !_b.done && (_c = _a.return)) await _c.call(_a);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    return { stdout, stderr };
                    var e_2, _c;
                };
                const exitEvent = async () => new Promise((_resolve, reject) => {
                    this.proc.once('exit', () => {
                        util_1.warn(stdout.join('\n'));
                        reject(util_1.mkError('GHCModInteractiveCrash', `${stdout}\n\n${stderr}`));
                    });
                });
                const timeoutEvent = async () => new Promise((_resolve, reject) => {
                    const tml = atom.config.get('atom-haskell-hsdev.interactiveActionTimeout');
                    if (tml) {
                        setTimeout(() => {
                            reject(util_1.mkError('InteractiveActionTimeout', `${stdout}\n\n${stderr}`));
                        }, tml * 1000);
                    }
                });
                const args2 = [command, ...args];
                util_1.debug(`Running hsdev command ${command}`, ...args);
                this.proc.stdin.write(`${args2.join(' ').replace(/(?:\r?\n|\r)/g, ' ')}${os_1.EOL}`);
                if (data) {
                    util_1.debug('Writing data to stdin...');
                    this.proc.stdin.write(`${data}${util_1.EOT}`);
                }
                return await Promise.race([readOutput(), exitEvent(), timeoutEvent()]);
            }
            catch (error) {
                if (error.name === 'InteractiveActionTimeout') {
                    this.proc.kill();
                }
                throw error;
            }
            finally {
                util_1.debug(`Ended interactive action block`);
                ended = true;
                this.proc.stdout.resume();
                this.proc.stderr.resume();
            }
        });
    }
    async readLine() {
        return this.requestQueue.add(async () => {
            let ended = false;
            const isEnded = () => ended;
            const stdout = [];
            const stderr = [];
            const readOutput = async () => {
                try {
                    for (var _a = tslib_1.__asyncValues(this.readgen(this.proc.stdout, isEnded)), _b; _b = await _a.next(), !_b.done;) {
                        const line = await _b.value;
                        stdout.push(line);
                        ended = true;
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (_b && !_b.done && (_c = _a.return)) await _c.call(_a);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
                return { stdout, stderr };
                var e_3, _c;
            };
            const exitEvent = async () => new Promise((_resolve, reject) => {
                this.proc.once('exit', () => {
                    util_1.warn(stdout.join('\n'));
                    reject(util_1.mkError('GHCModInteractiveCrash', `${stdout}\n\n${stderr}`));
                });
            });
            const timeoutEvent = async () => new Promise((_resolve, reject) => {
                const tml = atom.config.get('atom-haskell-hsdev.interactiveActionTimeout');
                if (tml) {
                    setTimeout(() => {
                        reject(util_1.mkError('InteractiveActionTimeout', `${stdout}\n\n${stderr}`));
                    }, tml * 1000);
                }
            });
            return await Promise.race([readOutput(), exitEvent(), timeoutEvent()]);
        });
    }
    resetTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        const tml = atom.config.get('atom-haskell-hsdev.interactiveInactivityTimeout');
        if (tml) {
            this.timer = window.setTimeout(() => { this.kill(); }, tml * 60 * 1000);
        }
    }
    async waitReadable(stream) {
        return new Promise((resolve) => stream.once('readable', () => {
            resolve();
        }));
    }
    readgen(out, isEnded) {
        return tslib_1.__asyncGenerator(this, arguments, function* readgen_1() {
            let buffer = '';
            while (!isEnded()) {
                const read = out.read();
                if (read !== null) {
                    buffer += read;
                    if (buffer.includes(os_1.EOL)) {
                        const arr = buffer.split(os_1.EOL);
                        buffer = arr.pop() || '';
                        yield tslib_1.__await(yield* tslib_1.__asyncDelegator(tslib_1.__asyncValues(arr)));
                    }
                }
                else {
                    yield tslib_1.__await(this.waitReadable(out));
                }
            }
            if (buffer) {
                out.unshift(buffer);
            }
        });
    }
}
exports.InteractiveProcess = InteractiveProcess;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJhY3RpdmUtcHJvY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9oc2Rldi9pbnRlcmFjdGl2ZS1wcm9jZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtCQUFtRDtBQUNuRCxrQ0FBbUQ7QUFDbkQsMkJBQXdCO0FBQ3hCLG9DQUFtQztBQUNuQyx1Q0FBdUM7QUFDdkMscUNBQXFDO0FBRXBDLE1BQWMsQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFDLGFBQWEsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUE7QUFFMUY7SUFTRSxZQUFZLElBQVksRUFBRSxHQUFhLEVBQUUsT0FBeUI7UUFDaEUsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLDBCQUFtQixFQUFFLENBQUE7UUFDNUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLGNBQU8sRUFBRSxDQUFBO1FBQzVCLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNsQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUVyQyxZQUFLLENBQUMsNkNBQTZDLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDN0QsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDeEMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNyQyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUM5QixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFl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QUMsS0FBSyxDQUFDLFFBQUcsQ0FBQyxDQUFBO3dCQUM3QixNQUFNLEdBQUcsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsQ0FBQTt3QkFDeEIsc0JBQUEsS0FBSyxDQUFDLENBQUMseUJBQUEsc0JBQUEsR0FBRyxDQUFBLENBQUEsQ0FBQSxDQUFBO29CQUNaLENBQUM7Z0JBQ0gsQ0FBQztnQkFBQyxJQUFJLENBQUMsQ0FBQztvQkFDTixzQkFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFBLENBQUE7Z0JBQzlCLENBQUM7WUFDSCxDQUFDO1lBQ0QsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQUMsQ0FBQztRQUNyQyxDQUFDO0tBQUE7Q0FDRjtBQW5NRCxnREFtTUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBFbWl0dGVyLCBDb21wb3NpdGVEaXNwb3NhYmxlIH0gZnJvbSAnYXRvbSdcclxuaW1wb3J0IHsgZGVidWcsIHdhcm4sIG1rRXJyb3IsIEVPVCB9IGZyb20gJy4uL3V0aWwnXHJcbmltcG9ydCB7IEVPTCB9IGZyb20gJ29zJ1xyXG5pbXBvcnQgKiBhcyBDUCBmcm9tICdjaGlsZF9wcm9jZXNzJ1xyXG5pbXBvcnQgUXVldWUgPSByZXF1aXJlKCdwcm9taXNlLXF1ZXVlJylcclxuaW1wb3J0IHBpZHVzYWdlID0gcmVxdWlyZSgncGlkdXNhZ2UnKVxyXG5cclxuKFN5bWJvbCBhcyBhbnkpLmFzeW5jSXRlcmF0b3IgPSBTeW1ib2wuYXN5bmNJdGVyYXRvciB8fCBTeW1ib2wuZm9yKCdTeW1ib2wuYXN5bmNJdGVyYXRvcicpXHJcblxyXG5leHBvcnQgY2xhc3MgSW50ZXJhY3RpdmVQcm9jZXNzIHtcclxuICBwcml2YXRlIGRpc3Bvc2FibGVzOiBDb21wb3NpdGVEaXNwb3NhYmxlXHJcbiAgcHJpdmF0ZSBlbWl0dGVyOiBFbWl0dGVyPHt9LCB7XHJcbiAgICAnZGlkLWV4aXQnOiBudW1iZXJcclxuICB9PlxyXG4gIHByaXZhdGUgcHJvYzogQ1AuQ2hpbGRQcm9jZXNzXHJcbiAgcHJpdmF0ZSB0aW1lcjogbnVtYmVyIHwgdW5kZWZpbmVkXHJcbiAgcHJpdmF0ZSByZXF1ZXN0UXVldWU6IFF1ZXVlXHJcblxyXG4gIGNvbnN0cnVjdG9yKHBhdGg6IHN0cmluZywgY21kOiBzdHJpbmdbXSwgb3B0aW9ucz86IHsgY3dkOiBzdHJpbmcgfSkge1xyXG4gICAgdGhpcy5kaXNwb3NhYmxlcyA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKClcclxuICAgIHRoaXMuZW1pdHRlciA9IG5ldyBFbWl0dGVyKClcclxuICAgIHRoaXMuZGlzcG9zYWJsZXMuYWRkKHRoaXMuZW1pdHRlcilcclxuICAgIHRoaXMucmVxdWVzdFF1ZXVlID0gbmV3IFF1ZXVlKDEsIDEwMClcclxuXHJcbiAgICBkZWJ1ZyhgU3Bhd25pbmcgbmV3IGhzZGV2IGluc3RhbmNlIHdpdGggb3B0aW9ucyA9IGAsIG9wdGlvbnMpXHJcbiAgICB0aGlzLnByb2MgPSBDUC5zcGF3bihwYXRoLCBjbWQsIG9wdGlvbnMpXHJcbiAgICB0aGlzLnByb2Muc3Rkb3V0LnNldEVuY29kaW5nKCd1dGYtOCcpXHJcbiAgICB0aGlzLnByb2Muc3RkZXJyLnNldEVuY29kaW5nKCd1dGYtOCcpXHJcbiAgICB0aGlzLnByb2Muc2V0TWF4TGlzdGVuZXJzKDEwMClcclxuICAgIHRoaXMucHJvYy5zdGRvdXQuc2V0TWF4TGlzdGVuZXJzKDEwMClcclxuICAgIHRoaXMucHJvYy5zdGRlcnIuc2V0TWF4TGlzdGVuZXJzKDEwMClcclxuICAgIHRoaXMucmVzZXRUaW1lcigpXHJcbiAgICB0aGlzLnByb2Mub25jZSgnZXhpdCcsIChjb2RlKSA9PiB7XHJcbiAgICAgIHRoaXMudGltZXIgJiYgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLnRpbWVyKVxyXG4gICAgICBkZWJ1ZyhgaHNkZXYgZW5kZWQgd2l0aCAke2NvZGV9YClcclxuICAgICAgdGhpcy5lbWl0dGVyLmVtaXQoJ2RpZC1leGl0JywgY29kZSlcclxuICAgICAgdGhpcy5kaXNwb3NhYmxlcy5kaXNwb3NlKClcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgb25jZUV4aXQoYWN0aW9uOiAoY29kZTogbnVtYmVyKSA9PiB2b2lkKSB7XHJcbiAgICByZXR1cm4gdGhpcy5lbWl0dGVyLm9uY2UoJ2RpZC1leGl0JywgYWN0aW9uKVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIGtpbGwoKTogUHJvbWlzZTxudW1iZXI+IHtcclxuICAgIHRoaXMucHJvYy5zdGRpbi5lbmQoKVxyXG4gICAgdGhpcy5wcm9jLmtpbGwoKVxyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPG51bWJlcj4oKHJlc29sdmUpID0+IHtcclxuICAgICAgdGhpcy5wcm9jLm9uY2UoJ2V4aXQnLCAoY29kZSkgPT4gcmVzb2x2ZShjb2RlKSlcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgaW50ZXJhY3QoXHJcbiAgICBjb21tYW5kOiBzdHJpbmcsIGFyZ3M6IHN0cmluZ1tdLCBkYXRhPzogc3RyaW5nLFxyXG4gICk6IFByb21pc2U8eyBzdGRvdXQ6IHN0cmluZ1tdLCBzdGRlcnI6IHN0cmluZ1tdIH0+IHtcclxuICAgIHJldHVybiB0aGlzLnJlcXVlc3RRdWV1ZS5hZGQoYXN5bmMgKCkgPT4ge1xyXG4gICAgICB0aGlzLnByb2Muc3Rkb3V0LnBhdXNlKClcclxuICAgICAgdGhpcy5wcm9jLnN0ZGVyci5wYXVzZSgpXHJcblxyXG4gICAgICBwaWR1c2FnZS5zdGF0KHRoaXMucHJvYy5waWQsIChlcnIsIHN0YXQpID0+IHtcclxuICAgICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgICB3YXJuKGVycilcclxuICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoc3RhdC5tZW1vcnkgPiBhdG9tLmNvbmZpZy5nZXQoJ2F0b20taGFza2VsbC1oc2Rldi5tYXhNZW1NZWdzJykgKiAxMDI0ICogMTAyNCkge1xyXG4gICAgICAgICAgdGhpcy5wcm9jLmtpbGwoKVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuXHJcbiAgICAgIGRlYnVnKGBTdGFydGVkIGludGVyYWN0aXZlIGFjdGlvbiBibG9ja2ApXHJcbiAgICAgIGRlYnVnKGBSdW5uaW5nIGludGVyYWN0aXZlIGNvbW1hbmQgJHtjb21tYW5kfSAke2FyZ3N9ICR7ZGF0YSA/ICd3aXRoJyA6ICd3aXRob3V0J30gYWRkaXRpb25hbCBkYXRhYClcclxuICAgICAgbGV0IGVuZGVkID0gZmFsc2VcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBjb25zdCBpc0VuZGVkID0gKCkgPT4gZW5kZWRcclxuICAgICAgICBjb25zdCBzdGRlcnI6IHN0cmluZ1tdID0gW11cclxuICAgICAgICBjb25zdCBzdGRvdXQ6IHN0cmluZ1tdID0gW11cclxuICAgICAgICBzZXRJbW1lZGlhdGUoYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgZm9yIGF3YWl0IChjb25zdCBsaW5lIG9mIHRoaXMucmVhZGdlbih0aGlzLnByb2Muc3RkZXJyLCBpc0VuZGVkKSkge1xyXG4gICAgICAgICAgICBzdGRlcnIucHVzaChsaW5lKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgY29uc3QgcmVhZE91dHB1dCA9IGFzeW5jICgpID0+IHtcclxuICAgICAgICAgIGZvciBhd2FpdCAoY29uc3QgbGluZSBvZiB0aGlzLnJlYWRnZW4odGhpcy5wcm9jLnN0ZG91dCwgaXNFbmRlZCkpIHtcclxuICAgICAgICAgICAgZGVidWcoYEdvdCByZXNwb25zZSBmcm9tIGhzZGV2OiAke2xpbmV9YClcclxuICAgICAgICAgICAgaWYgKGxpbmUgPT09ICdPSycpIHtcclxuICAgICAgICAgICAgICBlbmRlZCA9IHRydWVcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICBzdGRvdXQucHVzaChsaW5lKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4geyBzdGRvdXQsIHN0ZGVyciB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGV4aXRFdmVudCA9IGFzeW5jICgpID0+IG5ldyBQcm9taXNlPG5ldmVyPigoX3Jlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgdGhpcy5wcm9jLm9uY2UoJ2V4aXQnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHdhcm4oc3Rkb3V0LmpvaW4oJ1xcbicpKVxyXG4gICAgICAgICAgICByZWplY3QobWtFcnJvcignR0hDTW9kSW50ZXJhY3RpdmVDcmFzaCcsIGAke3N0ZG91dH1cXG5cXG4ke3N0ZGVycn1gKSlcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgICAgICBjb25zdCB0aW1lb3V0RXZlbnQgPSBhc3luYyAoKSA9PiBuZXcgUHJvbWlzZTxuZXZlcj4oKF9yZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgIGNvbnN0IHRtbDogbnVtYmVyID0gYXRvbS5jb25maWcuZ2V0KCdhdG9tLWhhc2tlbGwtaHNkZXYuaW50ZXJhY3RpdmVBY3Rpb25UaW1lb3V0JylcclxuICAgICAgICAgIGlmICh0bWwpIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dChcclxuICAgICAgICAgICAgICAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZWplY3QobWtFcnJvcignSW50ZXJhY3RpdmVBY3Rpb25UaW1lb3V0JywgYCR7c3Rkb3V0fVxcblxcbiR7c3RkZXJyfWApKVxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgdG1sICogMTAwMCxcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGNvbnN0IGFyZ3MyID0gW2NvbW1hbmQsIC4uLmFyZ3NdXHJcbiAgICAgICAgZGVidWcoYFJ1bm5pbmcgaHNkZXYgY29tbWFuZCAke2NvbW1hbmR9YCwgLi4uYXJncylcclxuICAgICAgICB0aGlzLnByb2Muc3RkaW4ud3JpdGUoYCR7YXJnczIuam9pbignICcpLnJlcGxhY2UoLyg/Olxccj9cXG58XFxyKS9nLCAnICcpfSR7RU9MfWApXHJcbiAgICAgICAgaWYgKGRhdGEpIHtcclxuICAgICAgICAgIGRlYnVnKCdXcml0aW5nIGRhdGEgdG8gc3RkaW4uLi4nKVxyXG4gICAgICAgICAgdGhpcy5wcm9jLnN0ZGluLndyaXRlKGAke2RhdGF9JHtFT1R9YClcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IFByb21pc2UucmFjZShbcmVhZE91dHB1dCgpLCBleGl0RXZlbnQoKSwgdGltZW91dEV2ZW50KCldKVxyXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby11bnNhZmUtYW55XHJcbiAgICAgICAgaWYgKGVycm9yLm5hbWUgPT09ICdJbnRlcmFjdGl2ZUFjdGlvblRpbWVvdXQnKSB7XHJcbiAgICAgICAgICB0aGlzLnByb2Mua2lsbCgpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRocm93IGVycm9yXHJcbiAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgZGVidWcoYEVuZGVkIGludGVyYWN0aXZlIGFjdGlvbiBibG9ja2ApXHJcbiAgICAgICAgZW5kZWQgPSB0cnVlXHJcbiAgICAgICAgdGhpcy5wcm9jLnN0ZG91dC5yZXN1bWUoKVxyXG4gICAgICAgIHRoaXMucHJvYy5zdGRlcnIucmVzdW1lKClcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyByZWFkTGluZSgpIHtcclxuICAgIHJldHVybiB0aGlzLnJlcXVlc3RRdWV1ZS5hZGQoYXN5bmMgKCkgPT4ge1xyXG4gICAgICBsZXQgZW5kZWQgPSBmYWxzZVxyXG4gICAgICBjb25zdCBpc0VuZGVkID0gKCkgPT4gZW5kZWRcclxuICAgICAgY29uc3Qgc3Rkb3V0OiBzdHJpbmdbXSA9IFtdXHJcbiAgICAgIGNvbnN0IHN0ZGVycjogc3RyaW5nW10gPSBbXVxyXG5cclxuICAgICAgY29uc3QgcmVhZE91dHB1dCA9IGFzeW5jICgpID0+IHtcclxuICAgICAgICBmb3IgYXdhaXQgKGNvbnN0IGxpbmUgb2YgdGhpcy5yZWFkZ2VuKHRoaXMucHJvYy5zdGRvdXQsIGlzRW5kZWQpKSB7XHJcbiAgICAgICAgICBzdGRvdXQucHVzaChsaW5lKVxyXG4gICAgICAgICAgZW5kZWQgPSB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7IHN0ZG91dCwgc3RkZXJyIH1cclxuICAgICAgfVxyXG4gICAgICBjb25zdCBleGl0RXZlbnQgPSBhc3luYyAoKSA9PiBuZXcgUHJvbWlzZTxuZXZlcj4oKF9yZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICB0aGlzLnByb2Mub25jZSgnZXhpdCcsICgpID0+IHtcclxuICAgICAgICAgIHdhcm4oc3Rkb3V0LmpvaW4oJ1xcbicpKVxyXG4gICAgICAgICAgcmVqZWN0KG1rRXJyb3IoJ0dIQ01vZEludGVyYWN0aXZlQ3Jhc2gnLCBgJHtzdGRvdXR9XFxuXFxuJHtzdGRlcnJ9YCkpXHJcbiAgICAgICAgfSlcclxuICAgICAgfSlcclxuICAgICAgY29uc3QgdGltZW91dEV2ZW50ID0gYXN5bmMgKCkgPT4gbmV3IFByb21pc2U8bmV2ZXI+KChfcmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgY29uc3QgdG1sOiBudW1iZXIgPSBhdG9tLmNvbmZpZy5nZXQoJ2F0b20taGFza2VsbC1oc2Rldi5pbnRlcmFjdGl2ZUFjdGlvblRpbWVvdXQnKVxyXG4gICAgICAgIGlmICh0bWwpIHtcclxuICAgICAgICAgIHNldFRpbWVvdXQoXHJcbiAgICAgICAgICAgICgpID0+IHtcclxuICAgICAgICAgICAgICByZWplY3QobWtFcnJvcignSW50ZXJhY3RpdmVBY3Rpb25UaW1lb3V0JywgYCR7c3Rkb3V0fVxcblxcbiR7c3RkZXJyfWApKVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0bWwgKiAxMDAwLFxyXG4gICAgICAgICAgKVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuXHJcbiAgICAgIHJldHVybiBhd2FpdCBQcm9taXNlLnJhY2UoW3JlYWRPdXRwdXQoKSwgZXhpdEV2ZW50KCksIHRpbWVvdXRFdmVudCgpXSlcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJlc2V0VGltZXIoKSB7XHJcbiAgICBpZiAodGhpcy50aW1lcikge1xyXG4gICAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lcilcclxuICAgIH1cclxuICAgIGNvbnN0IHRtbCA9IGF0b20uY29uZmlnLmdldCgnYXRvbS1oYXNrZWxsLWhzZGV2LmludGVyYWN0aXZlSW5hY3Rpdml0eVRpbWVvdXQnKVxyXG4gICAgaWYgKHRtbCkge1xyXG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWZsb2F0aW5nLXByb21pc2VzXHJcbiAgICAgIHRoaXMudGltZXIgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7IHRoaXMua2lsbCgpIH0sIHRtbCAqIDYwICogMTAwMClcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgd2FpdFJlYWRhYmxlKHN0cmVhbTogTm9kZUpTLlJlYWRhYmxlU3RyZWFtKSB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHN0cmVhbS5vbmNlKCdyZWFkYWJsZScsICgpID0+IHtcclxuICAgICAgcmVzb2x2ZSgpXHJcbiAgICB9KSlcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgKnJlYWRnZW4ob3V0OiBOb2RlSlMuUmVhZGFibGVTdHJlYW0sIGlzRW5kZWQ6ICgpID0+IGJvb2xlYW4pIHtcclxuICAgIGxldCBidWZmZXIgPSAnJ1xyXG4gICAgd2hpbGUgKCFpc0VuZGVkKCkpIHtcclxuICAgICAgY29uc3QgcmVhZCA9IG91dC5yZWFkKCkgYXMgKHN0cmluZyB8IG51bGwpXHJcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tbnVsbC1rZXl3b3JkXHJcbiAgICAgIGlmIChyZWFkICE9PSBudWxsKSB7XHJcbiAgICAgICAgYnVmZmVyICs9IHJlYWRcclxuICAgICAgICBpZiAoYnVmZmVyLmluY2x1ZGVzKEVPTCkpIHtcclxuICAgICAgICAgIGNvbnN0IGFyciA9IGJ1ZmZlci5zcGxpdChFT0wpXHJcbiAgICAgICAgICBidWZmZXIgPSBhcnIucG9wKCkgfHwgJydcclxuICAgICAgICAgIHlpZWxkKiBhcnJcclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgYXdhaXQgdGhpcy53YWl0UmVhZGFibGUob3V0KVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAoYnVmZmVyKSB7IG91dC51bnNoaWZ0KGJ1ZmZlcikgfVxyXG4gIH1cclxufVxyXG4iXX0=