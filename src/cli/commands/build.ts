import type { BuildOptions } from '../../types/index.js'

export function handleBuild(
  resource: string,
  type: string,
  options: BuildOptions,
): void {
  console.log('build command:', {
    resource,
    type,
    options,
  })
}
