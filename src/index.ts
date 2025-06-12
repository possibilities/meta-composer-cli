import { createProgram } from './cli/parser'
import {
  registry,
  shadcnModule,
  openAPIModule,
  lucideModule,
  nvimModule,
  tmuxModule,
} from './resources/index'

export async function main() {
  // Register available resources
  registry.register(shadcnModule)
  registry.register(openAPIModule)
  registry.register(lucideModule)
  registry.register(nvimModule)
  registry.register(tmuxModule)

  const program = createProgram()

  // Register commands from all resources
  for (const resource of registry.list()) {
    const resourceModule = registry.get(resource)
    if (resourceModule) {
      resourceModule.registerCommands(program)
    }
  }

  try {
    // Enable strict mode for better error handling
    program.exitOverride()
    program.configureOutput({
      writeErr: str => process.stderr.write(str),
    })

    await program.parseAsync(process.argv)
  } catch (error: any) {
    // Commander throws specific errors that should exit cleanly
    if (
      error.code === 'commander.excessArguments' ||
      error.code === 'commander.help' ||
      error.code === 'commander.helpDisplayed'
    ) {
      // These errors are already formatted by Commander
      process.exit(0)
    }
    console.error('Error:', error.message || error)
    process.exit(1)
  }
}

main().catch(error => {
  console.error('Failed to start CLI:', error)
  process.exit(1)
})
