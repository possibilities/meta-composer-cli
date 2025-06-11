import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as yaml from 'js-yaml'

export interface CommandMetadata {
  description: string
  instructions?: string
  commands: Record<string, string>
}

export interface Metadata {
  [commandName: string]: CommandMetadata
}

let metadataCache: Metadata | null = null

export function loadMetadata(): Metadata {
  if (metadataCache) {
    return metadataCache
  }

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  // Try multiple paths to find meta.yaml
  const possiblePaths = [
    // Production: in the same directory as the bundled JS
    join(__dirname, 'meta.yaml'),
    // Development: at the project root
    join(__dirname, '..', '..', 'meta.yaml'),
  ]

  let content: string | undefined

  for (const path of possiblePaths) {
    try {
      content = readFileSync(path, 'utf-8')
      break
    } catch {
      // Continue to next path
    }
  }

  if (!content) {
    throw new Error('meta.yaml not found in any expected location')
  }

  metadataCache = yaml.load(content) as Metadata

  return metadataCache
}

export function getCommandMetadata(commandName: string): CommandMetadata {
  const metadata = loadMetadata()

  if (!metadata[commandName]) {
    throw new Error(`Command "${commandName}" not found in meta.yaml`)
  }

  return metadata[commandName]
}

export function getSubcommandDescription(
  commandName: string,
  subcommandName: string,
): string {
  const commandMetadata = getCommandMetadata(commandName)

  if (!commandMetadata.commands[subcommandName]) {
    throw new Error(
      `Subcommand "${subcommandName}" not found for command "${commandName}" in meta.yaml`,
    )
  }

  return commandMetadata.commands[subcommandName]
}

export function validateCommand(commandName: string): void {
  getCommandMetadata(commandName)
}

export function validateSubcommand(
  commandName: string,
  subcommandName: string,
): void {
  getSubcommandDescription(commandName, subcommandName)
}
