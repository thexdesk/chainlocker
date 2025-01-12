import path from 'path'
import fs from 'fs-extra'
import fg from 'fast-glob'
import { $, cd } from 'zx'
import { join } from 'path'

export default async function FileUtils(readPath: string, writePath: string) {
  if (!exists(readPath)) {
    throw new Error(`file-utils: ${readPath} does not exist`)
  }
  if (!exists(writePath)) {
    throw new Error(`file-utils: ${writePath} path does not exist`)
  }
  let file = {
    async open(encoding: BufferEncoding = 'utf8') {
      return await read(readPath, encoding)
    },
    async save(data: any) {
      return await write(writePath, data)
    },
    change: {
      async readFile(readPath: string) {
        return await FileUtils(readPath, writePath)
      },
      async writeFile(writePath: string, data: any) {
        return await (await FileUtils(readPath, writePath)).save(data)
      },
    },
    JSON: await jsonRead(readPath),
  }
  return file
}

export function interpretPath(...args: string[]) {
  return path.join($.cwd || process.cwd(), ...(args ?? ''))
}

export const readDirectorySync = (directory: string, allFiles: string[] = []) => {
  const files = fs.readdirSync(directory).map((file) => join(directory, file))
  allFiles.push(...files)
  files.forEach((file) => {
    fs.statSync(file).isDirectory() && readDirectorySync(file, allFiles)
  })
  return allFiles
}

export function exists(path: string) {
  path = interpretPath(path)
  return fs.existsSync(path)
}

export async function remove(path: string) {
  path = interpretPath(path)
  return fs.remove(interpretPath(path))
}

export async function read(path: string, encoding?: BufferEncoding) {
  path = interpretPath(path)
  return fs.readFile(path, encoding ?? 'utf-8')
}

read.sync = function (...args: any) {
  const path = interpretPath(args)
  return fs.readFileSync(path, 'utf-8')
}

export async function mkdir(...path: string[]) {
  let input = interpretPath(...path)
  return fs.mkdir(input)
}
export async function write(path: any, content: any) {
  return fs.writeFile(interpretPath(path), content, 'utf-8')
}

write.sync = function (path: any, content: string | NodeJS.ArrayBufferView) {
  return fs.writeFileSync(interpretPath(path), content, 'utf-8')
}

async function jsonRead(path: string) {
  path = interpretPath(path)
  return fs.readJSON(path)
}

jsonRead.sync = function (path: string) {
  path = interpretPath(path)
  return fs.readJSONSync(path)
}

read.json = jsonRead

export function glob(args: string[]) {
  const input = args.map((path) => interpretPath(path))
  return fg(input, { cwd: interpretPath() })
}

export { cd, fs, fg }
