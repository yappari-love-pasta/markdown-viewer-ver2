export interface DocumentMeta {
  path: string
  title: string
  category: string
  tags: string[]
  lastModified: string
  format: TabType
  user?: string
  editPassword?: string
}

export type TabType = 'markdown' | 'mermaid' | 'markmap' | 'marp'

export type Theme = 'dark' | 'light'

export interface CategoryGroup {
  category: string
  documents: DocumentMeta[]
}
