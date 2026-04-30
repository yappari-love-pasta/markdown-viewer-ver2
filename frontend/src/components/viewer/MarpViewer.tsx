import { type FC, useState, useEffect, useMemo } from 'react'
import { marked } from 'marked'

interface Props {
  content: string
}

const MarpViewer: FC<Props> = ({ content }) => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [lastContent, setLastContent] = useState(content)

  // contentが変わった時にスライドをリセット（React推奨パターン）
  if (content !== lastContent) {
    setLastContent(content)
    setCurrentSlide(0)
  }

  // contentからslidesとerrorを計算
  const { slides, error } = useMemo(() => {
    if (!content) {
      return { slides: [], error: null }
    }

    try {
      // スライドごとに分割（---で区切られている）
      const slideContents = content.split(/^---$/m).filter(slide => slide.trim())
      
      if (slideContents.length === 0) {
        return { 
          slides: [], 
          error: 'Marp形式でスライドが見つかりませんでした。' 
        }
      }

      return { slides: slideContents, error: null }
    } catch (err) {
      return { 
        slides: [], 
        error: 'Marp レンダリングに失敗しました: ' + String(err) 
      }
    }
  }, [content])

  const showSlide = (index: number) => {
    setCurrentSlide(index)
  }

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && currentSlide > 0) {
      showSlide(currentSlide - 1)
    } else if (e.key === 'ArrowRight' && currentSlide < slides.length - 1) {
      showSlide(currentSlide + 1)
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [currentSlide, slides.length])

  if (error) {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      </div>
    )
  }

  if (slides.length === 0) {
    return <div className="p-6 text-base-content/50">スライドを読み込み中...</div>
  }

  // CSS styles
  const marpStyles = `
    .marp-container {
      width: 100%;
      max-width: 100%;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      margin: 20px 0;
      border: 1px solid #ddd;
    }
    
    .dark .marp-container {
      background: #1e293b;
      border-color: #404040;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    .marp-slide {
      width: 100%;
      aspect-ratio: 16/9;
      padding: 60px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      position: relative;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 500px;
    }

    .dark .marp-slide {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    }

    .marp-slide h1 {
      font-size: 3rem !important;
      font-weight: bold !important;
      margin: 0 0 1.5rem 0 !important;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3) !important;
      line-height: 1.2 !important;
      color: white !important;
      display: block !important;
    }

    .marp-slide h2 {
      font-size: 2.2rem !important;
      font-weight: 600 !important;
      margin: 0 0 1rem 0 !important;
      text-shadow: 1px 1px 3px rgba(0,0,0,0.3) !important;
      color: white !important;
      display: block !important;
    }

    .marp-slide h3 {
      font-size: 1.8rem !important;
      font-weight: 500 !important;
      margin: 0 0 0.8rem 0 !important;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.3) !important;
      color: white !important;
      display: block !important;
    }

    .marp-slide h4, .marp-slide h5, .marp-slide h6 {
      font-weight: 600 !important;
      color: white !important;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.2) !important;
      display: block !important;
    }

    .marp-slide p {
      font-size: 1.4rem !important;
      line-height: 1.6 !important;
      margin: 0 0 1rem 0 !important;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.2) !important;
      color: white !important;
    }

    .marp-slide table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 1.5rem 0 !important;
      font-size: 1.2rem !important;
      background-color: rgba(30, 41, 59, 0.8) !important;
      color: #fff !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
      border-radius: 6px !important;
      overflow: hidden !important;
    }

    .marp-slide th, .marp-slide td {
      padding: 0.8rem 1rem !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      text-align: left !important;
      color: white !important;
    }

    .marp-slide th {
      background-color: rgba(0, 0, 0, 0.5) !important;
      font-weight: 600 !important;
      text-transform: uppercase !important;
      font-size: 1.1rem !important;
      letter-spacing: 0.05em !important;
      color: white !important;
    }
    
    .marp-slide tr {
      background-color: rgba(30, 41, 59, 0.6) !important;
    }

    .marp-slide tr:nth-child(even) {
      background-color: rgba(30, 41, 59, 0.8) !important;
    }

    .marp-slide tr:hover {
      background-color: rgba(45, 55, 72, 0.9) !important;
    }

    .marp-slide ul, .marp-slide ol {
      font-size: 1.3rem !important;
      line-height: 1.8 !important;
      text-align: left !important;
      margin: 1rem 0 !important;
      padding-left: 2rem !important;
      color: white !important;
    }

    .marp-slide li {
      margin: 0.5rem 0 !important;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.2) !important;
      color: white !important;
    }

    .marp-slide code {
      background: rgba(255,255,255,0.2) !important;
      color: #fff !important;
      padding: 0.2rem 0.4rem !important;
      border-radius: 4px !important;
      font-family: 'Courier New', monospace !important;
    }

    .marp-slide pre {
      background: rgba(0,0,0,0.3) !important;
      color: #fff !important;
      padding: 1rem !important;
      border-radius: 8px !important;
      font-size: 1.1rem !important;
      text-align: left !important;
      overflow-x: auto !important;
      margin: 1rem 0 !important;
    }

    .marp-slide-number {
      position: absolute !important;
      bottom: 20px !important;
      right: 30px !important;
      font-size: 1rem !important;
      opacity: 0.7 !important;
      background: rgba(0,0,0,0.3) !important;
      padding: 5px 10px !important;
      border-radius: 15px !important;
      color: white !important;
    }

    .marp-nav-controls {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      padding: 15px;
      background: rgba(0,0,0,0.05);
      border-top: 1px solid #eee;
    }

    .dark .marp-nav-controls {
      background: rgba(255,255,255,0.05);
      border-top-color: #404040;
    }

    .marp-nav-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      background: #667eea;
      color: white;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
      font-weight: 500;
    }

    .marp-nav-btn:hover:not(:disabled) {
      background: #5a67d8;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    }

    .marp-nav-btn:disabled {
      background: #cbd5e0;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .dark .marp-nav-btn:disabled {
      background: #4a5568;
    }

    .marp-slide-counter {
      font-size: 14px;
      color: #666;
      font-weight: 500;
      padding: 0 10px;
    }

    .dark .marp-slide-counter {
      color: #a0a0a0;
    }
  `

  return (
    <div className="w-full bg-base-100">
      <style dangerouslySetInnerHTML={{ __html: marpStyles }} />

      {/* Marpコンテナ */}
      <div className="marp-container">
        {/* 現在のスライドを表示 */}
        <div className="marp-slide">
          <div 
            dangerouslySetInnerHTML={{ 
              __html: marked.parse(slides[currentSlide]?.trim() || '') 
            }} 
          />
          
          {/* スライド番号 */}
          <div className="marp-slide-number">
            {currentSlide + 1} / {slides.length}
          </div>
        </div>

        {/* ナビゲーションコントロール */}
        {slides.length > 1 && (
          <div className="marp-nav-controls">
            <button
              className="marp-nav-btn"
              onClick={() => showSlide(Math.max(0, currentSlide - 1))}
              disabled={currentSlide === 0}
            >
              前のスライド
            </button>
            <span className="marp-slide-counter">
              {currentSlide + 1} / {slides.length}
            </span>
            <button
              className="marp-nav-btn"
              onClick={() => showSlide(Math.min(slides.length - 1, currentSlide + 1))}
              disabled={currentSlide === slides.length - 1}
            >
              次のスライド
            </button>
          </div>
        )}
      </div>

      {/* ソースコード表示用のアコーディオン */}
      <details className="border border-slate-300 dark:border-slate-700 rounded-lg mb-6 bg-slate-50 dark:bg-slate-800 overflow-hidden">
        <summary className="px-4 py-2 cursor-pointer font-medium flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700/50">
          Marpソースコードを表示 
          <span className="text-xs text-slate-500 dark:text-slate-400">クリックで開閉</span>
        </summary>
        <div className="p-4 relative">
          <button 
            className="absolute top-5 right-5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm" 
            onClick={() => {
              navigator.clipboard.writeText(content).then(() => {
                console.log('Copied to clipboard')
              })
            }}
          >
            コピー
          </button>
          <pre className="overflow-auto">
            <code className="language-markdown">{content}</code>
          </pre>
        </div>
      </details>
    </div>
  )
}

export default MarpViewer
