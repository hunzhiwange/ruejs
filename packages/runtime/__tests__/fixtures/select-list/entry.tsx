import { render, signal } from '@rue-js/rue'
import { inputClass } from './styles'

const rows = signal([
  { id: 'mysql', type: 'MYSQL', configured: true },
  { id: 'postgres', type: 'POSTGRESQL', configured: false },
])
const Fields = () => <p>Connection fields</p>
const App = () => (
  <div>
    {rows.get().map((source, index) => (
      <details open>
        <summary>
          {source.id || `Database ${index + 1}`} ·{' '}
          {source.type === 'MYSQL' ? 'MySQL' : 'PostgreSQL'}
        </summary>
        <label>
          Value
          <select
            className={inputClass}
            value={source.type}
            onChange={(event: Event) => {
              const next = rows.get().slice()
              next[index] = { ...source, type: (event.target as HTMLSelectElement).value }
              rows.set(next)
            }}
          >
            <option value="POSTGRESQL">PostgreSQL</option>
            <option value="MYSQL">MySQL</option>
          </select>
        </label>
        <label>
          Selected
          <select className={inputClass}>
            <option value="POSTGRESQL" selected={source.type === 'POSTGRESQL'}>
              PostgreSQL
            </option>
            <option value="MYSQL" selected={source.type === 'MYSQL'}>
              MySQL
            </option>
          </select>
        </label>
        {source.configured ? (
          <button onClick={() => rows.set(rows.get().map(row => ({ ...row, configured: false })))}>
            Edit
          </button>
        ) : (
          <Fields />
        )}
      </details>
    ))}
  </div>
)
;(globalThis as any).selectList = {
  replace: (types: string[]) =>
    rows.set(types.map((type, index) => ({ id: String(index), type, configured: true }))),
  app: render(<App />, '#app'),
}
