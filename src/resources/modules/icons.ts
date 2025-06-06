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
    super('icons')

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

  async list(category: string): Promise<string> {
    this.ensureCacheDirectory()

    // Validate category
    if (category !== 'lucid') {
      throw new Error(
        `Invalid category '${category}'. Only 'lucid' category is supported.`,
      )
    }

    if (!this.isCacheWarmed()) {
      console.log('Cache is not warmed. Warming cache now...')
      this.warmCache()
    }

    // Read and return the cached icons.yaml file content
    const iconsPath = join(this.metadataDir, 'icons.yaml')
    const iconsData = readFileSync(iconsPath, 'utf-8')

    return iconsData
  }

  async show(category: string, id: string): Promise<string> {
    this.ensureCacheDirectory()

    // Validate category
    if (category !== 'lucid') {
      throw new Error(
        `Invalid category '${category}'. Only 'lucid' category is supported.`,
      )
    }

    if (!this.isCacheWarmed()) {
      throw new Error(
        'Cache is not warmed. Please run "list icons lucid" first to warm the cache.',
      )
    }

    // Return empty for now as per requirements
    return ''
  }

  registerCommands(program: Command): void {
    // Get or create list command
    let listCmd = program.commands.find(cmd => cmd.name() === 'list')
    if (!listCmd) {
      listCmd = new Command('list')
      listCmd.summary(`List resources`)
      program.addCommand(listCmd)
    }

    // Add icons list subcommand with category
    listCmd
      .command(`${this.name} <category>`)
      .description(`List ${this.name} lucid`)
      .allowExcessArguments(false)
      .action(async (category: string) => {
        try {
          const results = await this.list(category)
          if (results) {
            console.log(results)
          }
        } catch (error) {
          console.error(`Error listing ${this.name}:`, error)
          process.exit(1)
        }
      })

    // Get or create show command
    let showCmd = program.commands.find(cmd => cmd.name() === 'show')
    if (!showCmd) {
      showCmd = new Command('show')
      showCmd.summary(`Show resources`)
      program.addCommand(showCmd)
    }

    // Add icons show subcommand with category and id
    showCmd
      .command(`${this.name} <category> <id>`)
      .description(`Show ${this.name} lucid`)
      .allowExcessArguments(false)
      .action(async (category: string, id: string) => {
        try {
          const result = await this.show(category, id)
          if (result) {
            console.log(result)
          }
        } catch (error) {
          console.error(`Error showing ${this.name}:`, error)
          process.exit(1)
        }
      })
  }
}
