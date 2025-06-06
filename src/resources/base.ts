import { Command } from 'commander'

export interface ResourceModule {
  name: string
  list(category: string, options?: any): Promise<any>
  show(...ids: string[]): Promise<any>
  registerCommands(program: Command): void
}

export abstract class BaseResourceModule implements ResourceModule {
  constructor(public readonly name: string) {}

  abstract list(category: string, options?: any): Promise<any>
  abstract show(...ids: string[]): Promise<any>

  registerCommands(program: Command): void {
    // Get or create list command
    let listCmd = program.commands.find(cmd => cmd.name() === 'list')
    if (!listCmd) {
      listCmd = new Command('list')
      listCmd.summary(`List ${this.name}s`)
      program.addCommand(listCmd)
    }

    // Add resource-specific list subcommand
    listCmd
      .command(`${this.name} <category>`)
      .description(`List ${this.name}s of a specific category`)
      .action(async (category: string) => {
        try {
          const results = await this.list(category)
          console.log(JSON.stringify(results, null, 2))
        } catch (error) {
          console.error(`Error listing ${this.name}:`, error)
          process.exit(1)
        }
      })

    // Get or create show command
    let showCmd = program.commands.find(cmd => cmd.name() === 'show')
    if (!showCmd) {
      showCmd = new Command('show')
      showCmd.summary(`Show ${this.name}s`)
      program.addCommand(showCmd)
    }

    // Add resource-specific show subcommand
    showCmd
      .command(`${this.name} <id...>`)
      .description(`Show one or more ${this.name}s by ID`)
      .action(async (ids: string[]) => {
        try {
          const results = await this.show(...ids)
          console.log(JSON.stringify(results, null, 2))
        } catch (error) {
          console.error(`Error showing ${this.name}:`, error)
          process.exit(1)
        }
      })
  }
}
