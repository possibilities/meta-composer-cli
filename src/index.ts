import { createProgram } from './cli/parser.js'

export async function main() {
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
