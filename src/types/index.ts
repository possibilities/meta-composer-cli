export interface BuildOptions {
  resource: string
  category: string
}

export interface ListOptions {
  resource: string
  category: string
}

export interface PeekOptions {
  resource: string
  ids: string[]
}

export interface ShowOptions {
  resource: string
  ids: string[]
}
