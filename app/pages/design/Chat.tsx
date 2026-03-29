import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Chat, Tabs } from '@rue-js/design'

const ChatDemo: FC = () => {
  const tabStartEnd = ref<'preview' | 'code'>('preview')
  const tabWithImage = ref<'preview' | 'code'>('preview')
  const tabImageHeaderFooter = ref<'preview' | 'code'>('preview')
  const tabHeaderFooter = ref<'preview' | 'code'>('preview')
  const tabColors = ref<'preview' | 'code'>('preview')
  const tabArray = ref<'preview' | 'code'>('preview')
  const tabArrayInternal = ref<'preview' | 'code'>('preview')

  const chatData = [
    {
      placement: 'start',
      text: "It's over Anakin, I have the high ground.",
    },
    {
      placement: 'end',
      text: 'You underestimate my power!',
    },
    {
      placement: 'start',
      imageSrc: 'https://img.daisyui.com/images/profile/demo/kenobee@192.webp',
      headerName: 'Obi-Wan Kenobi',
      headerTime: '12:45',
      text: 'You were the Chosen One!',
      footer: 'Delivered',
    },
    {
      placement: 'end',
      imageSrc: 'https://img.daisyui.com/images/profile/demo/anakeen@192.webp',
      headerName: 'Anakin',
      headerTime: '12:46',
      text: 'I hate you!',
      footer: 'Seen at 12:46',
    },
    {
      placement: 'start',
      color: 'primary',
      text: 'What kind of nonsense is this',
    },
    {
      placement: 'end',
      color: 'success',
      text: 'You have been given a great honor.',
    },
  ]

  const chatItems = [
    {
      placement: 'start',
      text: (
        <>
          <span>It's over Anakin,</span>
          <br />I have the high ground.
        </>
      ),
    },
    { placement: 'end', text: 'You underestimate my power!' },
    {
      placement: 'start',
      imageSrc: 'https://img.daisyui.com/images/profile/demo/kenobee@192.webp',
      headerName: <span>Obi-Wan Kenobi</span>,
      headerTime: <span>12:45</span>,
      text: 'You were the Chosen One!',
      footer: <span>Delivered</span>,
    },
    {
      placement: 'end',
      imageSrc: 'https://img.daisyui.com/images/profile/demo/anakeen@192.webp',
      headerName: <span>Anakin</span>,
      headerTime: <span>12:46</span>,
      color: 'success',
      text: <span>I hate you!</span>,
      footer: <span>Seen at 12:46</span>,
    },
    { placement: 'start', color: 'primary', text: <em>What kind of nonsense is this</em> },
  ] as const

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Chat bubble 聊天气泡</h1>
        <p className="text-sm mt-3 mb-3">
          聊天气泡用于展示对话中的一行及其所有相关数据，包括作者头像、名称、时间等。
        </p>
        <div className="text-sm">
          <a href="https://daisyui.com/components/chat/" target="_blank">
            查看 Chat 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # chat-start and chat-end
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabStartEnd.value}
            onChange={k => (tabStartEnd.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabStartEnd.value === 'preview' ? (
            <div className="w-full">
              <Chat placement="start">
                <Chat.Bubble>
                  It's over Anakin,
                  <br />I have the high ground.
                </Chat.Bubble>
              </Chat>
              <Chat placement="end">
                <Chat.Bubble>You underestimate my power!</Chat.Bubble>
              </Chat>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="w-full">
  <Chat placement="start">
    <Chat.Bubble>
      It's over Anakin,
      <br />
      I have the high ground.
    </Chat.Bubble>
  </Chat>
  <Chat placement="end">
    <Chat.Bubble>You underestimate my power!</Chat.Bubble>
  </Chat>
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Chat 通过数据渲染（数组）
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
            <div className="w-full">
              {chatData.map((m, i) => (
                <Chat key={i} placement={m.placement as 'start' | 'end'}>
                  {m.imageSrc ? (
                    <Chat.Image className="avatar">
                      <div className="w-10 rounded-full">
                        <img alt="Tailwind CSS chat bubble component" src={m.imageSrc} />
                      </div>
                    </Chat.Image>
                  ) : null}
                  {m.headerName ? (
                    <Chat.Header>
                      {m.headerName} <time className="text-xs opacity-50">{m.headerTime}</time>
                    </Chat.Header>
                  ) : null}
                  <Chat.Bubble color={m.color as any}>{m.text}</Chat.Bubble>
                  {m.footer ? <Chat.Footer className="opacity-50">{m.footer}</Chat.Footer> : null}
                </Chat>
              ))}
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { ref } from '@rue-js/rue';
import { Chat } from '@rue-js/design';
const tabArray = ref<'preview' | 'code'>('preview');
const chatData = [
  { placement: 'start', text: "It's over Anakin, I have the high ground." },
  { placement: 'end', text: 'You underestimate my power!' },
  {
    placement: 'start',
    imageSrc: 'https://img.daisyui.com/images/profile/demo/kenobee@192.webp',
    headerName: 'Obi-Wan Kenobi',
    headerTime: '12:45',
    text: 'You were the Chosen One!',
    footer: 'Delivered',
  },
  {
    placement: 'end',
    imageSrc: 'https://img.daisyui.com/images/profile/demo/anakeen@192.webp',
    headerName: 'Anakin',
    headerTime: '12:46',
    text: 'I hate you!',
    footer: 'Seen at 12:46',
  },
  { placement: 'start', color: 'primary', text: 'What kind of nonsense is this' },
  { placement: 'end', color: 'success', text: 'You have been given a great honor.' },
];
<div className="w-full">
  {chatData.map((m, i) => (
    <Chat key={i} placement={m.placement}>
      {m.imageSrc ? (
        <Chat.Image className="avatar">
          <div className="w-10 rounded-full">
            <img alt="Tailwind CSS chat bubble component" src={m.imageSrc} />
          </div>
        </Chat.Image>
      ) : null}
      {m.headerName ? (
        <Chat.Header>
          {m.headerName} <time className="text-xs opacity-50">{m.headerTime}</time>
        </Chat.Header>
      ) : null}
      <Chat.Bubble color={m.color}>{m.text}</Chat.Bubble>
      {m.footer ? <Chat.Footer className="opacity-50">{m.footer}</Chat.Footer> : null}
    </Chat>
  ))}
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Chat 通过数据渲染（数组，组件内部）
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
            <div className="w-full">
              <Chat items={chatItems} className="w-full" />
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Chat } from '@rue-js/design';
const chatItems = [
  {
    placement: 'start',
    text: (
      <>
        <span>It's over Anakin,</span>
        <br />I have the high ground.
      </>
    ),
  },
  { placement: 'end', text: 'You underestimate my power!' },
  {
    placement: 'start',
    imageSrc: 'https://img.daisyui.com/images/profile/demo/kenobee@192.webp',
    headerName: <span>Obi-Wan Kenobi</span>,
    headerTime: <span>12:45</span>,
    text: 'You were the Chosen One!',
    footer: <span>Delivered</span>,
  },
  {
    placement: 'end',
    imageSrc: 'https://img.daisyui.com/images/profile/demo/anakeen@192.webp',
    headerName: <span>Anakin</span>,
    headerTime: <span>12:46</span>,
    color: 'success',
    text: <span>I hate you!</span>,
    footer: <span>Seen at 12:46</span>,
  },
  { placement: 'start', color: 'primary', text: <em>What kind of nonsense is this</em> },
];
<div className="w-full">
  <Chat items={chatItems} className="w-full" />
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Chat with image
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabWithImage.value}
            onChange={k => (tabWithImage.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabWithImage.value === 'preview' ? (
            <div className="w-full">
              <Chat placement="start">
                <Chat.Image className="avatar">
                  <div className="w-10 rounded-full">
                    <img
                      alt="Tailwind CSS chat bubble component"
                      src="https://img.daisyui.com/images/profile/demo/kenobee@192.webp"
                    />
                  </div>
                </Chat.Image>
                <Chat.Bubble>
                  It was said that you would, destroy the Sith, not join them.
                </Chat.Bubble>
              </Chat>
              <Chat placement="start">
                <Chat.Image className="avatar">
                  <div className="w-10 rounded-full">
                    <img
                      alt="Tailwind CSS chat bubble component"
                      src="https://img.daisyui.com/images/profile/demo/kenobee@192.webp"
                    />
                  </div>
                </Chat.Image>
                <Chat.Bubble>It was you who would bring balance to the Force</Chat.Bubble>
              </Chat>
              <Chat placement="start">
                <Chat.Image className="avatar">
                  <div className="w-10 rounded-full">
                    <img
                      alt="Tailwind CSS chat bubble component"
                      src="https://img.daisyui.com/images/profile/demo/kenobee@192.webp"
                    />
                  </div>
                </Chat.Image>
                <Chat.Bubble>Not leave it in Darkness</Chat.Bubble>
              </Chat>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="w-full">
  <Chat placement="start">
    <Chat.Image className="avatar">
      <div className="w-10 rounded-full">
        <img alt="Tailwind CSS chat bubble component" src="https://img.daisyui.com/images/profile/demo/kenobee@192.webp" />
      </div>
    </Chat.Image>
    <Chat.Bubble>It was said that you would, destroy the Sith, not join them.</Chat.Bubble>
  </Chat>
  <Chat placement="start">
    <Chat.Image className="avatar">
      <div className="w-10 rounded-full">
        <img alt="Tailwind CSS chat bubble component" src="https://img.daisyui.com/images/profile/demo/kenobee@192.webp" />
      </div>
    </Chat.Image>
    <Chat.Bubble>It was you who would bring balance to the Force</Chat.Bubble>
  </Chat>
  <Chat placement="start">
    <Chat.Image className="avatar">
      <div className="w-10 rounded-full">
        <img alt="Tailwind CSS chat bubble component" src="https://img.daisyui.com/images/profile/demo/kenobee@192.webp" />
      </div>
    </Chat.Image>
    <Chat.Bubble>Not leave it in Darkness</Chat.Bubble>
  </Chat>
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Chat with image, header and footer
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabImageHeaderFooter.value}
            onChange={k => (tabImageHeaderFooter.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabImageHeaderFooter.value === 'preview' ? (
            <div className="w-full">
              <Chat placement="start">
                <Chat.Image className="avatar">
                  <div className="w-10 rounded-full">
                    <img
                      alt="Tailwind CSS chat bubble component"
                      src="https://img.daisyui.com/images/profile/demo/kenobee@192.webp"
                    />
                  </div>
                </Chat.Image>
                <Chat.Header>
                  Obi-Wan Kenobi <time className="text-xs opacity-50">12:45</time>
                </Chat.Header>
                <Chat.Bubble>You were the Chosen One!</Chat.Bubble>
                <Chat.Footer className="opacity-50">Delivered</Chat.Footer>
              </Chat>
              <Chat placement="end">
                <Chat.Image className="avatar">
                  <div className="w-10 rounded-full">
                    <img
                      alt="Tailwind CSS chat bubble component"
                      src="https://img.daisyui.com/images/profile/demo/anakeen@192.webp"
                    />
                  </div>
                </Chat.Image>
                <Chat.Header>
                  Anakin <time className="text-xs opacity-50">12:46</time>
                </Chat.Header>
                <Chat.Bubble>I hate you!</Chat.Bubble>
                <Chat.Footer className="opacity-50">Seen at 12:46</Chat.Footer>
              </Chat>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="w-full">
  <Chat placement="start">
    <Chat.Image className="avatar">
      <div className="w-10 rounded-full">
        <img alt="Tailwind CSS chat bubble component" src="https://img.daisyui.com/images/profile/demo/kenobee@192.webp" />
      </div>
    </Chat.Image>
    <Chat.Header>
      Obi-Wan Kenobi <time className="text-xs opacity-50">12:45</time>
    </Chat.Header>
    <Chat.Bubble>You were the Chosen One!</Chat.Bubble>
    <Chat.Footer className="opacity-50">Delivered</Chat.Footer>
  </Chat>
  <Chat placement="end">
    <Chat.Image className="avatar">
      <div className="w-10 rounded-full">
        <img alt="Tailwind CSS chat bubble component" src="https://img.daisyui.com/images/profile/demo/anakeen@192.webp" />
      </div>
    </Chat.Image>
    <Chat.Header>
      Anakin <time className="text-xs opacity-50">12:46</time>
    </Chat.Header>
    <Chat.Bubble>I hate you!</Chat.Bubble>
    <Chat.Footer className="opacity-50">Seen at 12:46</Chat.Footer>
  </Chat>
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Chat with header and footer
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabHeaderFooter.value}
            onChange={k => (tabHeaderFooter.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabHeaderFooter.value === 'preview' ? (
            <div className="w-full">
              <Chat placement="start">
                <Chat.Header>
                  Obi-Wan Kenobi <time className="text-xs opacity-50">2 hours ago</time>
                </Chat.Header>
                <Chat.Bubble>You were my brother, Anakin.</Chat.Bubble>
                <Chat.Footer className="opacity-50">Seen</Chat.Footer>
              </Chat>
              <Chat placement="start">
                <Chat.Header>
                  Obi-Wan Kenobi <time className="text-xs opacity-50">2 hour ago</time>
                </Chat.Header>
                <Chat.Bubble>I loved you.</Chat.Bubble>
                <Chat.Footer className="opacity-50">Delivered</Chat.Footer>
              </Chat>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="w-full">
  <Chat placement="start">
    <Chat.Header>
      Obi-Wan Kenobi <time className="text-xs opacity-50">2 hours ago</time>
    </Chat.Header>
    <Chat.Bubble>You were my brother, Anakin.</Chat.Bubble>
    <Chat.Footer className="opacity-50">Seen</Chat.Footer>
  </Chat>
  <Chat placement="start">
    <Chat.Header>
      Obi-Wan Kenobi <time className="text-xs opacity-50">2 hour ago</time>
    </Chat.Header>
    <Chat.Bubble>I loved you.</Chat.Bubble>
    <Chat.Footer className="opacity-50">Delivered</Chat.Footer>
  </Chat>
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Chat Bubble with colors
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabColors.value}
            onChange={k => (tabColors.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabColors.value === 'preview' ? (
            <div className="w-full">
              <Chat placement="start">
                <Chat.Bubble color="primary">What kind of nonsense is this</Chat.Bubble>
              </Chat>
              <Chat placement="start">
                <Chat.Bubble color="secondary">
                  Put me on the Council and not make me a Master!??
                </Chat.Bubble>
              </Chat>
              <Chat placement="start">
                <Chat.Bubble color="accent">
                  That's never been done in the history of the Jedi.
                </Chat.Bubble>
              </Chat>
              <Chat placement="start">
                <Chat.Bubble color="neutral">It's insulting!</Chat.Bubble>
              </Chat>
              <Chat placement="end">
                <Chat.Bubble color="info">Calm down, Anakin.</Chat.Bubble>
              </Chat>
              <Chat placement="end">
                <Chat.Bubble color="success">You have been given a great honor.</Chat.Bubble>
              </Chat>
              <Chat placement="end">
                <Chat.Bubble color="warning">To be on the Council at your age.</Chat.Bubble>
              </Chat>
              <Chat placement="end">
                <Chat.Bubble color="error">It's never happened before.</Chat.Bubble>
              </Chat>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="w-full">
  <Chat placement="start">
    <Chat.Bubble color="primary">What kind of nonsense is this</Chat.Bubble>
  </Chat>
  <Chat placement="start">
    <Chat.Bubble color="secondary">Put me on the Council and not make me a Master!??</Chat.Bubble>
  </Chat>
  <Chat placement="start">
    <Chat.Bubble color="accent">That's never been done in the history of the Jedi.</Chat.Bubble>
  </Chat>
  <Chat placement="start">
    <Chat.Bubble color="neutral">It's insulting!</Chat.Bubble>
  </Chat>
  <Chat placement="end">
    <Chat.Bubble color="info">Calm down, Anakin.</Chat.Bubble>
  </Chat>
  <Chat placement="end">
    <Chat.Bubble color="success">You have been given a great honor.</Chat.Bubble>
  </Chat>
  <Chat placement="end">
    <Chat.Bubble color="warning">To be on the Council at your age.</Chat.Bubble>
  </Chat>
  <Chat placement="end">
    <Chat.Bubble color="error">It's never happened before.</Chat.Bubble>
  </Chat>
</div>`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default ChatDemo
