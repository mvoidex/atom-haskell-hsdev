import * as Util from '../util'
import { HsDevProcessReal, RunOptions } from './hsdev-process-real'

export type HsDevVersion = { vers: number[] }

export async function createHsDevProcessReal(): Promise<HsDevProcessReal> {
  let opts: RunOptions | undefined
  let vers: HsDevVersion | undefined
  try {
    opts = await Util.getProcessOptions()
    const versP = getVersion(opts)
    vers = await versP
    checkVersion(vers)
    return new HsDevProcessReal(opts)
  } catch (e) {
    // tslint:disable-next-line:no-unsafe-any
    const err: Error & {code: any} = e
    Util.notifySpawnFail({ err, opts, vers })
    throw e
  }
}

function checkVersion({ vers }: { vers: number[] }): void {
  const atLeast = (x: number[]) => Util.versAtLeast(vers, x)

  if (!atLeast([0, 3])) {
    atom.notifications.addError(
      `\
Atom-haskell-hsdev: hsdev < 0.3 is not supported. \
Use at your own risk or update your hsdev installation`,
      { dismissable: true },
    )
  }
}

async function getVersion(opts: Util.ExecOpts): Promise<HsDevVersion> {
  const timeout = atom.config.get('atom-haskell-hsdev.initTimeout') * 1000
  const cmd = atom.config.get('atom-haskell-hsdev.hsdevPath')
  const { stdout } = await Util.execPromise(cmd, ['version'], { timeout, ...opts })
  const versRaw = /^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?/.exec(stdout)
  if (!versRaw) { throw new Error("Couldn't get hsdev version") }
  const vers = versRaw.slice(1, 5).map((i) => parseInt(i, 10))
  return { vers }
}
