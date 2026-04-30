import { type FC, useEffect, useRef } from 'react'
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'
import { useApp } from '../../context/AppContext'

interface Props {
  content: string
}

const transformer = new Transformer()

const MarkmapViewer: FC<Props> = ({ content }) => {
  const { theme } = useApp()
  const svgRef = useRef<SVGSVGElement>(null)
  const mmRef = useRef<Markmap | null>(null)

  useEffect(() => {
    if (!svgRef.current) return
    if (!mmRef.current) {
      // カスタムスタイルをページに追加
      const existingStyle = document.getElementById('markmap-custom-style')
      if (existingStyle) {
        existingStyle.remove()
      }
      
      const style = document.createElement('style')
      style.id = 'markmap-custom-style'
      style.textContent = `
        .markmap-node-text {
          fill: white !important;
          font-weight: 500;
          cursor: pointer;
          paint-order: stroke fill;
          stroke: rgba(0, 0, 0, 0.8);
          stroke-width: 2px;
          stroke-linejoin: round;
        }
        .markmap-node-text:hover {
          fill: #f0f0f0 !important;
        }
        .markmap-link {
          stroke-width: 2px;
          opacity: 0.8;
        }
        .markmap-node > circle:hover {
          stroke-width: 3px;
          filter: brightness(1.2);
        }
        .markmap svg {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        }
      `
      document.head.appendChild(style)
      
      mmRef.current = Markmap.create(svgRef.current)
    }
  }, [theme])

  useEffect(() => {
    if (!mmRef.current || !content) return
    const { root } = transformer.transform(content)
    mmRef.current.setData(root)
    mmRef.current.fit()
  }, [content])

  return (
    <div className="w-full bg-base-100" style={{ height: '600px' }}>
      <svg ref={svgRef} className="w-full h-full" style={{ background: 'transparent' }} />
    </div>
  )
}

export default MarkmapViewer
