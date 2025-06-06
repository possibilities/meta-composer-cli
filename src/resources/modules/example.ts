import { BaseResourceModule } from '../base.js'

interface ExampleItem {
  id: string
  name: string
  category: string
  description: string
}

export class ExampleResource extends BaseResourceModule {
  private items: ExampleItem[] = [
    {
      id: '1',
      name: 'Item One',
      category: 'alpha',
      description: 'First example item',
    },
    {
      id: '2',
      name: 'Item Two',
      category: 'beta',
      description: 'Second example item',
    },
    {
      id: '3',
      name: 'Item Three',
      category: 'alpha',
      description: 'Third example item',
    },
    {
      id: '4',
      name: 'Item Four',
      category: 'gamma',
      description: 'Fourth example item',
    },
  ]

  constructor() {
    super('example')
  }

  async list(category: string): Promise<ExampleItem[]> {
    return this.items.filter(item => item.category === category)
  }

  async show(...ids: string[]): Promise<ExampleItem[]> {
    return ids
      .map(id => this.items.find(item => item.id === id))
      .filter((item): item is ExampleItem => item !== undefined)
  }
}
