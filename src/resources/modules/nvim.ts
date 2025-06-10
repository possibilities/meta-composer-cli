import { Command } from 'commander'

async function getInfo(): Promise<string> {
  throw new Error('Not implemented')
}

export function registerNvimCommands(program: Command): void {
  const nvimCmd = program.command('nvim').description('Neovim information')

  nvimCmd
    .command('get-info')
    .description('Get Neovim configuration and plugin information')
    .allowExcessArguments(false)
    .action(async () => {
      try {
        const result = await getInfo()
        console.log(result)
      } catch (error) {
        console.error('Error getting nvim info:', error)
        process.exit(1)
      }
    })
}

export const nvimModule = {
  name: 'nvim',
  registerCommands: registerNvimCommands,
}
