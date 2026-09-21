import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'
import Rating from '../../../packages/rue-design/src/components/rating/index'
import type { RatingCharacterRenderContext } from '../../../packages/rue-design/src/components/rating/index'

interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const
const wholeValues = ['1', '2', '3', '4', '5']
const _halfValues = ['0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5']
const feedbackTips = ['很难用', '能用', '稳定', '顺手', '非常喜欢']
const legacyVisibleItemTransitionClassName = 'transition-opacity duration-150'

const codeBlock = (lines: string[]) => lines.join('\n')

const isLegacyRatingItemActive = (currentValue: string, itemValue: string) => {
  if (!currentValue) return false
  return Number(itemValue) <= Number(currentValue)
}

const buildLegacyVisibleItemClassName = (
  currentValue: string,
  itemValue: string,
  className: string,
) => {
  const opacityClass = isLegacyRatingItemActive(currentValue, itemValue)
    ? 'opacity-100'
    : 'opacity-[0.35]'
  return `${className} ${legacyVisibleItemTransitionClassName} ${opacityClass}`
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

const HeartCharacter = () => <span className="inline-flex leading-none">❤</span>

const SemanticRatingPreview: FC = () => {
  const currentValue = ref(3)

  return (
    <div className="space-y-3">
      <Rating defaultValue={3} allowClear={false} onChange={next => (currentValue.value = next)} />
      <p className="m-0 text-sm text-base-content/70">当前评分：{currentValue.value || '未评分'}</p>
    </div>
  )
}

const TooltipRatingPreview: FC = () => {
  const currentValue = ref(4)
  const hoverValue = ref(0)
  const activeValue = hoverValue.value || currentValue.value

  return (
    <div className="space-y-3">
      <Rating
        value={currentValue.value}
        tooltips={feedbackTips}
        onChange={next => {
          currentValue.value = next
        }}
        onHoverChange={next => {
          hoverValue.value = next
        }}
      />
      <div className="rounded-box border border-base-300 bg-base-200/60 p-4 text-sm text-base-content/75">
        <p className="m-0">
          悬停文案：{activeValue ? feedbackTips[Math.ceil(activeValue) - 1] : '未选择'}
        </p>
        <p className="m-0 mt-1">最终得分：{currentValue.value || '未评分'}</p>
      </div>
    </div>
  )
}

const HalfSemanticPreview: FC = () => {
  const currentValue = ref(3.5)

  return (
    <div className="space-y-3">
      <Rating
        value={currentValue.value}
        allowHalf={true}
        activeCharacterClassName="text-success"
        inactiveCharacterClassName="text-success opacity-30"
        onChange={next => (currentValue.value = next)}
      />
      <p className="m-0 text-sm text-base-content/70">精细评分：{currentValue.value.toFixed(1)}</p>
    </div>
  )
}

const ClearBehaviorPreview: FC = () => {
  const clearableValue = ref(3)
  const lockedValue = ref(3)

  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-2">
        <Rating value={clearableValue.value} onChange={next => (clearableValue.value = next)} />
        <p className="m-0 text-base-content/70">
          allowClear=true，再点当前项可清空，当前值：{clearableValue.value || '未评分'}
        </p>
      </div>
      <div className="space-y-2">
        <Rating
          value={lockedValue.value}
          allowClear={false}
          onChange={next => (lockedValue.value = next)}
        />
        <p className="m-0 text-base-content/70">
          allowClear=false，只能改分不能清空，当前值：{lockedValue.value}
        </p>
      </div>
    </div>
  )
}

const CustomCharacterPreview: FC = () => {
  const heartValue = ref(4)
  const alphaValue = ref(2.5)

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Rating
          value={heartValue.value}
          onChange={next => (heartValue.value = next)}
          character={() => <HeartCharacter />}
          activeCharacterClassName="text-error"
          inactiveCharacterClassName="text-error opacity-25"
          size="lg"
        />
        <p className="m-0 text-sm text-base-content/70">
          用 currentColor 驱动自定义字符，适合心形、徽章或品牌字形。
        </p>
      </div>
      <div className="space-y-2">
        <Rating
          value={alphaValue.value}
          allowHalf={true}
          onChange={next => (alphaValue.value = next)}
          character={({ index }: RatingCharacterRenderContext) => (
            <span className="font-black tracking-[0.08em]">{String.fromCharCode(65 + index)}</span>
          )}
          activeCharacterClassName="text-info"
          inactiveCharacterClassName="text-info opacity-25"
          characterClassName="min-w-[1.8em] justify-center text-lg"
        />
        <p className="m-0 text-sm text-base-content/70">
          字符函数可以按 index 输出不同内容，当前值：{alphaValue.value.toFixed(1)}
        </p>
      </div>
    </div>
  )
}

const ReadOnlyStatePreview: FC = () => {
  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-2">
        <Rating defaultValue={4} readOnly={true} />
        <p className="m-0 text-base-content/70">readOnly 保持展示，不响应交互。</p>
      </div>
      <div className="space-y-2">
        <Rating defaultValue={2} disabled={true} />
        <p className="m-0 text-base-content/70">disabled 会降低可见性，同时禁用交互。</p>
      </div>
    </div>
  )
}

const CountAndSizesPreview: FC = () => {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Rating count={10} defaultValue={7} size="sm" />
        <p className="m-0 text-sm text-base-content/70">
          count 不再限定 5 项，适合 10 分制或更长评价维度。
        </p>
      </div>
      <div className="flex flex-col items-start gap-3">
        {sizes.map(size => (
          <Rating key={size} size={size} defaultValue={3} />
        ))}
      </div>
    </div>
  )
}

const LegacyBasicRatingPreview: FC = () => {
  const basicValue = ref('2')
  const customValue = ref(3)

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Rating
          value={Number(basicValue.value)}
          onChange={next => {
            basicValue.value = String(next)
          }}
        >
          {wholeValues.map(value => (
            <Rating.Item
              key={value}
              value={value}
              aria-label={`${value} star`}
              className="mask mask-star opacity-35 data-[rating-active=true]:opacity-100"
            />
          ))}
        </Rating>
        <p className="m-0 text-sm text-base-content/70">当前评分：{basicValue.value}</p>
      </div>
      <div className="space-y-2">
        <Rating value={customValue.value} onChange={next => (customValue.value = next)}>
          {wholeValues.map(value => (
            <Rating.Item
              key={`custom-${value}`}
              as="div"
              value={value}
              className="mask mask-star opacity-35 transition-opacity data-[rating-active=true]:opacity-100"
              aria-label={`${value} star`}
            />
          ))}
        </Rating>
        <p className="m-0 text-sm text-base-content/70">
          自定义宿主也由 group 统一管理，当前评分：{customValue.value}
        </p>
      </div>
    </div>
  )
}

const LegacyMaskGalleryPreview: FC = () => {
  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <Rating>
          {wholeValues.map(value => (
            <Rating.Item
              key={`warning-${value}`}
              name="rating-warning"
              value={value}
              checked={value === '2'}
              className="mask mask-star-2 bg-orange-400"
              aria-label={`${value} star`}
            />
          ))}
        </Rating>
        <Rating className="gap-1">
          <Rating.Item
            name="rating-heart"
            className="mask mask-heart bg-red-400"
            aria-label="1 star"
          />
          <Rating.Item
            name="rating-heart"
            className="mask mask-heart bg-orange-400"
            aria-label="2 star"
            checked={true}
          />
          <Rating.Item
            name="rating-heart"
            className="mask mask-heart bg-yellow-400"
            aria-label="3 star"
          />
          <Rating.Item
            name="rating-heart"
            className="mask mask-heart bg-lime-400"
            aria-label="4 star"
          />
          <Rating.Item
            name="rating-heart"
            className="mask mask-heart bg-green-400"
            aria-label="5 star"
          />
        </Rating>
        <Rating>
          {wholeValues.map(value => (
            <Rating.Item
              key={`green-${value}`}
              name="rating-green"
              value={value}
              checked={value === '2'}
              className="mask mask-star-2 bg-green-500"
              aria-label={`${value} star`}
            />
          ))}
        </Rating>
      </div>
      <div className="flex flex-col items-start gap-3">
        {sizes.map(size => (
          <Rating key={size} size={size}>
            {wholeValues.map(value => (
              <Rating.Item
                key={`${size}-${value}`}
                name={`rating-size-${size}`}
                value={value}
                checked={value === '2'}
                className="mask mask-star-2 bg-orange-400"
                aria-label={`${value} star`}
              />
            ))}
          </Rating>
        ))}
      </div>
    </div>
  )
}

const LegacyClearAndHalfPreview: FC = () => {
  const clearValue = ref('2')
  const halfValue = ref('1.5')

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Rating size="lg">
          <Rating.Item
            hidden={true}
            name="rating-clearable"
            aria-label="clear"
            checked={clearValue.value === ''}
            onChange={() => {
              clearValue.value = ''
            }}
          />
          <Rating.Item
            name="rating-clearable"
            value="1"
            aria-label="1 star"
            checked={clearValue.value === '1'}
            onChange={() => {
              clearValue.value = '1'
            }}
            className={buildLegacyVisibleItemClassName(clearValue.value, '1', 'mask mask-star-2')}
          />
          <Rating.Item
            name="rating-clearable"
            value="2"
            aria-label="2 star"
            checked={clearValue.value === '2'}
            onChange={() => {
              clearValue.value = '2'
            }}
            className={buildLegacyVisibleItemClassName(clearValue.value, '2', 'mask mask-star-2')}
          />
          <Rating.Item
            name="rating-clearable"
            value="3"
            aria-label="3 star"
            checked={clearValue.value === '3'}
            onChange={() => {
              clearValue.value = '3'
            }}
            className={buildLegacyVisibleItemClassName(clearValue.value, '3', 'mask mask-star-2')}
          />
          <Rating.Item
            name="rating-clearable"
            value="4"
            aria-label="4 star"
            checked={clearValue.value === '4'}
            onChange={() => {
              clearValue.value = '4'
            }}
            className={buildLegacyVisibleItemClassName(clearValue.value, '4', 'mask mask-star-2')}
          />
          <Rating.Item
            name="rating-clearable"
            value="5"
            aria-label="5 star"
            checked={clearValue.value === '5'}
            onChange={() => {
              clearValue.value = '5'
            }}
            className={buildLegacyVisibleItemClassName(clearValue.value, '5', 'mask mask-star-2')}
          />
        </Rating>
        <p className="m-0 text-sm text-base-content/70">当前评分：{clearValue.value || 'clear'}</p>
      </div>
      <div className="space-y-3">
        <Rating size="lg" half={true}>
          <Rating.Item
            hidden={true}
            name="rating-half"
            aria-label="clear"
            checked={halfValue.value === ''}
            onChange={() => {
              halfValue.value = ''
            }}
          />
          <Rating.Item
            name="rating-half"
            value="0.5"
            aria-label="0.5 star"
            checked={halfValue.value === '0.5'}
            onChange={() => {
              halfValue.value = '0.5'
            }}
            className={buildLegacyVisibleItemClassName(
              halfValue.value,
              '0.5',
              'bg-green-500 mask mask-star-2 mask-half-1',
            )}
          />
          <Rating.Item
            name="rating-half"
            value="1"
            aria-label="1 star"
            checked={halfValue.value === '1'}
            onChange={() => {
              halfValue.value = '1'
            }}
            className={buildLegacyVisibleItemClassName(
              halfValue.value,
              '1',
              'bg-green-500 mask mask-star-2 mask-half-2',
            )}
          />
          <Rating.Item
            name="rating-half"
            value="1.5"
            aria-label="1.5 star"
            checked={halfValue.value === '1.5'}
            onChange={() => {
              halfValue.value = '1.5'
            }}
            className={buildLegacyVisibleItemClassName(
              halfValue.value,
              '1.5',
              'bg-green-500 mask mask-star-2 mask-half-1',
            )}
          />
          <Rating.Item
            name="rating-half"
            value="2"
            aria-label="2 star"
            checked={halfValue.value === '2'}
            onChange={() => {
              halfValue.value = '2'
            }}
            className={buildLegacyVisibleItemClassName(
              halfValue.value,
              '2',
              'bg-green-500 mask mask-star-2 mask-half-2',
            )}
          />
          <Rating.Item
            name="rating-half"
            value="2.5"
            aria-label="2.5 star"
            checked={halfValue.value === '2.5'}
            onChange={() => {
              halfValue.value = '2.5'
            }}
            className={buildLegacyVisibleItemClassName(
              halfValue.value,
              '2.5',
              'bg-green-500 mask mask-star-2 mask-half-1',
            )}
          />
          <Rating.Item
            name="rating-half"
            value="3"
            aria-label="3 star"
            checked={halfValue.value === '3'}
            onChange={() => {
              halfValue.value = '3'
            }}
            className={buildLegacyVisibleItemClassName(
              halfValue.value,
              '3',
              'bg-green-500 mask mask-star-2 mask-half-2',
            )}
          />
          <Rating.Item
            name="rating-half"
            value="3.5"
            aria-label="3.5 star"
            checked={halfValue.value === '3.5'}
            onChange={() => {
              halfValue.value = '3.5'
            }}
            className={buildLegacyVisibleItemClassName(
              halfValue.value,
              '3.5',
              'bg-green-500 mask mask-star-2 mask-half-1',
            )}
          />
          <Rating.Item
            name="rating-half"
            value="4"
            aria-label="4 star"
            checked={halfValue.value === '4'}
            onChange={() => {
              halfValue.value = '4'
            }}
            className={buildLegacyVisibleItemClassName(
              halfValue.value,
              '4',
              'bg-green-500 mask mask-star-2 mask-half-2',
            )}
          />
          <Rating.Item
            name="rating-half"
            value="4.5"
            aria-label="4.5 star"
            checked={halfValue.value === '4.5'}
            onChange={() => {
              halfValue.value = '4.5'
            }}
            className={buildLegacyVisibleItemClassName(
              halfValue.value,
              '4.5',
              'bg-green-500 mask mask-star-2 mask-half-1',
            )}
          />
          <Rating.Item
            name="rating-half"
            value="5"
            aria-label="5 star"
            checked={halfValue.value === '5'}
            onChange={() => {
              halfValue.value = '5'
            }}
            className={buildLegacyVisibleItemClassName(
              halfValue.value,
              '5',
              'bg-green-500 mask mask-star-2 mask-half-2',
            )}
          />
        </Rating>
        <p className="m-0 text-sm text-base-content/70">当前评分：{halfValue.value || 'clear'}</p>
      </div>
    </div>
  )
}

const ratingApiRows: ApiRow[] = [
  {
    prop: 'activeCharacterClassName',
    description: '自动模式下激活层字符的附加类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'allowClear',
    description: '再次点击当前分值时是否允许清空',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    prop: 'allowHalf',
    description: '是否允许半星选择，支持基础的 half 写法',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'character',
    description: '自动模式下的自定义字符，可传节点或渲染函数',
    type: 'any | (context) => any',
    defaultValue: '默认星形',
  },
  {
    prop: 'characterClassName',
    description: '自动模式下字符容器的附加类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'children',
    description: '传入后切换到手动复合模式，保持 Rating.Item 的基础用法',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'className',
    description: '根节点附加类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'clearLabel',
    description: '清空动作的辅助文案',
    type: 'string',
    defaultValue: 'clear rating',
  },
  {
    prop: 'count',
    description: '自动模式下的项数',
    type: 'number',
    defaultValue: '5',
  },
  {
    prop: 'defaultValue',
    description: '默认分值，非受控模式生效',
    type: 'number',
    defaultValue: '0',
  },
  {
    prop: 'disabled',
    description: '禁用交互',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'inactiveCharacterClassName',
    description: '自动模式下未激活层字符的附加类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'itemClassName',
    description: '自动模式下每个按钮项的附加类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'name',
    description: '自动模式下会同步输出一个 hidden input，便于表单提交',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'onChange',
    description: '分值变化回调',
    type: '(value: number) => void',
    defaultValue: '-',
  },
  {
    prop: 'onHoverChange',
    description: '悬停预览分值变化回调',
    type: '(value: number) => void',
    defaultValue: '-',
  },
  {
    prop: 'readOnly',
    description: '只读展示，不响应交互',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'size',
    description: '尺寸，支持 xs 到 xl，也支持 small、default、medium、middle、large',
    type: 'string',
    defaultValue: 'md',
  },
  {
    prop: 'tooltips',
    description: '每一项的提示文案，会同步到 title 属性',
    type: 'Array<string | number | { title?: any }>',
    defaultValue: '-',
  },
  {
    prop: 'value',
    description: '当前分值，受控模式生效',
    type: 'number',
    defaultValue: '-',
  },
]

const itemApiRows: ApiRow[] = [
  {
    prop: 'as',
    description: '指定渲染节点，默认 input',
    type: 'any',
    defaultValue: 'input',
  },
  {
    prop: 'children',
    description: '当 as 不是 input 时渲染的子节点',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'className',
    description: '项的附加类名，适合继续挂 mask 类',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'hidden',
    description: '是否追加 rating-hidden，用于展示基础手动清空能力',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'type',
    description: '当 as 为 input 时的原生 type',
    type: 'string',
    defaultValue: 'radio',
  },
]

const RatingPage: FC = () => {
  const tabSemantic = ref<PreviewTabMode>('preview')
  const tabTooltip = ref<PreviewTabMode>('preview')
  const tabHalf = ref<PreviewTabMode>('preview')
  const tabClear = ref<PreviewTabMode>('preview')
  const tabCharacter = ref<PreviewTabMode>('preview')
  const tabState = ref<PreviewTabMode>('preview')
  const tabScale = ref<PreviewTabMode>('preview')
  const tabLegacyBasic = ref<PreviewTabMode>('preview')
  const tabLegacyMasks = ref<PreviewTabMode>('preview')
  const tabLegacyAdvanced = ref<PreviewTabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Rating 评分</h1>
        <p className="mt-3 mb-3 text-sm">
          Rating 现在有两条使用路径：默认使用语义化 API，直接获得 count、value /
          defaultValue、allowClear、allowHalf、tooltips 和自定义字符；需要完全使用 daisyUI mask
          结构时，仍然可以使用 Rating.Item 复合写法。
        </p>

        <PreviewBlock
          title="Semantic rating"
          tab={tabSemantic}
          preview={() => <SemanticRatingPreview />}
          code={codeBlock([
            'const value = ref(3)',
            '<Rating defaultValue={3} allowClear={false} onChange={next => (value.value = next)} />',
          ])}
        />

        <PreviewBlock
          title="Tooltips and copywriting"
          tab={tabTooltip}
          preview={() => <TooltipRatingPreview />}
          code={codeBlock([
            "const tips = ['很难用', '能用', '稳定', '顺手', '非常喜欢']",
            '<Rating',
            '  value={value}',
            '  tooltips={tips}',
            '  onChange={setValue}',
            '  onHoverChange={setHoverValue}',
            '/>',
          ])}
        />

        <PreviewBlock
          title="Half steps"
          tab={tabHalf}
          preview={() => <HalfSemanticPreview />}
          code={codeBlock([
            'const value = ref(3.5)',
            '<Rating value={value} allowHalf={true} activeCharacterClassName="text-success" inactiveCharacterClassName="text-success opacity-30" onChange={setValue} />',
          ])}
        />

        <PreviewBlock
          title="Clear behavior"
          tab={tabClear}
          preview={() => <ClearBehaviorPreview />}
          code={codeBlock([
            '<Rating value={value} onChange={setValue} />',
            '<Rating value={value} allowClear={false} onChange={setValue} />',
          ])}
        />

        <PreviewBlock
          title="Custom character"
          tab={tabCharacter}
          preview={() => <CustomCharacterPreview />}
          code={codeBlock([
            '<Rating',
            '  character={() => <span>❤</span>}',
            '  activeCharacterClassName="text-error"',
            '  inactiveCharacterClassName="text-error opacity-25"',
            '/>',
            '',
            '<Rating',
            '  allowHalf={true}',
            '  character={({ index }) => <span className="font-black tracking-[0.08em]">{String.fromCharCode(65 + index)}</span>}',
            '  activeCharacterClassName="text-info"',
            '  inactiveCharacterClassName="text-info opacity-25"',
            '/>',
          ])}
        />

        <PreviewBlock
          title="Read only and disabled"
          tab={tabState}
          preview={() => <ReadOnlyStatePreview />}
          code={codeBlock([
            '<Rating defaultValue={4} readOnly={true} />',
            '<Rating defaultValue={2} disabled={true} />',
          ])}
        />

        <PreviewBlock
          title="Counts and sizes"
          tab={tabScale}
          preview={() => <CountAndSizesPreview />}
          code={codeBlock([
            '<Rating count={10} defaultValue={7} size="sm" />',
            '<Rating size="xs" defaultValue={3} />',
            '<Rating size="lg" defaultValue={3} />',
          ])}
        />

        <PreviewBlock
          title="Composition mode"
          tab={tabLegacyBasic}
          preview={() => <LegacyBasicRatingPreview />}
          code={codeBlock([
            "const wholeValues = ['1', '2', '3', '4', '5']",
            '',
            '<Rating value={Number(value.value)} onChange={next => (value.value = String(next))}>',
            '  {wholeValues.map(value => (',
            '    <Rating.Item key={value} name="rating-basic" value={value} className="mask mask-star" aria-label={`${value} star`} />',
            '  ))}',
            '</Rating>',
            '',
            '<Rating value={customValue.value} onChange={next => (customValue.value = next)}>',
            '  <Rating.Item as="div" value="1" className="mask mask-star opacity-35 data-[rating-active=true]:opacity-100" aria-label="1 star" />',
            '  <Rating.Item as="div" value="3" className="mask mask-star opacity-35 data-[rating-active=true]:opacity-100" aria-label="3 star" />',
            '</Rating>',
          ])}
        />

        <PreviewBlock
          title="Mask gallery"
          tab={tabLegacyMasks}
          preview={() => <LegacyMaskGalleryPreview />}
          code={codeBlock([
            '<Rating>',
            '  <Rating.Item className="mask mask-star-2 bg-orange-400" aria-label="1 star" />',
            '  <Rating.Item className="mask mask-heart bg-red-400" aria-label="2 star" checked={true} />',
            '</Rating>',
            '',
            '<Rating size="lg">',
            "  {['1', '2', '3', '4', '5'].map(value => (",
            '    <Rating.Item',
            '      key={value}',
            '      name="rating-size-lg"',
            '      value={value}',
            "      checked={value === '2'}",
            '      className="mask mask-star-2 bg-orange-400"',
            '      aria-label={`${value} star`}',
            '    />',
            '  ))}',
            '</Rating>',
          ])}
        />

        <PreviewBlock
          title="Clear and half"
          tab={tabLegacyAdvanced}
          preview={() => <LegacyClearAndHalfPreview />}
          code={codeBlock([
            "const wholeValues = ['1', '2', '3', '4', '5']",
            "const halfValues = ['0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5']",
            "const ratingOpacity = (active) => active ? 'opacity-100' : 'opacity-[0.35]'",
            '',
            '<Rating size="lg">',
            '  <Rating.Item hidden={true} name="rating-clearable" aria-label="clear" />',
            '  {wholeValues.map(value => (',
            '    <Rating.Item',
            '      key={value}',
            '      name="rating-clearable"',
            '      value={value}',
            '      aria-label={`${value} star`}',
            '      className={`mask mask-star-2 transition-opacity duration-150 ${ratingOpacity(Number(value) <= Number(currentValue.value))}`}',
            '    />',
            '  ))}',
            '</Rating>',
            '',
            '<Rating size="lg" half={true}>',
            '  <Rating.Item hidden={true} name="rating-half" aria-label="clear" />',
            '  {halfValues.map((value, index) => (',
            '    <Rating.Item',
            '      key={value}',
            '      name="rating-half"',
            '      value={value}',
            '      aria-label={`${value} star`}',
            "      className={`bg-green-500 mask mask-star-2 transition-opacity duration-150 ${ratingOpacity(Number(value) <= Number(currentValue.value))} ${index % 2 === 0 ? 'mask-half-1' : 'mask-half-2'}`}",
            '    />',
            '  ))}',
            '</Rating>',
          ])}
        />

        <div className="not-prose my-8 space-y-4">
          <h2 className="m-0 text-lg font-semibold text-base-content"># Rating API</h2>
          <ApiTable rows={ratingApiRows} />
        </div>

        <div className="not-prose my-8 space-y-4">
          <h2 className="m-0 text-lg font-semibold text-base-content"># Rating.Item API</h2>
          <ApiTable rows={itemApiRows} />
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default RatingPage
