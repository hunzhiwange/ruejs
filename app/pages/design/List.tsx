import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import { List, Tabs } from '@rue-js/design'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'

type TabMode = 'preview' | 'code'

interface ExampleBlockProps {
  title: string
  summary?: string
  tab: { value: TabMode }
  preview: () => any
  code: string
}

interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

const ExampleBlock: FC<ExampleBlockProps> = ({ title, summary, tab, preview, code }) => {
  return (
    <div className="component-preview not-prose text-base-content my-6 lg:my-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># {title}</h2>
          {summary ? <p className="m-0 text-sm opacity-70">{summary}</p> : null}
        </div>
      </div>
      <Tabs
        style="box"
        items={[
          { key: 'preview', label: '预览' },
          { key: 'code', label: 'JSX代码' },
        ]}
        activeKey={tab.value}
        onChange={key => (tab.value = key as TabMode)}
        className="mb-3 mt-4"
      />
      {tab.value === 'preview' ? preview() : <Code className="mt-2" lang="tsx" code={code} />}
    </div>
  )
}

const ApiTable: FC<{ rows: ApiRow[] }> = ({ rows }) => {
  return (
    <div className="not-prose overflow-x-auto rounded-box border border-base-300 bg-base-100">
      <table className="table table-zebra">
        <thead>
          <tr>
            <th>属性</th>
            <th>说明</th>
            <th>类型</th>
            <th>默认值</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.prop}>
              <td>
                <code>{row.prop}</code>
              </td>
              <td>{row.description}</td>
              <td>
                <code>{row.type}</code>
              </td>
              <td>
                <code>{row.defaultValue}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const PlayIcon = () => (
  <svg
    className="size-[1.2em]"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 3 20 12 6 21V3Z" />
  </svg>
)

const HeartIcon = () => (
  <svg
    className="size-[1.2em]"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
    />
  </svg>
)

const MoreIcon = () => (
  <svg
    className="size-[1.2em]"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 12h.01M19 12h.01M5 12h.01" />
  </svg>
)

const Avatar: FC<{ src: string; alt: string }> = ({ src, alt }) => {
  return <img className="size-10 rounded-box object-cover" src={src} alt={alt} />
}

const SongActions = () => (
  <>
    <button className="btn btn-square btn-ghost" type="button" aria-label="Play">
      <PlayIcon />
    </button>
    <button className="btn btn-square btn-ghost" type="button" aria-label="Favorite">
      <HeartIcon />
    </button>
  </>
)

const songs = [
  {
    id: 'dio-lupa',
    rank: '01',
    artist: 'Dio Lupa',
    title: 'Remaining Reason',
    image: 'https://img.daisyui.com/images/profile/demo/1@94.webp',
    note: 'Remaining Reason became an instant hit, praised for its haunting sound and emotional depth.',
    duration: '3:42',
    plays: '248K',
  },
  {
    id: 'ellie-beilish',
    rank: '02',
    artist: 'Ellie Beilish',
    title: 'Bears of a fever',
    image: 'https://img.daisyui.com/images/profile/demo/4@94.webp',
    note: 'Bears of a Fever pairs restless percussion with a chorus built for repeat plays.',
    duration: '4:05',
    plays: '221K',
  },
  {
    id: 'sabrino-gardener',
    rank: '03',
    artist: 'Sabrino Gardener',
    title: 'Cappuccino',
    image: 'https://img.daisyui.com/images/profile/demo/3@94.webp',
    note: 'Cappuccino keeps the melody smooth while the hook does the heavy lifting.',
    duration: '2:58',
    plays: '198K',
  },
  {
    id: 'mira-lane',
    rank: '04',
    artist: 'Mira Lane',
    title: 'Window Seat',
    image: 'https://img.daisyui.com/images/profile/demo/2@94.webp',
    note: 'Window Seat turns a late train ride into a tiny cinematic pop song.',
    duration: '3:16',
    plays: '166K',
  },
  {
    id: 'noah-drift',
    rank: '05',
    artist: 'Noah Drift',
    title: 'Low Tide Letters',
    image: 'https://img.daisyui.com/images/profile/demo/5@94.webp',
    note: 'Low Tide Letters is quiet, patient, and built around a warm guitar loop.',
    duration: '3:37',
    plays: '152K',
  },
]

const legacyItems = [
  {
    type: 'item',
    className: 'p-4 pb-2 text-xs opacity-60 tracking-wide',
    content: 'Most played songs this week',
  },
  ...songs.slice(0, 3).map(song => ({
    type: 'row',
    content: [
      <div className="text-4xl font-thin opacity-30 tabular-nums">{song.rank}</div>,
      <div>
        <Avatar src={song.image} alt={`${song.artist} cover`} />
      </div>,
    ],
    cols: [
      {
        type: 'grow',
        content: (
          <div>
            <div>{song.artist}</div>
            <div className="text-xs uppercase font-semibold opacity-60">{song.title}</div>
          </div>
        ),
      },
    ],
  })),
]

const internalItems = [
  {
    type: 'item',
    content: (
      <div className="px-4 pt-4 pb-2 text-xs opacity-60 tracking-wide">
        Most played songs this week
      </div>
    ),
  },
  ...songs.slice(0, 3).map(song => ({
    key: song.id,
    className: 'px-4 py-3',
    title: song.artist,
    description: `${song.title} · ${song.duration}`,
    extra: `${song.plays} plays`,
  })),
]

const apiRows: ApiRow[] = [
  {
    prop: 'children',
    description: '直接传入自定义 li、List.Row、List.Item 等内容',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'items',
    description: '支持基础 Rue 数据结构，支持 item、row、cols',
    type: 'ListDataItem[]',
    defaultValue: '-',
  },
  {
    prop: 'dataSource',
    description: '数据源驱动的数组入口，通常搭配 renderItem',
    type: 'any[]',
    defaultValue: '-',
  },
  {
    prop: 'renderItem',
    description: '自定义 dataSource 中每一项的渲染内容',
    type: '(item, index) => any',
    defaultValue: '-',
  },
  {
    prop: 'rowKey',
    description: '列表项 key，可传字段名或函数',
    type: 'string | (item, index) => string | number',
    defaultValue: 'key',
  },
  {
    prop: 'header / footer',
    description: '列表头部和底部内容',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'loading',
    description: '加载态，支持 boolean 或 { spinning, tip, indicator }',
    type: 'boolean | object',
    defaultValue: 'false',
  },
  {
    prop: 'pagination',
    description: '分页配置，支持 current、pageSize、position、align、showTotal',
    type: 'boolean | ListPaginationConfig | false',
    defaultValue: 'false',
  },
  {
    prop: 'grid',
    description: '网格列表配置，支持 column 与 gutter',
    type: '{ column?: number; gutter?: number | string }',
    defaultValue: '-',
  },
  {
    prop: 'itemLayout',
    description: '列表项布局语义，vertical 会让 extra/actions 更适合图文内容',
    type: `'horizontal' | 'vertical'`,
    defaultValue: `'horizontal'`,
  },
  {
    prop: 'bordered / split / size',
    description: '边框、分割与尺寸控制',
    type: 'boolean / boolean / ListSize',
    defaultValue: 'false / true / default',
  },
  {
    prop: 'List.Item',
    description: '支持 actions、extra、classNames、styles，并包含 List.Item.Meta',
    type: 'compound component',
    defaultValue: '-',
  },
]

const basicCode = `import { List } from '@rue-js/design'

<List className="bg-base-100 rounded-box shadow-md">
  <List.Row normal className="p-4 pb-2 text-xs opacity-60 tracking-wide">
    Most played songs this week
  </List.Row>
  <List.Row>
    <img className="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/1@94.webp" />
    <div>
      <div>Dio Lupa</div>
      <div className="text-xs uppercase font-semibold opacity-60">Remaining Reason</div>
    </div>
    <button className="btn btn-square btn-ghost" type="button" aria-label="Play">
      <PlayIcon />
    </button>
    <button className="btn btn-square btn-ghost" type="button" aria-label="Favorite">
      <HeartIcon />
    </button>
  </List.Row>
</List>`

const growCode = `<List className="bg-base-100 rounded-box shadow-md">
  <List.Row normal className="p-4 pb-2 text-xs opacity-60 tracking-wide">
    Most played songs this week
  </List.Row>
  <List.Row>
    <div className="text-4xl font-thin opacity-30 tabular-nums">01</div>
    <img className="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/1@94.webp" />
    <List.ColGrow>
      <div>Dio Lupa</div>
      <div className="text-xs uppercase font-semibold opacity-60">Remaining Reason</div>
    </List.ColGrow>
    <button className="btn btn-square btn-ghost" type="button" aria-label="Play">
      <PlayIcon />
    </button>
  </List.Row>
</List>`

const manualArrayCode = `const listItems = [
  {
    type: 'item',
    className: 'p-4 pb-2 text-xs opacity-60 tracking-wide',
    content: 'Most played songs this week',
  },
  ...songs.slice(0, 3).map(song => ({
    key: song.id,
    type: 'row',
    content: [
      <div className="text-4xl font-thin opacity-30 tabular-nums">{song.rank}</div>,
      <img className="size-10 rounded-box" src={song.image} alt={\`\${song.artist} cover\`} />,
    ],
    cols: [
      {
        type: 'grow',
        content: (
          <div>
            <div>{song.artist}</div>
            <div className="text-xs uppercase font-semibold opacity-60">{song.title}</div>
          </div>
        ),
      },
      {
        type: 'wrap',
        content: (
          <button className="btn btn-square btn-ghost" type="button" aria-label="Play">
            <PlayIcon />
          </button>
        ),
      },
    ],
  })),
];

<List className="bg-base-100 rounded-box shadow-md">
  {listItems.map((item, index) =>
    item.type === 'item' ? (
      <List.Item className={item.className} key={index}>{item.content}</List.Item>
    ) : (
      <List.Row key={index}>
        {item.content}
        {item.cols.map(col => <List.ColGrow>{col.content}</List.ColGrow>)}
      </List.Row>
    ),
  )}
</List>`

const internalArrayCode = `const listItems = [
  {
    type: 'item',
    className: 'px-4 pt-4 pb-2 text-xs opacity-60 tracking-wide',
    content: 'Most played songs this week',
  },
  ...songs.slice(0, 3).map(song => ({
    key: song.id,
    className: 'px-4 py-3',
    title: song.artist,
    description: \`\${song.title} · \${song.duration}\`,
    extra: \`\${song.plays} plays\`,
  })),
];

<List items={listItems} className="bg-base-100 rounded-box shadow-md" />`

const wrapCode = `<List className="bg-base-100 rounded-box shadow-md">
  <List.Item className="p-4 pb-2 text-xs opacity-60 tracking-wide">
    Most played songs this week
  </List.Item>
  <List.Row>
    <img className="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/1@94.webp" />
    <div>
      <div>Dio Lupa</div>
      <div className="text-xs uppercase font-semibold opacity-60">Remaining Reason</div>
    </div>
    <List.ColWrap as="p" className="text-xs">
      Remaining Reason became an instant hit, praised for its haunting sound and emotional depth.
    </List.ColWrap>
    <button className="btn btn-square btn-ghost" type="button" aria-label="More">
      <MoreIcon />
    </button>
  </List.Row>
</List>`

const dataSourceCode = `<List
  bordered
  header={<span>Release queue</span>}
  dataSource={songs}
  rowKey="id"
  renderItem={song => (
    <List.Item
      key={song.id}
      actions={[<a>Review</a>, <a>Publish</a>]}
      extra={<span className="badge badge-soft">{song.duration}</span>}
    >
      <List.Item.Meta
        avatar={<img className="size-10 rounded-box" src={song.image} />}
        title={song.artist}
        description={song.title}
      />
    </List.Item>
  )}
/>`

const verticalCode = `<List itemLayout="vertical" className="bg-base-100 rounded-box shadow-md">
  <List.Item
    actions={[<button className="btn btn-xs">Share</button>, <button className="btn btn-xs btn-ghost">Save</button>]}
    extra={<div className="stats shadow"><div className="stat"><div className="stat-value text-sm">248K</div></div></div>}
  >
    <List.Item.Meta
      avatar={<img className="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/1@94.webp" />}
      title="Dio Lupa"
      description="Remaining Reason"
    />
    <p className="mt-3 text-sm opacity-70">A richer vertical item with actions and extra content.</p>
  </List.Item>
</List>`

const paginationCode = `<List
  bordered
  dataSource={songs}
  rowKey="id"
  pagination={{
    defaultPageSize: 2,
    position: 'bottom',
    align: 'center',
    showTotal: (total, range) => \`\${range[0]}-\${range[1]} of \${total}\`,
  }}
                loadMore={
                  <div className="py-1">
                    <button className="btn btn-sm btn-outline" type="button">
                      Load more
                    </button>
                  </div>
                }
  renderItem={song => (
                  <List.Item key={song.id} className="px-4 py-3">
      <List.Item.Meta title={song.artist} description={song.title} />
    </List.Item>
  )}
/>`

const gridCode = `<List
  grid={{ column: 3, gutter: 16 }}
  dataSource={songs.slice(0, 3)}
  rowKey="id"
  renderItem={song => (
    <List.Item key={song.id} className="rounded-box border border-base-300 bg-base-100 p-4">
      <List.Item.Meta
        avatar={<img className="size-10 rounded-box" src={song.image} />}
        title={song.artist}
        description={song.title}
      />
    </List.Item>
  )}
/>`

const stateCode = `<div className="grid gap-4 md:grid-cols-2">
  <List bordered loading={{ spinning: true, tip: 'Loading tracks' }} />
  <List bordered dataSource={[]} locale={{ emptyText: 'No tracks yet' }} />
</div>`

const ListDemo: FC = () => {
  const tabBasic = ref<TabMode>('preview')
  const tabGrow = ref<TabMode>('preview')
  const tabManualArray = ref<TabMode>('preview')
  const tabInternalArray = ref<TabMode>('preview')
  const tabWrap = ref<TabMode>('preview')
  const tabDataSource = ref<TabMode>('preview')
  const tabVertical = ref<TabMode>('preview')
  const tabPagination = ref<TabMode>('preview')
  const tabGrid = ref<TabMode>('preview')
  const tabState = ref<TabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>List 列表</h1>
        <p className="text-sm mt-3 mb-3">
          列表用于以行或网格的形式展示同类信息。Rue 的 List 使用 daisyUI 的轻量视觉，并补充
          dataSource、renderItem、Meta、actions、extra、分页、加载和空态等能力。
        </p>

        <ExampleBlock
          title="List（第二列默认填充剩余空间）"
          summary="展示基础组合式写法，适合快速拼装一组紧凑行。"
          tab={tabBasic}
          code={basicCode}
          preview={() => (
            <div className="w-full max-w-lg">
              <List className="bg-base-100 rounded-box shadow-md">
                <List.Row normal className="p-4 pb-2 text-xs opacity-60 tracking-wide">
                  Most played songs this week
                </List.Row>
                {songs.slice(0, 3).map(song => (
                  <List.Row key={song.id}>
                    <div>
                      <Avatar src={song.image} alt={`${song.artist} cover`} />
                    </div>
                    <div>
                      <div>{song.artist}</div>
                      <div className="text-xs uppercase font-semibold opacity-60">{song.title}</div>
                    </div>
                    <SongActions />
                  </List.Row>
                ))}
              </List>
            </div>
          )}
        />

        <ExampleBlock
          title="List（第三列填充剩余空间）"
          summary="使用 List.ColGrow 显式控制哪一列占据剩余宽度。"
          tab={tabGrow}
          code={growCode}
          preview={() => (
            <div className="w-full max-w-lg">
              <List className="bg-base-100 rounded-box shadow-md">
                <List.Row normal className="p-4 pb-2 text-xs opacity-60 tracking-wide">
                  Most played songs this week
                </List.Row>
                {songs.slice(0, 3).map(song => (
                  <List.Row key={song.id}>
                    <div className="text-4xl font-thin opacity-30 tabular-nums">{song.rank}</div>
                    <div>
                      <Avatar src={song.image} alt={`${song.artist} cover`} />
                    </div>
                    <List.ColGrow>
                      <div>{song.artist}</div>
                      <div className="text-xs uppercase font-semibold opacity-60">{song.title}</div>
                    </List.ColGrow>
                    <button className="btn btn-square btn-ghost" type="button" aria-label="Play">
                      <PlayIcon />
                    </button>
                  </List.Row>
                ))}
              </List>
            </div>
          )}
        />

        <ExampleBlock
          title="List 通过数据渲染（数组）"
          summary="整合基础示例 的手动 map 方式，适合完全掌控每一行结构。"
          tab={tabManualArray}
          code={manualArrayCode}
          preview={() => (
            <div className="w-full max-w-lg">
              <List className="bg-base-100 rounded-box shadow-md">
                {legacyItems.map((item: any, index) => {
                  if (item.type === 'item') {
                    return (
                      <List.Item className={item.className} key={index}>
                        {item.content}
                      </List.Item>
                    )
                  }
                  return (
                    <List.Row key={index}>
                      {item.content}
                      {item.cols.map((col: any, colIndex: number) =>
                        col.type === 'grow' ? (
                          <List.ColGrow as={col.as} className={col.className} key={colIndex}>
                            {col.content}
                          </List.ColGrow>
                        ) : (
                          <List.ColWrap as={col.as} className={col.className} key={colIndex}>
                            {col.content}
                          </List.ColWrap>
                        ),
                      )}
                    </List.Row>
                  )
                })}
              </List>
            </div>
          )}
        />

        <ExampleBlock
          title="List 通过数据渲染（数组，组件内部）"
          summary="items 仍然可用，适合用纯数据配置直接生成 Meta 与侧边信息。"
          tab={tabInternalArray}
          code={internalArrayCode}
          preview={() => (
            <div className="w-full max-w-lg">
              <List items={internalItems as any} className="bg-base-100 rounded-box shadow-md" />
            </div>
          )}
        />

        <ExampleBlock
          title="List（第三列换行至下一行）"
          summary="List.ColWrap 用于长文本、说明或次级信息换行展示。"
          tab={tabWrap}
          code={wrapCode}
          preview={() => (
            <div className="w-full max-w-lg">
              <List className="bg-base-100 rounded-box shadow-md">
                <List.Item className="p-4 pb-2 text-xs opacity-60 tracking-wide">
                  Most played songs this week
                </List.Item>
                {songs.slice(0, 3).map(song => (
                  <List.Row key={song.id}>
                    <div>
                      <Avatar src={song.image} alt={`${song.artist} cover`} />
                    </div>
                    <div>
                      <div>{song.artist}</div>
                      <div className="text-xs uppercase font-semibold opacity-60">{song.title}</div>
                    </div>
                    <List.ColWrap as="p" className="text-xs">
                      {song.note}
                    </List.ColWrap>
                    <SongActions />
                  </List.Row>
                ))}
              </List>
            </div>
          )}
        />

        <ExampleBlock
          title="dataSource 与 renderItem"
          summary="数据源驱动的列表 API 适合业务列表统一从数据源渲染。"
          tab={tabDataSource}
          code={dataSourceCode}
          preview={() => (
            <div className="w-full max-w-2xl">
              <List
                bordered
                header={<span>Release queue</span>}
                footer={<span>Synced 2 minutes ago</span>}
                dataSource={songs.slice(0, 4)}
                rowKey="id"
                className="bg-base-100 shadow-sm"
                renderItem={(song: (typeof songs)[number]) => (
                  <List.Item
                    key={song.id}
                    actions={[
                      <button className="btn btn-xs btn-ghost" type="button">
                        Review
                      </button>,
                      <button className="btn btn-xs btn-primary" type="button">
                        Publish
                      </button>,
                    ]}
                    extra={<span className="badge badge-soft">{song.duration}</span>}
                  >
                    <List.Item.Meta
                      avatar={<Avatar src={song.image} alt={`${song.artist} cover`} />}
                      title={song.artist}
                      description={song.title}
                    />
                  </List.Item>
                )}
              />
            </div>
          )}
        />

        <ExampleBlock
          title="Meta、actions 与 extra"
          summary="List.Item.Meta 管标题、描述和头像，actions/extra 放操作与侧边内容。"
          tab={tabVertical}
          code={verticalCode}
          preview={() => (
            <div className="w-full max-w-2xl">
              <List itemLayout="vertical" className="bg-base-100 rounded-box shadow-md">
                {songs.slice(0, 2).map(song => (
                  <List.Item
                    key={song.id}
                    actions={[
                      <button className="btn btn-xs" type="button">
                        Share
                      </button>,
                      <button className="btn btn-xs btn-ghost" type="button">
                        Save
                      </button>,
                    ]}
                    extra={
                      <div className="stats bg-base-200 shadow-sm">
                        <div className="stat py-2 px-4">
                          <div className="stat-title text-xs">Plays</div>
                          <div className="stat-value text-sm">{song.plays}</div>
                        </div>
                      </div>
                    }
                  >
                    <List.Item.Meta
                      avatar={<Avatar src={song.image} alt={`${song.artist} cover`} />}
                      title={song.artist}
                      description={song.title}
                    />
                    <p className="mt-3 mb-0 text-sm opacity-70">{song.note}</p>
                  </List.Item>
                ))}
              </List>
            </div>
          )}
        />

        <ExampleBlock
          title="分页与加载更多"
          summary="pagination 内置简单分页；loadMore 可放在列表底部承载自定义加载动作。"
          tab={tabPagination}
          code={paginationCode}
          preview={() => (
            <div className="w-full max-w-2xl">
              <List
                bordered
                className="bg-base-100 shadow-sm"
                dataSource={songs}
                rowKey="id"
                loadMore={
                  <div className="py-1">
                    <button className="btn btn-sm btn-outline" type="button">
                      Load more
                    </button>
                  </div>
                }
                pagination={{
                  defaultPageSize: 2,
                  position: 'bottom',
                  align: 'center',
                  showTotal: (total: number, range: [number, number]) =>
                    `${range[0]}-${range[1]} of ${total}`,
                }}
                renderItem={(song: (typeof songs)[number]) => (
                  <List.Item key={song.id} className="px-4 py-3">
                    <List.Item.Meta
                      avatar={<Avatar src={song.image} alt={`${song.artist} cover`} />}
                      title={song.artist}
                      description={`${song.title} · ${song.duration}`}
                    />
                  </List.Item>
                )}
              />
            </div>
          )}
        />

        <ExampleBlock
          title="Grid 网格列表"
          summary="grid 提供 column/gutter，用于把同类条目排成卡片网格。"
          tab={tabGrid}
          code={gridCode}
          preview={() => (
            <div className="w-full max-w-3xl">
              <List
                grid={{ column: 3, gutter: 16 }}
                dataSource={songs.slice(0, 3)}
                rowKey="id"
                renderItem={(song: (typeof songs)[number]) => (
                  <List.Item
                    key={song.id}
                    className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm"
                  >
                    <List.Item.Meta
                      avatar={<Avatar src={song.image} alt={`${song.artist} cover`} />}
                      title={song.artist}
                      description={song.title}
                    />
                    <div className="mt-4 flex items-center justify-between text-xs opacity-70">
                      <span>{song.plays} plays</span>
                      <button className="btn btn-xs btn-ghost" type="button" aria-label="More">
                        <MoreIcon />
                      </button>
                    </div>
                  </List.Item>
                )}
              />
            </div>
          )}
        />

        <ExampleBlock
          title="Loading 与 Empty"
          summary="空数据和加载中状态直接由 List 承接，便于异步列表先搭好骨架。"
          tab={tabState}
          code={stateCode}
          preview={() => (
            <div className="grid w-full gap-4 md:grid-cols-2">
              <List
                bordered
                loading={{ spinning: true, tip: 'Loading tracks' }}
                className="bg-base-100 shadow-sm"
              />
              <List
                bordered
                dataSource={[]}
                locale={{ emptyText: 'No tracks yet' }}
                className="bg-base-100 shadow-sm"
              />
            </div>
          )}
        />

        <h2>API</h2>
        <ApiTable rows={apiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default ListDemo
