import { BaseResourceModule } from '../base.js'
import { execSync } from 'child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'
import * as yaml from 'js-yaml'

interface ShadcnComponent {
  name: string
  title?: string
  description?: string
  examples?: Array<{
    name?: string
    label?: string
    description?: string
    [key: string]: string | undefined
  }>
}

export class ShadcnResource extends BaseResourceModule {
  private cacheDir: string
  private repoDir: string
  private metadataDir: string
  private processedDir: string

  constructor() {
    super('shadcn')

    // Set up cache directories
    this.cacheDir = join(
      homedir(),
      '.meta-composer',
      'cache',
      'resources',
      'shadcn',
    )
    this.repoDir = join(this.cacheDir, 'shadcn-ui-repo')
    this.metadataDir = join(this.cacheDir, 'shadcn-ui-docs-metadata')
    this.processedDir = join(this.cacheDir, 'shadcn-ui-docs-processed')
  }

  private ensureCacheDirectory(): void {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true })
    }
  }

  private isCacheWarmed(): boolean {
    return existsSync(this.metadataDir) && existsSync(this.processedDir)
  }

  private cloneShadcnRepo(): void {
    const repoUrl = 'https://github.com/shadcn-ui/ui.git'

    if (existsSync(this.repoDir)) {
      console.log(`Repository already exists at ${this.repoDir}`)
      return
    }

    console.log(`Cloning repository from ${repoUrl} to ${this.repoDir}...`)
    execSync(`git clone ${repoUrl} ${this.repoDir}`, { stdio: 'inherit' })
    console.log('Repository cloned successfully')
  }

  private extractComponentMetadata(): void {
    if (existsSync(this.metadataDir)) {
      console.log(`Metadata already exists at ${this.metadataDir}`)
      return
    }

    console.log(`Extracting component metadata to ${this.metadataDir}...`)
    mkdirSync(this.metadataDir, { recursive: true })

    const srcDocsPath = join(this.repoDir, 'apps/www/content/docs/components')
    const srcExamplesPath = join(
      this.repoDir,
      'apps/www/registry/new-york/examples',
    )

    const files = readdirSync(srcDocsPath).filter(f => f.endsWith('.mdx'))

    for (const filename of files) {
      const filePath = join(srcDocsPath, filename)
      const componentName = filename.replace('.mdx', '')

      const content = readFileSync(filePath, 'utf-8')
      const metadata: ShadcnComponent = { name: componentName }

      // Extract frontmatter
      const frontmatterMatch = content.match(/^---\s*([\s\S]*?)\s*---/)
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1]
        const titleMatch = frontmatter.match(/title:\s*"?(.*?)"?\s*(?:\n|$)/)
        const descriptionMatch = frontmatter.match(
          /description:\s*"?(.*?)"?\s*(?:\n|$)/,
        )

        if (titleMatch) {
          metadata.title = titleMatch[1].trim()
        } else {
          metadata.title = componentName
        }

        if (descriptionMatch) {
          metadata.description = descriptionMatch[1].trim()
        }
      } else {
        metadata.title = componentName
      }

      // Extract examples
      const examples: typeof metadata.examples = []
      const examplesMatch = content.match(/\n## Examples([\s\S]*?)(?:\n## |$)/)

      if (examplesMatch) {
        const examplesSection = examplesMatch[1].trim()
        const componentPreviewRegex =
          /<ComponentPreview(?:\s+|\s*\n\s*)([\s\S]*?)(?:\s*\/>|(?:\s*>\s*<\/ComponentPreview>))/g

        // Check for subsections
        const sections = examplesSection.split(/###\s+([^\n]+)/)

        if (sections.length > 1) {
          let currentLabel: string | undefined

          for (let i = 1; i < sections.length; i++) {
            if (i % 2 === 1) {
              currentLabel = sections[i].trim()
            } else {
              const sectionContent = sections[i].trim()
              let match

              while (
                (match = componentPreviewRegex.exec(sectionContent)) !== null
              ) {
                const example: (typeof examples)[0] = {}
                if (currentLabel) {
                  example.label = currentLabel
                }

                const previewContent = match[1]
                const attrRegex = /(\w+)=(["'])((?:(?=(\\?))\4.)*?)\2/g
                let attrMatch

                while ((attrMatch = attrRegex.exec(previewContent)) !== null) {
                  const name = attrMatch[1]
                  const value = attrMatch[3]
                  example[name] = value
                }

                examples.push(example)
              }
            }
          }
        } else {
          let match
          while (
            (match = componentPreviewRegex.exec(examplesSection)) !== null
          ) {
            const example: (typeof examples)[0] = {}
            const previewContent = match[1]
            const attrRegex = /(\w+)=(["'])((?:(?=(\\?))\4.)*?)\2/g
            let attrMatch

            while ((attrMatch = attrRegex.exec(previewContent)) !== null) {
              const name = attrMatch[1]
              const value = attrMatch[3]
              example[name] = value
            }

            examples.push(example)
          }
        }
      }

      if (examples.length > 0) {
        metadata.examples = examples
      }

      // Write metadata to YAML file
      const outputPath = join(this.metadataDir, `${componentName}.yaml`)
      writeFileSync(outputPath, yaml.dump(metadata, { sortKeys: false }))
      console.log(`Extracted metadata from ${filename}`)
    }

    console.log('Component metadata extraction completed')
  }

  private processComponentDocs(): void {
    if (existsSync(this.processedDir)) {
      console.log(`Processed docs already exist at ${this.processedDir}`)
      return
    }

    console.log(`Processing component docs to ${this.processedDir}...`)
    mkdirSync(this.processedDir, { recursive: true })

    const srcDocsPath = join(this.repoDir, 'apps/www/content/docs/components')
    const srcExamplesPath = join(
      this.repoDir,
      'apps/www/registry/new-york/examples',
    )

    const files = readdirSync(srcDocsPath).filter(f => f.endsWith('.mdx'))

    for (const filename of files) {
      const filePath = join(srcDocsPath, filename)
      const componentName = filename.replace('.mdx', '')

      let content = readFileSync(filePath, 'utf-8')

      // Extract frontmatter for title and description
      let title = componentName.charAt(0).toUpperCase() + componentName.slice(1)
      let description = ''

      const frontmatterMatch = content.match(/^---\s*([\s\S]*?)\s*---/)
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1]
        const titleMatch = frontmatter.match(/title:\s*"?(.*?)"?\s*(?:\n|$)/)
        const descriptionMatch = frontmatter.match(
          /description:\s*"?(.*?)"?\s*(?:\n|$)/,
        )

        if (titleMatch) {
          title = titleMatch[1].trim()
        }
        if (descriptionMatch) {
          description = descriptionMatch[1].trim()
        }
      }

      // Remove frontmatter
      const mainContentMatch = content.match(/---[\s\S]*?---\s*(.*)/)
      const mainContent = mainContentMatch ? mainContentMatch[1] : content

      // Create header
      let header = `# ${title}`
      if (description) {
        header += `\n\n${description}`
      }
      header += '\n\n## Demo'

      // Replace installation section
      let processedContent = mainContent.replace(
        /## Installation\s*?\n.*?(?=\n## )/s,
        `## Installation\n\`\`\`\nnpx shadcn@latest add ${componentName}\n\`\`\`\n`,
      )

      // Process ComponentPreview tags
      processedContent = processedContent.replace(
        /<ComponentPreview(?:\s+|\s*\n\s*)([\s\S]*?)(?:\s*\/>|(?:\s*>\s*<\/ComponentPreview>))/g,
        (match, content) => {
          // Extract attributes
          const nameMatch = content.match(/name=(["'])((?:(?=(\\?))\3.)*?)\1/)
          const titleMatch = content.match(/title=(["'])((?:(?=(\\?))\3.)*?)\1/)
          const descriptionMatch = content.match(
            /description=(["'])((?:(?=(\\?))\3.)*?)\1/,
          )

          const name = nameMatch ? nameMatch[2] : null
          const previewTitle = titleMatch ? titleMatch[2] : null
          const previewDescription = descriptionMatch
            ? descriptionMatch[2]
            : null

          let headerText = ''
          if (previewTitle && previewDescription) {
            headerText = `${previewTitle}: ${previewDescription}`
          } else if (previewTitle) {
            headerText = previewTitle
          } else if (previewDescription) {
            headerText = previewDescription
          }

          let exampleContent = ''
          if (name) {
            const exampleFilePath = join(srcExamplesPath, `${name}.tsx`)
            if (existsSync(exampleFilePath)) {
              exampleContent = readFileSync(exampleFilePath, 'utf-8')
            }
          }

          return `${headerText}\n\`\`\`\n${exampleContent}\n\`\`\``
        },
      )

      // Add header and clean up extra newlines
      processedContent = `${header}\n\n${processedContent}`
      processedContent = processedContent.replace(/\n\s*\n/g, '\n')

      // Write processed content
      const outputPath = join(this.processedDir, filename)
      writeFileSync(outputPath, processedContent)
      console.log(`Processed ${filename}`)
    }

    console.log('Component docs processing completed')
  }

  private warmCache(): void {
    console.log('Warming cache...')
    this.ensureCacheDirectory()
    this.cloneShadcnRepo()
    this.extractComponentMetadata()
    this.processComponentDocs()
    console.log('Cache warming completed')
  }

  async list(category: string): Promise<any[]> {
    this.ensureCacheDirectory()

    if (!this.isCacheWarmed()) {
      console.log('Cache is not warmed. Warming cache now...')
      this.warmCache()
    }

    // Return empty array for now - business logic to be implemented later
    return []
  }

  async show(...ids: string[]): Promise<any[]> {
    if (!this.isCacheWarmed()) {
      throw new Error(
        'Cache is not warmed. Please run "list shadcn <category>" first to warm the cache.',
      )
    }

    // Return empty array for now - business logic to be implemented later
    return []
  }
}
