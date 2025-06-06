import { Command } from 'commander'

export function createProgram(): Command {
  const program = new Command()

  program
    .name('meta-composer')
    .description('CLI tool for meta composition')
    .version('0.1.0')

  // Customize help to show commands in desired format
  program.configureHelp({
    subcommandTerm: cmd => {
      // For list and show commands, display with their subcommands
      if (cmd.name() === 'list' || cmd.name() === 'show') {
        const subcommands = cmd.commands.map(subcmd => subcmd.name()).join(', ')
        if (subcommands) {
          return `${cmd.name()} ${subcommands}`
        }
      }
      return cmd.name()
    },
  })

  return program
}
