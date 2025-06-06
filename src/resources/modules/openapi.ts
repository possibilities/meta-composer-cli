import { BaseResourceModule } from '../base.js'
import { Command } from 'commander'
import * as yaml from 'js-yaml'

interface OpenAPIOperation {
  operationId?: string
  summary?: string
  description?: string
  tags?: string[]
  parameters?: any[]
  requestBody?: any
  responses?: any
  [key: string]: any
}

interface OpenAPIPath {
  [method: string]: OpenAPIOperation
}

interface OpenAPISpec {
  openapi?: string
  info?: {
    title?: string
    version?: string
    description?: string
  }
  servers?: any[]
  paths?: {
    [path: string]: OpenAPIPath
  }
  components?: any
  [key: string]: any
}

interface APIEndpoint {
  id: number
  method: string
  path: string
  operationId?: string
  summary?: string
  description?: string
  tags?: string[]
}

export class OpenAPIResource extends BaseResourceModule {
  constructor() {
    super('openapi')
  }

  private async fetchOpenAPISpec(uri: string): Promise<OpenAPISpec> {
    try {
      const response = await fetch(uri)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data as OpenAPISpec
    } catch (error) {
      throw new Error(
        `Failed to fetch OpenAPI spec from ${uri}: ${error.message}`,
      )
    }
  }

  private extractEndpoints(spec: OpenAPISpec): APIEndpoint[] {
    const endpoints: APIEndpoint[] = []
    let id = 1

    if (!spec.paths) {
      return endpoints
    }

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        // Skip non-operation fields
        if (
          ['parameters', 'servers', 'summary', 'description'].includes(method)
        ) {
          continue
        }

        const endpoint: APIEndpoint = {
          id: id++,
          method: method.toUpperCase(),
          path: path,
          operationId: operation.operationId,
          summary: operation.summary,
          description: operation.description,
          tags: operation.tags,
        }

        endpoints.push(endpoint)
      }
    }

    return endpoints
  }

  private formatEndpointDetails(
    spec: OpenAPISpec,
    endpoint: APIEndpoint,
    operation: OpenAPIOperation,
  ): string {
    let output = `# ${endpoint.method} ${endpoint.path}\n\n`

    if (operation.summary) {
      output += `**${operation.summary}**\n\n`
    }

    if (operation.description) {
      output += `${operation.description}\n\n`
    }

    if (operation.operationId) {
      output += `**Operation ID:** \`${operation.operationId}\`\n\n`
    }

    if (operation.tags && operation.tags.length > 0) {
      output += `**Tags:** ${operation.tags.join(', ')}\n\n`
    }

    // Parameters
    if (operation.parameters && operation.parameters.length > 0) {
      output += `## Parameters\n\n`
      for (const param of operation.parameters) {
        const required = param.required ? ' *(required)*' : ''
        output += `- **${param.name}**${required} (${param.in}): ${param.description || 'No description'}\n`
        if (param.schema) {
          output += `  - Type: \`${param.schema.type || 'any'}\`\n`
          if (param.schema.enum) {
            output += `  - Enum: ${param.schema.enum.map((v: any) => `\`${v}\``).join(', ')}\n`
          }
        }
      }
      output += '\n'
    }

    // Request Body
    if (operation.requestBody) {
      output += `## Request Body\n\n`
      if (operation.requestBody.description) {
        output += `${operation.requestBody.description}\n\n`
      }
      if (operation.requestBody.required) {
        output += `*Required*\n\n`
      }
      if (operation.requestBody.content) {
        for (const [contentType, mediaType] of Object.entries(
          operation.requestBody.content,
        )) {
          output += `**Content-Type:** \`${contentType}\`\n\n`
          if (mediaType.schema) {
            output += '```json\n'
            output += JSON.stringify(mediaType.schema, null, 2)
            output += '\n```\n\n'
          }
        }
      }
    }

    // Responses
    if (operation.responses) {
      output += `## Responses\n\n`
      for (const [statusCode, response] of Object.entries(
        operation.responses,
      )) {
        output += `### ${statusCode}\n\n`
        if (response.description) {
          output += `${response.description}\n\n`
        }
        if (response.content) {
          for (const [contentType, mediaType] of Object.entries(
            response.content,
          )) {
            output += `**Content-Type:** \`${contentType}\`\n\n`
            if (mediaType.schema) {
              output += '```json\n'
              output += JSON.stringify(mediaType.schema, null, 2)
              output += '\n```\n\n'
            }
          }
        }
      }
    }

    // Servers
    if (spec.servers && spec.servers.length > 0) {
      output += `## Servers\n\n`
      for (const server of spec.servers) {
        output += `- ${server.url}`
        if (server.description) {
          output += ` - ${server.description}`
        }
        output += '\n'
      }
      output += '\n'
    }

    return output.trim()
  }

  async list(uri: string): Promise<string> {
    const spec = await this.fetchOpenAPISpec(uri)
    const endpoints = this.extractEndpoints(spec)

    // Format endpoints for YAML output
    const formattedEndpoints = endpoints.map(endpoint => ({
      id: endpoint.id,
      verb: endpoint.method,
      path: endpoint.path,
      description:
        endpoint.summary || endpoint.description || 'No description available',
    }))

    return yaml.dump(formattedEndpoints, { sortKeys: false }).trim()
  }

  async show(uri: string, id: string): Promise<string> {
    const spec = await this.fetchOpenAPISpec(uri)
    const endpoints = this.extractEndpoints(spec)

    // Parse numeric ID
    const numericId = parseInt(id, 10)
    if (isNaN(numericId) || numericId < 1) {
      return `Invalid ID '${id}'. Please provide a valid numeric ID.`
    }

    // Find endpoint by ID
    const endpoint = endpoints.find(ep => ep.id === numericId)
    if (!endpoint) {
      return `Endpoint with ID '${id}' not found. Valid IDs are 1-${endpoints.length}.`
    }

    // Get the operation details
    const pathItem = spec.paths?.[endpoint.path]
    if (!pathItem) {
      return `Path '${endpoint.path}' not found in OpenAPI spec.`
    }

    const operation = pathItem[endpoint.method.toLowerCase()]
    if (!operation) {
      return `Operation ${endpoint.method} not found for path '${endpoint.path}'.`
    }

    return this.formatEndpointDetails(spec, endpoint, operation)
  }

  registerCommands(program: Command): void {
    // Get or create list command
    let listCmd = program.commands.find(cmd => cmd.name() === 'list')
    if (!listCmd) {
      listCmd = new Command('list')
      listCmd.summary(`List resources`)
      program.addCommand(listCmd)
    }

    // Add openapi list subcommand with URI
    listCmd
      .command(`${this.name} <uri>`)
      .description(`List OpenAPI endpoints from the specified URI`)
      .allowExcessArguments(false)
      .action(async (uri: string) => {
        try {
          const results = await this.list(uri)
          console.log(results)
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

    // Add openapi show subcommand with URI and ID
    showCmd
      .command(`${this.name} <uri> <id>`)
      .description(`Show OpenAPI endpoint details for the specified ID`)
      .allowExcessArguments(false)
      .action(async (uri: string, id: string) => {
        try {
          const result = await this.show(uri, id)
          console.log(result)
        } catch (error) {
          console.error(`Error showing ${this.name}:`, error)
          process.exit(1)
        }
      })
  }
}
