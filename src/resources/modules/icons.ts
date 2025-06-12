import { execSync } from 'child_process'
import dedent from 'dedent'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import * as yaml from 'js-yaml'
import { Command } from 'commander'
import {
  getCommandMetadata,
  getSubcommandDescription,
} from '../metadata-loader'

type ListType = 'names' | 'categories' | 'tags'
type ShowType = 'category' | 'tag'

interface IconMetadata {
  name: string
  tags?: string[]
  categories?: string[]
}

const cacheDir = join(
  homedir(),
  '.meta-composer',
  'cache',
  'resources',
  'icons',
  'lucide',
)
const repoDir = join(cacheDir, 'lucide-icons-repo')
const metadataDir = join(cacheDir, 'lucide-icons-metadata')

function ensureCacheDirectory(): void {
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true })
  }
}

function isCacheWarmed(): boolean {
  return existsSync(metadataDir) && existsSync(join(metadataDir, 'icons.yaml'))
}

function cloneLucideRepo(): void {
  const repoUrl = 'https://github.com/lucide-icons/lucide.git'

  if (existsSync(repoDir)) {
    console.log(`Lucide repository already exists at ${repoDir}`)
    return
  }

  console.log(`Cloning Lucide repository from ${repoUrl} to ${repoDir}...`)
  execSync(`git clone ${repoUrl} ${repoDir}`, { stdio: 'inherit' })
  console.log('Lucide repository cloned successfully')
}

function processLucideIcons(): void {
  const lucideIconsDir = join(repoDir, 'icons')

  if (existsSync(metadataDir) && existsSync(join(metadataDir, 'icons.yaml'))) {
    console.log(`Icons metadata already exists at ${metadataDir}`)
    return
  }

  console.log(`Processing icons to ${metadataDir}...`)
  mkdirSync(metadataDir, { recursive: true })

  const iconsMetadata: IconMetadata[] = []

  const files = readdirSync(lucideIconsDir).filter(f => f.endsWith('.json'))

  for (const filename of files) {
    const filePath = join(lucideIconsDir, filename)
    const iconName = filename.replace('.json', '')

    try {
      const fileContent = readFileSync(filePath, 'utf-8')
      const iconData = JSON.parse(fileContent)

      const metadata: IconMetadata = { name: iconName }

      if (iconData.tags) {
        metadata.tags = iconData.tags
      }

      if (iconData.categories) {
        metadata.categories = iconData.categories
      }

      iconsMetadata.push(metadata)
      console.log(`Processed ${iconName} icon`)
    } catch (error) {
      console.error(`Error parsing JSON for ${filename}, skipping`)
    }
  }

  const outputPath = join(metadataDir, 'icons.yaml')
  writeFileSync(outputPath, yaml.dump(iconsMetadata, { sortKeys: false }))

  console.log(`Processed ${iconsMetadata.length} icons`)
}

function warmCache(): void {
  console.log('Warming cache...')
  ensureCacheDirectory()
  cloneLucideRepo()
  processLucideIcons()
  console.log('Cache warming completed')
}

export async function listIcons(listType: ListType): Promise<string> {
  ensureCacheDirectory()

  if (!isCacheWarmed()) {
    console.log('Cache is not warmed. Warming cache now...')
    warmCache()
  }

  const yamlContent = readFileSync(join(metadataDir, 'icons.yaml'), 'utf-8')
  const iconsData = yaml.load(yamlContent) as IconMetadata[]

  switch (listType) {
    case 'names':
      return iconsData.map(icon => `- ${icon.name}`).join('\n')

    case 'tags': {
      const tags = new Set<string>()
      iconsData.forEach(icon => {
        icon.tags?.forEach(tag => tags.add(tag))
      })
      return Array.from(tags)
        .sort()
        .map(tag => `- ${tag}`)
        .join('\n')
    }

    case 'categories': {
      const categories = new Set<string>()
      iconsData.forEach(icon => {
        icon.categories?.forEach(cat => categories.add(cat))
      })
      return Array.from(categories)
        .sort()
        .map(cat => `- ${cat}`)
        .join('\n')
    }
  }
}

export async function showIconsByFilter(
  showType: ShowType,
  filterValue: string,
): Promise<string> {
  ensureCacheDirectory()

  if (!isCacheWarmed()) {
    console.log('Cache is not warmed. Warming cache now...')
    warmCache()
  }

  const yamlContent = readFileSync(join(metadataDir, 'icons.yaml'), 'utf-8')
  const iconsData = yaml.load(yamlContent) as IconMetadata[]

  let matchingIcons: string[] = []

  switch (showType) {
    case 'category':
      matchingIcons = iconsData
        .filter(icon => icon.categories?.includes(filterValue))
        .map(icon => icon.name)
      break
    case 'tag':
      matchingIcons = iconsData
        .filter(icon => icon.tags?.includes(filterValue))
        .map(icon => icon.name)
      break
  }

  if (matchingIcons.length === 0) {
    return `No icons found for ${showType}: ${filterValue}`
  }

  return matchingIcons.map(name => `- ${name}`).join('\n')
}

export async function readAboutReactUsage(): Promise<string> {
  ensureCacheDirectory()

  if (!existsSync(repoDir)) {
    console.log('Lucide repository not found. Warming cache now...')
    warmCache()
  }

  const reactDocsPath = join(repoDir, 'docs/guide/packages/lucide-react.md')

  if (existsSync(reactDocsPath)) {
    const content = readFileSync(reactDocsPath, 'utf-8')
    return content.trim()
  } else {
    throw new Error(
      'React usage documentation not found. Please ensure the Lucide repository is cloned.',
    )
  }
}

export function registerLucideCommands(program: Command): void {
  const metadata = getCommandMetadata('lucide')

  const lucideCmd = program.command('lucide').description(metadata.description)

  lucideCmd
    .command('list-icons')
    .description(getSubcommandDescription('lucide', 'list-icons'))
    .allowExcessArguments(false)
    .action(async () => {
      try {
        const results = await listIcons('names')
        if (results) {
          console.log(results)
        }
      } catch (error) {
        console.error('Error listing icons:', error)
        process.exit(1)
      }
    })

  lucideCmd
    .command('list-icon-categories')
    .description(getSubcommandDescription('lucide', 'list-icon-categories'))
    .allowExcessArguments(false)
    .action(async () => {
      try {
        const results = await listIcons('categories')
        if (results) {
          console.log(results)
        }
      } catch (error) {
        console.error('Error listing icon categories:', error)
        process.exit(1)
      }
    })

  lucideCmd
    .command('list-icon-tags')
    .description(getSubcommandDescription('lucide', 'list-icon-tags'))
    .allowExcessArguments(false)
    .action(async () => {
      try {
        const results = await listIcons('tags')
        if (results) {
          console.log(results)
        }
      } catch (error) {
        console.error('Error listing icon tags:', error)
        process.exit(1)
      }
    })

  lucideCmd
    .command('list-icons-for-category <category>')
    .description(getSubcommandDescription('lucide', 'list-icons-for-category'))
    .allowExcessArguments(false)
    .action(async (category: string) => {
      try {
        const result = await showIconsByFilter('category', category)
        if (result) {
          console.log(result)
        }
      } catch (error) {
        console.error('Error listing icons for category:', error)
        process.exit(1)
      }
    })

  lucideCmd
    .command('list-icons-for-tag <tag>')
    .description(getSubcommandDescription('lucide', 'list-icons-for-tag'))
    .allowExcessArguments(false)
    .action(async (tag: string) => {
      try {
        const result = await showIconsByFilter('tag', tag)
        if (result) {
          console.log(result)
        }
      } catch (error) {
        console.error('Error listing icons for tag:', error)
        process.exit(1)
      }
    })

  lucideCmd
    .command('read-about-react-usage')
    .description(getSubcommandDescription('lucide', 'read-about-react-usage'))
    .allowExcessArguments(false)
    .action(async () => {
      try {
        const result = await readAboutReactUsage()
        console.log(result)
      } catch (error) {
        console.error('Error reading React usage documentation:', error)
        process.exit(1)
      }
    })
}

export const lucideModule = {
  name: 'lucide',
  registerCommands: registerLucideCommands,
  instructions: getCommandMetadata('lucide').instructions,
}
