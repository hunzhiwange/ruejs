import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { List, Tabs } from '@rue-js/design'

const ListDemo: FC = () => {
  const tabDefault = ref<'preview' | 'code'>('preview')
  const tabGrow = ref<'preview' | 'code'>('preview')
  const tabWrap = ref<'preview' | 'code'>('preview')
  const tabArray = ref<'preview' | 'code'>('preview')
  const tabArrayInternal = ref<'preview' | 'code'>('preview')

  const listData = [
    {
      type: 'item',
      className: 'p-4 pb-2 text-xs opacity-60 tracking-wide',
      content: 'Most played songs this week',
    },
    {
      type: 'row',
      content: [
        <div className="text-4xl font-thin opacity-30 tabular-nums">01</div>,
        <div>
          <img
            className="size-10 rounded-box"
            src="https://img.daisyui.com/images/profile/demo/1@94.webp"
            alt="Tailwind CSS list item"
          />
        </div>,
      ],
      cols: [
        {
          type: 'grow',
          content: (
            <div>
              <div>Dio Lupa</div>
              <div className="text-xs uppercase font-semibold opacity-60">Remaining Reason</div>
            </div>
          ),
        },
      ],
    },
    {
      type: 'row',
      content: [
        <div className="text-4xl font-thin opacity-30 tabular-nums">02</div>,
        <div>
          <img
            className="size-10 rounded-box"
            src="https://img.daisyui.com/images/profile/demo/4@94.webp"
            alt="Tailwind CSS list item"
          />
        </div>,
      ],
      cols: [
        {
          type: 'grow',
          content: (
            <div>
              <div>Ellie Beilish</div>
              <div className="text-xs uppercase font-semibold opacity-60">Bears of a fever</div>
            </div>
          ),
        },
      ],
    },
    {
      type: 'row',
      content: [
        <div className="text-4xl font-thin opacity-30 tabular-nums">03</div>,
        <div>
          <img
            className="size-10 rounded-box"
            src="https://img.daisyui.com/images/profile/demo/3@94.webp"
            alt="Tailwind CSS list item"
          />
        </div>,
      ],
      cols: [
        {
          type: 'grow',
          content: (
            <div>
              <div>Sabrino Gardener</div>
              <div className="text-xs uppercase font-semibold opacity-60">Cappuccino</div>
            </div>
          ),
        },
      ],
    },
  ]

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>List 列表</h1>
        <p className="text-sm mt-3 mb-3">列表用于以行的形式展示垂直布局的信息。</p>
        <div className="text-sm">
          <a href="https://daisyui.com/components/list/" target="_blank">
            查看 List 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # List（第二列默认填充剩余空间）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabDefault.value}
            onChange={k => (tabDefault.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabDefault.value === 'preview' ? (
            <div className="w-full max-w-lg">
              <List className="bg-base-100 rounded-box shadow-md">
                <List.Row normal className="p-4 pb-2 text-xs opacity-60 tracking-wide">
                  Most played songs this week
                </List.Row>
                <List.Row>
                  <div>
                    <img
                      className="size-10 rounded-box"
                      src="https://img.daisyui.com/images/profile/demo/1@94.webp"
                      alt="Tailwind CSS list item"
                    />
                  </div>
                  <div>
                    <div>Dio Lupa</div>
                    <div className="text-xs uppercase font-semibold opacity-60">
                      Remaining Reason
                    </div>
                  </div>
                  <button className="btn btn-square btn-ghost">
                    <svg
                      className="size-[1.2em]"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <g
                        stroke-linejoin="round"
                        stroke-linecap="round"
                        stroke-width="2"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path d="M6 3L20 12 6 21 6 3z"></path>
                      </g>
                    </svg>
                  </button>
                  <button className="btn btn-square btn-ghost">
                    <svg
                      className="size-[1.2em]"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <g
                        stroke-linejoin="round"
                        stroke-linecap="round"
                        stroke-width="2"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                      </g>
                    </svg>
                  </button>
                </List.Row>
                <List.Row>
                  <div>
                    <img
                      className="size-10 rounded-box"
                      src="https://img.daisyui.com/images/profile/demo/4@94.webp"
                      alt="Tailwind CSS list item"
                    />
                  </div>
                  <div>
                    <div>Ellie Beilish</div>
                    <div className="text-xs uppercase font-semibold opacity-60">
                      Bears of a fever
                    </div>
                  </div>
                  <button className="btn btn-square btn-ghost">
                    <svg
                      className="size-[1.2em]"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <g
                        stroke-linejoin="round"
                        stroke-linecap="round"
                        stroke-width="2"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path d="M6 3L20 12 6 21 6 3z"></path>
                      </g>
                    </svg>
                  </button>
                  <button className="btn btn-square btn-ghost">
                    <svg
                      className="size-[1.2em]"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <g
                        stroke-linejoin="round"
                        stroke-linecap="round"
                        stroke-width="2"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                      </g>
                    </svg>
                  </button>
                </List.Row>
                <List.Row>
                  <div>
                    <img
                      className="size-10 rounded-box"
                      src="https://img.daisyui.com/images/profile/demo/3@94.webp"
                      alt="Tailwind CSS list item"
                    />
                  </div>
                  <div>
                    <div>Sabrino Gardener</div>
                    <div className="text-xs uppercase font-semibold opacity-60">Cappuccino</div>
                  </div>
                  <button className="btn btn-square btn-ghost">
                    <svg
                      className="size-[1.2em]"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <g
                        stroke-linejoin="round"
                        stroke-linecap="round"
                        stroke-width="2"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path d="M6 3L20 12 6 21 6 3z"></path>
                      </g>
                    </svg>
                  </button>
                  <button className="btn btn-square btn-ghost">
                    <svg
                      className="size-[1.2em]"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <g
                        stroke-linejoin="round"
                        stroke-linecap="round"
                        stroke-width="2"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                      </g>
                    </svg>
                  </button>
                </List.Row>
              </List>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { List } from '@rue-js/design';
<div className="w-full max-w-lg">
  <List className="bg-base-100 rounded-box shadow-md">
    <List.Row normal className="p-4 pb-2 text-xs opacity-60 tracking-wide">Most played songs this week</List.Row>
    <List.Row>
      <div><img className="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/1@94.webp"/></div>
      <div>
        <div>Dio Lupa</div>
        <div className="text-xs uppercase font-semibold opacity-60">Remaining Reason</div>
      </div>
      <button className="btn btn-square btn-ghost"><svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor"><path d="M6 3L20 12 6 21 6 3z"></path></g></svg></button>
      <button className="btn btn-square btn-ghost"><svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></g></svg></button>
    </List.Row>
    <List.Row>
      <div><img className="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/4@94.webp"/></div>
      <div>
        <div>Ellie Beilish</div>
        <div className="text-xs uppercase font-semibold opacity-60">Bears of a fever</div>
      </div>
      <button className="btn btn-square btn-ghost"><svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor"><path d="M6 3L20 12 6 21 6 3z"></path></g></svg></button>
      <button className="btn btn-square btn-ghost"><svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></g></svg></button>
    </List.Row>
    <List.Row>
      <div><img className="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/3@94.webp"/></div>
      <div>
        <div>Sabrino Gardener</div>
        <div className="text-xs uppercase font-semibold opacity-60">Cappuccino</div>
      </div>
      <button className="btn btn-square btn-ghost"><svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor"><path d="M6 3L20 12 6 21 6 3z"></path></g></svg></button>
      <button className="btn btn-square btn-ghost"><svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></g></svg></button>
    </List.Row>
  </List>
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # List（第三列填充剩余空间）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabGrow.value}
            onChange={k => (tabGrow.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabGrow.value === 'preview' ? (
            <div className="w-full max-w-lg">
              <List className="bg-base-100 rounded-box shadow-md">
                <List.Row normal className="p-4 pb-2 text-xs opacity-60 tracking-wide">
                  Most played songs this week
                </List.Row>
                <List.Row>
                  <div className="text-4xl font-thin opacity-30 tabular-nums">01</div>
                  <div>
                    <img
                      className="size-10 rounded-box"
                      src="https://img.daisyui.com/images/profile/demo/1@94.webp"
                      alt="Tailwind CSS list item"
                    />
                  </div>
                  <List.ColGrow>
                    <div>Dio Lupa</div>
                    <div className="text-xs uppercase font-semibold opacity-60">
                      Remaining Reason
                    </div>
                  </List.ColGrow>
                  <button className="btn btn-square btn-ghost">
                    <svg
                      className="size-[1.2em]"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <g
                        stroke-linejoin="round"
                        stroke-linecap="round"
                        stroke-width="2"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path d="M6 3L20 12 6 21 6 3z"></path>
                      </g>
                    </svg>
                  </button>
                </List.Row>
                <List.Row>
                  <div className="text-4xl font-thin opacity-30 tabular-nums">02</div>
                  <div>
                    <img
                      className="size-10 rounded-box"
                      src="https://img.daisyui.com/images/profile/demo/4@94.webp"
                      alt="Tailwind CSS list item"
                    />
                  </div>
                  <List.ColGrow>
                    <div>Ellie Beilish</div>
                    <div className="text-xs uppercase font-semibold opacity-60">
                      Bears of a fever
                    </div>
                  </List.ColGrow>
                  <button className="btn btn-square btn-ghost">
                    <svg
                      className="size-[1.2em]"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <g
                        stroke-linejoin="round"
                        stroke-linecap="round"
                        stroke-width="2"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path d="M6 3L20 12 6 21 6 3z"></path>
                      </g>
                    </svg>
                  </button>
                </List.Row>
                <List.Row>
                  <div className="text-4xl font-thin opacity-30 tabular-nums">03</div>
                  <div>
                    <img
                      className="size-10 rounded-box"
                      src="https://img.daisyui.com/images/profile/demo/3@94.webp"
                      alt="Tailwind CSS list item"
                    />
                  </div>
                  <List.ColGrow>
                    <div>Sabrino Gardener</div>
                    <div className="text-xs uppercase font-semibold opacity-60">Cappuccino</div>
                  </List.ColGrow>
                  <button className="btn btn-square btn-ghost">
                    <svg
                      className="size-[1.2em]"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <g
                        stroke-linejoin="round"
                        stroke-linecap="round"
                        stroke-width="2"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path d="M6 3L20 12 6 21 6 3z"></path>
                      </g>
                    </svg>
                  </button>
                </List.Row>
              </List>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="w-full max-w-lg">
  <List className="bg-base-100 rounded-box shadow-md">
    <List.Row normal className="p-4 pb-2 text-xs opacity-60 tracking-wide">Most played songs this week</List.Row>
    <List.Row>
      <div className="text-4xl font-thin opacity-30 tabular-nums">01</div>
      <div><img className="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/1@94.webp"/></div>
      <List.ColGrow>
        <div>Dio Lupa</div>
        <div className="text-xs uppercase font-semibold opacity-60">Remaining Reason</div>
      </List.ColGrow>
      <button className="btn btn-square btn-ghost"><svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor"><path d="M6 3L20 12 6 21 6 3z"></path></g></svg></button>
    </List.Row>
    <List.Row>
      <div className="text-4xl font-thin opacity-30 tabular-nums">02</div>
      <div><img className="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/4@94.webp"/></div>
      <List.ColGrow>
        <div>Ellie Beilish</div>
        <div className="text-xs uppercase font-semibold opacity-60">Bears of a fever</div>
      </List.ColGrow>
      <button className="btn btn-square btn-ghost"><svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor"><path d="M6 3L20 12 6 21 6 3z"></path></g></svg></button>
    </List.Row>
    <List.Row>
      <div className="text-4xl font-thin opacity-30 tabular-nums">03</div>
      <div><img className="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/3@94.webp"/></div>
      <List.ColGrow>
        <div>Sabrino Gardener</div>
        <div className="text-xs uppercase font-semibold opacity-60">Cappuccino</div>
      </List.ColGrow>
      <button className="btn btn-square btn-ghost"><svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor"><path d="M6 3L20 12 6 21 6 3z"></path></g></svg></button>
    </List.Row>
  </List>
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # List 通过数据渲染（数组）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabArray.value}
            onChange={k => (tabArray.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabArray.value === 'preview' ? (
            <div className="w-full max-w-lg">
              <List className="bg-base-100 rounded-box shadow-md">
                {listData.map((m, i) => {
                  if (m.type === 'item') {
                    return (
                      <List.Item className={m.className as any} key={i}>
                        {m.content as any}
                      </List.Item>
                    )
                  }
                  return (
                    <List.Row key={i} className={m.className as any}>
                      {Array.isArray(m.content)
                        ? (m.content as any).map((c: any) => <>{c}</>)
                        : (m.content as any)}
                      {m.cols?.map((c, ci) =>
                        c.type === 'grow' ? (
                          <List.ColGrow
                            as={(c as any).as}
                            className={(c as any).className}
                            key={ci}
                          >
                            {(c as any).content}
                          </List.ColGrow>
                        ) : (
                          <List.ColWrap
                            as={(c as any).as}
                            className={(c as any).className}
                            key={ci}
                          >
                            {(c as any).content}
                          </List.ColWrap>
                        ),
                      )}
                    </List.Row>
                  )
                })}
              </List>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { ref } from '@rue-js/rue';
import { List } from '@rue-js/design';
const tabArray = ref<'preview' | 'code'>('preview');
const listData = [
  { type: 'item', className: 'p-4 pb-2 text-xs opacity-60 tracking-wide', content: 'Most played songs this week' },
  { type: 'row', content: [
      <div className="text-4xl font-thin opacity-30 tabular-nums">01</div>,
      <div><img className="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/1@94.webp" alt="Tailwind CSS list item" /></div>,
    ], cols: [ { type: 'grow', content: <div><div>Dio Lupa</div><div className="text-xs uppercase font-semibold opacity-60">Remaining Reason</div></div> } ] },
  { type: 'row', content: [
      <div className="text-4xl font-thin opacity-30 tabular-nums">02</div>,
      <div><img className="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/4@94.webp" alt="Tailwind CSS list item" /></div>,
    ], cols: [ { type: 'grow', content: <div><div>Ellie Beilish</div><div className="text-xs uppercase font-semibold opacity-60">Bears of a fever</div></div> } ] },
  { type: 'row', content: [
      <div className="text-4xl font-thin opacity-30 tabular-nums">03</div>,
      <div><img className="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/3@94.webp" alt="Tailwind CSS list item" /></div>,
    ], cols: [ { type: 'grow', content: <div><div>Sabrino Gardener</div><div className="text-xs uppercase font-semibold opacity-60">Cappuccino</div></div> } ] },
];
<div className="w-full max-w-lg">
  <List className="bg-base-100 rounded-box shadow-md">
    {listData.map((m, i) => (
      m.type === 'item' ? (
        <List.Item className={m.className} key={i}>{m.content}</List.Item>
      ) : (
        <List.Row key={i} className={m.className}>
          {Array.isArray(m.content) ? m.content.map((c, ci) => <>{c}</>) : m.content}
          {m.cols?.map((c, ci) => c.type === 'grow'
            ? (<List.ColGrow as={c.as} className={c.className} key={ci}>{c.content}</List.ColGrow>)
            : (<List.ColWrap as={c.as} className={c.className} key={ci}>{c.content}</List.ColWrap>)
          )}
        </List.Row>
      )
    ))}
  </List>
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # List 通过数据渲染（数组，组件内部）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabArrayInternal.value}
            onChange={k => (tabArrayInternal.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabArrayInternal.value === 'preview' ? (
            <div className="w-full max-w-lg">
              <List items={listData as any} className="bg-base-100 rounded-box shadow-md" />
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { List } from '@rue-js/design';
const listItems = [
  { type: 'item', className: 'p-4 pb-2 text-xs opacity-60 tracking-wide', content: 'Most played songs this week' },
  { type: 'row', content: [
      <div className="text-4xl font-thin opacity-30 tabular-nums">01</div>,
      <div><img className="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/1@94.webp" alt="Tailwind CSS list item" /></div>,
    ], cols: [ { type: 'grow', content: <div><div>Dio Lupa</div><div className="text-xs uppercase font-semibold opacity-60">Remaining Reason</div></div> } ] },
  { type: 'row', content: [
      <div className="text-4xl font-thin opacity-30 tabular-nums">02</div>,
      <div><img className="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/4@94.webp" alt="Tailwind CSS list item" /></div>,
    ], cols: [ { type: 'grow', content: <div><div>Ellie Beilish</div><div className="text-xs uppercase font-semibold opacity-60">Bears of a fever</div></div> } ] },
  { type: 'row', content: [
      <div className="text-4xl font-thin opacity-30 tabular-nums">03</div>,
      <div><img className="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/3@94.webp" alt="Tailwind CSS list item" /></div>,
    ], cols: [ { type: 'grow', content: <div><div>Sabrino Gardener</div><div className="text-xs uppercase font-semibold opacity-60">Cappuccino</div></div> } ] },
];
<div className="w-full max-w-lg">
  <List items={listItems} className="bg-base-100 rounded-box shadow-md" />
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # List（第三列换行至下一行）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabWrap.value}
            onChange={k => (tabWrap.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabWrap.value === 'preview' ? (
            <div className="w-full max-w-lg">
              <List className="bg-base-100 rounded-box shadow-md">
                <List.Item className="p-4 pb-2 text-xs opacity-60 tracking-wide">
                  Most played songs this week
                </List.Item>
                <List.Row>
                  <div>
                    <img
                      className="size-10 rounded-box"
                      src="https://img.daisyui.com/images/profile/demo/1@94.webp"
                      alt="Tailwind CSS list item"
                    />
                  </div>
                  <div>
                    <div>Dio Lupa</div>
                    <div className="text-xs uppercase font-semibold opacity-60">
                      Remaining Reason
                    </div>
                  </div>
                  <List.ColWrap as="p" className="text-xs">
                    "Remaining Reason" became an instant hit, praised for its haunting sound and
                    emotional depth. A viral performance brought it widespread recognition, making
                    it one of Dio Lupa’s most iconic tracks.
                  </List.ColWrap>
                  <button className="btn btn-square btn-ghost">
                    <svg
                      className="size-[1.2em]"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <g
                        stroke-linejoin="round"
                        stroke-linecap="round"
                        stroke-width="2"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path d="M6 3L20 12 6 21 6 3z"></path>
                      </g>
                    </svg>
                  </button>
                  <button className="btn btn-square btn-ghost">
                    <svg
                      className="size-[1.2em]"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <g
                        stroke-linejoin="round"
                        stroke-linecap="round"
                        stroke-width="2"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                      </g>
                    </svg>
                  </button>
                </List.Row>
                <List.Row>
                  <div>
                    <img
                      className="size-10 rounded-box"
                      src="https://img.daisyui.com/images/profile/demo/4@94.webp"
                      alt="Tailwind CSS list item"
                    />
                  </div>
                  <div>
                    <div>Ellie Beilish</div>
                    <div className="text-xs uppercase font-semibold opacity-60">
                      Bears of a fever
                    </div>
                  </div>
                  <List.ColWrap as="p" className="text-xs">
                    "Bears of a Fever" captivated audiences with its intense energy and mysterious
                    lyrics. Its popularity skyrocketed after fans shared it widely online, earning
                    Ellie critical acclaim.
                  </List.ColWrap>
                  <button className="btn btn-square btn-ghost">
                    <svg
                      className="size-[1.2em]"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <g
                        stroke-linejoin="round"
                        stroke-linecap="round"
                        stroke-width="2"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path d="M6 3L20 12 6 21 6 3z"></path>
                      </g>
                    </svg>
                  </button>
                  <button className="btn btn-square btn-ghost">
                    <svg
                      className="size-[1.2em]"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <g
                        stroke-linejoin="round"
                        stroke-linecap="round"
                        stroke-width="2"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                      </g>
                    </svg>
                  </button>
                </List.Row>
                <List.Row>
                  <div>
                    <img
                      className="size-10 rounded-box"
                      src="https://img.daisyui.com/images/profile/demo/3@94.webp"
                      alt="Tailwind CSS list item"
                    />
                  </div>
                  <div>
                    <div>Sabrino Gardener</div>
                    <div className="text-xs uppercase font-semibold opacity-60">Cappuccino</div>
                  </div>
                  <List.ColWrap as="p" className="text-xs">
                    "Cappuccino" quickly gained attention for its smooth melody and relatable
                    themes. The song’s success propelled Sabrino into the spotlight, solidifying
                    their status as a rising star.
                  </List.ColWrap>
                  <button className="btn btn-square btn-ghost">
                    <svg
                      className="size-[1.2em]"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <g
                        stroke-linejoin="round"
                        stroke-linecap="round"
                        stroke-width="2"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path d="M6 3L20 12 6 21 6 3z"></path>
                      </g>
                    </svg>
                  </button>
                  <button className="btn btn-square btn-ghost">
                    <svg
                      className="size-[1.2em]"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <g
                        stroke-linejoin="round"
                        stroke-linecap="round"
                        stroke-width="2"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                      </g>
                    </svg>
                  </button>
                </List.Row>
              </List>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="w-full max-w-lg">
  <List className="bg-base-100 rounded-box shadow-md">
    <List.Item className="p-4 pb-2 text-xs opacity-60 tracking-wide">Most played songs this week</List.Item>
    <List.Row>
      <div><img className="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/1@94.webp"/></div>
      <div>
        <div>Dio Lupa</div>
        <div className="text-xs uppercase font-semibold opacity-60">Remaining Reason</div>
      </div>
      <List.ColWrap as="p" className="text-xs">"Remaining Reason" became an instant hit, praised for its haunting sound and emotional depth. A viral performance brought it widespread recognition, making it one of Dio Lupa’s most iconic tracks.</List.ColWrap>
      <button className="btn btn-square btn-ghost"><svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor"><path d="M6 3L20 12 6 21 6 3z"></path></g></svg></button>
      <button className="btn btn-square btn-ghost"><svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></g></svg></button>
    </List.Row>
    <List.Row>
      <div><img className="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/4@94.webp"/></div>
      <div>
        <div>Ellie Beilish</div>
        <div className="text-xs uppercase font-semibold opacity-60">Bears of a fever</div>
      </div>
      <List.ColWrap as="p" className="text-xs">"Bears of a Fever" captivated audiences with its intense energy and mysterious lyrics. Its popularity skyrocketed after fans shared it widely online, earning Ellie critical acclaim.</List.ColWrap>
      <button className="btn btn-square btn-ghost"><svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor"><path d="M6 3L20 12 6 21 6 3z"></path></g></svg></button>
      <button className="btn btn-square btn-ghost"><svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></g></svg></button>
    </List.Row>
    <List.Row>
      <div><img className="size-10 rounded-box" src="https://img.daisyui.com/images/profile/demo/3@94.webp"/></div>
      <div>
        <div>Sabrino Gardener</div>
        <div className="text-xs uppercase font-semibold opacity-60">Cappuccino</div>
      </div>
      <List.ColWrap as="p" className="text-xs">"Cappuccino" quickly gained attention for its smooth melody and relatable themes. The song’s success propelled Sabrino into the spotlight, solidifying their status as a rising star.</List.ColWrap>
      <button className="btn btn-square btn-ghost"><svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor"><path d="M6 3L20 12 6 21 6 3z"></path></g></svg></button>
      <button className="btn btn-square btn-ghost"><svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></g></svg></button>
    </List.Row>
  </List>
</div>`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default ListDemo
