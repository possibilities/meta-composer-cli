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

interface ShadcnComponent {
  id: string
  title?: string
  description?: string
  examples?: Array<{
    id?: string
    label?: string
    description?: string
    [key: string]: string | undefined
  }>
}

const cacheDir = join(
  homedir(),
  '.meta-composer',
  'cache',
  'resources',
  'shadcn',
  'core',
)
const repoDir = join(cacheDir, 'shadcn-ui-repo')
const metadataDir = join(cacheDir, 'shadcn-ui-docs-metadata')
const processedDir = join(cacheDir, 'shadcn-ui-docs-processed')

function ensureCacheDirectory(): void {
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true })
  }
}

function isCacheWarmed(): boolean {
  return existsSync(metadataDir) && existsSync(processedDir)
}

function cloneShadcnRepo(): void {
  const repoUrl = 'https://github.com/shadcn-ui/ui.git'

  if (existsSync(repoDir)) {
    console.log(`Repository already exists at ${repoDir}`)
    return
  }

  console.log(`Cloning repository from ${repoUrl} to ${repoDir}...`)
  execSync(`git clone ${repoUrl} ${repoDir}`, { stdio: 'inherit' })
  console.log('Repository cloned successfully')
}

function extractComponentMetadata(): void {
  if (existsSync(metadataDir)) {
    console.log(`Metadata already exists at ${metadataDir}`)
    return
  }

  console.log(`Extracting component metadata to ${metadataDir}...`)
  mkdirSync(metadataDir, { recursive: true })

  const srcDocsPath = join(repoDir, 'apps/www/content/docs/components')

  const files = readdirSync(srcDocsPath).filter(f => f.endsWith('.mdx'))

  for (const filename of files) {
    const filePath = join(srcDocsPath, filename)
    const componentId = filename.replace('.mdx', '')

    const content = readFileSync(filePath, 'utf-8')
    const metadata: ShadcnComponent = { id: componentId }

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
        metadata.title = componentId
      }

      if (descriptionMatch) {
        metadata.description = descriptionMatch[1].trim()
      }
    } else {
      metadata.title = componentId
    }

    const examples: typeof metadata.examples = []
    const examplesMatch = content.match(/\n## Examples([\s\S]*?)(?:\n## |$)/)

    if (examplesMatch) {
      const examplesSection = examplesMatch[1].trim()
      const componentPreviewRegex =
        /<ComponentPreview(?:\s+|\s*\n\s*)([\s\S]*?)(?:\s*\/>|(?:\s*>\s*<\/ComponentPreview>))/g

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
        while ((match = componentPreviewRegex.exec(examplesSection)) !== null) {
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

    const outputPath = join(metadataDir, `${componentId}.yaml`)
    writeFileSync(outputPath, yaml.dump(metadata, { sortKeys: false }))
    console.log(`Extracted metadata from ${filename}`)
  }

  console.log('Component metadata extraction completed')
}

function processThemingDoc(): void {
  const themingProcessedPath = join(processedDir, 'theming.mdx')

  if (existsSync(themingProcessedPath)) {
    console.log(
      `Processed theming doc already exists at ${themingProcessedPath}`,
    )
    return
  }

  console.log(`Processing theming documentation...`)

  const srcThemingPath = join(repoDir, 'apps/www/content/docs/theming.mdx')

  if (!existsSync(srcThemingPath)) {
    console.log(`Theming documentation not found at ${srcThemingPath}`)
    return
  }

  let content = readFileSync(srcThemingPath, 'utf-8')

  let title = 'Theming'
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

  const mainContentMatch = content.match(/---[\s\S]*?---\s*([\s\S]*)/)
  const mainContent = mainContentMatch ? mainContentMatch[1] : content

  let processedContent = mainContent.replace(
    /<Callout(?:\s+[^>]*)?>([^]*?)<\/Callout>/g,
    (_match, content) => {
      const trimmedContent = content.trim()
      return `> **Note:** ${trimmedContent}`
    },
  )

  let header = `# ${title}`
  if (description) {
    header += `\n\n${description}`
  }

  processedContent = `${header}\n\n${processedContent}`
  processedContent = processedContent.replace(/\n\s*\n\s*\n/g, '\n\n')

  writeFileSync(themingProcessedPath, processedContent)
  console.log(`Processed theming documentation`)
}

function processComponentDocs(): void {
  console.log(`Processing component docs to ${processedDir}...`)

  if (!existsSync(processedDir)) {
    mkdirSync(processedDir, { recursive: true })
  }

  const srcDocsPath = join(repoDir, 'apps/www/content/docs/components')
  const srcExamplesPath = join(repoDir, 'apps/www/registry/new-york/examples')

  const files = readdirSync(srcDocsPath).filter(f => f.endsWith('.mdx'))

  for (const filename of files) {
    const filePath = join(srcDocsPath, filename)
    const componentId = filename.replace('.mdx', '')

    let content = readFileSync(filePath, 'utf-8')

    let title = componentId.charAt(0).toUpperCase() + componentId.slice(1)
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

    const mainContentMatch = content.match(/---[\s\S]*?---\s*([\s\S]*)/)
    const mainContent = mainContentMatch ? mainContentMatch[1] : content

    let header = `# ${title}`
    if (description) {
      header += `\n\n${description}`
    }
    header += '\n\n## Demo'

    let processedContent = mainContent.replace(
      /## Installation\s*?\n.*?(?=\n## )/s,
      `## Installation\n\`\`\`\nnpx shadcn@latest add ${componentId}\n\`\`\`\n`,
    )

    processedContent = processedContent.replace(
      /<ComponentPreview(?:\s+|\s*\n\s*)([\s\S]*?)(?:\s*\/>|(?:\s*>\s*<\/ComponentPreview>))/g,
      (_match, content) => {
        const nameMatch = content.match(/name=(["'])((?:(?=(\\?))\3.)*?)\1/)
        const titleMatch = content.match(/title=(["'])((?:(?=(\\?))\3.)*?)\1/)
        const descriptionMatch = content.match(
          /description=(["'])((?:(?=(\\?))\3.)*?)\1/,
        )

        const id = nameMatch ? nameMatch[2] : null
        const previewTitle = titleMatch ? titleMatch[2] : null
        const previewDescription = descriptionMatch ? descriptionMatch[2] : null

        let headerText = ''
        if (previewTitle && previewDescription) {
          headerText = `${previewTitle}: ${previewDescription}`
        } else if (previewTitle) {
          headerText = previewTitle
        } else if (previewDescription) {
          headerText = previewDescription
        }

        let exampleContent = ''
        if (id) {
          const exampleFilePath = join(srcExamplesPath, `${id}.tsx`)
          if (existsSync(exampleFilePath)) {
            exampleContent = readFileSync(exampleFilePath, 'utf-8')
          }
        }

        return `${headerText}\n\`\`\`\n${exampleContent}\n\`\`\``
      },
    )

    processedContent = `${header}\n\n${processedContent}`
    processedContent = processedContent.replace(/\n\s*\n/g, '\n')

    const outputPath = join(processedDir, filename)
    writeFileSync(outputPath, processedContent)
    console.log(`Processed ${filename}`)
  }

  console.log('Component docs processing completed')
}

function warmCache(): void {
  console.log('Warming cache...')
  ensureCacheDirectory()
  cloneShadcnRepo()
  extractComponentMetadata()
  processComponentDocs()
  processThemingDoc()
  console.log('Cache warming completed')
}

function exampleView(
  example: NonNullable<ShadcnComponent['examples']>[0],
): string {
  if (example.label && example.description) {
    return `${example.label}: ${example.description}`
  }
  if (example.label) {
    const id = example.id || ''
    return `${example.label}: ${id.charAt(0).toUpperCase()}${id.slice(1).replace(/-/g, ' ')}`
  }
  if (example.description) {
    const id = example.id || ''
    return `${example.description}: ${id.charAt(0).toUpperCase()}${id.slice(1).replace(/-/g, ' ')}`
  }
  const id = example.id || ''
  return id
    .split('-')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export async function listComponents(): Promise<string> {
  ensureCacheDirectory()

  if (!isCacheWarmed()) {
    console.log('Cache is not warmed. Warming cache now...')
    warmCache()
  }

  const components: ShadcnComponent[] = []

  const files = readdirSync(metadataDir).filter(f => f.endsWith('.yaml'))

  for (const filename of files) {
    const filePath = join(metadataDir, filename)
    const fileContent = readFileSync(filePath, 'utf-8')
    const componentData = yaml.load(fileContent) as ShadcnComponent

    if (componentData.id === 'typography') {
      continue
    }

    components.push(componentData)
  }

  components.sort((a, b) => a.id.localeCompare(b.id))
  const componentsYaml = components.map(comp => {
    const formatted: any = {
      name: comp.id,
      title: comp.title,
      description: comp.description,
    }
    if (comp.examples) {
      formatted.examples = comp.examples.map(ex => exampleView(ex))
    }
    return formatted
  })

  return yaml.dump(componentsYaml, { sortKeys: false }).trim()
}

export async function getComponentByName(name: string): Promise<string> {
  ensureCacheDirectory()

  if (!isCacheWarmed()) {
    throw new Error(
      'Cache is not warmed. Please run "shadcn list-components" first to warm the cache.',
    )
  }

  const filePath = join(processedDir, `${name}.mdx`)

  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf-8')
    return content.trim()
  } else {
    const files = readdirSync(metadataDir).filter(f => f.endsWith('.yaml'))
    const availableNames = files.map(f => f.replace('.yaml', '')).sort()
    return `Component with name '${name}' not found. Available component names: ${availableNames.join(', ')}`
  }
}

export async function readAboutTypography(): Promise<string> {
  ensureCacheDirectory()

  if (!isCacheWarmed()) {
    throw new Error(
      'Cache is not warmed. Please run "shadcn list-components" first to warm the cache.',
    )
  }

  const filePath = join(processedDir, 'typography.mdx')

  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf-8')
    return content.trim()
  } else {
    throw new Error(
      'Typography documentation not found. Please run "shadcn list-components" first to warm the cache.',
    )
  }
}

export async function readAboutTheming(): Promise<string> {
  ensureCacheDirectory()

  if (!isCacheWarmed()) {
    throw new Error(
      'Cache is not warmed. Please run "shadcn list-components" first to warm the cache.',
    )
  }

  const filePath = join(processedDir, 'theming.mdx')

  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf-8')
    return content.trim()
  } else {
    throw new Error(
      'Theming documentation not found. Please run "shadcn list-components" first to warm the cache.',
    )
  }
}

export function registerShadcnCommands(program: Command): void {
  const shadcnCmd = program
    .command('shadcn')
    .description('shadcn/ui components')

  shadcnCmd
    .command('list-components')
    .description('List all shadcn/ui components')
    .allowExcessArguments(false)
    .action(async () => {
      try {
        const results = await listComponents()
        console.log(results)
      } catch (error) {
        console.error('Error listing shadcn components:', error)
        process.exit(1)
      }
    })

  shadcnCmd
    .command('get-component-by-name <name>')
    .description('Get details for a specific shadcn/ui component by name')
    .allowExcessArguments(false)
    .action(async (name: string) => {
      try {
        const result = await getComponentByName(name)
        console.log(result)
      } catch (error) {
        console.error('Error getting shadcn component:', error)
        process.exit(1)
      }
    })

  shadcnCmd
    .command('read-about-typography')
    .description('The documentation page for shadcn/ui typography')
    .allowExcessArguments(false)
    .action(async () => {
      try {
        const result = await readAboutTypography()
        console.log(result)
      } catch (error) {
        console.error('Error reading typography documentation:', error)
        process.exit(1)
      }
    })

  shadcnCmd
    .command('read-about-theming')
    .description('The documentation page for shadcn/ui theming')
    .allowExcessArguments(false)
    .action(async () => {
      try {
        const result = await readAboutTheming()
        console.log(result)
      } catch (error) {
        console.error('Error reading theming documentation:', error)
        process.exit(1)
      }
    })
}

export const shadcnModule = {
  name: 'shadcn',
  registerCommands: registerShadcnCommands,
  instructions: `Shadcn/ui component library for React is a high quality, themable, components and blocks for building beautiful UIs with a great UX
The following commands find information about available components in addition to installing and using them:

- Use \`list-components\` for a full list of names and descriptions of every component in the library
- Use \`get-component-by-name\` to fetch full documentation, usage, examples, and installation instructions by name
- Use \`read-about-theming\` to read about theming and for a full list of variables that are available
- Use \`read-about-typography\` to read about using typography
- When using and creating components, use theme variables that shadcn exposes rather than adding our own styles
- Select from the library components rather than writing your own
- Build up more complicated components from existing components, blocks, and examples
- Use the installation instructions found in each components' documentation to add it to the project`,
}
