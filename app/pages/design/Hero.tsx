import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'
import { Button, Fieldset, Hero, Input } from '@rue-js/design'
const stockFigure = 'https://img.daisyui.com/images/stock/photo-1635805737707-575885ab0820.webp'
const stockOverlay = 'https://img.daisyui.com/images/stock/photo-1507358522600-9f71e620c44e.webp'

interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

const ApiTable: FC<{ rows: ApiRow[] }> = ({ rows }) => {
  return (
    <div className={'not-prose overflow-x-auto rounded-box border border-base-300 bg-base-100'}>
      <table className={'table table-zebra'}>
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

const heroApiRows: ApiRow[] = [
  {
    prop: 'as',
    description: '指定 Hero 根节点标签',
    type: 'string',
    defaultValue: 'div',
  },
  {
    prop: 'backgroundImage',
    description: '直接设置背景图 URL，组件会自动写入内联背景样式',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'backgroundPosition',
    description: '背景图定位',
    type: 'string',
    defaultValue: 'center',
  },
  {
    prop: 'backgroundRepeat',
    description: '背景图重复方式',
    type: 'string',
    defaultValue: 'no-repeat',
  },
  {
    prop: 'backgroundSize',
    description: '背景图尺寸',
    type: 'string',
    defaultValue: 'cover',
  },
  {
    prop: 'fullHeight',
    description: '直接切换到全屏高度，等价于 screen 尺寸',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'overlay',
    description: '开启自动遮罩，也支持直接传入 Hero.Overlay 同构配置对象',
    type: 'boolean | HeroOverlayProps',
    defaultValue: 'false',
  },
  {
    prop: 'size',
    description: 'Hero 区块高度预设',
    type: 'sm | md | lg | xl | screen',
    defaultValue: '-',
  },
  {
    prop: 'tone',
    description: 'Root 背景与前景色语义层',
    type: 'default | base-100 | base-200 | base-300 | neutral | primary | secondary | accent | info | success | warning | error',
    defaultValue: 'default',
  },
]

const contentApiRows: ApiRow[] = [
  {
    prop: 'Hero.Content.align',
    description: '控制内容区交叉轴对齐',
    type: 'start | center | end',
    defaultValue: '-',
  },
  {
    prop: 'Hero.Content.as',
    description: '指定内容区标签',
    type: 'string',
    defaultValue: 'div',
  },
  {
    prop: 'Hero.Content.gap',
    description: '内容区间距预设，适合覆盖 split 默认间距',
    type: 'sm | md | lg | xl',
    defaultValue: '-',
  },
  {
    prop: 'Hero.Content.layout',
    description: '语义布局预设，覆盖居中、分栏与反向分栏',
    type: 'inherit | center | split | split-reverse',
    defaultValue: 'inherit',
  },
  {
    prop: 'Hero.Content.textAlign',
    description: '文字对齐方式',
    type: 'start | center | end',
    defaultValue: '-',
  },
]

const partApiRows: ApiRow[] = [
  {
    prop: 'Hero.Overlay.blur',
    description: '为遮罩添加轻量模糊，适合背景图场景',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'Hero.Overlay.opacity',
    description: '遮罩透明度，支持 soft / medium / strong 或数字',
    type: 'soft | medium | strong | number',
    defaultValue: '-',
  },
  {
    prop: 'Hero.Overlay.tone',
    description: '遮罩色调，可配合自动 overlay 一起用',
    type: 'default | base-content | neutral | primary | secondary | accent | info | success | warning | error',
    defaultValue: 'default',
  },
  {
    prop: 'Hero.Title.balanced',
    description: '标题默认启用 text-balance，减少过长标题断行问题',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    prop: 'Hero.Title.size',
    description: '标题字号预设',
    type: 'sm | md | lg | xl',
    defaultValue: 'lg',
  },
  {
    prop: 'Hero.Description.muted',
    description: '描述文本默认降低一点对比度',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    prop: 'Hero.Description.size',
    description: '描述字号预设',
    type: 'sm | md | lg',
    defaultValue: 'md',
  },
  {
    prop: 'Hero.Actions.align',
    description: '操作区对齐方式，会根据横排或竖排自动切换到 justify / items',
    type: 'start | center | end',
    defaultValue: '-',
  },
  {
    prop: 'Hero.Actions.direction',
    description: '操作区排列方向',
    type: 'row | column',
    defaultValue: 'row',
  },
  {
    prop: 'Hero.Actions.stackOnMobile',
    description: '移动端堆叠、桌面端横排，适合 CTA 组合',
    type: 'boolean',
    defaultValue: 'false',
  },
]

const HeroPage: FC = () => {
  const tabSemantic = ref<PreviewTabMode>('preview')
  const tabCentered = ref<PreviewTabMode>('preview')
  const tabFigure = ref<PreviewTabMode>('preview')
  const tabReverse = ref<PreviewTabMode>('preview')
  const tabForm = ref<PreviewTabMode>('preview')
  const tabOverlay = ref<PreviewTabMode>('preview')
  const tabOverlayAuto = ref<PreviewTabMode>('preview')
  const tabPresets = ref<PreviewTabMode>('preview')

  return (
    <SidebarPlayground>
      <div className={'max-w-none prose prose-sm md:prose-base'}>
        <h1>Hero 主视觉区</h1>
        <p className={'mt-3 mb-3 text-sm'}>
          Hero 现在不只是一个样式壳。Root 负责背景、尺寸和遮罩，Content 负责布局，Title /
          Description / Actions 负责最常见的文案骨架，剩下的局部视觉继续交给 className 微调。
        </p>
        <p className={'mt-0 mb-4 text-sm'}>
          没有可以直接对照的同名标准组件，所以组件重点覆盖组合能力和语义 API 上：使用 Rue
          自己的视觉语言，但把高频搭建动作从页面里收回到组件里。
        </p>

        <div className={'not-prose mt-6 grid gap-4 lg:grid-cols-3'}>
          <div className={'rounded-[1.5rem] border border-base-300 bg-base-100 p-5 shadow-sm'}>
            <div className={'text-xs uppercase tracking-[0.28em] opacity-60'}>Root</div>
            <div className={'mt-3 text-lg font-semibold'}>Background, size, overlay</div>
            <p className={'mt-2 text-sm opacity-70'}>
              用 tone、size、backgroundImage、overlay 先把 Hero 的外层骨架搭起来。
            </p>
          </div>
          <div className={'rounded-[1.5rem] border border-base-300 bg-base-100 p-5 shadow-sm'}>
            <div className={'text-xs uppercase tracking-[0.28em] opacity-60'}>Content</div>
            <div className={'mt-3 text-lg font-semibold'}>Split, reverse, center</div>
            <p className={'mt-2 text-sm opacity-70'}>
              用 Hero.Content.layout 切换常见主视觉布局，再按需叠加 align、textAlign 和 gap。
            </p>
          </div>
          <div className={'rounded-[1.5rem] border border-base-300 bg-base-100 p-5 shadow-sm'}>
            <div className={'text-xs uppercase tracking-[0.28em] opacity-60'}>Parts</div>
            <div className={'mt-3 text-lg font-semibold'}>Readable copy blocks</div>
            <p className={'mt-2 text-sm opacity-70'}>
              标题、描述和操作区都给了语义化入口，页面里的重复样式可以明显减少。
            </p>
          </div>
        </div>

        <PreviewBlock
          title={'Semantic starter'}
          tab={tabSemantic}
          preview={() => (
            <Hero
              tone={'base-100'}
              size={'xl'}
              className={
                'overflow-hidden rounded-[2rem] border border-base-300 bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10'
              }
            >
              <Hero.Content
                layout={'split'}
                align={'center'}
                gap={'xl'}
                className={'px-6 py-10 lg:px-16'}
              >
                <div className={'space-y-5'}>
                  <span className={'badge badge-outline badge-primary'}>Rue Design Hero</span>
                  <Hero.Title>
                    Ship landing sections without rebuilding layout scaffolding.
                  </Hero.Title>
                  <Hero.Description>
                    Hero 现在把 surface、height、background image、overlay 和 action
                    布局都提升成了语义 API。页面可以更聚焦在内容，而不是重复拼装容器类名。
                  </Hero.Description>
                  <Hero.Actions stackOnMobile>
                    <Button color={'primary'}>Get Started</Button>
                    <Button type={'outlined'}>Browse patterns</Button>
                  </Hero.Actions>
                </div>

                <div className={'grid w-full max-w-md gap-4'}>
                  <div
                    className={
                      'rounded-[1.5rem] border border-base-300 bg-base-100/90 p-5 shadow-xl'
                    }
                  >
                    <p className={'text-xs uppercase tracking-[0.3em] opacity-60'}>Composition</p>
                    <div className={'mt-4 space-y-3'}>
                      <div className={'rounded-2xl bg-base-200 p-4'}>
                        <div className={'text-sm font-semibold'}>Root handles surface</div>
                        <p className={'mt-1 text-sm opacity-70'}>
                          tone、size、backgroundImage、overlay 负责外层骨架。
                        </p>
                      </div>
                      <div className={'rounded-2xl bg-base-200 p-4'}>
                        <div className={'text-sm font-semibold'}>Content handles layout</div>
                        <p className={'mt-1 text-sm opacity-70'}>
                          layout、align、textAlign、gap 负责组织主视觉内容。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Hero.Content>
            </Hero>
          )}
          code={`<Hero
  tone={'base-100'}
  size={'xl'}
  className={'overflow-hidden rounded-[2rem] border border-base-300 bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10'}
>
  <Hero.Content layout={'split'} align={'center'} gap={'xl'} className={'px-6 py-10 lg:px-16'}>
    <div className={'space-y-5'}>
      <span className={'badge badge-outline badge-primary'}>Rue Design Hero</span>
      <Hero.Title>Ship landing sections without rebuilding layout scaffolding.</Hero.Title>
      <Hero.Description>
        Hero 现在把 surface、height、background image、overlay 和 action 布局都提升成了语义 API。
      </Hero.Description>
      <Hero.Actions stackOnMobile>
        <Button color={'primary'}>Get Started</Button>
        <Button type={'outlined'}>Browse patterns</Button>
      </Hero.Actions>
    </div>

    <div className={'grid w-full max-w-md gap-4'}>
      <div className={'rounded-[1.5rem] border border-base-300 bg-base-100/90 p-5 shadow-xl'}>
        <p className={'text-xs uppercase tracking-[0.3em] opacity-60'}>Composition</p>
        <div className={'mt-4 space-y-3'}>
          <div className={'rounded-2xl bg-base-200 p-4'}>
            <div className={'text-sm font-semibold'}>Root handles surface</div>
            <p className={'mt-1 text-sm opacity-70'}>tone、size、backgroundImage、overlay 负责外层骨架。</p>
          </div>
          <div className={'rounded-2xl bg-base-200 p-4'}>
            <div className={'text-sm font-semibold'}>Content handles layout</div>
            <p className={'mt-1 text-sm opacity-70'}>layout、align、textAlign、gap 负责组织主视觉内容。</p>
          </div>
        </div>
      </div>
    </div>
  </Hero.Content>
</Hero>`}
        />

        <PreviewBlock
          title={'Centered hero'}
          tab={tabCentered}
          preview={() => (
            <Hero tone={'base-200'} size={'lg'} className={'rounded-box'}>
              <Hero.Content
                layout={'center'}
                textAlign={'center'}
                gap={'md'}
                className={'px-6 py-10'}
              >
                <div className={'max-w-md space-y-4'}>
                  <Hero.Title>Hello there</Hero.Title>
                  <Hero.Description>
                    Provident cupiditate voluptatem et in. Quaerat fugiat ut assumenda excepturi
                    exercitationem quasi.
                  </Hero.Description>
                  <Hero.Actions align={'center'} stackOnMobile>
                    <Button color={'primary'}>Get Started</Button>
                    <Button type={'outlined'}>View Docs</Button>
                  </Hero.Actions>
                </div>
              </Hero.Content>
            </Hero>
          )}
          code={`<Hero tone={'base-200'} size={'lg'} className={'rounded-box'}>
  <Hero.Content layout={'center'} textAlign={'center'} gap={'md'} className={'px-6 py-10'}>
    <div className={'max-w-md space-y-4'}>
      <Hero.Title>Hello there</Hero.Title>
      <Hero.Description>
        Provident cupiditate voluptatem et in. Quaerat fugiat ut assumenda excepturi exercitationem quasi.
      </Hero.Description>
      <Hero.Actions align={'center'} stackOnMobile>
        <Button color={'primary'}>Get Started</Button>
        <Button type={'outlined'}>View Docs</Button>
      </Hero.Actions>
    </div>
  </Hero.Content>
</Hero>`}
        />

        <PreviewBlock
          title={'Hero with figure'}
          tab={tabFigure}
          preview={() => (
            <Hero tone={'base-200'} size={'lg'} className={'rounded-box'}>
              <Hero.Content layout={'split'} align={'center'} className={'px-6 py-10'}>
                <img
                  src={stockFigure}
                  className={'max-w-sm rounded-lg shadow-2xl'}
                  alt={'Hero figure'}
                />
                <div>
                  <Hero.Title>Box Office News!</Hero.Title>
                  <Hero.Description>
                    Provident cupiditate voluptatem et in. Quaerat fugiat ut assumenda excepturi.
                  </Hero.Description>
                  <Hero.Actions className={'mt-6'}>
                    <Button color={'primary'}>Get Started</Button>
                    <Button type={'text'}>View details</Button>
                  </Hero.Actions>
                </div>
              </Hero.Content>
            </Hero>
          )}
          code={`<Hero tone={'base-200'} size={'lg'} className={'rounded-box'}>
  <Hero.Content layout={'split'} align={'center'} className={'px-6 py-10'}>
    <img src={'${stockFigure}'} className={'max-w-sm rounded-lg shadow-2xl'} alt={'Hero figure'} />
    <div>
      <Hero.Title>Box Office News!</Hero.Title>
      <Hero.Description>
        Provident cupiditate voluptatem et in. Quaerat fugiat ut assumenda excepturi.
      </Hero.Description>
      <Hero.Actions className={'mt-6'}>
        <Button color={'primary'}>Get Started</Button>
        <Button type={'text'}>View details</Button>
      </Hero.Actions>
    </div>
  </Hero.Content>
</Hero>`}
        />

        <PreviewBlock
          title={'Hero with figure but reverse order'}
          tab={tabReverse}
          preview={() => (
            <Hero
              tone={'base-100'}
              size={'lg'}
              className={
                'rounded-box border border-base-300 bg-gradient-to-br from-base-100 via-base-100 to-accent/10'
              }
            >
              <Hero.Content layout={'split-reverse'} align={'center'} className={'px-6 py-10'}>
                <img
                  src={stockFigure}
                  className={'max-w-sm rounded-lg shadow-2xl'}
                  alt={'Hero reverse figure'}
                />
                <div>
                  <span className={'badge badge-soft badge-accent'}>Reverse layout</span>
                  <Hero.Title className={'mt-4'}>Box Office News!</Hero.Title>
                  <Hero.Description>
                    Provident cupiditate voluptatem et in. Quaerat fugiat ut assumenda excepturi.
                  </Hero.Description>
                  <Hero.Actions className={'mt-6'}>
                    <Button color={'primary'}>Get Started</Button>
                    <Button type={'outlined'}>See release plan</Button>
                  </Hero.Actions>
                </div>
              </Hero.Content>
            </Hero>
          )}
          code={`<Hero
  tone={'base-100'}
  size={'lg'}
  className={'rounded-box border border-base-300 bg-gradient-to-br from-base-100 via-base-100 to-accent/10'}
>
  <Hero.Content layout={'split-reverse'} align={'center'} className={'px-6 py-10'}>
    <img src={'${stockFigure}'} className={'max-w-sm rounded-lg shadow-2xl'} alt={'Hero reverse figure'} />
    <div>
      <span className={'badge badge-soft badge-accent'}>Reverse layout</span>
      <Hero.Title className={'mt-4'}>Box Office News!</Hero.Title>
      <Hero.Description>
        Provident cupiditate voluptatem et in. Quaerat fugiat ut assumenda excepturi.
      </Hero.Description>
      <Hero.Actions className={'mt-6'}>
        <Button color={'primary'}>Get Started</Button>
        <Button type={'outlined'}>See release plan</Button>
      </Hero.Actions>
    </div>
  </Hero.Content>
</Hero>`}
        />

        <PreviewBlock
          title={'Hero with form'}
          tab={tabForm}
          preview={() => (
            <Hero tone={'base-200'} size={'lg'} className={'rounded-box'}>
              <Hero.Content layout={'split-reverse'} align={'center'} className={'px-6 py-10'}>
                <div className={'space-y-4 text-center lg:text-left'}>
                  <span className={'badge badge-outline'}>Members only</span>
                  <Hero.Title>Login now!</Hero.Title>
                  <Hero.Description>
                    Provident cupiditate voluptatem et in. Quaerat fugiat ut assumenda excepturi.
                  </Hero.Description>
                </div>
                <div className={'card w-full max-w-sm shrink-0 bg-base-100 shadow-2xl'}>
                  <div className={'card-body'}>
                    <Fieldset>
                      <Fieldset.Label>Email</Fieldset.Label>
                      <Input type={'email'} placeholder={'Email'} />
                      <Fieldset.Label>Password</Fieldset.Label>
                      <Input type={'password'} placeholder={'Password'} />
                      <div>
                        <a className={'link link-hover'}>Forgot password?</a>
                      </div>
                      <Button color={'neutral'} className={'mt-4'}>
                        Login
                      </Button>
                    </Fieldset>
                  </div>
                </div>
              </Hero.Content>
            </Hero>
          )}
          code={`<Hero tone={'base-200'} size={'lg'} className={'rounded-box'}>
  <Hero.Content layout={'split-reverse'} align={'center'} className={'px-6 py-10'}>
    <div className={'space-y-4 text-center lg:text-left'}>
      <span className={'badge badge-outline'}>Members only</span>
      <Hero.Title>Login now!</Hero.Title>
      <Hero.Description>
        Provident cupiditate voluptatem et in. Quaerat fugiat ut assumenda excepturi.
      </Hero.Description>
    </div>

    <div className={'card w-full max-w-sm shrink-0 bg-base-100 shadow-2xl'}>
      <div className={'card-body'}>
        <Fieldset>
          <Fieldset.Label>Email</Fieldset.Label>
          <Input type={'email'} placeholder={'Email'} />
          <Fieldset.Label>Password</Fieldset.Label>
          <Input type={'password'} placeholder={'Password'} />
          <div>
            <a className={'link link-hover'}>Forgot password?</a>
          </div>
          <Button color={'neutral'} className={'mt-4'}>
            Login
          </Button>
        </Fieldset>
      </div>
    </div>
  </Hero.Content>
</Hero>`}
        />

        <PreviewBlock
          title={'Hero with overlay image'}
          tab={tabOverlay}
          preview={() => (
            <Hero backgroundImage={stockOverlay} size={'lg'} className={'rounded-box'}>
              <Hero.Overlay opacity={'medium'} className={'rounded-box'} />
              <Hero.Content
                layout={'center'}
                textAlign={'center'}
                className={'px-6 py-10 text-neutral-content'}
              >
                <div className={'max-w-md space-y-5'}>
                  <Hero.Title>Hello there</Hero.Title>
                  <Hero.Description muted={false} className={'text-neutral-content/80'}>
                    Provident cupiditate voluptatem et in. Quaerat fugiat ut assumenda excepturi.
                  </Hero.Description>
                  <Hero.Actions align={'center'} stackOnMobile>
                    <Button color={'primary'}>Get Started</Button>
                    <Button type={'outlined'}>Read story</Button>
                  </Hero.Actions>
                </div>
              </Hero.Content>
            </Hero>
          )}
          code={`<Hero backgroundImage={'${stockOverlay}'} size={'lg'} className={'rounded-box'}>
  <Hero.Overlay opacity={'medium'} className={'rounded-box'} />
  <Hero.Content layout={'center'} textAlign={'center'} className={'px-6 py-10 text-neutral-content'}>
    <div className={'max-w-md space-y-5'}>
      <Hero.Title>Hello there</Hero.Title>
      <Hero.Description muted={false} className={'text-neutral-content/80'}>
        Provident cupiditate voluptatem et in. Quaerat fugiat ut assumenda excepturi.
      </Hero.Description>
      <Hero.Actions align={'center'} stackOnMobile>
        <Button color={'primary'}>Get Started</Button>
        <Button type={'outlined'}>Read story</Button>
      </Hero.Actions>
    </div>
  </Hero.Content>
</Hero>`}
        />

        <PreviewBlock
          title={'Hero with automatic overlay'}
          tab={tabOverlayAuto}
          preview={() => (
            <Hero
              as={'section'}
              backgroundImage={stockOverlay}
              size={'xl'}
              overlay={{
                tone: 'base-content',
                opacity: 'medium',
                blur: true,
                className: 'rounded-[2rem]',
              }}
              className={'overflow-hidden rounded-[2rem]'}
            >
              <Hero.Content
                layout={'split'}
                align={'center'}
                gap={'xl'}
                className={'px-6 py-12 text-neutral-content lg:px-16'}
              >
                <div className={'space-y-5'}>
                  <span className={'badge badge-soft badge-primary'}>Auto Overlay</span>
                  <Hero.Title>把背景图和可读性补丁一起交给 Hero 处理。</Hero.Title>
                  <Hero.Description muted={false} className={'text-neutral-content/80'}>
                    当页面只是想快速搭一个带图主视觉区时，直接传 backgroundImage 和 overlay
                    就够了，不用再手写遮罩层节点。
                  </Hero.Description>
                </div>

                <div
                  className={
                    'w-full max-w-xs rounded-[1.5rem] border border-white/15 bg-black/30 p-5 backdrop-blur-sm'
                  }
                >
                  <Hero.Actions direction={'column'} align={'start'}>
                    <Button color={'primary'} block>
                      Start from template
                    </Button>
                    <Button type={'outlined'} block>
                      Read migration guide
                    </Button>
                  </Hero.Actions>
                </div>
              </Hero.Content>
            </Hero>
          )}
          code={`<Hero
  as={'section'}
  backgroundImage={'${stockOverlay}'}
  size={'xl'}
  overlay={{ tone: 'base-content', opacity: 'medium', blur: true, className: 'rounded-[2rem]' }}
  className={'overflow-hidden rounded-[2rem]'}
>
  <Hero.Content layout={'split'} align={'center'} gap={'xl'} className={'px-6 py-12 text-neutral-content lg:px-16'}>
    <div className={'space-y-5'}>
      <span className={'badge badge-soft badge-primary'}>Auto Overlay</span>
      <Hero.Title>把背景图和可读性补丁一起交给 Hero 处理。</Hero.Title>
      <Hero.Description muted={false} className={'text-neutral-content/80'}>
        当页面只是想快速搭一个带图主视觉区时，直接传 backgroundImage 和 overlay 就够了。
      </Hero.Description>
    </div>

    <div className={'w-full max-w-xs rounded-[1.5rem] border border-white/15 bg-black/30 p-5 backdrop-blur-sm'}>
      <Hero.Actions direction={'column'} align={'start'}>
        <Button color={'primary'} block>
          Start from template
        </Button>
        <Button type={'outlined'} block>
          Read migration guide
        </Button>
      </Hero.Actions>
    </div>
  </Hero.Content>
</Hero>`}
        />

        <PreviewBlock
          title={'Surface and size presets'}
          tab={tabPresets}
          preview={() => (
            <div className={'grid gap-4 xl:grid-cols-3'}>
              <Hero tone={'base-200'} size={'sm'} className={'rounded-box'}>
                <Hero.Content className={'px-4 py-6'}>
                  <div className={'space-y-3'}>
                    <span className={'badge badge-soft'}>base-200 / sm</span>
                    <Hero.Title size={'sm'}>Compact spotlight</Hero.Title>
                    <Hero.Description size={'sm'}>适合列表页里的次级引导块。</Hero.Description>
                  </div>
                </Hero.Content>
              </Hero>

              <Hero tone={'primary'} size={'md'} className={'rounded-box'}>
                <Hero.Content className={'px-4 py-6'}>
                  <div className={'space-y-3'}>
                    <span className={'badge badge-soft badge-neutral'}>primary / md</span>
                    <Hero.Title size={'sm'}>Campaign push</Hero.Title>
                    <Hero.Description size={'sm'} muted={false}>
                      颜色与前景色一起切换，页面里不用再单独补文字颜色。
                    </Hero.Description>
                  </div>
                </Hero.Content>
              </Hero>

              <Hero tone={'neutral'} size={'lg'} className={'rounded-box'}>
                <Hero.Content className={'px-4 py-6'}>
                  <div className={'space-y-3'}>
                    <span className={'badge badge-outline badge-primary'}>neutral / lg</span>
                    <Hero.Title size={'sm'}>Full campaign frame</Hero.Title>
                    <Hero.Description size={'sm'} muted={false}>
                      更高的尺寸适合首页首屏或专题页入口。
                    </Hero.Description>
                  </div>
                </Hero.Content>
              </Hero>
            </div>
          )}
          code={`<div className={'grid gap-4 xl:grid-cols-3'}>
  <Hero tone={'base-200'} size={'sm'} className={'rounded-box'}>
    <Hero.Content className={'px-4 py-6'}>
      <div className={'space-y-3'}>
        <span className={'badge badge-soft'}>base-200 / sm</span>
        <Hero.Title size={'sm'}>Compact spotlight</Hero.Title>
        <Hero.Description size={'sm'}>适合列表页里的次级引导块。</Hero.Description>
      </div>
    </Hero.Content>
  </Hero>

  <Hero tone={'primary'} size={'md'} className={'rounded-box'}>
    <Hero.Content className={'px-4 py-6'}>
      <div className={'space-y-3'}>
        <span className={'badge badge-soft badge-neutral'}>primary / md</span>
        <Hero.Title size={'sm'}>Campaign push</Hero.Title>
        <Hero.Description size={'sm'} muted={false}>
          颜色与前景色一起切换，页面里不用再单独补文字颜色。
        </Hero.Description>
      </div>
    </Hero.Content>
  </Hero>

  <Hero tone={'neutral'} size={'lg'} className={'rounded-box'}>
    <Hero.Content className={'px-4 py-6'}>
      <div className={'space-y-3'}>
        <span className={'badge badge-outline badge-primary'}>neutral / lg</span>
        <Hero.Title size={'sm'}>Full campaign frame</Hero.Title>
        <Hero.Description size={'sm'} muted={false}>
          更高的尺寸适合首页首屏或专题页入口。
        </Hero.Description>
      </div>
    </Hero.Content>
  </Hero>
</div>`}
        />

        <div className={'not-prose my-12 space-y-8'}>
          <section className={'space-y-2'}>
            <h2 className={'text-2xl font-semibold'}>API</h2>
            <p className={'text-sm opacity-70'}>
              推荐把外层背景和高度交给 Hero Root，把布局交给 Hero.Content，把标题、描述和 CTA
              交给语义子组件。这样页面里仍然可以用 className 微调，但不会反复重写同一套结构。
            </p>
          </section>

          <section className={'space-y-3'}>
            <h3 className={'text-xl font-semibold'}>Hero</h3>
            <ApiTable rows={heroApiRows} />
          </section>

          <section className={'space-y-3'}>
            <h3 className={'text-xl font-semibold'}>Hero.Content</h3>
            <ApiTable rows={contentApiRows} />
          </section>

          <section className={'space-y-3'}>
            <h3 className={'text-xl font-semibold'}>Hero parts</h3>
            <ApiTable rows={partApiRows} />
          </section>
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default HeroPage
