import { useState, useEffect, useCallback } from 'react'
import type { DocumentMeta } from '../types'
import { USE_MOCK } from '../constants'
import { MOCK_DOCUMENT_LIST } from '../mock/mockData'
import { fetchDocumentList } from '../services/api'

export function useDocumentList() {
  const [documentList, setDocumentList] = useState<DocumentMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (USE_MOCK) {
      setTimeout(() => {
        setDocumentList(MOCK_DOCUMENT_LIST)
        setIsLoading(false)
      }, 300)
      return
    }
    setIsLoading(true)
    fetchDocumentList()
      .then(data => setDocumentList(data))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [refreshKey])

  const refetch = useCallback(() => setRefreshKey(k => k + 1), [])

  return { documentList, isLoading, refetch }
}
