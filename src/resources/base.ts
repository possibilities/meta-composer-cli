import { Command } from 'commander'

export interface CommandInfo {
  name: string
  description: string
  arguments?: string[]
}

export interface ResourceModule {
  name: string
  list(...args: any[]): Promise<any>
  show(...args: any[]): Promise<any>
  registerCommands(program: Command): void
  getCommandInfo(): CommandInfo[]
}

export abstract class BaseResourceModule implements ResourceModule {
  constructor(public readonly name: string) {}

  abstract list(...args: any[]): Promise<any>
  abstract show(...args: any[]): Promise<any>
  abstract registerCommands(program: Command): void
  abstract getCommandInfo(): CommandInfo[]
}
