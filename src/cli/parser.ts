import { Command } from 'commander'
import { handleList } from './commands/list.js'
import { handleShow } from './commands/show.js'

export function createProgram(): Command {
  const program = new Command()

  program
    .name('meta-composer')
    .description('CLI tool for meta composition')
    .version('0.1.0')

  program
    .command('list <resource> <category>')
    .description('List resources of a specific category')
    .action((resource: string, category: string) => {
      handleList(resource, category, { resource, category })
    })

  program
    .command('show <resource> <id...>')
    .description('Show one or more resources by ID')
    .action((resource: string, ids: string[]) => {
      handleShow(resource, ids, { resource, ids })
    })

  return program
}
