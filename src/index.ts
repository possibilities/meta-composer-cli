import { createProgram } from './cli/parser.js'
import { registry } from './resources/index.js'
import { ExampleResource } from './resources/modules/example.js'

export async function main() {
  // Register available resources
  registry.register(new ExampleResource())

  const program = createProgram()

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
