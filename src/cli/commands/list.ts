import type { ListOptions } from '../../types/index.js'
import { registry } from '../../resources/index.js'

export async function handleList(
  resource: string,
  category: string,
  options: ListOptions,
): Promise<void> {
  const resourceModule = registry.get(resource)

  if (!resourceModule) {
    console.error(`Error: Unknown resource type "${resource}"`)
    console.error(
      `Available resources: ${registry.list().join(', ') || 'none'}`,
    )
    process.exit(1)
  }

  try {
    const results = await resourceModule.list(category, options)
    console.log(results)
  } catch (error) {
    console.error(`Error listing ${resource}:`, error)
    process.exit(1)
  }
}
