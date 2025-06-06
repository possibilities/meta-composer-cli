export interface BuildOptions {
  resource: string
  type: string
}

export interface ListOptions {
  resource: string
  type: string
}

export interface PeekOptions {
  resource: string
  ids: string[]
}

export interface ShowOptions {
  resource: string
  ids: string[]
}
