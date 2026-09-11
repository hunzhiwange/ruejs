import type { FC } from '@rue-js/rue'

const TDZMemo: FC = () => {
  return (
    <div className="max-w-[600px] mx-auto p-6">
      <h2 className="text-xl font-semibold mb-3">TDZ E2E</h2>
      <select aria-label="切换主题" className="select select-bordered select-sm bg-transparent">
        <option value="light">亮色 (light)</option>
        <option value="dark">暗色 (dark)</option>
      </select>
    </div>
  )
}

export default TDZMemo
