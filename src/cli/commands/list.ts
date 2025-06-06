import type { ListOptions } from '../../types/index.js'

export function handleList(
  resource: string,
  type: string,
  options: ListOptions,
): void {
  console.log('list command:', {
    resource,
    type,
    options,
  })
}
