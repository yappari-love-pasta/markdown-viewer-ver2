import { type FC, useEffect, useRef, useState, useCallback } from 'react'
import { ZoomIn, ZoomOut, RefreshCw, Maximize2 } from 'lucide-react'
import mermaid from 'mermaid'
import { useApp } from '../../context/AppContext'

interface Props {
  content: string
}

// アプリのダークテーマに合わせたカラーパレット (oklch 19%/255 系)
const DARK_THEME_VARS = {
  darkMode:            true,
  background:          '#121a28',
  primaryColor:        '#1e3a5f',
  primaryTextColor:    '#dce8f8',
  primaryBorderColor:  '#3a6ea8',
  lineColor:           '#5a9fd4',
  secondaryColor:      '#162847',
  tertiaryColor:       '#0f1e34',
  nodeBorder:          '#3a6ea8',
  clusterBkg:          '#162847',
  clusterBorder:       '#2a5080',
  edgeLabelBackground: '#1a2e48',
  titleColor:          '#dce8f8',
  attributeBackgroundColorEven: '#162847',
  attributeBackgroundColorOdd:  '#1a3055',
}

// アプリのライトテーマに合わせたカラーパレット (oklch 96%/240 系)
const LIGHT_THEME_VARS = {
  darkMode:            false,
  background:          '#f5f7fb',
  primaryColor:        '#dbeafe',
  primaryTextColor:    '#1e3a5f',
  primaryBorderColor:  '#93c5fd',
  lineColor:           '#3b82f6',
  secondaryColor:      '#ede9fe',
  tertiaryColor:       '#f0fdf4',
  nodeBorder:          '#93c5fd',
  clusterBkg:          '#eff6ff',
  clusterBorder:       '#bfdbfe',
  edgeLabelBackground: '#f0f7ff',
  titleColor:          '#1e3a5f',
}

// 並行レンダリング時のID衝突を防ぐためのモジュールレベルカウンター
let _renderId = 0

function extractMermaidCode(md: string): string {
  const match = md.match(/```mermaid\n([\s\S]*?)```/)
  return match ? match[1].trim() : md.trim()
}

/**
 * Mermaid が生成する edgeLabel の rect に横方向のパディングと角丸を追加する。
 * rect は原点中心 (x = -W/2, y = -H/2) で配置されているため、
 * 左右に padX ずつ広げても内側のテキストは再センタリング不要。
 */
function styleEdgeLabels(container: HTMLDivElement) {
  const PAD_X = 8   // 横余白 (px)
  const PAD_Y = 2   // 縦余白 (px)
  const RADIUS = 6  // 角丸半径 (px)

  container.querySelectorAll<SVGGElement>('.edgeLabel').forEach(group => {
    const rect = group.querySelector('rect')
    if (!rect) return

    const w = parseFloat(rect.getAttribute('width')  ?? '0')
    const h = parseFloat(rect.getAttribute('height') ?? '0')
    const x = parseFloat(rect.getAttribute('x')      ?? '0')
    const y = parseFloat(rect.getAttribute('y')      ?? '0')
    if (w <= 0 || h <= 0) return

    rect.setAttribute('width',  String(w + PAD_X * 2))
    rect.setAttribute('height', String(h + PAD_Y * 2))
    rect.setAttribute('x',      String(x - PAD_X))
    rect.setAttribute('y',      String(y - PAD_Y))
    rect.setAttribute('rx',     String(RADIUS))
    rect.setAttribute('ry',     String(RADIUS))
  })
}

const MermaidViewer: FC<Props> = ({ content }) => {
  const { theme } = useApp()
  const wrapperRef   = useRef<HTMLDivElement>(null)  // overflow-hidden の外側
  const containerRef = useRef<HTMLDivElement>(null)  // transform を適用する内側
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  // SVGサイズをコンテナに合わせた初期スケールを計算
  const calcFitScale = useCallback((): number => {
    if (!wrapperRef.current || !containerRef.current) return 1
    const svgEl = containerRef.current.querySelector('svg')
    if (!svgEl) return 1

    // viewBox から自然サイズを取得（transform の影響を受けない）
    const vb = svgEl.viewBox?.baseVal
    const svgW = vb && vb.width  > 0 ? vb.width  : svgEl.getBoundingClientRect().width
    const svgH = vb && vb.height > 0 ? vb.height : svgEl.getBoundingClientRect().height
    if (svgW <= 0 || svgH <= 0) return 1

    const padding  = 64  // 上下左右の余白(px)
    const availW   = wrapperRef.current.clientWidth  - padding
    const availH   = wrapperRef.current.clientHeight - padding
    return Math.min(availW / svgW, availH / svgH, 1)  // 等倍より拡大はしない
  }, [])

  // テーマ変更時に再初期化してレンダリング
  const renderDiagram = useCallback(async (cancelled: { value: boolean }) => {
    if (!containerRef.current || !content) return

    const isDark = theme === 'dark'
    mermaid.initialize({
      startOnLoad: false,
      theme:        'base',
      themeVariables: isDark ? DARK_THEME_VARS : LIGHT_THEME_VARS,
      securityLevel: 'loose',
      fontFamily:    '"Noto Sans JP", "Segoe UI", system-ui, sans-serif',
    })

    // Date.now() は同一ミリ秒で重複しうるため、モジュール内カウンタで一意化
    const id   = `mermaid-${++_renderId}`
    const code = extractMermaidCode(content)

    // レンダリング前にコンテナをクリア（エラー時に前回内容が残らないよう）
    if (containerRef.current) containerRef.current.innerHTML = ''

    try {
      const { svg } = await mermaid.render(id, code)

      // React StrictMode の二重実行や古い非同期結果を破棄
      if (cancelled.value || !containerRef.current) return

      // Mermaid がエラーを SVG として描画するケースを検出してコンソールへ
      if (/syntax error/i.test(svg)) {
        console.warn('[Mermaid] Syntax error in diagram – rendering suppressed.')
        return
      }

      containerRef.current.innerHTML = svg

      // エッジラベルに横余白と角丸を追加
      styleEdgeLabels(containerRef.current)

      // レイアウト確定後にフィットスケールを計算してセット
      requestAnimationFrame(() => {
        setTranslate({ x: 0, y: 0 })
        setScale(calcFitScale())
      })

      // Mermaid が body に残した一時要素を削除
      // ※ container 内の正規 SVG は削除しないよう body 直下のみ対象にする
      document.body.querySelector(`:scope > #${CSS.escape(id)}`)?.remove()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)

      // 非Mermaid形式のコンテンツを開いた場合は正常ケースとして無視
      if (/no diagram type detected/i.test(msg)) return

      // その他のエラーのみコンソールへ
      console.warn('[Mermaid] Render error:', msg)
    }
  }, [content, theme, calcFitScale])

  useEffect(() => {
    const cancelled = { value: false }
    setScale(1)
    setTranslate({ x: 0, y: 0 })
    renderDiagram(cancelled)
    // クリーンアップ: アンマウント or 再実行時に古い非同期処理を無効化
    return () => { cancelled.value = true }
  }, [renderDiagram])

  // ホイールズーム
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setScale(prev => Math.min(5, Math.max(0.2, prev - e.deltaY * 0.001)))
  }

  // ドラッグ移動
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    setTranslate(prev => ({ x: prev.x + dx, y: prev.y + dy }))
  }
  const handleMouseUp = () => { isDragging.current = false }

  // フィットスケールに戻す（リセット = 画面に合わせる）
  const resetView = () => { setScale(calcFitScale()); setTranslate({ x: 0, y: 0 }) }

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* 図エリア */}
      <div
        ref={wrapperRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing select-none bg-base-200 rounded-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* グリッド背景 */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div
          ref={containerRef}
          className="absolute inset-0 flex items-center justify-center p-8"
          style={{
            transform:       `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition:      isDragging.current ? 'none' : 'transform 0.15s ease',
          }}
        />
      </div>

      {/* ズームコントロール (右下) */}
      <div className="absolute bottom-5 right-5 flex flex-col gap-1.5 items-center">
        {/* スケール表示 */}
        <div className="text-xs font-mono bg-base-300/80 backdrop-blur px-2 py-0.5 rounded-full text-base-content/70 border border-base-300 mb-1">
          {Math.round(scale * 100)}%
        </div>

        <div className="flex flex-col gap-1 bg-base-300/80 backdrop-blur border border-base-300 rounded-xl p-1.5 shadow-lg">
          <button
            className="btn btn-xs btn-ghost btn-square tooltip tooltip-left"
            data-tip="拡大"
            onClick={() => setScale(s => Math.min(5, parseFloat((s + 0.25).toFixed(2))))}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            className="btn btn-xs btn-ghost btn-square tooltip tooltip-left"
            data-tip="リセット"
            onClick={resetView}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            className="btn btn-xs btn-ghost btn-square tooltip tooltip-left"
            data-tip="縮小"
            onClick={() => setScale(s => Math.max(0.2, parseFloat((s - 0.25).toFixed(2))))}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        {/* フィット表示 */}
        <button
          className="btn btn-xs btn-ghost btn-square bg-base-300/80 backdrop-blur border border-base-300 rounded-xl shadow-lg tooltip tooltip-left mt-1"
          data-tip="画面に合わせる"
          onClick={resetView}
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* 操作ヒント (左下) */}
      <div className="absolute bottom-5 left-5 text-xs text-base-content/30 pointer-events-none">
        ドラッグ: 移動 &nbsp;|&nbsp; ホイール: ズーム
      </div>
    </div>
  )
}

export default MermaidViewer
