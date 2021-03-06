"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Util = require("../util");
const hsdev_process_real_1 = require("./hsdev-process-real");
async function createHsDevProcessReal() {
    let opts;
    let vers;
    try {
        opts = await Util.getProcessOptions();
        const versP = getVersion(opts);
        vers = await versP;
        checkVersion(vers);
        return new hsdev_process_real_1.HsDevProcessReal(opts);
    }
    catch (e) {
        const err = e;
        Util.notifySpawnFail({ err, opts, vers });
        throw e;
    }
}
exports.createHsDevProcessReal = createHsDevProcessReal;
function checkVersion({ vers }) {
    const atLeast = (x) => Util.versAtLeast(vers, x);
    if (!atLeast([0, 3])) {
        atom.notifications.addError(`\
Atom-haskell-hsdev: hsdev < 0.3 is not supported. \
Use at your own risk or update your hsdev installation`, { dismissable: true });
    }
}
async function getVersion(opts) {
    const timeout = atom.config.get('atom-haskell-hsdev.initTimeout') * 1000;
    const cmd = atom.config.get('atom-haskell-hsdev.hsdevPath');
    const { stdout } = await Util.execPromise(cmd, ['version'], Object.assign({ timeout }, opts));
    const versRaw = /^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?/.exec(stdout);
    if (!versRaw) {
        throw new Error("Couldn't get hsdev version");
    }
    const vers = versRaw.slice(1, 5).map((i) => parseInt(i, 10));
    return { vers };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHNkZXYtcHJvY2Vzcy1yZWFsLWZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvaHNkZXYvaHNkZXYtcHJvY2Vzcy1yZWFsLWZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxnQ0FBK0I7QUFDL0IsNkRBQW1FO0FBSTVELEtBQUs7SUFDVixJQUFJLElBQTRCLENBQUE7SUFDaEMsSUFBSSxJQUE4QixDQUFBO0lBQ2xDLElBQUksQ0FBQztRQUNILElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBQ3JDLE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM5QixJQUFJLEdBQUcsTUFBTSxLQUFLLENBQUE7UUFDbEIsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2xCLE1BQU0sQ0FBQyxJQUFJLHFDQUFnQixDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRVgsTUFBTSxHQUFHLEdBQXdCLENBQUMsQ0FBQTtRQUNsQyxJQUFJLENBQUMsZUFBZSxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sQ0FBQyxDQUFBO0lBQ1QsQ0FBQztBQUNILENBQUM7QUFmRCx3REFlQztBQUVELHNCQUFzQixFQUFFLElBQUksRUFBc0I7SUFDaEQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFXLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBRTFELEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JCLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUN6Qjs7dURBRWlELEVBQ2pELEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUN0QixDQUFBO0lBQ0gsQ0FBQztBQUNILENBQUM7QUFFRCxLQUFLLHFCQUFxQixJQUFtQjtJQUMzQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsQ0FBQyxHQUFHLElBQUksQ0FBQTtJQUN4RSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFBO0lBQzNELE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLGtCQUFJLE9BQU8sSUFBSyxJQUFJLEVBQUcsQ0FBQTtJQUNqRixNQUFNLE9BQU8sR0FBRyxrQ0FBa0MsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDL0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO0lBQUMsQ0FBQztJQUMvRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM1RCxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQTtBQUNqQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgVXRpbCBmcm9tICcuLi91dGlsJ1xyXG5pbXBvcnQgeyBIc0RldlByb2Nlc3NSZWFsLCBSdW5PcHRpb25zIH0gZnJvbSAnLi9oc2Rldi1wcm9jZXNzLXJlYWwnXHJcblxyXG5leHBvcnQgdHlwZSBIc0RldlZlcnNpb24gPSB7IHZlcnM6IG51bWJlcltdIH1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVIc0RldlByb2Nlc3NSZWFsKCk6IFByb21pc2U8SHNEZXZQcm9jZXNzUmVhbD4ge1xyXG4gIGxldCBvcHRzOiBSdW5PcHRpb25zIHwgdW5kZWZpbmVkXHJcbiAgbGV0IHZlcnM6IEhzRGV2VmVyc2lvbiB8IHVuZGVmaW5lZFxyXG4gIHRyeSB7XHJcbiAgICBvcHRzID0gYXdhaXQgVXRpbC5nZXRQcm9jZXNzT3B0aW9ucygpXHJcbiAgICBjb25zdCB2ZXJzUCA9IGdldFZlcnNpb24ob3B0cylcclxuICAgIHZlcnMgPSBhd2FpdCB2ZXJzUFxyXG4gICAgY2hlY2tWZXJzaW9uKHZlcnMpXHJcbiAgICByZXR1cm4gbmV3IEhzRGV2UHJvY2Vzc1JlYWwob3B0cylcclxuICB9IGNhdGNoIChlKSB7XHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tdW5zYWZlLWFueVxyXG4gICAgY29uc3QgZXJyOiBFcnJvciAmIHtjb2RlOiBhbnl9ID0gZVxyXG4gICAgVXRpbC5ub3RpZnlTcGF3bkZhaWwoeyBlcnIsIG9wdHMsIHZlcnMgfSlcclxuICAgIHRocm93IGVcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNoZWNrVmVyc2lvbih7IHZlcnMgfTogeyB2ZXJzOiBudW1iZXJbXSB9KTogdm9pZCB7XHJcbiAgY29uc3QgYXRMZWFzdCA9ICh4OiBudW1iZXJbXSkgPT4gVXRpbC52ZXJzQXRMZWFzdCh2ZXJzLCB4KVxyXG5cclxuICBpZiAoIWF0TGVhc3QoWzAsIDNdKSkge1xyXG4gICAgYXRvbS5ub3RpZmljYXRpb25zLmFkZEVycm9yKFxyXG4gICAgICBgXFxcclxuQXRvbS1oYXNrZWxsLWhzZGV2OiBoc2RldiA8IDAuMyBpcyBub3Qgc3VwcG9ydGVkLiBcXFxyXG5Vc2UgYXQgeW91ciBvd24gcmlzayBvciB1cGRhdGUgeW91ciBoc2RldiBpbnN0YWxsYXRpb25gLFxyXG4gICAgICB7IGRpc21pc3NhYmxlOiB0cnVlIH0sXHJcbiAgICApXHJcbiAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBnZXRWZXJzaW9uKG9wdHM6IFV0aWwuRXhlY09wdHMpOiBQcm9taXNlPEhzRGV2VmVyc2lvbj4ge1xyXG4gIGNvbnN0IHRpbWVvdXQgPSBhdG9tLmNvbmZpZy5nZXQoJ2F0b20taGFza2VsbC1oc2Rldi5pbml0VGltZW91dCcpICogMTAwMFxyXG4gIGNvbnN0IGNtZCA9IGF0b20uY29uZmlnLmdldCgnYXRvbS1oYXNrZWxsLWhzZGV2LmhzZGV2UGF0aCcpXHJcbiAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IFV0aWwuZXhlY1Byb21pc2UoY21kLCBbJ3ZlcnNpb24nXSwgeyB0aW1lb3V0LCAuLi5vcHRzIH0pXHJcbiAgY29uc3QgdmVyc1JhdyA9IC9eKFxcZCspXFwuKFxcZCspXFwuKFxcZCspKD86XFwuKFxcZCspKT8vLmV4ZWMoc3Rkb3V0KVxyXG4gIGlmICghdmVyc1JhdykgeyB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZG4ndCBnZXQgaHNkZXYgdmVyc2lvblwiKSB9XHJcbiAgY29uc3QgdmVycyA9IHZlcnNSYXcuc2xpY2UoMSwgNSkubWFwKChpKSA9PiBwYXJzZUludChpLCAxMCkpXHJcbiAgcmV0dXJuIHsgdmVycyB9XHJcbn1cclxuIl19