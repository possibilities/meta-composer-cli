import type { ShowOptions } from '../../types/index.js'

export function handleShow(
  resource: string,
  ids: string[],
  options: ShowOptions,
): void {
  console.log('show command:', {
    resource,
    ids,
    options,
  })
}
