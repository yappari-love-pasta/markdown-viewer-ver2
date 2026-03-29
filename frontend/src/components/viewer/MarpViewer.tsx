import { type FC, useState, useEffect } from 'react'

interface Props {
  content: string
}

const MarpViewer: FC<Props> = ({ content }) => {
  const [slides, setSlides] = useState<Array<{ html: string; css: string }>>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!content) return
    setCurrentSlide(0)

    const renderMarp = async () => {
      try {
        const { Marp } = await import('@marp-team/marp-core')
        const marp = new Marp()
        const { html, css } = marp.render(content)

        // スライドを分割 (section タグで区切る)
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        const sections = Array.from(doc.querySelectorAll('section'))

        if (sections.length > 0) {
          setSlides(sections.map(s => ({ html: s.outerHTML, css })))
        } else {
          setSlides([{ html, css }])
        }
        setError(null)
      } catch (err) {
        setError('Marp レンダリングに失敗しました: ' + String(err))
      }
    }

    renderMarp()
  }, [content])

  if (error) {
    return (
      <div className="p-6">
        <div className="alert alert-error"><span>{error}</span></div>
      </div>
    )
  }

  if (slides.length === 0) {
    return <div className="p-6 text-base-content/50">スライドを読み込み中...</div>
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {/* スライド表示 */}
      <div className="w-full max-w-3xl">
        <iframe
          srcDoc={`<!DOCTYPE html><html><head><style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            html, body { width: 100%; height: 100%; overflow: hidden; background: #111; }
            section {
              display: block !important;
              width: 1280px !important;
              height: 720px !important;
              transform-origin: top left;
              transform: scale(calc(100vw / 1280));
            }
            ${slides[currentSlide]?.css ?? ''}
          </style></head><body>
            ${slides[currentSlide]?.html ?? ''}
          </body></html>`}
          className="w-full border border-base-300 rounded-lg shadow-lg bg-black"
          style={{ height: '56.25vw', maxHeight: '540px', minHeight: '300px' }}
          sandbox="allow-scripts"
          title={`slide-${currentSlide + 1}`}
        />
      </div>

      {/* ナビゲーション */}
      {slides.length > 1 && (
        <div className="flex items-center gap-4">
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setCurrentSlide(s => Math.max(0, s - 1))}
            disabled={currentSlide === 0}
          >
            ← 前へ
          </button>
          <span className="text-sm text-base-content/70">
            {currentSlide + 1} / {slides.length}
          </span>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setCurrentSlide(s => Math.min(slides.length - 1, s + 1))}
            disabled={currentSlide === slides.length - 1}
          >
            次へ →
          </button>
        </div>
      )}
    </div>
  )
}

export default MarpViewer
