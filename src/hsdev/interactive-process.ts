import { Emitter, CompositeDisposable } from 'atom'
import { debug, warn, mkError, EOT } from '../util'
import { EOL } from 'os'
import * as CP from 'child_process'
import Queue = require('promise-queue')
import pidusage = require('pidusage')

(Symbol as any).asyncIterator = Symbol.asyncIterator || Symbol.for('Symbol.asyncIterator')

export class InteractiveProcess {
  private disposables: CompositeDisposable
  private emitter: Emitter<{}, {
    'did-exit': number
  }>
  private proc: CP.ChildProcess
  private timer: number | undefined
  private requestQueue: Queue

  constructor(path: string, cmd: string[], options?: { cwd: string }) {
    this.disposables = new CompositeDisposable()
    this.emitter = new Emitter()
    this.disposables.add(this.emitter)
    this.requestQueue = new Queue(1, 100)

    debug(`Spawning new hsdev instance with options = `, options)
    this.proc = CP.spawn(path, cmd, options)
    this.proc.stdout.setEncoding('utf-8')
    this.proc.stderr.setEncoding('utf-8')
    this.proc.setMaxListeners(100)
    this.proc.stdout.setMaxListeners(100)
    this.proc.stderr.setMaxListeners(100)
    this.resetTimer()
    this.proc.once('exit', (code) => {
      this.timer && window.clearTimeout(this.timer)
      debug(`hsdev ended with ${code}`)
      this.emitter.emit('did-exit', code)
      this.disposables.dispose()
    })
  }

  public onceExit(action: (code: number) => void) {
    return this.emitter.once('did-exit', action)
  }

  public async kill(): Promise<number> {
    this.proc.stdin.end()
    this.proc.kill()
    return new Promise<number>((resolve) => {
      this.proc.once('exit', (code) => resolve(code))
    })
  }

  public async interact(
    command: string, args: string[], data?: string,
  ): Promise<{ stdout: string[], stderr: string[] }> {
    return this.requestQueue.add(async () => {
      this.proc.stdout.pause()
      this.proc.stderr.pause()

      pidusage.stat(this.proc.pid, (err, stat) => {
        if (err) {
          warn(err)
          return
        }
        if (stat.memory > atom.config.get('atom-haskell-hsdev.maxMemMegs') * 1024 * 1024) {
          this.proc.kill()
        }
      })

      debug(`Started interactive action block`)
      debug(`Running interactive command ${command} ${args} ${data ? 'with' : 'without'} additional data`)
      let ended = false
      try {
        const isEnded = () => ended
        const stderr: string[] = []
        const stdout: string[] = []
        setImmediate(async () => {
          for await (const line of this.readgen(this.proc.stderr, isEnded)) {
            stderr.push(line)
          }
        })
        const readOutput = async () => {
          for await (const line of this.readgen(this.proc.stdout, isEnded)) {
            debug(`Got response from hsdev: ${line}`)
            if (line === 'OK') {
              ended = true
            } else {
              stdout.push(line)
            }
          }
          return { stdout, stderr }
        }
        const exitEvent = async () => new Promise<never>((_resolve, reject) => {
          this.proc.once('exit', () => {
            warn(stdout.join('\n'))
            reject(mkError('GHCModInteractiveCrash', `${stdout}\n\n${stderr}`))
          })
        })
        const timeoutEvent = async () => new Promise<never>((_resolve, reject) => {
          const tml: number = atom.config.get('atom-haskell-hsdev.interactiveActionTimeout')
          if (tml) {
            setTimeout(
              () => {
                reject(mkError('InteractiveActionTimeout', `${stdout}\n\n${stderr}`))
              },
              tml * 1000,
            )
          }
        })

        const args2 = [command, ...args]
        debug(`Running hsdev command ${command}`, ...args)
        this.proc.stdin.write(`${args2.join(' ').replace(/(?:\r?\n|\r)/g, ' ')}${EOL}`)
        if (data) {
          debug('Writing data to stdin...')
          this.proc.stdin.write(`${data}${EOT}`)
        }
        return await Promise.race([readOutput(), exitEvent(), timeoutEvent()])
      } catch (error) {
        // tslint:disable-next-line:no-unsafe-any
        if (error.name === 'InteractiveActionTimeout') {
          this.proc.kill()
        }
        throw error
      } finally {
        debug(`Ended interactive action block`)
        ended = true
        this.proc.stdout.resume()
        this.proc.stderr.resume()
      }
    })
  }

  public async readLine() {
    return this.requestQueue.add(async () => {
      let ended = false
      const isEnded = () => ended
      const stdout: string[] = []
      const stderr: string[] = []

      const readOutput = async () => {
        for await (const line of this.readgen(this.proc.stdout, isEnded)) {
          stdout.push(line)
          ended = true
        }
        return { stdout, stderr }
      }
      const exitEvent = async () => new Promise<never>((_resolve, reject) => {
        this.proc.once('exit', () => {
          warn(stdout.join('\n'))
          reject(mkError('GHCModInteractiveCrash', `${stdout}\n\n${stderr}`))
        })
      })
      const timeoutEvent = async () => new Promise<never>((_resolve, reject) => {
        const tml: number = atom.config.get('atom-haskell-hsdev.interactiveActionTimeout')
        if (tml) {
          setTimeout(
            () => {
              reject(mkError('InteractiveActionTimeout', `${stdout}\n\n${stderr}`))
            },
            tml * 1000,
          )
        }
      })

      return await Promise.race([readOutput(), exitEvent(), timeoutEvent()])
    })
  }

  private resetTimer() {
    if (this.timer) {
      clearTimeout(this.timer)
    }
    const tml = atom.config.get('atom-haskell-hsdev.interactiveInactivityTimeout')
    if (tml) {
      // tslint:disable-next-line: no-floating-promises
      this.timer = window.setTimeout(() => { this.kill() }, tml * 60 * 1000)
    }
  }

  private async waitReadable(stream: NodeJS.ReadableStream) {
    return new Promise((resolve) => stream.once('readable', () => {
      resolve()
    }))
  }

  private async *readgen(out: NodeJS.ReadableStream, isEnded: () => boolean) {
    let buffer = ''
    while (!isEnded()) {
      const read = out.read() as (string | null)
      // tslint:disable-next-line: no-null-keyword
      if (read !== null) {
        buffer += read
        if (buffer.includes(EOL)) {
          const arr = buffer.split(EOL)
          buffer = arr.pop() || ''
          yield* arr
        }
      } else {
        await this.waitReadable(out)
      }
    }
    if (buffer) { out.unshift(buffer) }
  }
}
