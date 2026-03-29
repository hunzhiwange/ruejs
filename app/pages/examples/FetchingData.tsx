import { type FC, computed, ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

type Row = Record<string, string | number>

const DemoGrid: FC<{
  data: Row[]
  columns: string[]
  filterKey: string
}> = props => {
  const sortKey = ref<string>('')
  const sortOrders = ref<Record<string, number>>(
    props.columns.reduce(
      (o, k) => {
        ;(o as any)[k] = 1
        return o
      },
      {} as Record<string, number>,
    ),
  )

  const filteredData = computed(() => {
    let data: Row[] = props.data
    let filterKey = props.filterKey
    if (filterKey) {
      const q = String(filterKey).toLowerCase()
      data = data.filter(row =>
        Object.keys(row).some(key => String(row[key]).toLowerCase().includes(q)),
      )
    }
    const key = sortKey.value
    if (key) {
      const order = sortOrders.value[key]
      data = data.slice().sort((a, b) => {
        const av = a[key] as any
        const bv = b[key] as any
        return (av === bv ? 0 : av > bv ? 1 : -1) * order
      })
    }
    return data
  })

  const sortBy = (key: string) => {
    sortKey.value = key
    sortOrders.value[key] = (sortOrders.value[key] || 1) * -1
  }

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

  return (
    <div>
      {filteredData.get().length ? (
        <table className="min-w-full border-2 border-emerald-500 rounded-md bg-white">
          <thead>
            <tr>
              {props.columns.map(key => (
                <th
                  key={key}
                  className={`bg-emerald-500 text-white/90 cursor-pointer select-none px-5 py-2 ${sortKey.value === key ? 'text-white' : ''}`}
                  onClick={() => sortBy(key)}
                >
                  {capitalize(key)}
                  <span
                    className={`ml-2 inline-block align-middle opacity-80 ${sortOrders.value[key] > 0 ? 'border-l-4 border-r-4 border-b-4 border-transparent border-b-white h-0 w-0' : 'border-l-4 border-r-4 border-t-4 border-transparent border-t-white h-0 w-0'}`}
                  ></span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.get().map((entry: Row, idx: number) => (
              <tr key={idx}>
                {props.columns.map(key => (
                  <td key={key} className="bg-gray-50 min-w-[120px] px-5 py-2">
                    {String(entry[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-700">No matches found.</p>
      )}
    </div>
  )
}

const SortFilterGrid: FC = () => {
  const searchQuery = ref('')
  const gridColumns = ['name', 'power']
  const gridData: Row[] = [
    { name: 'Chuck Norris', power: Infinity },
    { name: 'Bruce Lee', power: 9000 },
    { name: 'Jackie Chan', power: 7000 },
    { name: 'Jet Li', power: 8000 },
  ]

  const updateQuery = (e: any) => {
    searchQuery.value = (e.target as HTMLInputElement).value
  }
  const activeTab = ref<'preview' | 'code'>('preview')

  return (
    <SidebarPlayground>
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">带有排序和过滤器的网格（移植自 Vue）</h1>

      <div role="tablist" className="tabs tabs-box">
        <button
          role="tab"
          className={`tab ${activeTab.value === 'preview' ? 'tab-active' : ''}`}
          onClick={() => {
            activeTab.value = 'preview'
          }}
        >
          效果
        </button>
        <button
          role="tab"
          className={`tab ${activeTab.value === 'code' ? 'tab-active' : ''}`}
          onClick={() => {
            activeTab.value = 'code'
          }}
        >
          代码
        </button>
      </div>

      <div className="mt-4 grid md:grid-cols-1 gap-6 items-start">
        {activeTab.value === 'code' && (
          <div className="card bg-base-100 shadow overflow-auto h-[360px] md:h-[720px]">
            <div className="card-body p-0">
              <Code
                className="h-full"
                lang="tsx"
                code={`import { type FC, ref, computed } from '@rue-js/rue';

type Row = Record<string, string | number>;

const DemoGrid: FC<{ data: Row[]; columns: string[]; filterKey: string }> = (props) => {
  const sortKey = ref<string>('');
  const sortOrders = ref<Record<string, number>>(props.columns.reduce((o, k) => { (o as any)[k] = 1; return o; }, {} as Record<string, number>));

  const filteredData = computed(() => {
    let data: Row[] = props.data;
    let filterKey = props.filterKey;
    if (filterKey) {
      const q = String(filterKey).toLowerCase();
      data = data.filter((row) => Object.keys(row).some((key) => String(row[key]).toLowerCase().includes(q)));
    }
    const key = sortKey.value;
    if (key) {
      const order = sortOrders.value[key];
      data = data.slice().sort((a, b) => {
        const av = a[key] as any;
        const bv = b[key] as any;
        return (av === bv ? 0 : av > bv ? 1 : -1) * order;
      });
    }
    return data;
  });

  const sortBy = (key: string) => {
    sortKey.value = key;
    sortOrders.value[key] = (sortOrders.value[key] || 1) * -1;
  };

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <div>
      {filteredData.value.length ? (
        <table className="min-w-full border-2 border-emerald-500 rounded-md bg-white">
          <thead>
            <tr>
              {props.columns.map((key) => (
                <th
                  key={key}
                  className={\`bg-emerald-500 text-white/90 cursor-pointer select-none px-5 py-2 \${sortKey.value === key ? 'text-white' : ''}\`}
                  onClick={() => sortBy(key)}
                >
                  {capitalize(key)}
                  <span className={\`ml-2 inline-block align-middle opacity-80 \${sortOrders.value[key] > 0 ? 'border-l-4 border-r-4 border-b-4 border-transparent border-b-white h-0 w-0' : 'border-l-4 border-r-4 border-t-4 border-transparent border-t-white h-0 w-0'}\`}></span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.value.map((entry, idx) => (
              <tr key={idx}>
                {props.columns.map((key) => (
                  <td key={key} className="bg-gray-50 min-w-[120px] px-5 py-2">{String(entry[key])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-700">No matches found.</p>
      )}
    </div>
  );
};

const SortFilterGrid: FC = () => {
  const searchQuery = ref('');
  const gridColumns = ['name', 'power'];
  const gridData: Row[] = [
    { name: 'Chuck Norris', power: Infinity },
    { name: 'Bruce Lee', power: 9000 },
    { name: 'Jackie Chan', power: 7000 },
    { name: 'Jet Li', power: 8000 },
  ];
  const updateQuery = (e: any) => { searchQuery.value = (e.target as HTMLInputElement).value; };
  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body grid gap-4">
        <form id="search" className="flex items-center gap-2">
          <span>Search</span>
          <input
            name="query"
            className="input input-bordered"
            value={searchQuery.value}
            onInput={updateQuery}
          />
        </form>
        <DemoGrid data={gridData} columns={gridColumns} filterKey={searchQuery.value} />
      </div>
    </div>
  );
};

export default SortFilterGrid;`}
              />
            </div>
          </div>
        )}

        {activeTab.value === 'preview' && (
          <div className="card bg-base-100 shadow">
            <div className="card-body grid gap-4">
              <form id="search" className="flex items-center gap-2">
                <span>Search</span>
                <input
                  name="query"
                  className="input input-bordered"
                  value={searchQuery.value}
                  onInput={updateQuery}
                />
              </form>
              <DemoGrid data={gridData} columns={gridColumns} filterKey={searchQuery.value} />
            </div>
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default SortFilterGrid
