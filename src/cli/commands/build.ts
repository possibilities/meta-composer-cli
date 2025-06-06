import type { BuildOptions } from '../../types/index.js'

export function handleBuild(
  resource: string,
  category: string,
  options: BuildOptions,
): void {
  console.log('build command:', {
    resource,
    category,
    options,
  })
}
