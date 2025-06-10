import { execSync } from 'child_process'
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
  'lucid',
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
    console.log(`Lucide icons metadata already exists at ${metadataDir}`)
    return
  }

  console.log(`Processing Lucide icons to ${metadataDir}...`)
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

  console.log(`Processed ${iconsMetadata.length} Lucide icons`)
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

export function registerLucidCommands(program: Command): void {
  const lucidCmd = program.command('lucid').description('Lucide icons')

  lucidCmd
    .command('list-icons')
    .description('List all Lucide icons')
    .allowExcessArguments(false)
    .action(async () => {
      try {
        const results = await listIcons('names')
        if (results) {
          console.log(results)
        }
      } catch (error) {
        console.error('Error listing lucid icons:', error)
        process.exit(1)
      }
    })

  lucidCmd
    .command('list-icon-categories')
    .description('List all Lucide icon categories')
    .allowExcessArguments(false)
    .action(async () => {
      try {
        const results = await listIcons('categories')
        if (results) {
          console.log(results)
        }
      } catch (error) {
        console.error('Error listing lucid icon categories:', error)
        process.exit(1)
      }
    })

  lucidCmd
    .command('list-icon-tags')
    .description('List all Lucide icon tags')
    .allowExcessArguments(false)
    .action(async () => {
      try {
        const results = await listIcons('tags')
        if (results) {
          console.log(results)
        }
      } catch (error) {
        console.error('Error listing lucid icon tags:', error)
        process.exit(1)
      }
    })

  lucidCmd
    .command('list-icons-for-category <category>')
    .description('List all Lucide icons that belong to a specific category')
    .allowExcessArguments(false)
    .action(async (category: string) => {
      try {
        const result = await showIconsByFilter('category', category)
        if (result) {
          console.log(result)
        }
      } catch (error) {
        console.error('Error listing lucid icons for category:', error)
        process.exit(1)
      }
    })

  lucidCmd
    .command('list-icons-for-tag <tag>')
    .description('List all Lucide icons that have a specific tag')
    .allowExcessArguments(false)
    .action(async (tag: string) => {
      try {
        const result = await showIconsByFilter('tag', tag)
        if (result) {
          console.log(result)
        }
      } catch (error) {
        console.error('Error listing lucid icons for tag:', error)
        process.exit(1)
      }
    })

  lucidCmd
    .command('read-about-react-usage')
    .description('The documentation page for lucid icon usage in React')
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

export const lucidModule = {
  name: 'lucid',
  registerCommands: registerLucidCommands,
  instructions: `Lucid icon library is a large, high quality icon collection for react
The following commands find information about available icons in addition to installing and using them:

- Use \`list-icons\` for a full list of every icon name. It's a large list (~8000 tokens)
- Use \`list-icon-categories\` for a full list of every icon category. It's a small list (~130 tokens)
- Use \`list-icon-tags\` for a full list of every icon tag. It's a large list (~11000 tokens)
- Use \`list-icons-for-category\` for a list of the icons in a category
- Use \`list-icons-for-tag\` for a list of icons that have a tag
- Use \`read-about-react-usage\` to read about how to install and use icons in React
- When creating components that need icons use one or more of the various list methods to find a set of initial choices that can then be narrowed down`,
}
