import type { PeekOptions } from '../../types/index.js'

export function handlePeek(
  resource: string,
  ids: string[],
  options: PeekOptions,
): void {
  console.log('peek command:', {
    resource,
    ids,
    options,
  })
}
