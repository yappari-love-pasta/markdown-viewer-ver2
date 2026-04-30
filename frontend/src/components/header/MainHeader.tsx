import { type FC } from 'react'
import { Pencil } from 'lucide-react'
import { useApp } from '../../context/AppContext'


function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

const MainHeader: FC = () => {
  const { selectedDocument, openEdit } = useApp()

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b-2 border-base-300 bg-base-100 min-h-[56px]">
      {/* 左: タイトル・タグ */}
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        {selectedDocument ? (
          <>
            <h1 className="text-lg font-semibold text-base-content truncate leading-tight">
              {selectedDocument.title}
            </h1>
            {selectedDocument.tags.length > 0 && (
              <p className="text-xs" style={{ color: '#727171' }}>
                タグ：{selectedDocument.tags.join('　／　')}
              </p>
            )}
          </>
        ) : (
          <h1 className="text-lg font-semibold text-base-content/50">
            ドキュメントを選択してください
          </h1>
        )}
      </div>

      {/* 右: 最終更新日・編集ボタン */}
      {selectedDocument && (
        <div className="flex items-center gap-3 ml-4 shrink-0">
          <span className="text-xs" style={{ color: '#727171' }}>
            最終更新日：{formatDate(selectedDocument.lastModified)}
          </span>
          <button
            className="btn btn-xs gap-1 bg-gradient-to-br from-accent/20 to-accent/10 hover:from-accent/30 hover:to-accent/20 border border-accent/30 hover:border-accent/50 text-accent hover:text-accent transition-all"
            onClick={openEdit}
          >
            <Pencil className="w-3 h-3" />
            編集
          </button>
        </div>
      )}
    </header>
  )
}

export default MainHeader
