import { Command } from 'commander'

export function createProgram(): Command {
  const program = new Command()

  program
    .name('meta-composer')
    .description(
      'A tool for composing and traversing arbitrary information. Possibly the worst named tool mankind will ever know.',
    )
    .version('0.1.0')

  // Customize help to show commands in desired format
  program.configureHelp({
    subcommandTerm: cmd => {
      // For list and show commands, display with usage info
      if (cmd.name() === 'list') {
        const shadcnCmd = cmd.commands.find(
          subcmd => subcmd.name() === 'shadcn',
        )
        if (shadcnCmd) {
          return `list shadcn core`
        }
      } else if (cmd.name() === 'show') {
        const shadcnCmd = cmd.commands.find(
          subcmd => subcmd.name() === 'shadcn',
        )
        if (shadcnCmd) {
          return `show shadcn core <name>`
        }
      }
      return cmd.name()
    },
  })

  return program
}
