import { type FC } from 'react'
import { FileText } from 'lucide-react'
import type { DocumentMeta } from '../../types'

interface Props {
  doc: DocumentMeta
  isActive: boolean
  onSelect: (doc: DocumentMeta) => void
}

const FORMAT_BADGE: Record<string, string> = {
  markdown: 'MD',
  mermaid:  'MM',
  markmap:  'MK',
  marp:     'MP',
}

const FORMAT_COLOR: Record<string, string> = {
  markdown: 'badge-info',
  mermaid:  'badge-success',
  markmap:  'badge-warning',
  marp:     'badge-secondary',
}

const DocumentItem: FC<Props> = ({ doc, isActive, onSelect }) => {
  return (
    <li>
      <button
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
          isActive
            ? 'bg-primary text-primary-content'
            : 'hover:bg-base-300 text-base-content'
        }`}
        onClick={() => onSelect(doc)}
      >
        <FileText className="w-4 h-4 shrink-0" />
        <span className="truncate flex-1">{doc.title}</span>
        <span className={`badge badge-xs shrink-0 ${isActive ? 'badge-outline' : FORMAT_COLOR[doc.format]}`}>
          {FORMAT_BADGE[doc.format]}
        </span>
      </button>
    </li>
  )
}

export default DocumentItem
