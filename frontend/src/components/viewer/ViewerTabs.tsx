import { type FC, lazy, Suspense } from 'react'
import { useApp } from '../../context/AppContext'
import { TAB_LABELS } from '../../constants'
import type { TabType } from '../../types'
import SkeletonLoader from './SkeletonLoader'

const MarkdownViewer = lazy(() => import('./MarkdownViewer'))
const MermaidViewer = lazy(() => import('./MermaidViewer'))
const MarkmapViewer = lazy(() => import('./MarkmapViewer'))
const MarpViewer = lazy(() => import('./MarpViewer'))

const TABS: TabType[] = ['markdown', 'mermaid', 'markmap', 'marp']

const ViewerTabs: FC = () => {
  const { activeTab, setActiveTab, content, isContentLoading, selectedDocument } = useApp()

  if (!selectedDocument) {
    return (
      <div className="flex-1 flex items-center justify-center text-base-content/30">
        <div className="text-center space-y-3">
          <div className="text-6xl">📄</div>
          <p className="text-lg">左のサイドバーからドキュメントを選択してください</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* タブバー */}
      <div className="flex items-center gap-2 px-4 py-2 bg-base-200 border-b-2 border-base-300">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-base-100 text-base-content shadow-sm border border-base-300'
                : 'text-base-content/60 hover:text-base-content hover:bg-base-100/50'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* ビューワーエリア */}
      <div className="flex-1 overflow-auto relative">
        {isContentLoading ? (
          <SkeletonLoader />
        ) : (
          <Suspense fallback={<SkeletonLoader />}>
            {activeTab === 'markdown' && <MarkdownViewer content={content} />}
            {activeTab === 'mermaid' && <MermaidViewer content={content} />}
            {activeTab === 'markmap' && <MarkmapViewer content={content} />}
            {activeTab === 'marp' && <MarpViewer content={content} />}
          </Suspense>
        )}
      </div>
    </div>
  )
}

export default ViewerTabs
