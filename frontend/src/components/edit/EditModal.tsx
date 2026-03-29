import { type FC, useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { TabType } from '../../types'
import { updateDocument } from '../../services/api'

const FORMAT_OPTIONS: { value: TabType; label: string }[] = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'mermaid',  label: 'Mermaid（図解）' },
  { value: 'markmap',  label: 'Markmap（マインドマップ）' },
  { value: 'marp',     label: 'Marp（スライド）' },
]

const inputCls = 'input input-bordered input-sm w-full upload-placeholder'

const EditModal: FC = () => {
  const {
    isEditOpen, closeEdit,
    selectedDocument, content,
    setSelectedDocument, refreshDocumentList,
  } = useApp()

  const [title,           setTitle]           = useState('')
  const [category,        setCategory]        = useState('')
  const [user,            setUser]            = useState('')
  const [format,          setFormat]          = useState<TabType>('markdown')
  const [tags,            setTags]            = useState('')
  const [editContent,     setEditContent]     = useState('')
  const [enteredPassword, setEnteredPassword] = useState('')
  const [initial, setInitial] = useState({
    title: '', category: '', user: '', format: 'markdown' as TabType, tags: '', content: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // モーダルが開いたときにフォームを初期化
  useEffect(() => {
    if (isEditOpen && selectedDocument) {
      const vals = {
        title:    selectedDocument.title,
        category: selectedDocument.category,
        user:     selectedDocument.user ?? '',
        format:   selectedDocument.format as TabType,
        tags:     selectedDocument.tags.join(', '),
        content,
      }
      setTitle(vals.title)
      setCategory(vals.category)
      setUser(vals.user)
      setFormat(vals.format)
      setTags(vals.tags)
      setEditContent(vals.content)
      setInitial(vals)
      setEnteredPassword('')
      setMessage(null)
    }
  }, [isEditOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const storedPassword = selectedDocument?.editPassword ?? ''
  const requiresPassword = storedPassword !== ''
  const passwordOk = !requiresPassword || enteredPassword === storedPassword

  const isDirty =
    title       !== initial.title    ||
    category    !== initial.category ||
    user        !== initial.user     ||
    format      !== initial.format   ||
    tags        !== initial.tags     ||
    editContent !== initial.content

  const handleClose = () => {
    setMessage(null)
    closeEdit()
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDocument || !isDirty || !passwordOk) return
    setIsSubmitting(true)
    setMessage(null)
    try {
      const result = await updateDocument({
        path:         selectedDocument.path,
        title,
        category,
        user,
        format,
        tags,
        content:      editContent,
        editPassword: enteredPassword,
      })
      setSelectedDocument(result.meta)
      refreshDocumentList()
      setMessage({ type: 'success', text: '保存しました' })
      setTimeout(handleClose, 1200)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '保存に失敗しました'
      setMessage({ type: 'error', text: msg })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isEditOpen || !selectedDocument) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-3xl w-full max-h-[90vh] overflow-y-auto upload-modal-box">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">ドキュメント編集</h3>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={handleClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* 編集時パスワード（設定されている場合のみ表示） */}
          {requiresPassword && (
            <div className="form-control">
              <label className="label"><span className="label-text">編集時パスワード *</span></label>
              <input
                type="password"
                className={inputCls}
                placeholder="パスワードを入力してください"
                value={enteredPassword}
                onChange={e => setEnteredPassword(e.target.value)}
                autoFocus
              />
              {enteredPassword !== '' && !passwordOk && (
                <label className="label">
                  <span className="label-text-alt text-error">パスワードが一致しません</span>
                </label>
              )}
            </div>
          )}

          {/* メタデータ */}
          <div className="grid grid-cols-2 gap-3">
            {/* タイトル */}
            <div className="form-control col-span-2">
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
          </div>

          {/* コンテンツ */}
          <div className="form-control">
            <label className="label"><span className="label-text">内容</span></label>
            <textarea
              className="textarea textarea-bordered font-mono text-sm w-full upload-placeholder"
              rows={20}
              placeholder="Markdownコンテンツを入力..."
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
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
            <button
              type="submit"
              className="btn btn-primary btn-sm gap-2"
              disabled={!isDirty || !passwordOk || isSubmitting}
            >
              {isSubmitting ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              保存
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={handleClose} />
    </div>
  )
}

export default EditModal
