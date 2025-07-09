import { createProgram } from './cli/parser'
import {
  registry,
  shadcnModule,
  openAPIModule,
  lucideModule,
  nvimModule,
  tmuxModule,
  projectModule,
} from './resources/index'

export async function main() {
  registry.register(shadcnModule)
  registry.register(openAPIModule)
  registry.register(lucideModule)
  registry.register(nvimModule)
  registry.register(tmuxModule)
  registry.register(projectModule)

  const program = createProgram()

  for (const resource of registry.list()) {
    const resourceModule = registry.get(resource)
    if (resourceModule) {
      resourceModule.registerCommands(program)
    }
  }

  try {
    program.exitOverride()
    program.configureOutput({
      writeErr: str => process.stderr.write(str),
    })

    await program.parseAsync(process.argv)
  } catch (error: any) {
    if (
      error.code === 'commander.excessArguments' ||
      error.code === 'commander.help' ||
      error.code === 'commander.helpDisplayed' ||
      error.code === 'commander.version'
    ) {
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
