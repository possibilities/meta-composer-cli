import type { ListOptions } from '../../types/index.js'

export function handleList(
  resource: string,
  category: string,
  options: ListOptions,
): void {
  console.log('list command:', {
    resource,
    category,
    options,
  })
}
