import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { DocumentMeta, TabType, Theme, CategoryGroup } from '../types'
import { useTheme } from '../hooks/useTheme'
import { useDocumentList } from '../hooks/useDocumentList'
import { useDocumentContent } from '../hooks/useDocumentContent'
import { groupByCategory } from '../utils/groupByCategory'

interface AppContextValue {
  theme: Theme
  toggleTheme: () => void
  selectedDocument: DocumentMeta | null
  setSelectedDocument: (doc: DocumentMeta) => void
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
  content: string
  isContentLoading: boolean
  documentList: DocumentMeta[]
  isListLoading: boolean
  categoryGroups: CategoryGroup[]
  isUploadOpen: boolean
  openUpload: () => void
  closeUpload: () => void
  isEditOpen: boolean
  openEdit: () => void
  closeEdit: () => void
  refreshDocumentList: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme()
  const { documentList, isLoading: isListLoading, refetch: refreshDocumentList } = useDocumentList()
  const [selectedDocument, setSelectedDocumentState] = useState<DocumentMeta | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('markdown')
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const { content, isLoading: isContentLoading } = useDocumentContent(selectedDocument)

  // S3 path → URL id 変換: "uploads/xxxx.md" → "xxxx"
  const toUrlId   = (path: string) => path.replace(/^uploads\//, '').replace(/\.md$/, '')
  // URL id → S3 path 変換: "xxxx" → "uploads/xxxx.md"
  const fromUrlId = (id: string)   => `uploads/${id}.md`

  // ドキュメント選択: 状態更新 + URL クエリストリング同期
  const setSelectedDocument = (doc: DocumentMeta) => {
    setSelectedDocumentState(doc)
    setActiveTab(doc.format)
    const params = new URLSearchParams(window.location.search)
    params.set('id', toUrlId(doc.path))
    history.replaceState(null, '', `?${params.toString()}`)
  }

  // ドキュメントリスト読み込み完了後、URL の ?id= に対応するドキュメントを自動選択
  useEffect(() => {
    if (isListLoading || documentList.length === 0) return
    const id = new URLSearchParams(window.location.search).get('id')
    if (!id) return
    const found = documentList.find(d => d.path === fromUrlId(id))
    if (found) {
      setSelectedDocumentState(found)
      setActiveTab(found.format)
    }
  }, [isListLoading, documentList])

  const categoryGroups = groupByCategory(documentList)

  return (
    <AppContext.Provider value={{
      theme, toggleTheme,
      selectedDocument, setSelectedDocument,
      activeTab, setActiveTab,
      content, isContentLoading,
      documentList, isListLoading,
      categoryGroups,
      isUploadOpen,
      openUpload: () => setIsUploadOpen(true),
      closeUpload: () => setIsUploadOpen(false),
      isEditOpen,
      openEdit: () => setIsEditOpen(true),
      closeEdit: () => setIsEditOpen(false),
      refreshDocumentList,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
