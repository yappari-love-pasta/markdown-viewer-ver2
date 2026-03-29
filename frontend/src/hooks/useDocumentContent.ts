import { useState, useEffect } from 'react'
import type { DocumentMeta } from '../types'
import { USE_MOCK } from '../constants'
import { MOCK_CONTENT_MAP } from '../mock/mockData'
import { fetchFileContent } from '../services/api'

export function useDocumentContent(doc: DocumentMeta | null) {
  const [content, setContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!doc) return
    setIsLoading(true)
    setContent('')

    if (USE_MOCK) {
      setTimeout(() => {
        setContent(MOCK_CONTENT_MAP[doc.path] ?? '# コンテンツが見つかりません')
        setIsLoading(false)
      }, 200)
      return
    }
    fetchFileContent(doc.path)
      .then(text => setContent(text))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [doc])

  return { content, isLoading }
}
