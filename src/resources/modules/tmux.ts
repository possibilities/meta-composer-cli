import { BaseResourceModule, CommandInfo } from '../base.js'
import { Command } from 'commander'

export class TmuxResource extends BaseResourceModule {
  constructor() {
    super('tmux')
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
    const tmuxCmd = program.command(this.name).description('tmux information')

    tmuxCmd
      .command('get-info')
      .description('Get tmux configuration and session information')
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
        description: 'Get tmux configuration and session information',
      },
    ]
  }
}
