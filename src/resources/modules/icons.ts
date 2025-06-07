import { BaseResourceModule } from '../base.js'
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
import { z } from 'zod'

// Define the type enum schema
const IconListTypeSchema = z.enum(['icons', 'tags', 'categories'])
type IconListType = z.infer<typeof IconListTypeSchema>

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
   * List Lucide icons, tags, or categories
   * @param type - The type of data to list ('icons', 'tags', or 'categories')
   * @returns A list of items separated by newlines
   */
  async listIcons(type: IconListType): Promise<string> {
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

    // Extract based on type
    switch (type) {
      case 'icons':
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
   * Get details for a specific Lucide icon
   * @param name - The icon name
   * @returns Icon details (currently empty, placeholder for future implementation)
   */
  async getIcon(name: string): Promise<string> {
    this.ensureCacheDirectory()

    if (!this.isCacheWarmed()) {
      throw new Error(
        'Cache is not warmed. Please run "lucid list-icons icons" first to warm the cache.',
      )
    }

    // Placeholder for future implementation
    return ''
  }

  registerCommands(program: Command): void {
    // Create lucid command
    const lucidCmd = program.command(this.name).description('Lucide icons')

    // Add list-icons subcommand
    lucidCmd
      .command('list-icons <type>')
      .description('List Lucide icons, tags, or categories')
      .allowExcessArguments(false)
      .action(async (type: string) => {
        try {
          // Validate type using Zod
          const validatedType = IconListTypeSchema.parse(type)
          const results = await this.listIcons(validatedType)
          if (results) {
            console.log(results)
          }
        } catch (error) {
          if (error instanceof z.ZodError) {
            console.error(
              `Error: Invalid type '${type}'. Must be one of: icons, tags, categories`,
            )
          } else {
            console.error(`Error listing ${this.name} icons:`, error)
          }
          process.exit(1)
        }
      })

    // Add get-icon subcommand
    lucidCmd
      .command('get-icon <name>')
      .description('Get details for a specific Lucide icon by name')
      .allowExcessArguments(false)
      .action(async (name: string) => {
        try {
          const result = await this.getIcon(name)
          if (result) {
            console.log(result)
          }
        } catch (error) {
          console.error(`Error getting ${this.name} icon:`, error)
          process.exit(1)
        }
      })
  }
}
