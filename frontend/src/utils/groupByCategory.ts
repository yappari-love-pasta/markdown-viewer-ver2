import type { DocumentMeta, CategoryGroup } from '../types'

export function groupByCategory(documents: DocumentMeta[]): CategoryGroup[] {
  const map = new Map<string, DocumentMeta[]>()
  for (const doc of documents) {
    const existing = map.get(doc.category) ?? []
    existing.push(doc)
    map.set(doc.category, existing)
  }
  return Array.from(map.entries()).map(([category, docs]) => ({
    category,
    documents: docs,
  }))
}
