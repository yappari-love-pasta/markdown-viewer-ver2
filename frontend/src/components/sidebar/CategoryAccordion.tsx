import { type FC } from 'react'
import { ChevronDown } from 'lucide-react'
import type { CategoryGroup, DocumentMeta } from '../../types'
import DocumentItem from './DocumentItem'

interface Props {
  group: CategoryGroup
  isOpen: boolean
  onToggle: () => void
  selectedDocument: DocumentMeta | null
  onSelect: (doc: DocumentMeta) => void
}

const CategoryAccordion: FC<Props> = ({ group, isOpen, onToggle, selectedDocument, onSelect }) => {
  return (
    <div className="mb-2 pb-1 border-b border-base-300/50 last:border-b-0">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-base-300 transition-colors text-sm font-semibold text-base-content/80"
        onClick={onToggle}
      >
        <ChevronDown
          className="w-4 h-4 shrink-0 transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
        <span className="truncate">{group.category}</span>
        <span className="ml-auto badge badge-sm badge-ghost">{group.documents.length}</span>
      </button>
      {/* CSS Grid trick: grid-template-rows 0fr→1fr でアニメーション */}
      <div
        className="grid transition-all duration-200 ease-in-out"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        <ul className="overflow-hidden ml-2 mt-1 space-y-0.5">
          {group.documents.map(doc => (
            <DocumentItem
              key={doc.path}
              doc={doc}
              isActive={selectedDocument?.path === doc.path}
              onSelect={onSelect}
            />
          ))}
        </ul>
      </div>
    </div>
  )
}

export default CategoryAccordion
