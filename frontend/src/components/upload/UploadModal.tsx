import { type FC, useState, useRef } from 'react'
import { X, Upload, FileText } from 'lucide-react'
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
  const { isUploadOpen, closeUpload, refreshDocumentList } = useApp()
  const [title, setTitle]       = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags]             = useState('')
  const [user, setUser]             = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [format, setFormat]     = useState<TabType>('markdown')
  const [file, setFile]         = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage]   = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!file.name.toLowerCase().endsWith('.md')) {
      return 'マークダウンファイル（.md）のみアップロード可能です'
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB制限
      return 'ファイルサイズは10MB以下にしてください'
    }
    return null
  }

  const handleFileSelect = (selectedFile: File) => {
    const error = validateFile(selectedFile)
    if (error) {
      setMessage({ type: 'error', text: error })
      return
    }
    setFile(selectedFile)
    setMessage(null)
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  const handleDropAreaClick = () => {
    fileRef.current?.click()
  }

  const reset = () => {
    setTitle('')
    setCategory('')
    setTags('')
    setUser('')
    setEditPassword('')
    setFormat('markdown')
    setFile(null)
    setMessage(null)
    setIsDragOver(false)
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
      // アップロード成功後、サイドバーのドキュメント一覧を更新
      refreshDocumentList()
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
          <button className="btn btn-circle btn-sm bg-gradient-to-br from-base-300 to-base-200 hover:from-error/20 hover:to-error/10 border-0 transition-all" onClick={handleClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ファイル - ドラッグ&ドロップエリア */}
          <div className="form-control">
            <label className="label"><span className="label-text">ファイル (.md) *</span></label>
            <div
              className={`
                relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
                ${isDragOver 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-gray-300 hover:border-primary hover:bg-base-200'
                }
              `}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={handleDropAreaClick}
            >
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-60" />
              {file ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-success">✓ {file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <p className="text-xs text-gray-400">クリックして変更</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {isDragOver ? 'ファイルをドロップしてください' : 'ファイルをドラッグ&ドロップ'}
                  </p>
                  <p className="text-xs text-gray-500">
                    または <span className="text-primary underline">クリックして選択</span>
                  </p>
                  <p className="text-xs text-gray-400">マークダウンファイル (.md) のみ</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".md"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileInputChange}
              />
            </div>
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
            <button type="button" className="btn btn-sm bg-gradient-to-br from-base-300 to-base-200 hover:from-base-200 hover:to-base-100 border-0 transition-all" onClick={handleClose}>
              キャンセル
            </button>
            <button type="submit" className="btn btn-sm gap-2 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-content border-0 transition-all shadow-lg" disabled={isSubmitting}>
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
