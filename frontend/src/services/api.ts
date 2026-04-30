/**
 * バックエンド API クライアント
 * 環境変数 VITE_API_BASE_URL が設定されていない場合は /api をベースURLとして使用
 */

import type { DocumentMeta, TabType } from '../types'

const BASE_URL = 'https://guj5firmug.execute-api.ap-northeast-1.amazonaws.com'

// -------------------------------------------------------
// Basic 認証設定
// 一時的に無効化（CORS全開テスト用）
// -------------------------------------------------------
// const BASIC_AUTH_USER = '60siv66Q7o'     // ← 設定してください
// const BASIC_AUTH_PASSWORD = 'TBAtPyIxli' // ← 設定してください
// -------------------------------------------------------

function getAuthHeader(): Record<string, string> {
  // Basic認証を無効化
  return {}
}

export interface UploadParams {
  file: File
  title: string
  category: string
  format: TabType
  tags: string
  user: string
  editPassword: string
}

export interface UploadResult {
  message: string
  path: string
  meta: DocumentMeta
}

export interface UpdateParams {
  path: string
  title: string
  category: string
  format: TabType
  tags: string
  user: string
  content: string
  editPassword: string
}

export interface UpdateResult {
  message: string
  meta: DocumentMeta
}

export async function fetchDocumentList(): Promise<DocumentMeta[]> {
  const res = await fetch(`${BASE_URL}/list`, {
    headers: getAuthHeader(),
  })
  if (!res.ok) throw new Error(`GET /list failed: ${res.status}`)
  return res.json()
}

export async function fetchFileContent(path: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/file?path=${encodeURIComponent(path)}`, {
    headers: getAuthHeader(),
  })
  if (!res.ok) throw new Error(`GET /file failed: ${res.status}`)
  return res.text()
}

export async function uploadDocument(params: UploadParams): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', params.file)
  form.append('title', params.title)
  form.append('category', params.category)
  form.append('format', params.format)
  form.append('tags', params.tags)
  form.append('user', params.user)
  form.append('editPassword', params.editPassword)

  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: getAuthHeader(),  // multipart では Content-Type はブラウザが自動設定
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error ?? `Upload failed: ${res.status}`)
  }
  return res.json()
}

export async function updateDocument(params: UpdateParams): Promise<UpdateResult> {
  const res = await fetch(`${BASE_URL}/update`, {
    method: 'PUT',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error ?? `Update failed: ${res.status}`)
  }
  return res.json()
}
