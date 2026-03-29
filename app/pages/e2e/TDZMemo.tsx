import type { FC } from '@rue-js/rue'

const TDZMemo: FC = () => {
  const themes = ['light', 'dark']
  const labels: Record<string, string> = { light: '亮色', dark: '暗色' }
  return (
    <div className="max-w-[600px] mx-auto p-6">
      <h2 className="text-xl font-semibold mb-3">TDZ E2E</h2>
      <select aria-label="切换主题" className="select select-bordered select-sm bg-transparent">
        {themes.map(n => (
          <option key={n} value={n}>
            {labels[n] ? `${labels[n]} (${n})` : n}
          </option>
        ))}
      </select>
    </div>
  )
}

export default TDZMemo
