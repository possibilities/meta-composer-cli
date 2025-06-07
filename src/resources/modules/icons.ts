import { BaseResourceModule, CommandInfo } from '../base.js'
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

// Define types for list and show operations
type ListType = 'names' | 'categories' | 'tags'
type ShowType = 'category' | 'tag'

interface IconMetadata {
  name: string
  tags?: string[]
  categories?: string[]
}

export class IconsResource extends BaseResourceModule {
  private cacheDir: string
  private repoDir: string
  private metadataDir: string

  constructor() {
    super('lucid')

    // Set up cache directories
    this.cacheDir = join(
      homedir(),
      '.meta-composer',
      'cache',
      'resources',
      'icons',
      'lucid',
    )
    this.repoDir = join(this.cacheDir, 'lucide-icons-repo')
    this.metadataDir = join(this.cacheDir, 'lucide-icons-metadata')
  }

  private ensureCacheDirectory(): void {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true })
    }
  }

  private isCacheWarmed(): boolean {
    return (
      existsSync(this.metadataDir) &&
      existsSync(join(this.metadataDir, 'icons.yaml'))
    )
  }

  private cloneLucideRepo(): void {
    const repoUrl = 'https://github.com/lucide-icons/lucide.git'

    if (existsSync(this.repoDir)) {
      console.log(`Lucide repository already exists at ${this.repoDir}`)
      return
    }

    console.log(
      `Cloning Lucide repository from ${repoUrl} to ${this.repoDir}...`,
    )
    execSync(`git clone ${repoUrl} ${this.repoDir}`, { stdio: 'inherit' })
    console.log('Lucide repository cloned successfully')
  }

  private processLucideIcons(): void {
    const lucideIconsDir = join(this.repoDir, 'icons')

    if (
      existsSync(this.metadataDir) &&
      existsSync(join(this.metadataDir, 'icons.yaml'))
    ) {
      console.log(`Lucide icons metadata already exists at ${this.metadataDir}`)
      return
    }

    console.log(`Processing Lucide icons to ${this.metadataDir}...`)
    mkdirSync(this.metadataDir, { recursive: true })

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

    const outputPath = join(this.metadataDir, 'icons.yaml')
    writeFileSync(outputPath, yaml.dump(iconsMetadata, { sortKeys: false }))

    console.log(`Processed ${iconsMetadata.length} Lucide icons`)
  }

  private warmCache(): void {
    console.log('Warming cache...')
    this.ensureCacheDirectory()
    this.cloneLucideRepo()
    this.processLucideIcons()
    console.log('Cache warming completed')
  }

  /**
   * List Lucide icons, categories, or tags
   * @param listType - The type of data to list ('names', 'categories', or 'tags')
   * @returns A formatted list of items
   */
  async list(listType: ListType): Promise<string> {
    this.ensureCacheDirectory()

    if (!this.isCacheWarmed()) {
      console.log('Cache is not warmed. Warming cache now...')
      this.warmCache()
    }

    // Load metadata
    const yamlContent = readFileSync(
      join(this.metadataDir, 'icons.yaml'),
      'utf-8',
    )
    const iconsData = yaml.load(yamlContent) as IconMetadata[]

    // Extract based on listType
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

  /**
   * List icons by category or tag
   * @param showType - Filter type ('category' or 'tag')
   * @param filterValue - The category or tag value to filter by
   * @returns A formatted list of matching icons
   */
  async show(showType: ShowType, filterValue: string): Promise<string> {
    this.ensureCacheDirectory()

    if (!this.isCacheWarmed()) {
      console.log('Cache is not warmed. Warming cache now...')
      this.warmCache()
    }

    // Load metadata
    const yamlContent = readFileSync(
      join(this.metadataDir, 'icons.yaml'),
      'utf-8',
    )
    const iconsData = yaml.load(yamlContent) as IconMetadata[]

    // Filter icons based on showType and filterValue
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

  /**
   * Read the documentation page for lucid icon usage in React
   * @returns The lucide-react.md documentation content
   */
  async readAboutReactUsage(): Promise<string> {
    this.ensureCacheDirectory()

    if (!existsSync(this.repoDir)) {
      console.log('Lucide repository not found. Warming cache now...')
      this.warmCache()
    }

    const reactDocsPath = join(
      this.repoDir,
      'docs/guide/packages/lucide-react.md',
    )

    if (existsSync(reactDocsPath)) {
      const content = readFileSync(reactDocsPath, 'utf-8')
      return content.trim()
    } else {
      throw new Error(
        'React usage documentation not found. Please ensure the Lucide repository is cloned.',
      )
    }
  }

  registerCommands(program: Command): void {
    // Create lucid command
    const lucidCmd = program.command(this.name).description('Lucide icons')

    // Add list-icons subcommand
    lucidCmd
      .command('list-icons')
      .description('List all Lucide icons')
      .allowExcessArguments(false)
      .action(async () => {
        try {
          const results = await this.list('names')
          if (results) {
            console.log(results)
          }
        } catch (error) {
          console.error(`Error listing ${this.name} icons:`, error)
          process.exit(1)
        }
      })

    // Add list-icon-categories subcommand
    lucidCmd
      .command('list-icon-categories')
      .description('List all Lucide icon categories')
      .allowExcessArguments(false)
      .action(async () => {
        try {
          const results = await this.list('categories')
          if (results) {
            console.log(results)
          }
        } catch (error) {
          console.error(`Error listing ${this.name} icon categories:`, error)
          process.exit(1)
        }
      })

    // Add list-icon-tags subcommand
    lucidCmd
      .command('list-icon-tags')
      .description('List all Lucide icon tags')
      .allowExcessArguments(false)
      .action(async () => {
        try {
          const results = await this.list('tags')
          if (results) {
            console.log(results)
          }
        } catch (error) {
          console.error(`Error listing ${this.name} icon tags:`, error)
          process.exit(1)
        }
      })

    // Add list-icons-for-category subcommand
    lucidCmd
      .command('list-icons-for-category <category>')
      .description('List all Lucide icons that belong to a specific category')
      .allowExcessArguments(false)
      .action(async (category: string) => {
        try {
          const result = await this.show('category', category)
          if (result) {
            console.log(result)
          }
        } catch (error) {
          console.error(`Error listing ${this.name} icons for category:`, error)
          process.exit(1)
        }
      })

    // Add list-icons-for-tag subcommand
    lucidCmd
      .command('list-icons-for-tag <tag>')
      .description('List all Lucide icons that have a specific tag')
      .allowExcessArguments(false)
      .action(async (tag: string) => {
        try {
          const result = await this.show('tag', tag)
          if (result) {
            console.log(result)
          }
        } catch (error) {
          console.error(`Error listing ${this.name} icons for tag:`, error)
          process.exit(1)
        }
      })

    // Add read-about-react-usage subcommand
    lucidCmd
      .command('read-about-react-usage')
      .description('The documentation page for lucid icon usage in React')
      .allowExcessArguments(false)
      .action(async () => {
        try {
          const result = await this.readAboutReactUsage()
          console.log(result)
        } catch (error) {
          console.error(`Error reading React usage documentation:`, error)
          process.exit(1)
        }
      })
  }

  getCommandInfo(): CommandInfo[] {
    return [
      {
        name: 'list-icons',
        description: 'List all Lucide icons',
      },
      {
        name: 'list-icon-categories',
        description: 'List all Lucide icon categories',
      },
      {
        name: 'list-icon-tags',
        description: 'List all Lucide icon tags',
      },
      {
        name: 'list-icons-for-category',
        description: 'List all Lucide icons that belong to a specific category',
        arguments: ['<category>'],
      },
      {
        name: 'list-icons-for-tag',
        description: 'List all Lucide icons that have a specific tag',
        arguments: ['<tag>'],
      },
      {
        name: 'read-about-react-usage',
        description: 'The documentation page for lucid icon usage in React',
      },
    ]
  }
}
