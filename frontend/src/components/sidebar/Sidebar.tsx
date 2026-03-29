import { type FC, useState } from 'react'
import { Plus } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import CategoryAccordion from './CategoryAccordion'
import ThemeToggle from '../header/ThemeToggle'

const Sidebar: FC = () => {
  const { categoryGroups, selectedDocument, setSelectedDocument, openUpload, isListLoading, theme, toggleTheme } = useApp()
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    () => new Set(categoryGroups.map(g => g.category))
  )

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  return (
    <aside className="flex flex-col h-full bg-base-200 border-r-2 border-base-300 w-96 shrink-0">
      {/* ロゴ + テーマ切替 */}
      <div className="flex items-center justify-between px-4 py-4 border-b-2 border-base-300">
        <h2 className="text-base font-bold text-primary">Markdown Viewer</h2>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      {/* ドキュメントリスト */}
      <div className="flex-1 overflow-y-auto p-3">
        {isListLoading ? (
          <div className="space-y-2 pt-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-8 w-full rounded" />
            ))}
          </div>
        ) : categoryGroups.length === 0 ? (
          <p className="text-sm text-base-content/50 text-center pt-8">
            ドキュメントがありません
          </p>
        ) : (
          categoryGroups.map(group => (
            <CategoryAccordion
              key={group.category}
              group={group}
              isOpen={openCategories.has(group.category)}
              onToggle={() => toggleCategory(group.category)}
              selectedDocument={selectedDocument}
              onSelect={setSelectedDocument}
            />
          ))
        )}
      </div>

      {/* 新規アップロードボタン */}
      <div className="p-3 border-t-2 border-base-300">
        <button
          className="btn btn-primary btn-sm w-full gap-2"
          onClick={openUpload}
        >
          <Plus className="w-4 h-4" />
          新規アップロード
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
