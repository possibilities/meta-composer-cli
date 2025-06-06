import { createProgram } from './cli/parser.js'
import { registry } from './resources/index.js'
import { ShadcnResource } from './resources/modules/shadcn.js'

export async function main() {
  // Register available resources
  registry.register(new ShadcnResource())

  const program = createProgram()

  // Register commands from all resources
  for (const resource of registry.list()) {
    const resourceModule = registry.get(resource)
    if (resourceModule) {
      resourceModule.registerCommands(program)
    }
  }

  try {
    await program.parseAsync(process.argv)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main().catch(error => {
  console.error('Failed to start CLI:', error)
  process.exit(1)
})
