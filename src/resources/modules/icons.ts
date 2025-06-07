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
   * List Lucide icon names, categories, or tags
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
   * Get icons by category or tag
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

  registerCommands(program: Command): void {
    // Create lucid command
    const lucidCmd = program.command(this.name).description('Lucide icons')

    // Add list-icon-names subcommand
    lucidCmd
      .command('list-icon-names')
      .description('List all Lucide icon names')
      .allowExcessArguments(false)
      .action(async () => {
        try {
          const results = await this.list('names')
          if (results) {
            console.log(results)
          }
        } catch (error) {
          console.error(`Error listing ${this.name} icon names:`, error)
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

    // Add get-icons-by-category subcommand
    lucidCmd
      .command('get-icons-by-category <category>')
      .description('Get all icons that belong to a specific category')
      .allowExcessArguments(false)
      .action(async (category: string) => {
        try {
          const result = await this.show('category', category)
          if (result) {
            console.log(result)
          }
        } catch (error) {
          console.error(`Error getting ${this.name} icons by category:`, error)
          process.exit(1)
        }
      })

    // Add get-icons-by-tag subcommand
    lucidCmd
      .command('get-icons-by-tag <tag>')
      .description('Get all icons that have a specific tag')
      .allowExcessArguments(false)
      .action(async (tag: string) => {
        try {
          const result = await this.show('tag', tag)
          if (result) {
            console.log(result)
          }
        } catch (error) {
          console.error(`Error getting ${this.name} icons by tag:`, error)
          process.exit(1)
        }
      })
  }

  getCommandInfo(): CommandInfo[] {
    return [
      {
        name: 'list-icon-names',
        description: 'List all Lucide icon names',
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
        name: 'get-icons-by-category',
        description: 'Get all icons that belong to a specific category',
        arguments: ['<category>'],
      },
      {
        name: 'get-icons-by-tag',
        description: 'Get all icons that have a specific tag',
        arguments: ['<tag>'],
      },
    ]
  }
}
