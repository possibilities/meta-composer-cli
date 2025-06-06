import { Command } from 'commander'
import { handleBuild } from './commands/build.js'
import { handleList } from './commands/list.js'
import { handlePeek } from './commands/peek.js'
import { handleShow } from './commands/show.js'

export function createProgram(): Command {
  const program = new Command()

  program
    .name('meta-composer')
    .description('CLI tool for meta composition')
    .version('0.1.0')

  program
    .command('build <resource> <category>')
    .description('Build a resource of a specific category')
    .action((resource: string, category: string) => {
      handleBuild(resource, category, { resource, category })
    })

  program
    .command('list <resource> <category>')
    .description('List resources of a specific category')
    .action((resource: string, category: string) => {
      handleList(resource, category, { resource, category })
    })

  program
    .command('peek <resource> <id...>')
    .description('Peek at one or more resources by ID')
    .action((resource: string, ids: string[]) => {
      handlePeek(resource, ids, { resource, ids })
    })

  program
    .command('show <resource> <id...>')
    .description('Show one or more resources by ID')
    .action((resource: string, ids: string[]) => {
      handleShow(resource, ids, { resource, ids })
    })

  return program
}
