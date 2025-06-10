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
  method: string
  path: string
  operationId?: string
  summary?: string
  description?: string
  tags?: string[]
}

async function fetchOpenAPISpec(uri: string): Promise<OpenAPISpec> {
  try {
    const response = await fetch(uri)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data as OpenAPISpec
  } catch (error) {
    throw new Error(
      `Failed to fetch OpenAPI spec from ${uri}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

function extractEndpoints(spec: OpenAPISpec): APIEndpoint[] {
  const endpoints: APIEndpoint[] = []

  if (!spec.paths) {
    return endpoints
  }

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (
        ['parameters', 'servers', 'summary', 'description'].includes(method)
      ) {
        continue
      }

      const endpoint: APIEndpoint = {
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

function formatEndpointDetails(
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
        if ((mediaType as any).schema) {
          output += '```json\n'
          output += JSON.stringify((mediaType as any).schema, null, 2)
          output += '\n```\n\n'
        }
      }
    }
  }

  if (operation.responses) {
    output += `## Responses\n\n`
    for (const [statusCode, response] of Object.entries(operation.responses)) {
      output += `### ${statusCode}\n\n`
      if ((response as any).description) {
        output += `${(response as any).description}\n\n`
      }
      if ((response as any).content) {
        for (const [contentType, mediaType] of Object.entries(
          (response as any).content,
        )) {
          output += `**Content-Type:** \`${contentType}\`\n\n`
          if ((mediaType as any).schema) {
            output += '```json\n'
            output += JSON.stringify((mediaType as any).schema, null, 2)
            output += '\n```\n\n'
          }
        }
      }
    }
  }

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

export async function listOperations(uri: string): Promise<string> {
  const spec = await fetchOpenAPISpec(uri)
  const endpoints = extractEndpoints(spec)

  const formattedEndpoints = endpoints.map(endpoint => ({
    'operation-id': endpoint.operationId || 'N/A',
    verb: endpoint.method,
    path: endpoint.path,
    description:
      endpoint.summary || endpoint.description || 'No description available',
  }))

  return yaml.dump(formattedEndpoints, { sortKeys: false }).trim()
}

export async function getOperationById(
  uri: string,
  operationId: string,
): Promise<string> {
  const spec = await fetchOpenAPISpec(uri)
  const endpoints = extractEndpoints(spec)

  const endpoint = endpoints.find(ep => ep.operationId === operationId)
  if (!endpoint) {
    const availableIds = endpoints
      .filter(ep => ep.operationId)
      .map(ep => ep.operationId)
      .join(', ')
    return `Endpoint with operation ID '${operationId}' not found. Available operation IDs: ${availableIds || 'None (no operation IDs defined in spec)'}`
  }

  const pathItem = spec.paths?.[endpoint.path]
  if (!pathItem) {
    return `Path '${endpoint.path}' not found in OpenAPI spec.`
  }

  const operation = pathItem[endpoint.method.toLowerCase()]
  if (!operation) {
    return `Operation ${endpoint.method} not found for path '${endpoint.path}'.`
  }

  return formatEndpointDetails(spec, endpoint, operation)
}

export function registerOpenAPICommands(program: Command): void {
  const openapiCmd = program
    .command('openapi')
    .description('OpenAPI specifications')

  openapiCmd
    .command('list-operations <uri>')
    .description('List all API operations from the specified OpenAPI URI')
    .allowExcessArguments(false)
    .action(async (uri: string) => {
      try {
        const results = await listOperations(uri)
        console.log(results)
      } catch (error) {
        console.error('Error listing openapi:', error)
        process.exit(1)
      }
    })

  openapiCmd
    .command('get-operation-by-id <uri> <operation-id>')
    .description('Get details for a specific API operation by operation ID')
    .allowExcessArguments(false)
    .action(async (uri: string, operationId: string) => {
      try {
        const result = await getOperationById(uri, operationId)
        console.log(result)
      } catch (error) {
        console.error('Error getting openapi operation:', error)
        process.exit(1)
      }
    })
}

export const openAPIModule = {
  name: 'openapi',
  registerCommands: registerOpenAPICommands,
  instructions: `OpenAPI is a specification for describing APIs
The following commands expose all API specification information:

- Use \`list-operations <uri>\` with a valid OpenAPI spec in JSON format to get a list of every operation with some minimal metadata for each
- Use \`get-operation-by-id <uri> <operation-id>\` to get detailed information for a path`,
}
