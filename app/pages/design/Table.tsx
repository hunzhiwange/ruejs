import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Table, Tabs } from '@rue-js/design'

const TableDemo: FC = () => {
  const tabBasic = ref<'preview' | 'code'>('preview')
  const tabBorderBg = ref<'preview' | 'code'>('preview')
  const tabActiveRow = ref<'preview' | 'code'>('preview')
  const tabHoverRow = ref<'preview' | 'code'>('preview')
  const tabSelection = ref<'preview' | 'code'>('preview')
  const tabSelectionRadio = ref<'preview' | 'code'>('preview')
  const tabSort = ref<'preview' | 'code'>('preview')
  const tabExpand = ref<'preview' | 'code'>('preview')
  const tabPaginate = ref<'preview' | 'code'>('preview')
  const tabZebra = ref<'preview' | 'code'>('preview')
  const tabXs = ref<'preview' | 'code'>('preview')
  const tabVisual = ref<'preview' | 'code'>('preview')
  const tabPinnedRowsFull = ref<'preview' | 'code'>('preview')
  const tabPinnedRowsCols = ref<'preview' | 'code'>('preview')
  const tabFilters = ref<'preview' | 'code'>('preview')
  const tabHidden = ref<'preview' | 'code'>('preview')
  const tabSummary = ref<'preview' | 'code'>('preview')
  const tabEmpty = ref<'preview' | 'code'>('preview')
  const tabRowEvents = ref<'preview' | 'code'>('preview')
  const tabCellAttrs = ref<'preview' | 'code'>('preview')
  const tabScroll = ref<'preview' | 'code'>('preview')
  const tabTitleFooter = ref<'preview' | 'code'>('preview')
  const tabEllipsis = ref<'preview' | 'code'>('preview')
  const tabSelectionPart = ref<'preview' | 'code'>('preview')
  const tabSelectionRadioPart = ref<'preview' | 'code'>('preview')
  const tabFilterFn = ref<'preview' | 'code'>('preview')
  const tabFilterInline = ref<'preview' | 'code'>('preview')

  const selectedVisual = ref<Array<string | number>>([])
  const selectedSelection = ref<Array<string | number>>(['2'])
  const paginateCurrent = ref(1)
  const selectedRadio = ref<string | number | null>('2')
  const selectedSelectionDisabled = ref<Array<string | number>>(['2'])
  const selectedRadioDisabled = ref<string | number | null>('2')
  const selectedSelectionPart = ref<Array<string | number>>(['1'])
  const selectedRadioPart = ref<string | number | null>(null)
  const sortOrderName = ref<'ascend' | 'descend' | null>('ascend')
  const filteredAge = ref<any[]>(['gte40'])
  const filteredAgeInline = ref<any[] | null>(null)
  const filterMultipleEnabled = ref(true)
  const filterOnCloseEnabled = ref(true)
  const dataVisual = [
    {
      key: '2',
      id: 2,
      name: 'Hart Hagerty',
      country: 'United States',
      company: 'Zemlak, Daniel and Leannon',
      job: 'Desktop Support Technician',
      color: 'Purple',
    },
    {
      key: '3',
      id: 3,
      name: 'Brice Swyre',
      country: 'China',
      company: 'Carroll Group',
      job: 'Tax Accountant',
      color: 'Red',
    },
    {
      key: '4',
      id: 4,
      name: 'Marjy Ferencz',
      country: 'Russia',
      company: 'Rowe-Schoen',
      job: 'Office Assistant I',
      color: 'Crimson',
    },
    {
      key: '5',
      id: 5,
      name: 'Yancy Tear',
      country: 'Brazil',
      company: 'Wyman-Ledner',
      job: 'Community Outreach Specialist',
      color: 'Indigo',
    },
  ]

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Table 表格</h1>
        <p className="text-sm mt-3 mb-3">表格用于以表格形式展示列表数据。</p>
        <div className="text-sm">
          <a href="https://daisyui.com/components/table/" target="_blank">
            查看 Table 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Table</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabBasic.value}
            onChange={k => (tabBasic.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabBasic.value === 'preview' ? (
            <div className="overflow-x-auto">
              <Table
                className="w-full"
                columns={[
                  { title: '姓名', dataIndex: 'name' },
                  { title: '年龄', dataIndex: 'age' },
                  { title: '住址', dataIndex: 'address' },
                ]}
                dataSource={[
                  { key: '1', name: '小明', age: 32, address: '高洞村1号' },
                  { key: '2', name: '小红', age: 42, address: '高洞村1号' },
                  { key: '3', name: '王二', age: 22, address: '高洞村2号' },
                ]}
              />
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Table
  className="w-full"
  columns={[
    { title: '姓名', dataIndex: 'name' },
    { title: '年龄', dataIndex: 'age' },
    { title: '住址', dataIndex: 'address' },
  ]}
  dataSource={[
    { key: '1', name: '小明', age: 32, address: '高洞村1号' },
    { key: '2', name: '小红', age: 42, address: '高洞村1号' },
    { key: '3', name: '王二', age: 22, address: '高洞村2号' },
  ]}
/>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 筛选（内置图标菜单/多选/单选/关闭触发）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabFilterInline.value}
            onChange={k => (tabFilterInline.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabFilterInline.value === 'preview' ? (
            <div className="overflow-x-auto">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm">
                  筛选：{(filteredAgeInline.value ?? ['默认≥40']).join(', ')}
                </span>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => (filterMultipleEnabled.value = true)}
                >
                  多选
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => (filterMultipleEnabled.value = false)}
                >
                  单选
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => (filterOnCloseEnabled.value = !filterOnCloseEnabled.value)}
                >
                  {filterOnCloseEnabled.value ? '关闭时触发' : '即时触发'}
                </button>
              </div>
              <Table
                className="w-full"
                columns={[
                  { title: '姓名', dataIndex: 'name' },
                  {
                    title: '年龄',
                    dataIndex: 'age',
                    filters: [
                      { text: '≥40', value: 'gte40' },
                      { text: '<40', value: 'lt40' },
                      { text: '偶数', value: 'even' },
                    ],
                    filteredValue: filteredAgeInline.value ?? undefined,
                    defaultFilteredValue: ['gte40'],
                    filterMultiple: filterMultipleEnabled.value,
                    filterOnClose: filterOnCloseEnabled.value,
                    onFilter: (val: any, rec: any) => {
                      if (val === 'gte40') return rec.age >= 40
                      if (val === 'lt40') return rec.age < 40
                      if (val === 'even') return rec.age % 2 === 0
                      return true
                    },
                  },
                  { title: '住址', dataIndex: 'address' },
                ]}
                dataSource={[
                  { key: '1', name: '小红', age: 42, address: '高洞村1号' },
                  { key: '2', name: '小明', age: 32, address: '高洞村1号' },
                  { key: '3', name: '王二', age: 21, address: '高洞村2号' },
                  { key: '4', name: '赵六', age: 40, address: '高洞村3号' },
                ]}
                onChange={(pagination: any, filters: any, sorter: any, extra: any) => {
                  if (extra?.action === 'filter') {
                    const vals = filters?.age ?? filters?.['age'] ?? []
                    filteredAgeInline.value = Array.isArray(vals) ? vals : []
                  }
                }}
              />
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`const filtered = ref<any[] | null>(null)
const multiple = ref(true)
const onCloseTrigger = ref(true)

<Table
  columns={[
    { title: '姓名', dataIndex: 'name' },
    {
      title: '年龄',
      dataIndex: 'age',
      filters: [
        { text: '≥40', value: 'gte40' },
        { text: '<40', value: 'lt40' },
        { text: '偶数', value: 'even' },
      ],
      filteredValue: filtered.value ?? undefined,
      defaultFilteredValue: ['gte40'],
      filterMultiple: multiple.value,
      filterOnClose: onCloseTrigger.value,
      onFilter: (val, rec) => {
        if (val === 'gte40') return rec.age >= 40
        if (val === 'lt40') return rec.age < 40
        if (val === 'even') return rec.age % 2 === 0
        return true
      },
    },
    { title: '住址', dataIndex: 'address' },
  ]}
  dataSource={[
    { key: '1', name: '小红', age: 42, address: '高洞村1号' },
    { key: '2', name: '小明', age: 32, address: '高洞村1号' },
    { key: '3', name: '王二', age: 21, address: '高洞村2号' },
    { key: '4', name: '赵六', age: 40, address: '高洞村3号' },
  ]}
  onChange={(p, filters, sorter, extra) => {
    if (extra?.action === 'filter') {
      const vals = filters?.age ?? filters?.['age'] ?? []
      filtered.value = Array.isArray(vals) ? vals : []
    }
  }}
/>
`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 筛选（自定义函数）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabFilterFn.value}
            onChange={k => (tabFilterFn.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabFilterFn.value === 'preview' ? (
            <div className="overflow-x-auto">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm">筛选：{filteredAge.value.join(', ') || '无'}</span>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => (filteredAge.value = ['gte40'])}
                >
                  年龄≥40
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => (filteredAge.value = ['lt40'])}
                >
                  年龄＜40
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => (filteredAge.value = ['even'])}
                >
                  偶数年龄
                </button>
                <button className="btn btn-ghost btn-xs" onClick={() => (filteredAge.value = [])}>
                  清空
                </button>
              </div>
              <Table
                className="w-full"
                columns={[
                  {
                    title: '姓名',
                    dataIndex: 'name',
                  },
                  {
                    title: '年龄',
                    dataIndex: 'age',
                    filters: [
                      { text: '≥40', value: 'gte40' },
                      { text: '<40', value: 'lt40' },
                      { text: '偶数', value: 'even' },
                    ],
                    filteredValue: filteredAge.value,
                    filterOnClose: true,
                    onFilter: (val: any, rec: any) => {
                      if (val === 'gte40') return rec.age >= 40
                      if (val === 'lt40') return rec.age < 40
                      if (val === 'even') return rec.age % 2 === 0
                      return true
                    },
                  },
                  { title: '住址', dataIndex: 'address' },
                ]}
                dataSource={[
                  { key: '1', name: '小红', age: 42, address: '高洞村1号' },
                  { key: '2', name: '小明', age: 32, address: '高洞村1号' },
                  { key: '3', name: '王二', age: 21, address: '高洞村2号' },
                  { key: '4', name: '赵六', age: 40, address: '高洞村3号' },
                ]}
                onChange={(p: any, filters: any, sorter: any, extra: any) => {
                  if (extra?.action === 'filter') {
                    const vals = filters?.age ?? filters?.['age'] ?? []
                    filteredAge.value = Array.isArray(vals) ? vals : []
                  }
                }}
              />
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`const filteredAge = ref<any[]>(['gte40'])

<div className="mb-2 flex items-center gap-2">
  <span className="text-sm">筛选：{filteredAge.value.join(', ') || '无'}</span>
  <button className="btn btn-ghost btn-xs" onClick={() => (filteredAge.value = ['gte40'])}>年龄≥40</button>
  <button className="btn btn-ghost btn-xs" onClick={() => (filteredAge.value = ['lt40'])}>年龄＜40</button>
  <button className="btn btn-ghost btn-xs" onClick={() => (filteredAge.value = ['even'])}>偶数年龄</button>
  <button className="btn btn-ghost btn-xs" onClick={() => (filteredAge.value = [])}>清空</button>
</div>

<Table
  className="w-full"
  columns={[
    { title: '姓名', dataIndex: 'name' },
    {
      title: '年龄',
      dataIndex: 'age',
      filters: [
        { text: '≥40', value: 'gte40' },
        { text: '<40', value: 'lt40' },
        { text: '偶数', value: 'even' },
      ],
      filteredValue: filteredAge.value,
      filterOnClose: true,
      onFilter: (val, rec) => {
        if (val === 'gte40') return rec.age >= 40
        if (val === 'lt40') return rec.age < 40
        if (val === 'even') return rec.age % 2 === 0
        return true
      },
    },
    { title: '住址', dataIndex: 'address' },
  ]}
  dataSource={[
    { key: '1', name: '小红', age: 42, address: '高洞村1号' },
    { key: '2', name: '小明', age: 32, address: '高洞村1号' },
    { key: '3', name: '王二', age: 21, address: '高洞村2号' },
    { key: '4', name: '赵六', age: 40, address: '高洞村3号' },
  ]}
  onChange={(p, filters, sorter, extra) => {
    if (extra?.action === 'filter') {
      const vals = filters?.age ?? filters?.['age'] ?? []
      filteredAge.value = Array.isArray(vals) ? vals : []
    }
  }}
/>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 可选择（多选部分禁用）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabSelectionPart.value}
            onChange={k => (tabSelectionPart.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabSelectionPart.value === 'preview' ? (
            <div className="overflow-x-auto">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm">
                  已选：
                  {selectedSelectionPart.value.length
                    ? selectedSelectionPart.value.join(', ')
                    : '无'}
                </span>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => (selectedSelectionPart.value = ['1'])}
                >
                  选中1
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => (selectedSelectionPart.value = ['1', '3'])}
                >
                  选中1,3
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => (selectedSelectionPart.value = [])}
                >
                  清空
                </button>
              </div>
              <Table
                className="w-full"
                rowSelection={{
                  selectedRowKeys: selectedSelectionPart.value,
                  onChange: (keys: Array<string | number>) => (selectedSelectionPart.value = keys),
                  getCheckboxProps: (record: any) => ({ disabled: record.key === '2' }),
                }}
                columns={[
                  { title: '姓名', dataIndex: 'name' },
                  { title: '年龄', dataIndex: 'age' },
                  { title: '住址', dataIndex: 'address' },
                ]}
                dataSource={[
                  { key: '1', name: '小明', age: 32, address: '高洞村1号' },
                  { key: '2', name: '小红', age: 42, address: '高洞村1号' },
                  { key: '3', name: '王二', age: 22, address: '高洞村2号' },
                ]}
              />
              <div className="mt-2 text-xs opacity-60">注：第2行禁用不可选</div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`const selected = ref<Array<string | number>>(['1'])

<div className="overflow-x-auto">
  <div className="mb-2 flex items-center gap-2">
    <span className="text-sm">已选：{selected.value.length ? selected.value.join(', ') : '无'}</span>
    <button className="btn btn-ghost btn-xs" onClick={() => (selected.value = ['1'])}>选中1</button>
    <button className="btn btn-ghost btn-xs" onClick={() => (selected.value = ['1','3'])}>选中1,3</button>
    <button className="btn btn-ghost btn-xs" onClick={() => (selected.value = [])}>清空</button>
  </div>
  <Table
    className="w-full"
    rowSelection={{ selectedRowKeys: selected.value, onChange: (keys) => (selected.value = keys), getCheckboxProps: (record) => ({ disabled: record.key === '2' }) }}
    columns={[{ title: '姓名', dataIndex: 'name' }, { title: '年龄', dataIndex: 'age' }, { title: '住址', dataIndex: 'address' }]}
    dataSource={[{ key: '1', name: '小明', age: 32, address: '高洞村1号' }, { key: '2', name: '小红', age: 42, address: '高洞村1号' }, { key: '3', name: '王二', age: 22, address: '高洞村2号' }]}
  />
  <div className="mt-2 text-xs opacity-60">注：第2行禁用不可选</div>
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 可选择（单选部分禁用）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabSelectionRadioPart.value}
            onChange={k => (tabSelectionRadioPart.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabSelectionRadioPart.value === 'preview' ? (
            <div className="overflow-x-auto">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm">
                  已选：{selectedRadioPart.value != null ? String(selectedRadioPart.value) : '无'}
                </span>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => (selectedRadioPart.value = '1')}
                >
                  选中1
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => (selectedRadioPart.value = '3')}
                >
                  选中3
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => (selectedRadioPart.value = null)}
                >
                  清空
                </button>
              </div>
              <Table
                className="w-full"
                rowSelection={{
                  type: 'radio',
                  selectedRowKeys: selectedRadioPart.value != null ? [selectedRadioPart.value] : [],
                  onChange: (keys: Array<string | number>) =>
                    (selectedRadioPart.value = keys[0] ?? null),
                  getCheckboxProps: (record: any) => ({ disabled: record.key === '2' }),
                }}
                columns={[
                  { title: '姓名', dataIndex: 'name' },
                  { title: '年龄', dataIndex: 'age' },
                  { title: '住址', dataIndex: 'address' },
                ]}
                dataSource={[
                  { key: '1', name: '小明', age: 32, address: '高洞村1号' },
                  { key: '2', name: '小红', age: 42, address: '高洞村1号' },
                  { key: '3', name: '王二', age: 22, address: '高洞村2号' },
                ]}
              />
              <div className="mt-2 text-xs opacity-60">注：第2行禁用不可选</div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`const selected = ref<string | number | null>(null)

<div className="overflow-x-auto">
  <div className="mb-2 flex items-center gap-2">
    <span className="text-sm">已选：{selected.value != null ? String(selected.value) : '无'}</span>
    <button className="btn btn-ghost btn-xs" onClick={() => (selected.value = '1')}>选中1</button>
    <button className="btn btn-ghost btn-xs" onClick={() => (selected.value = '3')}>选中3</button>
    <button className="btn btn-ghost btn-xs" onClick={() => (selected.value = null)}>清空</button>
  </div>
  <Table
    className="w-full"
    rowSelection={{ type: 'radio', selectedRowKeys: selected.value != null ? [selected.value] : [], onChange: (keys) => (selected.value = keys[0] ?? null), getCheckboxProps: (record) => ({ disabled: record.key === '2' }) }}
    columns={[{ title: '姓名', dataIndex: 'name' }, { title: '年龄', dataIndex: 'age' }, { title: '住址', dataIndex: 'address' }]}
    dataSource={[{ key: '1', name: '小明', age: 32, address: '高洞村1号' }, { key: '2', name: '小红', age: 42, address: '高洞村1号' }, { key: '3', name: '王二', age: 22, address: '高洞村2号' }]}
  />
  <div className="mt-2 text-xs opacity-60">注：第2行禁用不可选</div>
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 可选择（多选禁用）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabSelectionRadio.value}
            onChange={k => (tabSelectionRadio.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabSelectionRadio.value === 'preview' ? (
            <div className="overflow-x-auto">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm">
                  已选：
                  {selectedSelectionDisabled.value.length
                    ? selectedSelectionDisabled.value.join(', ')
                    : '无'}
                </span>
                <button className="btn btn-ghost btn-xs" disabled>
                  选中1
                </button>
                <button className="btn btn-ghost btn-xs" disabled>
                  选中1,3
                </button>
                <button className="btn btn-ghost btn-xs" disabled>
                  清空
                </button>
              </div>
              <Table
                className="w-full"
                rowSelection={{
                  disabled: true,
                  selectedRowKeys: selectedSelectionDisabled.value,
                  onChange: (keys: Array<string | number>) =>
                    (selectedSelectionDisabled.value = keys),
                }}
                columns={[
                  { title: '姓名', dataIndex: 'name' },
                  { title: '年龄', dataIndex: 'age' },
                  { title: '住址', dataIndex: 'address' },
                ]}
                dataSource={[
                  { key: '1', name: '小明', age: 32, address: '高洞村1号' },
                  { key: '2', name: '小红', age: 42, address: '高洞村1号' },
                  { key: '3', name: '王二', age: 22, address: '高洞村2号' },
                ]}
              />
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`const selected = ref<Array<string | number>>(['2'])

<div className="overflow-x-auto">
  <div className="mb-2 flex items-center gap-2">
    <span className="text-sm">已选：{selected.value.length ? selected.value.join(', ') : '无'}</span>
    <button className="btn btn-ghost btn-xs" disabled>选中1</button>
    <button className="btn btn-ghost btn-xs" disabled>选中1,3</button>
    <button className="btn btn-ghost btn-xs" disabled>清空</button>
  </div>
  <Table
    className="w-full"
    rowSelection={{ disabled: true, selectedRowKeys: selected.value, onChange: (keys) => (selected.value = keys) }}
    columns={[{ title: '姓名', dataIndex: 'name' }, { title: '年龄', dataIndex: 'age' }, { title: '住址', dataIndex: 'address' }]}
    dataSource={[{ key: '1', name: '小明', age: 32, address: '高洞村1号' }, { key: '2', name: '小红', age: 42, address: '高洞村1号' }, { key: '3', name: '王二', age: 22, address: '高洞村2号' }]}
  />
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 可选择（单选禁用）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabSelectionRadio.value}
            onChange={k => (tabSelectionRadio.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabSelectionRadio.value === 'preview' ? (
            <div className="overflow-x-auto">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm">
                  已选：
                  {selectedRadioDisabled.value != null ? String(selectedRadioDisabled.value) : '无'}
                </span>
                <button className="btn btn-ghost btn-xs" disabled>
                  选中1
                </button>
                <button className="btn btn-ghost btn-xs" disabled>
                  选中3
                </button>
                <button className="btn btn-ghost btn-xs" disabled>
                  清空
                </button>
              </div>
              <Table
                className="w-full"
                rowSelection={{
                  type: 'radio',
                  disabled: true,
                  selectedRowKeys:
                    selectedRadioDisabled.value != null ? [selectedRadioDisabled.value] : [],
                  onChange: (keys: Array<string | number>) =>
                    (selectedRadioDisabled.value = keys[0] ?? null),
                }}
                columns={[
                  { title: '姓名', dataIndex: 'name' },
                  { title: '年龄', dataIndex: 'age' },
                  { title: '住址', dataIndex: 'address' },
                ]}
                dataSource={[
                  { key: '1', name: '小明', age: 32, address: '高洞村1号' },
                  { key: '2', name: '小红', age: 42, address: '高洞村1号' },
                  { key: '3', name: '王二', age: 22, address: '高洞村2号' },
                ]}
              />
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`const selected = ref<string | number | null>('2')

<div className="overflow-x-auto">
  <div className="mb-2 flex items-center gap-2">
    <span className="text-sm">已选：{selected.value != null ? String(selected.value) : '无'}</span>
    <button className="btn btn-ghost btn-xs" disabled>选中1</button>
    <button className="btn btn-ghost btn-xs" disabled>选中3</button>
    <button className="btn btn-ghost btn-xs" disabled>清空</button>
  </div>
  <Table
    className="w-full"
    rowSelection={{ type: 'radio', disabled: true, selectedRowKeys: selected.value != null ? [selected.value] : [], onChange: (keys) => (selected.value = keys[0] ?? null) }}
    columns={[{ title: '姓名', dataIndex: 'name' }, { title: '年龄', dataIndex: 'age' }, { title: '住址', dataIndex: 'address' }]}
    dataSource={[{ key: '1', name: '小明', age: 32, address: '高洞村1号' }, { key: '2', name: '小红', age: 42, address: '高洞村1号' }, { key: '3', name: '王二', age: 22, address: '高洞村2号' }]}
  />
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Table with border and background
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabBorderBg.value}
            onChange={k => (tabBorderBg.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabBorderBg.value === 'preview' ? (
            <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
              <Table
                className="w-full"
                columns={[
                  { title: 'No.', dataIndex: 'no' },
                  { title: 'Name', dataIndex: 'name' },
                  { title: 'Job', dataIndex: 'job' },
                  { title: 'Favorite Color', dataIndex: 'color' },
                ]}
                dataSource={[
                  {
                    key: '1',
                    no: 1,
                    name: 'Cy Ganderton',
                    job: 'Quality Control Specialist',
                    color: 'Blue',
                  },
                  {
                    key: '2',
                    no: 2,
                    name: 'Hart Hagerty',
                    job: 'Desktop Support Technician',
                    color: 'Purple',
                  },
                  { key: '3', no: 3, name: 'Brice Swyre', job: 'Tax Accountant', color: 'Red' },
                ]}
              />
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
  <Table
    className="w-full"
    columns={[
      { title: 'No.', dataIndex: 'no' },
      { title: 'Name', dataIndex: 'name' },
      { title: 'Job', dataIndex: 'job' },
      { title: 'Favorite Color', dataIndex: 'color' },
    ]}
    dataSource={[
      { key: '1', no: 1, name: 'Cy Ganderton', job: 'Quality Control Specialist', color: 'Blue' },
      { key: '2', no: 2, name: 'Hart Hagerty', job: 'Desktop Support Technician', color: 'Purple' },
      { key: '3', no: 3, name: 'Brice Swyre', job: 'Tax Accountant', color: 'Red' },
    ]}
  />
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Table with an active row
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabActiveRow.value}
            onChange={k => (tabActiveRow.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabActiveRow.value === 'preview' ? (
            <Table
              rowHoverable={false}
              rowClassName={(_, i) => (i === 0 ? 'bg-base-200' : '')}
              columns={[
                { title: 'No.', dataIndex: 'no' },
                { title: 'Name', dataIndex: 'name' },
                { title: 'Job', dataIndex: 'job' },
                { title: 'Favorite Color', dataIndex: 'color' },
              ]}
              dataSource={[
                {
                  key: '1',
                  no: 1,
                  name: 'Cy Ganderton',
                  job: 'Quality Control Specialist',
                  color: 'Blue',
                },
                {
                  key: '2',
                  no: 2,
                  name: 'Hart Hagerty',
                  job: 'Desktop Support Technician',
                  color: 'Purple',
                },
                { key: '3', no: 3, name: 'Brice Swyre', job: 'Tax Accountant', color: 'Red' },
              ]}
            />
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Table
  rowHoverable={false}
  rowClassName={(_, i) => (i === 0 ? 'bg-base-200' : '')}
  columns={[
    { title: 'No.', dataIndex: 'no' },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Job', dataIndex: 'job' },
    { title: 'Favorite Color', dataIndex: 'color' },
  ]}
  dataSource={[
    { key: '1', no: 1, name: 'Cy Ganderton', job: 'Quality Control Specialist', color: 'Blue' },
    { key: '2', no: 2, name: 'Hart Hagerty', job: 'Desktop Support Technician', color: 'Purple' },
    { key: '3', no: 3, name: 'Brice Swyre', job: 'Tax Accountant', color: 'Red' },
  ]}
/>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # A row that highlights on hover
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabHoverRow.value}
            onChange={k => (tabHoverRow.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabHoverRow.value === 'preview' ? (
            <Table
              rowHoverable
              rowHoverClass="hover:bg-base-300"
              columns={[
                { title: 'No.', dataIndex: 'no' },
                { title: 'Name', dataIndex: 'name' },
                { title: 'Job', dataIndex: 'job' },
                { title: 'Favorite Color', dataIndex: 'color' },
              ]}
              dataSource={[
                {
                  key: '1',
                  no: 1,
                  name: 'Cy Ganderton',
                  job: 'Quality Control Specialist',
                  color: 'Blue',
                },
                {
                  key: '2',
                  no: 2,
                  name: 'Hart Hagerty',
                  job: 'Desktop Support Technician',
                  color: 'Purple',
                },
                { key: '3', no: 3, name: 'Brice Swyre', job: 'Tax Accountant', color: 'Red' },
              ]}
            />
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Table
  rowHoverable
  rowHoverClass="hover:bg-base-300"
  columns={[
    { title: 'No.', dataIndex: 'no' },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Job', dataIndex: 'job' },
    { title: 'Favorite Color', dataIndex: 'color' },
  ]}
  dataSource={[
    { key: '1', no: 1, name: 'Cy Ganderton', job: 'Quality Control Specialist', color: 'Blue' },
    { key: '2', no: 2, name: 'Hart Hagerty', job: 'Desktop Support Technician', color: 'Purple' },
    { key: '3', no: 3, name: 'Brice Swyre', job: 'Tax Accountant', color: 'Red' },
  ]}
/>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Table with visual elements
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabVisual.value}
            onChange={k => (tabVisual.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabVisual.value === 'preview' ? (
            <div className="overflow-x-auto">
              <div className="mb-2 flex gap-2">
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => (selectedVisual.value = dataVisual.map(d => d.key))}
                >
                  全选
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => (selectedVisual.value = [])}
                >
                  取消全选
                </button>
              </div>
              <Table
                className="w-full"
                rowSelection={{
                  selectedRowKeys: selectedVisual.value,
                  onChange: (keys: Array<string | number>) => (selectedVisual.value = keys),
                }}
                columns={[
                  {
                    title: 'Name',
                    dataIndex: 'name',
                    render: (_: any, rec: any) => (
                      <div className="flex items-center gap-3">
                        <div className="avatar">
                          <div className="w-12 h-12 mask mask-squircle">
                            <img
                              src={`https://img.daisyui.com/images/profile/demo/${rec.id}@94.webp`}
                              alt="Tailwind CSS list item"
                            />
                          </div>
                        </div>
                        <div>
                          <div className="font-bold">{rec.name}</div>
                          <div className="text-sm opacity-50">{rec.country}</div>
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: 'Job',
                    dataIndex: 'job',
                    render: (_: any, rec: any) => (
                      <div>
                        {rec.company}
                        <br />
                        <span className="badge badge-ghost badge-sm">{rec.job}</span>
                      </div>
                    ),
                  },
                  { title: 'Favorite Color', dataIndex: 'color' },
                  {
                    key: 'actions',
                    title: '',
                    render: () => <button className="btn btn-ghost btn-xs">details</button>,
                  },
                ]}
                dataSource={dataVisual}
              />
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`const selectedVisual = ref<Array<string | number>>([])

const dataVisual = [
  {
    key: '2',
    id: 2,
    name: 'Hart Hagerty',
    country: 'United States',
    company: 'Zemlak, Daniel and Leannon',
    job: 'Desktop Support Technician',
    color: 'Purple',
  },
  {
    key: '3',
    id: 3,
    name: 'Brice Swyre',
    country: 'China',
    company: 'Carroll Group',
    job: 'Tax Accountant',
    color: 'Red',
  },
  {
    key: '4',
    id: 4,
    name: 'Marjy Ferencz',
    country: 'Russia',
    company: 'Rowe-Schoen',
    job: 'Office Assistant I',
    color: 'Crimson',
  },
  {
    key: '5',
    id: 5,
    name: 'Yancy Tear',
    country: 'Brazil',
    company: 'Wyman-Ledner',
    job: 'Community Outreach Specialist',
    color: 'Indigo',
  },
]

<div className="overflow-x-auto">
  <div className="mb-2 flex gap-2">
    <button
      className="btn btn-ghost btn-xs"
      onClick={() => (selectedVisual.value = dataVisual.map(d => d.key))}
    >
      全选
    </button>
    <button className="btn btn-ghost btn-xs" onClick={() => (selectedVisual.value = [])}>
      取消全选
    </button>
  </div>
  <Table
    className="w-full"
    rowSelection={{
      selectedRowKeys: selectedVisual.value,
      onChange: (keys: Array<string | number>) => (selectedVisual.value = keys),
    }}
    columns={[
      {
        title: 'Name',
        dataIndex: 'name',
        render: (_: any, rec: any) => (
          <div className="flex items-center gap-3">
            <div className="avatar">
              <div className="w-12 h-12 mask mask-squircle">
                <img
                  src={\`https://img.daisyui.com/images/profile/demo/\${rec.id}@94.webp\`}
                  alt="Tailwind CSS list item"
                />
              </div>
            </div>
            <div>
              <div className="font-bold">{rec.name}</div>
              <div className="text-sm opacity-50">{rec.country}</div>
            </div>
          </div>
        ),
      },
      {
        title: 'Job',
        dataIndex: 'job',
        render: (_: any, rec: any) => (
          <div>
            {rec.company}
            <br />
            <span className="badge badge-ghost badge-sm">{rec.job}</span>
          </div>
        ),
      },
      { title: 'Favorite Color', dataIndex: 'color' },
      {
        key: 'actions',
        title: '',
        render: () => <button className="btn btn-ghost btn-xs">details</button>,
      },
    ]}
    dataSource={dataVisual}
  />
</div>
`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 过滤（无 UI）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabFilters.value}
            onChange={k => (tabFilters.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabFilters.value === 'preview' ? (
            <Table
              columns={[
                { title: 'Name', dataIndex: 'name', filteredValue: ['A'] },
                { title: 'Job', dataIndex: 'job' },
              ]}
              dataSource={[
                { key: '1', name: 'A', job: 'Dev' },
                { key: '2', name: 'B', job: 'Ops' },
              ]}
            />
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Table
  columns={[
    { title: 'Name', dataIndex: 'name', filteredValue: ['A'] },
    { title: 'Job', dataIndex: 'job' },
  ]}
  dataSource={[
    { key: '1', name: 'A', job: 'Dev' },
    { key: '2', name: 'B', job: 'Ops' },
  ]}
/>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># 隐藏列</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabHidden.value}
            onChange={k => (tabHidden.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabHidden.value === 'preview' ? (
            <Table
              columns={[
                { title: 'Name', dataIndex: 'name' },
                { title: 'Job', dataIndex: 'job', hidden: true },
              ]}
              dataSource={[{ key: '1', name: 'A', job: 'Dev' }]}
            />
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Table
  columns={[
    { title: 'Name', dataIndex: 'name' },
    { title: 'Job', dataIndex: 'job', hidden: true },
  ]}
  dataSource={[
    { key: '1', name: 'A', job: 'Dev' },
  ]}
/>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># 摘要</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabSummary.value}
            onChange={k => (tabSummary.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabSummary.value === 'preview' ? (
            <Table
              columns={[{ title: 'Name', dataIndex: 'name' }]}
              dataSource={[
                { key: '1', name: 'A' },
                { key: '2', name: 'B' },
                { key: '3', name: 'C' },
              ]}
              summary={(rows: any[]) => <div className="p-2">Total: {(rows as any).total}</div>}
            />
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Table
  columns={[{ title: 'Name', dataIndex: 'name' }]}
  dataSource={[{ key: '1', name: 'A' }, { key: '2', name: 'B' }, { key: '3', name: 'C' }]}
  summary={(rows) => <div className="p-2">Total: {rows.total}</div>}
/>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># 空数据</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabEmpty.value}
            onChange={k => (tabEmpty.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabEmpty.value === 'preview' ? (
            <Table
              columns={[{ title: 'Name', dataIndex: 'name' }]}
              dataSource={[]}
              emptyText={<div className="p-4 text-base-400">Empty</div>}
            />
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Table
  columns={[
    { title: 'Name', dataIndex: 'name' },
  ]}
  dataSource={[]}
  emptyText={<div className="p-4 text-base-400">Empty</div>}
/>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 行事件与回调（onRow）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabRowEvents.value}
            onChange={k => (tabRowEvents.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabRowEvents.value === 'preview' ? (
            <Table
              columns={[{ title: 'Name', dataIndex: 'name' }]}
              dataSource={[{ key: '1', name: 'Click Row' }]}
              onRow={row => ({
                onClick: () => console.log('row click', row),
                onMouseEnter: () => console.log('row enter'),
              })}
            />
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Table
  columns={[{ title: 'Name', dataIndex: 'name' }]}
  dataSource={[{ key: '1', name: 'Click Row' }]}
  onRow={(row) => ({
    onClick: () => console.log('row click', row),
    onMouseEnter: () => console.log('row enter'),
  })}
/>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 头/单元格属性（onHeaderCell/onCell）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabCellAttrs.value}
            onChange={k => (tabCellAttrs.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabCellAttrs.value === 'preview' ? (
            <Table
              columns={[
                {
                  title: 'Name',
                  dataIndex: 'name',
                  onHeaderCell: () => ({ className: 'bg-base-200' }),
                  onCell: () => ({ className: 'text-primary' }),
                },
                { title: 'Age', dataIndex: 'age', onCell: () => ({ style: { width: '120px' } }) },
              ]}
              dataSource={[{ key: '1', name: 'A', age: 18 }]}
            />
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Table
  columns={[
    {
      title: 'Name',
      dataIndex: 'name',
      onHeaderCell: () => ({ className: 'bg-base-200' }),
      onCell: () => ({ className: 'text-primary' }),
    },
    { title: 'Age', dataIndex: 'age', onCell: () => ({ style: { width: '120px' } }) },
  ]}
  dataSource={[{ key: '1', name: 'A', age: 18 }]}
/>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 滚动与 onScroll
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabScroll.value}
            onChange={k => (tabScroll.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabScroll.value === 'preview' ? (
            <Table
              height={160}
              onScroll={() => console.log('table scrolled')}
              columns={[{ title: 'Name', dataIndex: 'name' }]}
              dataSource={Array.from({ length: 20 }).map((_, i) => ({
                key: String(i + 1),
                name: `Item ${i + 1}`,
              }))}
            />
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Table
  height={160}
  onScroll={() => console.log('table scrolled')}
  columns={[{ title: 'Name', dataIndex: 'name' }]}
  dataSource={Array.from({ length: 20 }).map((_, i) => ({
    key: String(i + 1),
    name: 'Item ' + (i + 1),
  }))}
/>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 标题与尾部（title/footer）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabTitleFooter.value}
            onChange={k => (tabTitleFooter.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabTitleFooter.value === 'preview' ? (
            <Table
              scroll={{ x: true }}
              title={(rows: any[]) => <div className="p-2">Title: {rows.length} rows</div>}
              footer={(rows: any[]) => <div className="p-2">Footer: {rows.length} rows</div>}
              columns={[{ title: 'Name', dataIndex: 'name' }]}
              dataSource={[
                { key: '1', name: 'A' },
                { key: '2', name: 'B' },
              ]}
            />
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Table
  scroll={{ x: true }}
  title={(rows) => <div className="p-2">Title: {rows.length} rows</div>}
  footer={(rows) => <div className="p-2">Footer: {rows.length} rows</div>}
  columns={[{ title: 'Name', dataIndex: 'name' }]}
  dataSource={[{ key: '1', name: 'A' }, { key: '2', name: 'B' }]}
/>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 省略与固定布局（ellipsis/fixed）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabEllipsis.value}
            onChange={k => (tabEllipsis.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabEllipsis.value === 'preview' ? (
            <Table
              columns={[
                { title: 'Name', dataIndex: 'name', width: 120 },
                { title: 'Description', dataIndex: 'desc', ellipsis: true },
              ]}
              dataSource={[
                {
                  key: '1',
                  name: 'A',
                  desc: '这是一段很长很长的描述性文字，超过列宽会自动省略显示，这是一段很长很长的描述性文字，超过列宽会自动省略显示，这是一段很长很长的描述性文字，超过列宽会自动省略显示，这是一段很长很长的描述性文字，超过列宽会自动省略显示',
                },
              ]}
            />
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Table
  columns={[
    { title: 'Name', dataIndex: 'name', width: 120 },
    { title: 'Description', dataIndex: 'desc', ellipsis: true },
  ]}
  dataSource={[{
    key: '1',
    name: 'A',
    desc:
      '这是一段很长很长的描述性文字，超过列宽会自动省略显示，这是一段很长很长的描述性文字，超过列宽会自动省略显示，这是一段很长很长的描述性文字，超过列宽会自动省略显示，这是一段很长很长的描述性文字，超过列宽会自动省略显示',
  }]}
/>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Table with pinned-rows
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabPinnedRowsFull.value}
            onChange={k => (tabPinnedRowsFull.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabPinnedRowsFull.value === 'preview' ? (
            <div className="overflow-x-auto h-96">
              <Table
                pinRows
                className="bg-base-200"
                columns={[{ title: 'Name', dataIndex: 'name' }]}
                dataSource={[
                  // A
                  'Ant-Man',
                  'Aquaman',
                  'Asterix',
                  'The Atom',
                  'The Avengers',
                  // B
                  'Batgirl',
                  'Batman',
                  'Batwoman',
                  'Black Canary',
                  'Black Panther',
                  // C
                  'Captain America',
                  'Captain Marvel',
                  'Catwoman',
                  'Conan the Barbarian',
                ].map((x, i) => ({ key: String(i + 1), name: x }))}
              />
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="overflow-x-auto h-96">
  <Table
    pinRows
    className="bg-base-200"
    columns={[{ title: 'Name', dataIndex: 'name' }]}
    dataSource={[
      'Ant-Man',
      'Aquaman',
      'Asterix',
      'The Atom',
      'The Avengers',
      'Batgirl',
      'Batman',
      'Batwoman',
      'Black Canary',
      'Black Panther',
      'Captain America',
      'Captain Marvel',
      'Catwoman',
      'Conan the Barbarian',
    ].map((x, i) => ({ key: String(i + 1), name: x }))}
  />
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Table with pinned-rows and pinned-cols
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabPinnedRowsCols.value}
            onChange={k => (tabPinnedRowsCols.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabPinnedRowsCols.value === 'preview' ? (
            <div className="overflow-x-auto h-96 w-96">
              <Table
                size="xs"
                pinRows
                pinCols
                columns={[
                  { title: '#', dataIndex: 'no', fixedCol: true },
                  { title: 'Name', dataIndex: 'name' },
                  { title: 'Job', dataIndex: 'job' },
                  { title: 'company', dataIndex: 'company' },
                  { title: 'location', dataIndex: 'location' },
                  { title: 'Last Login', dataIndex: 'last' },
                  { title: 'Favorite Color', dataIndex: 'color' },
                  { title: '#', dataIndex: 'noEnd', fixedCol: true },
                ]}
                dataSource={[1, 2, 3, 4, 5].map(i => ({
                  key: String(i),
                  no: i,
                  name: [
                    'Cy Ganderton',
                    'Hart Hagerty',
                    'Brice Swyre',
                    'Marjy Ferencz',
                    'Yancy Tear',
                  ][i - 1],
                  job: [
                    'Quality Control Specialist',
                    'Desktop Support Technician',
                    'Tax Accountant',
                    'Office Assistant I',
                    'Community Outreach Specialist',
                  ][i - 1],
                  company: [
                    'Littel, Schaden and Vandervort',
                    'Zemlak, Daniel and Leannon',
                    'Carroll Group',
                    'Rowe-Schoen',
                    'Wyman-Ledner',
                  ][i - 1],
                  location: ['Canada', 'United States', 'China', 'Russia', 'Brazil'][i - 1],
                  last: ['12/16/2020', '12/5/2020', '8/15/2020', '3/25/2021', '5/22/2020'][i - 1],
                  color: ['Blue', 'Purple', 'Red', 'Crimson', 'Indigo'][i - 1],
                  noEnd: i,
                }))}
              />
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="overflow-x-auto h-96 w-96">
  <Table
    size="xs"
    pinRows
    pinCols
    columns={[
      { title: '#', dataIndex: 'no', fixedCol: true },
      { title: 'Name', dataIndex: 'name' },
      { title: 'Job', dataIndex: 'job' },
      { title: 'company', dataIndex: 'company' },
      { title: 'location', dataIndex: 'location' },
      { title: 'Last Login', dataIndex: 'last' },
      { title: 'Favorite Color', dataIndex: 'color' },
      { title: '#', dataIndex: 'noEnd', fixedCol: true },
    ]}
    dataSource={[1, 2, 3, 4, 5].map(i => ({
      key: String(i),
      no: i,
      name: ['Cy Ganderton', 'Hart Hagerty', 'Brice Swyre', 'Marjy Ferencz', 'Yancy Tear'][i - 1],
      job: [
        'Quality Control Specialist',
        'Desktop Support Technician',
        'Tax Accountant',
        'Office Assistant I',
        'Community Outreach Specialist',
      ][i - 1],
      company: [
        'Littel, Schaden and Vandervort',
        'Zemlak, Daniel and Leannon',
        'Carroll Group',
        'Rowe-Schoen',
        'Wyman-Ledner',
      ][i - 1],
      location: ['Canada', 'United States', 'China', 'Russia', 'Brazil'][i - 1],
      last: ['12/16/2020', '12/5/2020', '8/15/2020', '3/25/2021', '5/22/2020'][i - 1],
      color: ['Blue', 'Purple', 'Red', 'Crimson', 'Indigo'][i - 1],
      noEnd: i,
    }))}
  />
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># 可选择</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabSelection.value}
            onChange={k => (tabSelection.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabSelection.value === 'preview' ? (
            <div className="overflow-x-auto">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm">
                  已选：
                  {(() => {
                    const keys = selectedSelection?.value || []
                    return Array.isArray(keys) && keys.length > 0 ? String(keys.join(', ')) : '无'
                  })()}
                </span>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => (selectedSelection.value = ['1'])}
                >
                  选中1
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => (selectedSelection.value = ['1', '3'])}
                >
                  选中1,3
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => (selectedSelection.value = [])}
                >
                  清空
                </button>
              </div>
              <Table
                className="w-full"
                rowSelection={{
                  selectedRowKeys: selectedSelection.value,
                  onChange: (keys: Array<string | number>) => (selectedSelection.value = keys),
                }}
                columns={[
                  { title: '姓名', dataIndex: 'name' },
                  { title: '年龄', dataIndex: 'age' },
                  { title: '住址', dataIndex: 'address' },
                ]}
                dataSource={[
                  { key: '1', name: '小明', age: 32, address: '高洞村1号' },
                  { key: '2', name: '小红', age: 42, address: '高洞村1号' },
                  { key: '3', name: '王二', age: 22, address: '高洞村2号' },
                ]}
              />
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`const selected = ref<Array<string | number>>(['2'])

<div className="overflow-x-auto">
  <div className="mb-2 flex items-center gap-2">
    <span className="text-sm">已选：{selected.value.length ? selected.value.join(', ') : '无'}</span>
    <button className="btn btn-ghost btn-xs" onClick={() => (selected.value = ['1'])}>选中1</button>
    <button className="btn btn-ghost btn-xs" onClick={() => (selected.value = ['1','3'])}>选中1,3</button>
    <button className="btn btn-ghost btn-xs" onClick={() => (selected.value = [])}>清空</button>
  </div>
  <Table
    className="w-full"
    rowSelection={{ selectedRowKeys: selected.value, onChange: (keys) => (selected.value = keys) }}
    columns={[
      { title: '姓名', dataIndex: 'name' },
      { title: '年龄', dataIndex: 'age' },
      { title: '住址', dataIndex: 'address' },
    ]}
    dataSource={[
      { key: '1', name: '小明', age: 32, address: '高洞村1号' },
      { key: '2', name: '小红', age: 42, address: '高洞村1号' },
      { key: '3', name: '王二', age: 22, address: '高洞村2号' },
    ]}
  />
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 可选择（单选）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabSelectionRadio.value}
            onChange={k => (tabSelectionRadio.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabSelectionRadio.value === 'preview' ? (
            <div className="overflow-x-auto">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm">
                  已选：{selectedRadio.value != null ? String(selectedRadio.value) : '无'}
                </span>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => (selectedRadio.value = '1')}
                >
                  选中1
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => (selectedRadio.value = '3')}
                >
                  选中3
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => (selectedRadio.value = null)}
                >
                  清空
                </button>
              </div>
              <Table
                className="w-full"
                rowSelection={{
                  type: 'radio',
                  selectedRowKeys: selectedRadio.value != null ? [selectedRadio.value] : [],
                  onChange: (keys: Array<string | number>) =>
                    (selectedRadio.value = keys[0] ?? null),
                }}
                columns={[
                  { title: '姓名', dataIndex: 'name' },
                  { title: '年龄', dataIndex: 'age' },
                  { title: '住址', dataIndex: 'address' },
                ]}
                dataSource={[
                  { key: '1', name: '小明', age: 32, address: '高洞村1号' },
                  { key: '2', name: '小红', age: 42, address: '高洞村1号' },
                  { key: '3', name: '王二', age: 22, address: '高洞村2号' },
                ]}
              />
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`const selected = ref<string | number | null>('2')

<div className="overflow-x-auto">
  <div className="mb-2 flex items-center gap-2">
    <span className="text-sm">已选：{selected.value != null ? String(selected.value) : '无'}</span>
    <button className="btn btn-ghost btn-xs" onClick={() => (selected.value = '1')}>选中1</button>
    <button className="btn btn-ghost btn-xs" onClick={() => (selected.value = '3')}>选中3</button>
    <button className="btn btn-ghost btn-xs" onClick={() => (selected.value = null)}>清空</button>
  </div>
  <Table
    className="w-full"
    rowSelection={{ type: 'radio', selectedRowKeys: selected.value != null ? [selected.value] : [], onChange: (keys) => (selected.value = keys[0] ?? null) }}
    columns={[{ title: '姓名', dataIndex: 'name' }, { title: '年龄', dataIndex: 'age' }, { title: '住址', dataIndex: 'address' }]}
    dataSource={[{ key: '1', name: '小明', age: 32, address: '高洞村1号' }, { key: '2', name: '小红', age: 42, address: '高洞村1号' }, { key: '3', name: '王二', age: 22, address: '高洞村2号' }]}
  />
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># 排序</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabSort.value}
            onChange={k => (tabSort.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabSort.value === 'preview' ? (
            <div className="overflow-x-auto">
              <Table
                className="w-full"
                columns={[
                  {
                    title: '姓名',
                    dataIndex: 'name',
                    sorter: true,
                    sortOrder: sortOrderName.value,
                  },
                  { title: '年龄', dataIndex: 'age' },
                  { title: '住址', dataIndex: 'address' },
                ]}
                dataSource={[
                  { key: '1', name: '小红', age: 42, address: '高洞村1号' },
                  { key: '2', name: '小明', age: 32, address: '高洞村1号' },
                ]}
                onChange={(pagination: any, filters: any, sorter: any, extra: any) => {
                  if (extra?.action === 'sort') sortOrderName.value = sorter?.order ?? null
                }}
              />
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`const sortOrder = ref<'ascend' | 'descend' | null>('ascend')

<Table
  columns={[
    { title: '姓名', dataIndex: 'name', sorter: true, sortOrder: sortOrder.value },
    { title: '年龄', dataIndex: 'age' },
    { title: '住址', dataIndex: 'address' },
  ]}
  dataSource={[
    { key: '1', name: '小红', age: 42, address: '高洞村1号' },
    { key: '2', name: '小明', age: 32, address: '高洞村1号' },
  ]}
  onChange={(pagination, filters, sorter, extra) => {
    if (extra?.action === 'sort') sortOrder.value = sorter?.order ?? null
  }}
/>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># 可展开</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabExpand.value}
            onChange={k => (tabExpand.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabExpand.value === 'preview' ? (
            <div className="overflow-x-auto">
              <Table
                className="w-full"
                expandable={{
                  defaultExpandAllRows: false,
                  expandedRowRender: (r: any) => <div className="p-3">更多信息：{r.name}</div>,
                }}
                columns={[
                  { title: '姓名', dataIndex: 'name' },
                  { title: '年龄', dataIndex: 'age' },
                  { title: '住址', dataIndex: 'address' },
                ]}
                dataSource={[
                  { key: '1', name: '小明', age: 32, address: '高洞村1号' },
                  { key: '2', name: '小红', age: 42, address: '高洞村1号' },
                ]}
              />
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Table
  expandable={{ defaultExpandAllRows: true, expandedRowRender: (r: any) => <div className="p-3">更多信息：{r.name}</div> }}
  columns={[
    { title: '姓名', dataIndex: 'name' },
    { title: '年龄', dataIndex: 'age' },
    { title: '住址', dataIndex: 'address' },
  ]}
  dataSource={[
    { key: '1', name: '小明', age: 32, address: '高洞村1号' },
    { key: '2', name: '小红', age: 42, address: '高洞村1号' },
  ]}
/>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># 分页设置</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabPaginate.value}
            onChange={k => (tabPaginate.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabPaginate.value === 'preview' ? (
            <div className="overflow-x-auto">
              <Table
                className="w-full"
                pagination={{
                  current: paginateCurrent.value,
                  pageSize: 2,
                  onChange: (p: number) => (paginateCurrent.value = p),
                }}
                columns={[
                  { title: '姓名', dataIndex: 'name' },
                  { title: '年龄', dataIndex: 'age' },
                  { title: '住址', dataIndex: 'address' },
                ]}
                dataSource={[
                  { key: '1', name: '张三', age: 23, address: '杭州' },
                  { key: '2', name: '李四', age: 28, address: '上海' },
                  { key: '3', name: '王五', age: 30, address: '北京' },
                  { key: '4', name: '赵六', age: 25, address: '深圳' },
                ]}
              />
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`const page = ref(1)

<Table
  pagination={{ current: page.value, pageSize: 2, onChange: (p) => (page.value = p) }}
  columns={[
    { title: '姓名', dataIndex: 'name' },
    { title: '年龄', dataIndex: 'age' },
    { title: '住址', dataIndex: 'address' },
  ]}
  dataSource={[
    { key: '1', name: '张三', age: 23, address: '杭州' },
    { key: '2', name: '李四', age: 28, address: '上海' },
    { key: '3', name: '王五', age: 30, address: '北京' },
    { key: '4', name: '赵六', age: 25, address: '深圳' },
  ]}
/>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Table zebra</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabZebra.value}
            onChange={k => (tabZebra.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabZebra.value === 'preview' ? (
            <div className="overflow-x-auto">
              <Table
                zebra
                className="w-full"
                columns={[
                  { title: 'No.', dataIndex: 'no' },
                  { title: 'Name', dataIndex: 'name' },
                  { title: 'Job', dataIndex: 'job' },
                  { title: 'Favorite Color', dataIndex: 'color' },
                ]}
                dataSource={[
                  {
                    key: '1',
                    no: 1,
                    name: 'Cy Ganderton',
                    job: 'Quality Control Specialist',
                    color: 'Blue',
                  },
                  {
                    key: '2',
                    no: 2,
                    name: 'Hart Hagerty',
                    job: 'Desktop Support Technician',
                    color: 'Purple',
                  },
                  { key: '3', no: 3, name: 'Brice Swyre', job: 'Tax Accountant', color: 'Red' },
                ]}
              />
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Table
  zebra
  className="w-full"
  columns={[
    { title: 'No.', dataIndex: 'no' },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Job', dataIndex: 'job' },
    { title: 'Favorite Color', dataIndex: 'color' },
  ]}
  dataSource={[
    { key: '1', no: 1, name: 'Cy Ganderton', job: 'Quality Control Specialist', color: 'Blue' },
    { key: '2', no: 2, name: 'Hart Hagerty', job: 'Desktop Support Technician', color: 'Purple' },
    { key: '3', no: 3, name: 'Brice Swyre', job: 'Tax Accountant', color: 'Red' },
  ]}
/>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Table xs</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabXs.value}
            onChange={k => (tabXs.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabXs.value === 'preview' ? (
            <div className="overflow-x-auto">
              <Table
                size="xs"
                className="w-full"
                columns={[
                  { title: '#', dataIndex: 'no' },
                  { title: 'Name', dataIndex: 'name' },
                  { title: 'Job', dataIndex: 'job' },
                  { title: 'company', dataIndex: 'company' },
                  { title: 'location', dataIndex: 'location' },
                  { title: 'Last Login', dataIndex: 'last' },
                  { title: 'Favorite Color', dataIndex: 'color' },
                ]}
                dataSource={[
                  {
                    key: '1',
                    no: 1,
                    name: 'Cy Ganderton',
                    job: 'Quality Control Specialist',
                    company: 'Littel, Schaden and Vandervort',
                    location: 'Canada',
                    last: '12/16/2020',
                    color: 'Blue',
                  },
                  {
                    key: '2',
                    no: 2,
                    name: 'Hart Hagerty',
                    job: 'Desktop Support Technician',
                    company: 'Zemlak, Daniel and Leannon',
                    location: 'United States',
                    last: '12/5/2020',
                    color: 'Purple',
                  },
                  {
                    key: '3',
                    no: 3,
                    name: 'Brice Swyre',
                    job: 'Tax Accountant',
                    company: 'Carroll Group',
                    location: 'China',
                    last: '8/15/2020',
                    color: 'Red',
                  },
                  {
                    key: '4',
                    no: 4,
                    name: 'Marjy Ferencz',
                    job: 'Office Assistant I',
                    company: 'Rowe-Schoen',
                    location: 'Russia',
                    last: '3/25/2021',
                    color: 'Crimson',
                  },
                  {
                    key: '5',
                    no: 5,
                    name: 'Yancy Tear',
                    job: 'Community Outreach Specialist',
                    company: 'Wyman-Ledner',
                    location: 'Brazil',
                    last: '5/22/2020',
                    color: 'Indigo',
                  },
                  {
                    key: '6',
                    no: 6,
                    name: 'Irma Vasilik',
                    job: 'Editor',
                    company: 'Wiza, Bins and Emard',
                    location: 'Venezuela',
                    last: '12/8/2020',
                    color: 'Purple',
                  },
                  {
                    key: '7',
                    no: 7,
                    name: 'Meghann Durtnal',
                    job: 'Staff Accountant IV',
                    company: 'Schuster-Schimmel',
                    location: 'Philippines',
                    last: '2/17/2021',
                    color: 'Yellow',
                  },
                  {
                    key: '8',
                    no: 8,
                    name: 'Sammy Seston',
                    job: 'Accountant I',
                    company: "O'Hara, Welch and Keebler",
                    location: 'Indonesia',
                    last: '5/23/2020',
                    color: 'Crimson',
                  },
                  {
                    key: '9',
                    no: 9,
                    name: 'Lesya Tinham',
                    job: 'Safety Technician IV',
                    company: 'Turner-Kuhlman',
                    location: 'Philippines',
                    last: '2/21/2021',
                    color: 'Maroon',
                  },
                  {
                    key: '10',
                    no: 10,
                    name: 'Zaneta Tewkesbury',
                    job: 'VP Marketing',
                    company: 'Sauer LLC',
                    location: 'Chad',
                    last: '6/23/2020',
                    color: 'Green',
                  },
                  {
                    key: '11',
                    no: 11,
                    name: 'Andy Tipple',
                    job: 'Librarian',
                    company: 'Hilpert Group',
                    location: 'Poland',
                    last: '7/9/2020',
                    color: 'Indigo',
                  },
                  {
                    key: '12',
                    no: 12,
                    name: 'Sophi Biles',
                    job: 'Recruiting Manager',
                    company: 'Gutmann Inc',
                    location: 'Indonesia',
                    last: '2/12/2021',
                    color: 'Maroon',
                  },
                  {
                    key: '13',
                    no: 13,
                    name: 'Florida Garces',
                    job: 'Web Developer IV',
                    company: 'Gaylord, Pacocha and Baumbach',
                    location: 'Poland',
                    last: '5/31/2020',
                    color: 'Purple',
                  },
                  {
                    key: '14',
                    no: 14,
                    name: 'Maribeth Popping',
                    job: 'Analyst Programmer',
                    company: 'Deckow-Pouros',
                    location: 'Portugal',
                    last: '4/27/2021',
                    color: 'Aquamarine',
                  },
                  {
                    key: '15',
                    no: 15,
                    name: 'Moritz Dryburgh',
                    job: 'Dental Hygienist',
                    company: 'Schiller, Cole and Hackett',
                    location: 'Sri Lanka',
                    last: '8/8/2020',
                    color: 'Crimson',
                  },
                  {
                    key: '16',
                    no: 16,
                    name: 'Reid Semiras',
                    job: 'Teacher',
                    company: 'Sporer, Sipes and Rogahn',
                    location: 'Poland',
                    last: '7/30/2020',
                    color: 'Green',
                  },
                  {
                    key: '17',
                    no: 17,
                    name: 'Alec Lethby',
                    job: 'Teacher',
                    company: 'Reichel, Glover and Hamill',
                    location: 'China',
                    last: '2/28/2021',
                    color: 'Khaki',
                  },
                  {
                    key: '18',
                    no: 18,
                    name: 'Aland Wilber',
                    job: 'Quality Control Specialist',
                    company: 'Kshlerin, Rogahn and Swaniawski',
                    location: 'Czech Republic',
                    last: '9/29/2020',
                    color: 'Purple',
                  },
                  {
                    key: '19',
                    no: 19,
                    name: 'Teddie Duerden',
                    job: 'Staff Accountant III',
                    company: 'Pouros, Ullrich and Windler',
                    location: 'France',
                    last: '10/27/2020',
                    color: 'Aquamarine',
                  },
                  {
                    key: '20',
                    no: 20,
                    name: 'Lorelei Blackstone',
                    job: 'Data Coordinator',
                    company: 'Witting, Kutch and Greenfelder',
                    location: 'Kazakhstan',
                    last: '6/3/2020',
                    color: 'Red',
                  },
                ]}
              />
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Table
  size="xs"
  className="w-full"
  columns={[
    { title: '#', dataIndex: 'no' },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Job', dataIndex: 'job' },
    { title: 'company', dataIndex: 'company' },
    { title: 'location', dataIndex: 'location' },
    { title: 'Last Login', dataIndex: 'last' },
    { title: 'Favorite Color', dataIndex: 'color' },
  ]}
  dataSource={[
    { key: '1', no: 1, name: 'Cy Ganderton', job: 'Quality Control Specialist', company: 'Littel, Schaden and Vandervort', location: 'Canada', last: '12/16/2020', color: 'Blue' },
    { key: '2', no: 2, name: 'Hart Hagerty', job: 'Desktop Support Technician', company: 'Zemlak, Daniel and Leannon', location: 'United States', last: '12/5/2020', color: 'Purple' },
    { key: '3', no: 3, name: 'Brice Swyre', job: 'Tax Accountant', company: 'Carroll Group', location: 'China', last: '8/15/2020', color: 'Red' },
    { key: '4', no: 4, name: 'Marjy Ferencz', job: 'Office Assistant I', company: 'Rowe-Schoen', location: 'Russia', last: '3/25/2021', color: 'Crimson' },
    { key: '5', no: 5, name: 'Yancy Tear', job: 'Community Outreach Specialist', company: 'Wyman-Ledner', location: 'Brazil', last: '5/22/2020', color: 'Indigo' },
    { key: '6', no: 6, name: 'Irma Vasilik', job: 'Editor', company: 'Wiza, Bins and Emard', location: 'Venezuela', last: '12/8/2020', color: 'Purple' },
    { key: '7', no: 7, name: 'Meghann Durtnal', job: 'Staff Accountant IV', company: 'Schuster-Schimmel', location: 'Philippines', last: '2/17/2021', color: 'Yellow' },
    { key: '8', no: 8, name: 'Sammy Seston', job: 'Accountant I', company: "O'Hara, Welch and Keebler", location: 'Indonesia', last: '5/23/2020', color: 'Crimson' },
    { key: '9', no: 9, name: 'Lesya Tinham', job: 'Safety Technician IV', company: 'Turner-Kuhlman', location: 'Philippines', last: '2/21/2021', color: 'Maroon' },
    { key: '10', no: 10, name: 'Zaneta Tewkesbury', job: 'VP Marketing', company: 'Sauer LLC', location: 'Chad', last: '6/23/2020', color: 'Green' },
    { key: '11', no: 11, name: 'Andy Tipple', job: 'Librarian', company: 'Hilpert Group', location: 'Poland', last: '7/9/2020', color: 'Indigo' },
    { key: '12', no: 12, name: 'Sophi Biles', job: 'Recruiting Manager', company: 'Gutmann Inc', location: 'Indonesia', last: '2/12/2021', color: 'Maroon' },
    { key: '13', no: 13, name: 'Florida Garces', job: 'Web Developer IV', company: 'Gaylord, Pacocha and Baumbach', location: 'Poland', last: '5/31/2020', color: 'Purple' },
    { key: '14', no: 14, name: 'Maribeth Popping', job: 'Analyst Programmer', company: 'Deckow-Pouros', location: 'Portugal', last: '4/27/2021', color: 'Aquamarine' },
    { key: '15', no: 15, name: 'Moritz Dryburgh', job: 'Dental Hygienist', company: 'Schiller, Cole and Hackett', location: 'Sri Lanka', last: '8/8/2020', color: 'Crimson' },
    { key: '16', no: 16, name: 'Reid Semiras', job: 'Teacher', company: 'Sporer, Sipes and Rogahn', location: 'Poland', last: '7/30/2020', color: 'Green' },
    { key: '17', no: 17, name: 'Alec Lethby', job: 'Teacher', company: 'Reichel, Glover and Hamill', location: 'China', last: '2/28/2021', color: 'Khaki' },
    { key: '18', no: 18, name: 'Aland Wilber', job: 'Quality Control Specialist', company: 'Kshlerin, Rogahn and Swaniawski', location: 'Czech Republic', last: '9/29/2020', color: 'Purple' },
    { key: '19', no: 19, name: 'Teddie Duerden', job: 'Staff Accountant III', company: 'Pouros, Ullrich and Windler', location: 'France', last: '10/27/2020', color: 'Aquamarine' },
    { key: '20', no: 20, name: 'Lorelei Blackstone', job: 'Data Coordinator', company: 'Witting, Kutch and Greenfelder', location: 'Kazakhstan', last: '6/3/2020', color: 'Red' },
  ]}
/>`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default TableDemo
