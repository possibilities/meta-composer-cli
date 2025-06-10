import { Command } from 'commander'

async function getInfo(): Promise<string> {
  throw new Error('Not implemented')
}

export function registerTmuxCommands(program: Command): void {
  const tmuxCmd = program.command('tmux').description('tmux information')

  tmuxCmd
    .command('get-info')
    .description('Get tmux configuration and session information')
    .allowExcessArguments(false)
    .action(async () => {
      try {
        const result = await getInfo()
        console.log(result)
      } catch (error) {
        console.error('Error getting tmux info:', error)
        process.exit(1)
      }
    })
}

export const tmuxModule = {
  name: 'tmux',
  registerCommands: registerTmuxCommands,
}
