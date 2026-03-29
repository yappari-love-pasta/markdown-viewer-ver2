import { type FC } from 'react'

interface Props {
  lines?: number
}

const SkeletonLoader: FC<Props> = ({ lines = 8 }) => {
  return (
    <div className="p-6 space-y-3 animate-pulse">
      <div className="skeleton h-8 w-1/2 rounded" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-4 rounded"
          style={{ width: `${70 + (i % 3) * 10}%` }}
        />
      ))}
    </div>
  )
}

export default SkeletonLoader
