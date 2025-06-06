import { ResourceModule } from './base'

export class ResourceRegistry {
  private resources = new Map<string, ResourceModule>()

  register(resource: ResourceModule): void {
    if (this.resources.has(resource.name)) {
      throw new Error(`Resource "${resource.name}" is already registered`)
    }
    this.resources.set(resource.name, resource)
  }

  get(name: string): ResourceModule | undefined {
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
