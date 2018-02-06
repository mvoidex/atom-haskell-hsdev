import { File, Directory } from 'atom'
import * as Util from '../util'

export interface HsDevSettings {
  disable?: boolean
  suppressErrors?: boolean
  ghcOptions?: string[]
  ghcModOptions?: string[]
}

export async function getSettings(runDir: Directory): Promise<HsDevSettings> {
  const localSettings = readSettings(runDir.getFile('.atom-haskell-hsdev.json'))

  const [projectDir] = atom.project.getDirectories().filter((d) => d.contains(runDir.getPath()))
  const projectSettings =
    projectDir ?
      readSettings(projectDir.getFile('.atom-haskell-hsdev.json'))
      :
      Promise.resolve({})

  const configDir = new Directory(atom.getConfigDirPath())
  const globalSettings = readSettings(configDir.getFile('atom-haskell-hsdev.json'))

  const [glob, prj, loc] = await Promise.all([globalSettings, projectSettings, localSettings])
  return { ...glob, ...prj, ...loc }
}

async function readSettings(file: File): Promise<HsDevSettings> {
  try {
    const ex = await file.exists()
    if (ex) {
      const contents = await file.read()
      try {
        // tslint:disable-next-line:no-unsafe-any
        return JSON.parse(contents)
      } catch (err) {
        atom.notifications.addError(`Failed to parse ${file.getPath()}`, {
          detail: err,
          dismissable: true,
        })
        throw err
      }
    } else {
      return {}
    }
  } catch (error) {
    if (error) { Util.warn(error) }
    return {}
  }
}
