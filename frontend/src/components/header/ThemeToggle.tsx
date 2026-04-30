import { type FC } from 'react'
import { Sun, Moon } from 'lucide-react'
import type { Theme } from '../../types'

interface Props {
  theme: Theme
  onToggle: () => void
}

const ThemeToggle: FC<Props> = ({ theme, onToggle }) => {
  return (
    <label className="swap swap-rotate btn btn-circle bg-gradient-to-br from-base-300 to-base-200 hover:from-primary/20 hover:to-primary/10 border-0 transition-all" title="テーマ切替">
      <input type="checkbox" checked={theme === 'light'} onChange={onToggle} />
      <Sun className="swap-on w-5 h-5" />
      <Moon className="swap-off w-5 h-5" />
    </label>
  )
}

export default ThemeToggle
