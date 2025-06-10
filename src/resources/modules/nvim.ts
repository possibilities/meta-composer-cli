import { BaseResourceModule, CommandInfo } from '../base.js'
import { Command } from 'commander'

export class NvimResource extends BaseResourceModule {
  constructor() {
    super('nvim')
  }

  async list(): Promise<string> {
    throw new Error('Not implemented')
  }

  async show(): Promise<string> {
    throw new Error('Not implemented')
  }

  async getInfo(): Promise<string> {
    throw new Error('Not implemented')
  }

  registerCommands(program: Command): void {
    const nvimCmd = program.command(this.name).description('Neovim information')

    nvimCmd
      .command('get-info')
      .description('Get Neovim configuration and plugin information')
      .allowExcessArguments(false)
      .action(async () => {
        try {
          const result = await this.getInfo()
          console.log(result)
        } catch (error) {
          console.error(`Error getting ${this.name} info:`, error)
          process.exit(1)
        }
      })
  }

  getCommandInfo(): CommandInfo[] {
    return [
      {
        name: 'get-info',
        description: 'Get Neovim configuration and plugin information',
      },
    ]
  }
}
