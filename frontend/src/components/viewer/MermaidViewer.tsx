import { type FC, useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import { useApp } from '../../context/AppContext'

interface Props {
  content: string
}

function extractMermaidCode(md: string): string {
  let code = md.trim()
  
  // コードブロックマーカーを除去
  code = code.replace(/^```mermaid\s*\n/, '').replace(/\n```\s*$/, '')
  
  // さらに念のため先頭と末尾のコードブロックマーカーを除去
  code = code.replace(/^```mermaid/, '').replace(/```$/, '')
  
  // HTMLエスケープを解除する処理
  code = code
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  
  return code.trim()
}

const MermaidViewer: FC<Props> = ({ content }) => {
  const { theme } = useApp()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Mermaidの初期化設定（テーマ変更時にも再初期化）
    const isDark = theme === 'dark'
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'loose'
    })
  }, [theme])

  useEffect(() => {
    if (!containerRef.current || !content) return

    const renderMermaid = async () => {
      try {
        const container = containerRef.current
        if (!container) return

        const mermaidCode = extractMermaidCode(content)
        console.log('[Mermaid] Extracted code:', mermaidCode)

        // 既存のコンテンツをクリア
        container.innerHTML = ''

        // web-markdown-viewerの正常動作する方法を参考に
        // Mermaidコンテナを作成
        const mermaidContainer = document.createElement('div')
        mermaidContainer.className = 'mermaid-container my-6'
        
        // Mermaid要素を作成（web-markdown-viewerと同じ方法）
        const mermaidDiv = document.createElement('div')
        mermaidDiv.className = 'mermaid my-6'
        // textContentではなくinnerHTMLを使用
        mermaidDiv.innerHTML = mermaidCode
        
        mermaidContainer.appendChild(mermaidDiv)
        container.appendChild(mermaidContainer)

        // web-markdown-viewerと同様の遅延処理でMermaidを実行
        setTimeout(async () => {
          try {
            await mermaid.run({ 
              querySelector: '.mermaid' 
            })
            console.log('[Mermaid] Render completed successfully')
          } catch (renderError) {
            console.error('[Mermaid] Render execution error:', renderError)
            throw renderError
          }
        }, 10)
        
      } catch (error) {
        console.error('[Mermaid] Render error:', error)
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div class="p-6 text-center text-error">
              <h3 class="text-lg font-semibold mb-2">Mermaid図の描画に失敗しました</h3>
              <p class="text-sm opacity-70">${error instanceof Error ? error.message : String(error)}</p>
              <details class="mt-4 text-left">
                <summary class="cursor-pointer text-sm font-medium">ソースコード</summary>
                <pre class="mt-2 p-3 bg-base-300 rounded text-xs overflow-auto">${content}</pre>
              </details>
            </div>
          `
        }
      }
    }

    renderMermaid()
  }, [content, theme])

  return (
    <div className="w-full h-full bg-base-100">
      <div 
        ref={containerRef}
        className="w-full min-h-[400px] p-4"
        style={{ height: '100%', overflow: 'auto' }}
      />
    </div>
  )
}

export default MermaidViewer
