export interface ResourceModule {
  name: string
  list(category: string, options?: any): Promise<any>
  peek(...ids: string[]): Promise<any>
  show(...ids: string[]): Promise<any>
}

export abstract class BaseResourceModule implements ResourceModule {
  constructor(public readonly name: string) {}

  abstract list(category: string, options?: any): Promise<any>
  abstract peek(...ids: string[]): Promise<any>
  abstract show(...ids: string[]): Promise<any>
}
