import { type FC, useState, useRef } from 'react'
import { X, Upload } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { TabType } from '../../types'
import { uploadDocument } from '../../services/api'

const FORMAT_OPTIONS: { value: TabType; label: string }[] = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'mermaid',  label: 'Mermaid（図解）' },
  { value: 'markmap',  label: 'Markmap（マインドマップ）' },
  { value: 'marp',     label: 'Marp（スライド）' },
]

// モーダル内共通スタイル
const inputCls = 'input input-bordered input-sm w-full upload-placeholder'

const UploadModal: FC = () => {
  const { isUploadOpen, closeUpload } = useApp()
  const [title, setTitle]       = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags]             = useState('')
  const [user, setUser]             = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [format, setFormat]     = useState<TabType>('markdown')
  const [file, setFile]         = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage]   = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setTitle('')
    setCategory('')
    setTags('')
    setUser('')
    setEditPassword('')
    setFormat('markdown')
    setFile(null)
    setMessage(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleClose = () => {
    reset()
    closeUpload()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title || !category) {
      setMessage({ type: 'error', text: 'ファイル・タイトル・分類は必須です' })
      return
    }
    setIsSubmitting(true)
    setMessage(null)
    try {
      await uploadDocument({ file, title, category, format, tags, user, editPassword })
      setMessage({ type: 'success', text: 'アップロードしました' })
      setTimeout(handleClose, 1500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'アップロードに失敗しました'
      setMessage({ type: 'error', text: msg })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isUploadOpen) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md upload-modal-box">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">新規アップロード</h3>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={handleClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ファイル */}
          <div className="form-control">
            <label className="label"><span className="label-text">ファイル (.md) *</span></label>
            <input
              ref={fileRef}
              type="file"
              accept=".md"
              className="file-input file-input-bordered file-input-sm w-full"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* タイトル */}
          <div className="form-control">
            <label className="label"><span className="label-text">タイトル *</span></label>
            <input
              type="text"
              className={inputCls}

              placeholder="ドキュメントタイトル"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* 分類 */}
          <div className="form-control">
            <label className="label"><span className="label-text">分類 *</span></label>
            <input
              type="text"
              className={inputCls}

              placeholder="例: 設計、運用、企画"
              value={category}
              onChange={e => setCategory(e.target.value)}
            />
          </div>

          {/* 投稿者 */}
          <div className="form-control">
            <label className="label"><span className="label-text">投稿者</span></label>
            <input
              type="text"
              className={inputCls}

              placeholder="例: 山田太郎"
              value={user}
              onChange={e => setUser(e.target.value)}
            />
          </div>

          {/* 形式 */}
          <div className="form-control">
            <label className="label"><span className="label-text">形式 *</span></label>
            <select
              className="select select-bordered select-sm"
              value={format}
              onChange={e => setFormat(e.target.value as TabType)}
            >
              {FORMAT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* タグ */}
          <div className="form-control">
            <label className="label"><span className="label-text">タグ（カンマ区切り）</span></label>
            <input
              type="text"
              className={inputCls}

              placeholder="例: AWS, API, Mermaid"
              value={tags}
              onChange={e => setTags(e.target.value)}
            />
          </div>

          {/* 編集時パスワード */}
          <div className="form-control">
            <label className="label"><span className="label-text">編集時パスワード</span></label>
            <input
              type="password"
              className={inputCls}
              placeholder="設定する場合のみ入力"
              value={editPassword}
              onChange={e => setEditPassword(e.target.value)}
            />
          </div>

          {message && (
            <div className={`alert alert-sm ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          <div className="modal-action mt-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleClose}>
              キャンセル
            </button>
            <button type="submit" className="btn btn-primary btn-sm gap-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              アップロード
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={handleClose} />
    </div>
  )
}

export default UploadModal
