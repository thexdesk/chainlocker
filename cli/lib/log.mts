import { chalk } from 'zx'
import rainbowRoad from './rainbowRoad.mjs'

export default (
  message: string,
  options: { level: 'info' | 'success' | 'warning' | 'danger'; docs?: string; padding?: any; tools?: any[] }
) => {
  const colors = {
    info: 'blue',
    success: 'green',
    warning: 'yellowBright',
    danger: 'red',
  }

  const titles = {
    info: '❱ Info',
    success: '❱ Ok',
    warning: '❱ Warning',
    danger: '❱ Error',
  }

  const color = options.level ? colors[options.level] : 'gray'
  const title = options.level ? titles[options.level] : 'Help'
  const docs = options.docs || undefined

  console.log(`\n${options.padding || ''}${rainbowRoad()}\n`)
  //@ts-ignore
  console.log(`${options.padding || ''}${chalk[color](`${title}:`)}\n`)
  console.log(`${options.padding || ''}${chalk.white(message)}\n`)
  console.log(`${options.padding || ''}${chalk.grey('---')}\n`)
  if (docs) {
    console.log(`${options.padding || ''}${chalk.white('Relevant Documentation:')}\n`)
    console.log(`${options.padding || ''}${chalk.blue(docs)}\n`)
    console.log(`${options.padding || ''}${chalk.white('Stuck? Ask a Question:')}\n`)
  }
  if (options.tools && Array.isArray(options.tools)) {
    console.log(`${options.padding || ''}${chalk.white('Current comands:')}\n`)
    options.tools.forEach((tool: any) => {
      console.log(`${options.padding || ''}${chalk.blue(`${tool.title} — ${tool.text}`)}\n`)
    })
  }

  console.log(`${options.padding || ''}${rainbowRoad()}\n`)
}
