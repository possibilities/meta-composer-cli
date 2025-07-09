import { Command } from 'commander'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import yaml from 'js-yaml'
import {
  getCommandMetadata,
  getSubcommandDescription,
} from '../metadata-loader'

interface PackageJson {
  name?: string
  description?: string
  homepage?: string
  repository?: string | { type?: string; url?: string }
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
}

async function getInfo(): Promise<string> {
  const projectPath = process.cwd()
  const packageJsonPath = join(projectPath, 'package.json')

  if (!existsSync(packageJsonPath)) {
    console.log('No dependency information found')
    process.exit(0)
  }

  const packageJson: PackageJson = JSON.parse(
    readFileSync(packageJsonPath, 'utf8'),
  )

  const info: any = {
    project: packageJson.name || 'unnamed',
  }

  if (packageJson.scripts && Object.keys(packageJson.scripts).length > 0) {
    info.scripts = packageJson.scripts
  }

  if (
    packageJson.dependencies &&
    Object.keys(packageJson.dependencies).length > 0
  ) {
    const dependencies: Record<string, string> = {}

    for (const [name] of Object.entries(packageJson.dependencies)) {
      dependencies[name] = await getDependencyInfo(name)
    }

    info.dependencies = dependencies
  }

  return yaml.dump(info, { indent: 2, lineWidth: -1 })
}

function extractRepositoryUrl(
  repo: string | { type?: string; url?: string } | undefined,
): string | undefined {
  if (!repo) return undefined
  if (typeof repo === 'string') return repo
  return repo.url
}

function formatContext7Id(name: string): string {
  if (name.startsWith('@')) {
    return name.replace('@', '/')
  }

  const knownPackages: Record<string, string> = {
    commander: '/tj/commander.js',
    prompts: '/terkelg/prompts',
  }

  if (knownPackages[name]) {
    return knownPackages[name]
  }

  return `/${name}/${name}`
}

async function getDependencyInfo(name: string): Promise<string> {
  const lines: string[] = []

  try {
    const depPackageJsonPath = join(
      process.cwd(),
      'node_modules',
      name,
      'package.json',
    )
    if (existsSync(depPackageJsonPath)) {
      const depPackageJson: PackageJson = JSON.parse(
        readFileSync(depPackageJsonPath, 'utf8'),
      )

      const description = depPackageJson.description || 'No description'
      lines.push(`# ${description}`)

      const context7Id = formatContext7Id(name)
      lines.push(`- Use context7 tool for documentation with id ${context7Id}`)

      const repoUrl = extractRepositoryUrl(depPackageJson.repository)
      if (repoUrl) {
        const cleanUrl = repoUrl
          .replace('git+', '')
          .replace('git:', 'https:')
          .replace('.git', '')
          .replace('git@github.com:', 'https://github.com/')
        lines.push(`- Use kit tool to explore the repo at ${cleanUrl}`)
      }

      if (depPackageJson.homepage && depPackageJson.homepage !== repoUrl) {
        lines.push(`- Visit the project homepage at ${depPackageJson.homepage}`)
      }
    } else {
      lines.push('# Package information not available')
    }
  } catch (error) {
    lines.push('# Error reading package information')
  }

  return lines.join('\n')
}

export function registerProjectCommands(program: Command): void {
  const metadata = getCommandMetadata('project')

  const projectCmd = program
    .command('project')
    .description(metadata.description)

  projectCmd
    .command('get-info')
    .description(getSubcommandDescription('project', 'get-info'))
    .allowExcessArguments(false)
    .action(async () => {
      const result = await getInfo()
      console.log(result)
    })
}

export const projectModule = {
  name: 'project',
  registerCommands: registerProjectCommands,
  instructions: getCommandMetadata('project').instructions,
}
