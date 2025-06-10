import { Command } from 'commander'

export interface Module {
  name: string
  registerCommands: (program: Command) => void
}

export class ResourceRegistry {
  private resources = new Map<string, Module>()

  register(resource: Module): void {
    if (this.resources.has(resource.name)) {
      throw new Error(`Resource "${resource.name}" is already registered`)
    }
    this.resources.set(resource.name, resource)
  }

  get(name: string): Module | undefined {
    return this.resources.get(name)
  }

  has(name: string): boolean {
    return this.resources.has(name)
  }

  list(): string[] {
    return Array.from(this.resources.keys())
  }

  clear(): void {
    this.resources.clear()
  }
}

export const registry = new ResourceRegistry()
