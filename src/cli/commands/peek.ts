import type { PeekOptions } from '../../types/index.js'
import { registry } from '../../resources/index.js'

export async function handlePeek(
  resource: string,
  ids: string[],
  options: PeekOptions,
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
    const results = await resourceModule.peek(...ids)
    console.log(results)
  } catch (error) {
    console.error(`Error peeking ${resource}:`, error)
    process.exit(1)
  }
}
