import { type FC, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import mermaid from 'mermaid'
import { useApp } from '../../context/AppContext'

interface Props {
  content: string
}

const MarkdownViewer: FC<Props> = ({ content }) => {
  const { theme } = useApp()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Mermaidの初期化
    const isDark = theme === 'dark'
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'loose'
    })
  }, [theme])

  useEffect(() => {
    // Mermaid図を描画
    const renderMermaidDiagrams = async () => {
      if (!containerRef.current) return
      
      try {
        // 少し遅延してMermaidを実行（ReactMarkdownのレンダリング完了後）
        setTimeout(async () => {
          await mermaid.run({
            querySelector: '.mermaid-diagram'
          })
        }, 100)
      } catch (error) {
        console.error('[MarkdownViewer] Mermaid rendering error:', error)
      }
    }

    renderMermaidDiagrams()
  }, [content, theme])

  return (
    <div ref={containerRef} className="markdown-body p-6 max-w-none prose prose-sm max-w-none">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '')
            const language = match?.[1]
            
            // インラインコードかどうかを判定（classNameがあればブロック、なければインライン）
            const isCodeBlock = !!className
            
            if (isCodeBlock && language === 'mermaid') {
              // Mermaidコードブロックの場合 - web-markdown-viewerと同様の方法
              const code = String(children).replace(/\n$/, '')
              return (
                <div className="mermaid-container my-6">
                  <div 
                    className="mermaid-diagram my-6" 
                    style={{ textAlign: 'center' }}
                    dangerouslySetInnerHTML={{ __html: code }}
                  />
                  <details className="border border-slate-300 dark:border-slate-700 rounded-lg mb-6 bg-slate-50 dark:bg-slate-800 overflow-hidden">
                    <summary className="px-4 py-2 cursor-pointer font-medium flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700/50">
                      Mermaidソースコードを表示 
                      <span className="text-xs text-slate-500 dark:text-slate-400">クリックで開閉</span>
                    </summary>
                    <div className="p-4 relative">
                      <button 
                        className="absolute top-5 right-5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm" 
                        onClick={() => {
                          navigator.clipboard.writeText(code).then(() => {
                            // コピー成功の表示（簡易版）
                            console.log('Copied to clipboard')
                          })
                        }}
                      >
                        コピー
                      </button>
                      <pre className="overflow-auto">
                        <code className="language-mermaid">{code}</code>
                      </pre>
                    </div>
                  </details>
                </div>
              )
            }
            
            // 通常のコードブロック
            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownViewer
