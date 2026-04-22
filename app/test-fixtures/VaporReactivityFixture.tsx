import { computed, ref, type FC } from '@rue-js/rue'

export const TogglePanel: FC = () => {
  const open = ref(false)

  return (
    <section>
      <button
        data-testid="toggle"
        onClick={() => {
          open.value = !open.value
        }}
      >
        {open.value ? 'open' : 'closed'}
      </button>
      {open.value ? <p data-testid="content">content</p> : null}
    </section>
  )
}

type Row = {
  name: string
  power: number
}

const DemoGrid: FC<{
  data: Row[]
  filterKey: string
}> = props => {
  const filteredRows = computed(() => {
    const q = props.filterKey.trim().toLowerCase()
    if (!q) {
      return props.data
    }
    return props.data.filter(row => row.name.toLowerCase().includes(q))
  })

  return (
    <ul data-testid="rows">
      {filteredRows.get().map(row => (
        <li key={row.name}>{row.name}</li>
      ))}
    </ul>
  )
}

export const SortFilterPreview: FC = () => {
  const activeTab = ref<'preview' | 'code'>('preview')
  const searchQuery = ref('')
  const gridData: Row[] = [
    { name: 'Chuck Norris', power: Number.POSITIVE_INFINITY },
    { name: 'Bruce Lee', power: 9000 },
    { name: 'Jackie Chan', power: 7000 },
    { name: 'Jet Li', power: 8000 },
  ]

  return (
    <section>
      <div role="tablist">
        <button
          role="tab"
          data-testid="tab-preview"
          onClick={() => {
            activeTab.value = 'preview'
          }}
        >
          preview
        </button>
        <button
          role="tab"
          data-testid="tab-code"
          onClick={() => {
            activeTab.value = 'code'
          }}
        >
          code
        </button>
      </div>

      {activeTab.value === 'preview' ? (
        <div data-testid="preview-panel">
          <input
            data-testid="search"
            value={searchQuery.value}
            onInput={(event: Event) => {
              searchQuery.value = (event.target as HTMLInputElement).value
            }}
          />
          <DemoGrid data={gridData} filterKey={searchQuery.value} />
        </div>
      ) : (
        <pre data-testid="code-panel">code</pre>
      )}
    </section>
  )
}
