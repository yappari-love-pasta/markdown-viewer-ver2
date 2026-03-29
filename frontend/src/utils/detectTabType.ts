import type { TabType } from '../types'

export function detectTabType(content: string): TabType {
  if (/^---\s*\nmarp:\s*true/m.test(content)) {
    return 'marp'
  }
  const mermaidBlocks = content.match(/```mermaid/g)
  if (mermaidBlocks && mermaidBlocks.length > 0) {
    return 'mermaid'
  }
  return 'markdown'
}
