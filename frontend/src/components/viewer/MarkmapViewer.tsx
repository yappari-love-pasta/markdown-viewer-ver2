import { type FC, useEffect, useRef } from 'react'
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'

interface Props {
  content: string
}

const transformer = new Transformer()

const MarkmapViewer: FC<Props> = ({ content }) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const mmRef = useRef<Markmap | null>(null)

  useEffect(() => {
    if (!svgRef.current) return
    if (!mmRef.current) {
      mmRef.current = Markmap.create(svgRef.current)
    }
  }, [])

  useEffect(() => {
    if (!mmRef.current || !content) return
    const { root } = transformer.transform(content)
    mmRef.current.setData(root)
    mmRef.current.fit()
  }, [content])

  return (
    <div className="w-full" style={{ height: '600px' }}>
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  )
}

export default MarkmapViewer
