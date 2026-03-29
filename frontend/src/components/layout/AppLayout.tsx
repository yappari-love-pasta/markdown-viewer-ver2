import { type FC, useState } from 'react'
import { Menu, X } from 'lucide-react'
import Sidebar from '../sidebar/Sidebar'
import MainHeader from '../header/MainHeader'
import ViewerTabs from '../viewer/ViewerTabs'
import UploadModal from '../upload/UploadModal'
import EditModal from '../edit/EditModal'

const AppLayout: FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-base-100">
      {/* モバイル: ハンバーガーボタン */}
      <button
        className="lg:hidden fixed top-3 left-3 z-50 btn btn-ghost btn-sm btn-circle"
        onClick={() => setIsMobileOpen(v => !v)}
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* サイドバー (デスクトップ: flex内固定列, モバイル: fixed オーバーレイ) */}
      <div className={`
        shrink-0
        max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-40
        max-lg:transition-transform max-lg:duration-200
        ${isMobileOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full'}
      `}>
        <Sidebar />
      </div>

      {/* モバイル: 背景オーバーレイ */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* メインコンテンツ */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <MainHeader />
        <ViewerTabs />
      </div>

      <UploadModal />
      <EditModal />
    </div>
  )
}

export default AppLayout
