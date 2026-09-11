import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'
import { Button, Checkbox, Form, Input } from '@rue-js/design'
interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

const ApiTable: FC<{ title: string; rows: ApiRow[] }> = ({ title, rows }) => {
  return (
    <div className="not-prose my-6 lg:my-8">
      <h3 className="mt-0 mb-3 text-base font-semibold text-base-content">{title}</h3>
      <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
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
    </div>
  )
}

const GuideCard: FC<{ eyebrow?: string; title: string; description: string; items?: string[] }> = ({
  eyebrow,
  title,
  description,
  items,
}) => {
  return (
    <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm">
      {eyebrow ? (
        <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
          {eyebrow}
        </div>
      ) : null}
      <h3 className="mt-3 mb-0 text-lg font-semibold text-base-content">{title}</h3>
      <p className="mt-3 mb-0 text-sm leading-6 text-base-content/70">{description}</p>
      {items?.length ? (
        <ul className="mt-4 grid gap-2 pl-5 text-sm leading-6 text-base-content/75">
          {items.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

const formatJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const buildQueryString = (values: Record<string, string | boolean>) => {
  return Object.entries(values)
    .filter(([, value]) => value !== '' && value !== false)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&')
}

const BasicSubmitShowcase: FC = () => {
  const initialValues = {
    profile: {
      name: 'Rue Design',
      email: 'team@rue.dev',
    },
    agree: true,
  }
  const draft = ref(formatJson(initialValues))
  const result = ref('等待提交，右侧会展示 payload 或校验摘要。')

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <Form
        className="rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm lg:p-7"
        initialValues={initialValues}
        scrollToFirstError={true}
        validateMessages={{
          required: '请先填写 ${label}',
        }}
        onValuesChange={(_changedValues, allValues) => {
          draft.value = formatJson(allValues)
        }}
        onFinish={values => {
          result.value = '提交成功\n' + formatJson(values)
        }}
        onFinishFailed={info => {
          result.value =
            '校验失败\n' +
            formatJson({
              values: info.values,
              errorFields: info.errorFields.map(field => ({
                name: field.name.join('.'),
                errors: field.errors,
              })),
            })
        }}
        render={form => (
          <>
            <Form.Item
              form={form}
              name={['profile', 'name']}
              label="名称"
              rules={[{ required: true }]}
              extra="名称字段会直接参与 submit payload。"
              render={control => <Input {...control} placeholder="输入项目名称" />}
            />

            <Form.Item
              form={form}
              name={['profile', 'email']}
              label="邮箱"
              rules={[{ required: true }, { type: 'email' }]}
              hasFeedback={true}
              extra="这里演示 Rue Form 当前支持的校验消息、反馈图标和 scrollToFirstError 行为。"
              render={control => <Input {...control} placeholder="team@rue.dev" />}
            />

            <Form.Item
              form={form}
              name="agree"
              label="发布确认"
              valuePropName="checked"
              render={control => <Checkbox {...control}>允许直接覆盖 staging 配置</Checkbox>}
            />

            <div className="flex flex-wrap gap-3 pt-2">
              <Button color="primary" htmlType="submit">
                保存表单
              </Button>
              <Button type="outlined" onClick={() => form.resetFields()}>
                重置
              </Button>
            </div>
          </>
        )}
      />

      <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm lg:p-7">
        <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
          Submit result
        </div>
        <p className="mt-3 mb-0 text-sm text-base-content/65">
          这个示例覆盖基础提交路径：基础收集、规则校验、Checkbox 的 checked
          绑定，以及失败时滚到错误字段。
        </p>
        <div className="mt-4 grid gap-4">
          <div className="rounded-[1.25rem] bg-base-200/70 p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-base-content/45">
              Live draft
            </div>
            <pre className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-base-content/80">
              {draft.value}
            </pre>
          </div>
          <div className="rounded-[1.25rem] bg-neutral p-4 text-neutral-content">
            <div className="text-xs uppercase tracking-[0.22em] text-neutral-content/60">
              Last submit
            </div>
            <pre className="mt-3 whitespace-pre-wrap break-words text-xs leading-6">
              {result.value}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

const InstanceMethodsShowcase: FC = () => {
  const [form] = Form.useForm()
  const role = Form.useWatch('role', form) ?? 'viewer'
  const region = Form.useWatch('region', form) ?? 'cn-hz'
  const notes = Form.useWatch('notes', form) ?? ''
  const activity = ref('等待实例方法操作。')

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <Form
        form={form}
        className="content-start gap-5 rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm lg:p-7"
        initialValues={{
          role: 'viewer',
          region: 'cn-hz',
          notes: '仅开放只读权限',
        }}
        scrollToFirstError={true}
        validateMessages={{
          required: '请填写 ${label}',
        }}
        onFinish={values => {
          activity.value = 'submit()\n' + formatJson(values)
        }}
        onFinishFailed={info => {
          activity.value =
            'submit() failed\n' +
            formatJson(
              info.errorFields.map(field => ({
                name: field.name.join('.'),
                errors: field.errors,
                warnings: field.warnings,
              })),
            )
        }}
        render={formInstance => (
          <>
            <div className="grid gap-5 md:grid-cols-2">
              <Form.Item
                form={formInstance}
                name="role"
                label="角色"
                rules={[
                  { required: true },
                  {
                    pattern: /^(viewer|editor|admin)$/,
                    message: '角色只能是 viewer、editor 或 admin',
                  },
                ]}
                hasFeedback={true}
                render={control => <Input {...control} placeholder="viewer / editor / admin" />}
              />

              <Form.Item
                form={formInstance}
                name="region"
                label="区域"
                rules={[
                  { required: true },
                  {
                    pattern: /^(cn|us|eu)-[a-z]+$/,
                    message: '区域格式示例：cn-hz、us-east、eu-west',
                  },
                ]}
                hasFeedback={true}
                render={control => <Input {...control} placeholder="cn-hz" />}
              />
            </div>

            <Form.Item
              form={formInstance}
              name="notes"
              label="交付备注"
              rules={[{ required: true }, { min: 6 }]}
              render={control => <Input {...control} placeholder="写入审批说明或 rollout 策略" />}
            />

            <div className="flex flex-wrap gap-3 pt-1">
              <Button
                size="sm"
                onClick={() => {
                  form.setFieldValue('role', 'editor')
                  activity.value = "setFieldValue('role', 'editor')"
                }}
              >
                设为 editor
              </Button>
              <Button
                size="sm"
                type="outlined"
                onClick={() => {
                  form.setFieldsValue({
                    region: 'us-east',
                    notes: '需要双人复核',
                  })
                  activity.value = 'setFieldsValue({ region: "us-east", notes: "需要双人复核" })'
                }}
              >
                填充预设
              </Button>
              <Button
                size="sm"
                type="outlined"
                onClick={() => {
                  form.setFieldsValue({
                    role: 'guest',
                    region: 'hangzhou',
                    notes: '',
                  })
                  activity.value =
                    'setFieldsValue({ role: "guest", region: "hangzhou", notes: "" })'
                }}
              >
                填入异常值
              </Button>
              <Button
                size="sm"
                type="text"
                onClick={() => {
                  form.resetFields()
                  activity.value = 'resetFields()'
                }}
              >
                恢复初始值
              </Button>
              <Button
                size="sm"
                color="primary"
                onClick={() => {
                  form.submit()
                }}
              >
                程序化提交
              </Button>
              <Button
                size="sm"
                type="outlined"
                onClick={() => {
                  void form
                    .validateFields()
                    .then(values => {
                      activity.value = 'validateFields()\n' + formatJson(values)
                    })
                    .catch(info => {
                      activity.value = 'validateFields() failed\n' + formatJson(info.errorFields)
                    })
                }}
              >
                validateFields
              </Button>
            </div>
          </>
        )}
      />

      <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm lg:p-7">
        <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
          Reactive summary
        </div>
        <p className="mt-3 mb-0 text-sm text-base-content/65">
          这里把表单实例方法和 Watch Hooks
          两类示例：同一个实例被按钮、摘要卡片和提交流程共享，字段变化会同步反映到右侧。
        </p>
        <div className="mt-4 grid gap-3">
          <div className="rounded-[1.25rem] bg-base-200/70 p-4 text-sm">
            <div className="text-xs uppercase tracking-[0.22em] text-base-content/45">role</div>
            <div className="mt-2 text-lg font-semibold text-base-content">{String(role)}</div>
          </div>
          <div className="rounded-[1.25rem] bg-base-200/70 p-4 text-sm">
            <div className="text-xs uppercase tracking-[0.22em] text-base-content/45">region</div>
            <div className="mt-2 text-lg font-semibold text-base-content">{String(region)}</div>
          </div>
          <div className="rounded-[1.25rem] bg-base-200/70 p-4 text-sm">
            <div className="text-xs uppercase tracking-[0.22em] text-base-content/45">notes</div>
            <div className="mt-2 text-sm leading-6 text-base-content/80">
              {String(notes) || '未填写'}
            </div>
          </div>
        </div>
        <pre className="mt-4 whitespace-pre-wrap break-words rounded-box bg-neutral text-neutral-content p-4 text-xs leading-6">
          {activity.value}
        </pre>
      </div>
    </div>
  )
}

const ValidationDependenciesShowcase: FC = () => {
  const [form] = Form.useForm()
  const password = Form.useWatch('password', form) ?? ''
  const confirm = Form.useWatch('confirm', form) ?? ''
  const website = Form.useWatch('website', form) ?? ''
  const status = ref('试试先输入密码，再修改确认密码，观察依赖字段的重新校验。')

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <Form
        form={form}
        className="rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm lg:p-7"
        initialValues={{
          account: 'release-admin',
          website: 'http://staging.rue.dev',
        }}
        validateMessages={{
          required: '请填写 ${label}',
        }}
        onFinish={values => {
          status.value = '提交成功\n' + formatJson(values)
        }}
        onFinishFailed={info => {
          status.value =
            '校验失败\n' +
            formatJson(
              info.errorFields.map(field => ({
                name: field.name.join('.'),
                errors: field.errors,
                warnings: field.warnings,
              })),
            )
        }}
        render={formInstance => (
          <>
            <div className="grid gap-5 md:grid-cols-2">
              <Form.Item
                form={formInstance}
                name="account"
                label="账号"
                rules={[{ required: true }, { whitespace: true }]}
                hasFeedback={true}
                render={control => <Input {...control} placeholder="release-admin" />}
              />
              <Form.Item
                form={formInstance}
                name="website"
                label="回调域名"
                validateTrigger="onBlur"
                rules={[
                  {
                    warningOnly: true,
                    pattern: /^https:\/\/.+/,
                    message: '建议使用 https:// 前缀',
                  },
                ]}
                extra="warningOnly 会持续提示格式，但不会阻塞 submit。"
                render={control => <Input {...control} placeholder="https://prod.rue.dev" />}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Form.Item
                form={formInstance}
                name="password"
                label="密码"
                validateTrigger="onBlur"
                rules={[{ required: true }, { min: 8 }]}
                hasFeedback={true}
                extra="这里用 onBlur 展示 validateTrigger 的常见用法。"
                render={control => <Input {...control} placeholder="至少 8 位" />}
              />
              <Form.Item
                form={formInstance}
                name="confirm"
                label="确认密码"
                dependencies={['password']}
                validateTrigger="onBlur"
                rules={[
                  { required: true },
                  {
                    validator: (_rule, value, values) => {
                      if (!value) return '请再次输入密码'
                      if (value !== values.password) return '两次输入的密码不一致'
                      return undefined
                    },
                  },
                ]}
                hasFeedback={true}
                extra="dependencies 会在 password 变化后重新触发这里的校验。"
                render={control => <Input {...control} placeholder="再次输入密码" />}
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button color="primary" htmlType="submit">
                执行校验
              </Button>
              <Button type="outlined" onClick={() => form.resetFields()}>
                清空状态
              </Button>
            </div>
          </>
        )}
      />

      <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm lg:p-7">
        <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
          Validation notes
        </div>
        <p className="mt-3 mb-0 text-sm text-base-content/65">
          这组示例把最常用的跨字段模式放到一起：`validateTrigger` 控制时机，`dependencies`
          负责联动校验，`warningOnly` 用于规范提醒。
        </p>
        <div className="mt-4 grid gap-3">
          <div className="rounded-[1.25rem] bg-base-200/70 p-4 text-sm">
            <div className="text-xs uppercase tracking-[0.22em] text-base-content/45">
              Password match
            </div>
            <div className="mt-2 text-base font-semibold text-base-content">
              {password && confirm ? (password === confirm ? '已匹配' : '未匹配') : '等待输入'}
            </div>
          </div>
          <div className="rounded-[1.25rem] bg-base-200/70 p-4 text-sm">
            <div className="text-xs uppercase tracking-[0.22em] text-base-content/45">
              Website warning
            </div>
            <div className="mt-2 text-base font-semibold text-base-content">
              {website
                ? String(website).startsWith('https://')
                  ? '格式建议通过'
                  : '建议补上 https://'
                : '未填写'}
            </div>
          </div>
        </div>
        <pre className="mt-4 whitespace-pre-wrap break-words rounded-[1.25rem] bg-neutral p-4 text-xs leading-6 text-neutral-content">
          {status.value}
        </pre>
      </div>
    </div>
  )
}

const NormalizeValueShowcase: FC = () => {
  const [form] = Form.useForm()
  const initialValues = {
    issueId: '2048',
    slug: 'release-planning',
    branch: 'main',
  }
  const issueId = Form.useWatch('issueId', form) ?? ''
  const slug = Form.useWatch('slug', form) ?? ''
  const branch = Form.useWatch('branch', form) ?? ''
  const snapshot = ref(formatJson(initialValues))

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <Form
        form={form}
        className="rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm lg:p-7"
        initialValues={initialValues}
        onValuesChange={(_changedValues, allValues) => {
          snapshot.value = formatJson(allValues)
        }}
        onFinish={values => {
          snapshot.value = '提交成功\n' + formatJson(values)
        }}
        render={formInstance => (
          <>
            <Form.Item
              form={formInstance}
              name="issueId"
              label="Issue 编号"
              rules={[{ required: true }]}
              getValueProps={value => ({ value: value ? `#${String(value)}` : '' })}
              normalize={value =>
                String(value ?? '')
                  .replace(/^#/, '')
                  .replace(/\D/g, '')
                  .slice(0, 6)
              }
              extra="getValueProps 负责把 store 里的纯数字映射成带 # 的输入框表现。"
              render={control => <Input {...control} placeholder="#2048" />}
            />

            <Form.Item
              form={formInstance}
              name="slug"
              label="发布 slug"
              rules={[{ required: true }, { pattern: /^[a-z0-9-]+$/ }]}
              normalize={value =>
                String(value ?? '')
                  .trim()
                  .toLowerCase()
                  .replace(/\s+/g, '-')
                  .replace(/[^a-z0-9-]/g, '')
                  .replace(/--+/g, '-')
              }
              extra="normalize 会在写入 store 前统一 trim、lowercase 和 kebab-case。"
              render={control => <Input {...control} placeholder="release-planning" />}
            />

            <Form.Item
              form={formInstance}
              name="branch"
              label="目标分支"
              messageVariables={{ label: '目标分支' }}
              rules={[
                { required: true },
                {
                  pattern: /^(main|release\/[a-z0-9-]+)$/i,
                  message: '${label} 需为 main 或 release/*',
                },
              ]}
              render={control => <Input {...control} placeholder="main / release/v1-2" />}
            />

            <div className="flex flex-wrap gap-3 pt-2">
              <Button color="primary" htmlType="submit">
                应用转换
              </Button>
              <Button
                type="outlined"
                onClick={() => {
                  form.setFieldsValue({
                    issueId: '4096',
                    slug: 'release notes',
                    branch: 'release/v2-0',
                  })
                }}
              >
                填充示例
              </Button>
            </div>
          </>
        )}
      />

      <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm lg:p-7">
        <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
          Store snapshot
        </div>
        <p className="mt-3 mb-0 text-sm text-base-content/65">
          这个示例演示 `getValueProps + normalize` 思路：显示层和存储层可以不同，但写入 Form store
          前必须同步归一化。
        </p>
        <div className="mt-4 grid gap-3">
          <div className="rounded-[1.25rem] bg-base-200/70 p-4 text-sm">
            <div className="text-xs uppercase tracking-[0.22em] text-base-content/45">issueId</div>
            <div className="mt-2 text-lg font-semibold text-base-content">
              {String(issueId) || '空'}
            </div>
          </div>
          <div className="rounded-[1.25rem] bg-base-200/70 p-4 text-sm">
            <div className="text-xs uppercase tracking-[0.22em] text-base-content/45">slug</div>
            <div className="mt-2 text-lg font-semibold text-base-content">
              {String(slug) || '空'}
            </div>
          </div>
          <div className="rounded-[1.25rem] bg-base-200/70 p-4 text-sm">
            <div className="text-xs uppercase tracking-[0.22em] text-base-content/45">branch</div>
            <div className="mt-2 text-lg font-semibold text-base-content">
              {String(branch) || '空'}
            </div>
          </div>
        </div>
        <pre className="mt-4 whitespace-pre-wrap break-words rounded-[1.25rem] bg-neutral p-4 text-xs leading-6 text-neutral-content">
          {snapshot.value}
        </pre>
      </div>
    </div>
  )
}

const ConditionalFieldsShowcase: FC = () => {
  const [form] = Form.useForm()
  const enableCanary = !!Form.useWatch('enableCanary', form)
  const publishMode = Form.useWatch('publishMode', form) ?? 'manual'
  const batchSize = Form.useWatch('batchSize', form) ?? ''
  const approveBy = Form.useWatch('approveBy', form) ?? ''
  const result = ref('开启灰度发布后，额外字段会由 shouldUpdate 动态挂载。')

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <Form
        form={form}
        className="rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm lg:p-7"
        initialValues={{
          service: 'gateway',
          publishMode: 'manual',
          enableCanary: false,
        }}
        onFinish={values => {
          result.value = '提交成功\n' + formatJson(values)
        }}
        render={formInstance => (
          <>
            <div className="grid gap-5 md:grid-cols-2">
              <Form.Item
                form={formInstance}
                name="service"
                label="服务名"
                rules={[{ required: true }]}
                render={control => <Input {...control} placeholder="gateway" />}
              />
              <Form.Item
                form={formInstance}
                name="publishMode"
                label="发布模式"
                rules={[{ required: true }]}
                render={control => <Input {...control} placeholder="manual / auto" />}
              />
            </div>

            <Form.Item
              form={formInstance}
              name="enableCanary"
              label="灰度发布"
              valuePropName="checked"
              extra="这个字段变化时，下面的 shouldUpdate 区域会按需挂载或卸载额外输入。"
              render={control => <Checkbox {...control}>开启 canary rollout</Checkbox>}
            />

            <Form.Item
              shouldUpdate={(prev: Record<string, any>, next: Record<string, any>) => {
                return (
                  prev.enableCanary !== next.enableCanary || prev.publishMode !== next.publishMode
                )
              }}
              render={(allValues: Record<string, any>) =>
                allValues.enableCanary ? (
                  <div className="rounded-[1.25rem] border border-base-300 bg-base-200/30 p-5">
                    <div className="mb-4 text-sm font-medium text-base-content">
                      Canary settings
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <Form.Item
                        form={formInstance}
                        name="batchSize"
                        label="首批流量"
                        rules={[{ required: true }]}
                        render={control => <Input {...control} placeholder="10%" />}
                      />
                      <Form.Item
                        form={formInstance}
                        name="approveBy"
                        label="审批人"
                        rules={[{ required: true }]}
                        render={control => <Input {...control} placeholder="release-ops" />}
                      />
                    </div>
                    {allValues.publishMode === 'auto' ? (
                      <div className="rounded-[1rem] bg-base-100 p-4 text-sm leading-6 text-base-content/70">
                        自动模式下建议把首批流量控制在 10% 以内，这就是 shouldUpdate
                        适合承载的“条件区域”。
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-[1.25rem] border border-dashed border-base-300 bg-base-200/40 p-5 text-sm text-base-content/60">
                    未开启灰度发布，额外字段不会挂载，也不会参与校验。
                  </div>
                )
              }
            />

            <div className="flex flex-wrap gap-3 pt-2">
              <Button color="primary" htmlType="submit">
                保存发布策略
              </Button>
              <Button
                type="outlined"
                onClick={() => {
                  form.setFieldsValue({
                    enableCanary: true,
                    publishMode: 'auto',
                    batchSize: '10%',
                    approveBy: 'ops-squad',
                  })
                }}
              >
                套用 canary 模板
              </Button>
            </div>
          </>
        )}
      />

      <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm lg:p-7">
        <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
          Conditional summary
        </div>
        <p className="mt-3 mb-0 text-sm text-base-content/65">
          这个示例演示 `shouldUpdate`
          使用方式：字段本身负责绑定，条件区域负责根据全表单值决定是否渲染额外内容。
        </p>
        <div className="mt-4 grid gap-3">
          <div className="rounded-[1.25rem] bg-base-200/70 p-4 text-sm">
            <div className="text-xs uppercase tracking-[0.22em] text-base-content/45">
              enableCanary
            </div>
            <div className="mt-2 text-lg font-semibold text-base-content">
              {enableCanary ? 'true' : 'false'}
            </div>
          </div>
          <div className="rounded-[1.25rem] bg-base-200/70 p-4 text-sm">
            <div className="text-xs uppercase tracking-[0.22em] text-base-content/45">
              publishMode
            </div>
            <div className="mt-2 text-lg font-semibold text-base-content">
              {String(publishMode)}
            </div>
          </div>
          <div className="rounded-[1.25rem] bg-base-200/70 p-4 text-sm">
            <div className="text-xs uppercase tracking-[0.22em] text-base-content/45">
              Conditional fields
            </div>
            <div className="mt-2 text-sm leading-6 text-base-content/80">
              batchSize: {String(batchSize) || '未挂载'}
              <br />
              approveBy: {String(approveBy) || '未挂载'}
            </div>
          </div>
        </div>
        <pre className="mt-4 whitespace-pre-wrap break-words rounded-[1.25rem] bg-neutral p-4 text-xs leading-6 text-neutral-content">
          {result.value}
        </pre>
      </div>
    </div>
  )
}

const CompositeNoStyleShowcase: FC = () => {
  const [form] = Form.useForm()
  const host = String(Form.useWatch('host', form) ?? 'api.rue.dev')
  const path = String(Form.useWatch('path', form) ?? 'release-hooks')
  const saveLog = ref('noStyle 更适合把字段绑定嵌进自定义布局，而不是单独承担一整行表单结构。')

  const normalizedPath = path ? path.replace(/^\/+/, '') : ''
  const previewUrl = `https://${host}:443/hooks/${normalizedPath}`

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <Form
        form={form}
        className="rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm lg:p-7"
        initialValues={{
          host: 'api.rue.dev',
          path: 'release-hooks',
        }}
        onFinish={values => {
          saveLog.value = '保存复合控件\n' + formatJson(values)
        }}
        render={formInstance => (
          <>
            <div className="grid gap-6">
              <div className="grid gap-3">
                <div className="text-[0.95rem] leading-7 font-medium text-base-content/78">
                  回调地址
                </div>
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                  <span className="rounded-full bg-base-200 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-base-content/55">
                    https://
                  </span>
                  <Form.Item
                    form={formInstance}
                    name="host"
                    noStyle={true}
                    render={control => (
                      <div className="min-w-0">
                        <Input {...control} placeholder="api.rue.dev" />
                      </div>
                    )}
                  />
                  <span className="rounded-full bg-base-200 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-base-content/55">
                    :443
                  </span>
                </div>
                <div className="text-[0.8rem] leading-6 text-base-content/55">
                  这一整行是自定义布局，真正接收 Form 注入值和事件的只有内部 noStyle Item。
                </div>
              </div>

              <div className="grid gap-3">
                <div className="text-[0.95rem] leading-7 font-medium text-base-content/78">
                  资源路径
                </div>
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                  <span className="rounded-full bg-base-200 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-base-content/55">
                    /hooks/
                  </span>
                  <Form.Item
                    form={formInstance}
                    name="path"
                    noStyle={true}
                    normalize={value =>
                      String(value ?? '')
                        .trim()
                        .replace(/^\/+/, '')
                    }
                    render={control => (
                      <div className="min-w-0">
                        <Input {...control} placeholder="release-hooks" />
                      </div>
                    )}
                  />
                  <span className="text-xs uppercase tracking-[0.18em] text-base-content/45">
                    POST target
                  </span>
                </div>
                <div className="text-[0.8rem] leading-6 text-base-content/55">
                  noStyle 很适合把字段嵌进带前缀、后缀和静态说明文本的复合行，而不用重复套一层完整的
                  Form.Item 样式壳。
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button color="primary" htmlType="submit">
                保存复合地址
              </Button>
              <Button
                type="outlined"
                onClick={() => {
                  form.setFieldsValue({
                    host: 'staging.rue.dev',
                    path: 'preview-hook',
                  })
                }}
              >
                填入 staging
              </Button>
            </div>
          </>
        )}
      />

      <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm lg:p-7">
        <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
          Composite preview
        </div>
        <p className="mt-3 mb-0 text-sm text-base-content/65">
          这个示例演示复合表单控件的常见组织方式
          思路：一个视觉行可以包含多个真实字段，但绑定必须落在内部 noStyle Item 上。
        </p>
        <div className="mt-4 rounded-[1.25rem] bg-base-200/70 p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-base-content/45">
            Resolved URL
          </div>
          <div className="mt-3 break-all text-lg font-semibold text-base-content">{previewUrl}</div>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-base-content/75">
          <div className="rounded-[1.25rem] bg-base-200/70 p-4">
            `https://`、`:443` 和 `/hooks/` 都是布局文本，真正绑定的字段只有 host 和 path。
          </div>
          <div className="rounded-[1.25rem] bg-base-200/70 p-4">
            外层 label、说明文案和静态修饰可以完全手写，不需要为每个子字段重复渲染一整行 Form.Item。
          </div>
          <div className="rounded-[1.25rem] bg-base-200/70 p-4">
            如果你需要更细粒度的错误落点，通常要手动设计这些 noStyle 子字段的错误承载位置。
          </div>
        </div>
        <pre className="mt-4 whitespace-pre-wrap break-words rounded-[1.25rem] bg-neutral p-4 text-xs leading-6 text-neutral-content">
          {saveLog.value}
        </pre>
      </div>
    </div>
  )
}

const LongFormScrollShowcase: FC = () => {
  const [form] = Form.useForm()
  const activity = ref(
    '点击左侧按钮可调用 scrollToField；提交时会用 scrollToFirstError 自动滚到首个错误字段。',
  )

  const jumpToField = (name: string | Array<string | number>, label: string) => {
    form.scrollToField(name, { block: 'center', focus: true })
    activity.value = `scrollToField -> ${label}`
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
          Scroll actions
        </div>
        <p className="mt-3 mb-0 text-sm text-base-content/65">
          这个示例把手动 scrollToField
          和提交失败自动滚动放进同一个长表单容器里，方便直接比较两种行为。
        </p>
        <div className="mt-4 grid gap-2">
          <Button size="sm" onClick={() => jumpToField('releaseName', '发布名称')}>
            滚到发布名称
          </Button>
          <Button
            size="sm"
            type="outlined"
            onClick={() => jumpToField(['strategy', 'batchSize'], '灰度批次')}
          >
            滚到灰度批次
          </Button>
          <Button
            size="sm"
            type="outlined"
            onClick={() => jumpToField(['observability', 'dashboard'], '监控看板')}
          >
            滚到监控看板
          </Button>
          <Button
            size="sm"
            type="outlined"
            onClick={() => jumpToField(['rollback', 'ticket'], '回滚单号')}
          >
            滚到回滚单号
          </Button>
        </div>
        <pre className="mt-4 whitespace-pre-wrap break-words rounded-[1.25rem] bg-neutral p-4 text-xs leading-6 text-neutral-content">
          {activity.value}
        </pre>
      </div>

      <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-4 shadow-sm lg:p-5">
        <div
          className="overflow-y-auto overscroll-contain pr-2"
          style={{
            height: 'min(34rem, 72vh)',
            scrollBehavior: 'smooth',
            scrollbarGutter: 'stable',
          }}
        >
          <Form
            form={form}
            name="advanced-scroll-demo"
            className="pb-4"
            scrollToFirstError={{ block: 'center', focus: true }}
            initialValues={{
              application: 'rue-design',
              environment: 'staging',
              strategy: { batchSize: '10%', pauseWindow: '15m' },
              observability: { dashboard: '' },
            }}
            onFinish={values => {
              activity.value = '提交成功\n' + formatJson(values)
            }}
            onFinishFailed={info => {
              activity.value =
                '校验失败，已定位到首个错误字段\n' +
                formatJson({
                  firstError: info.errorFields[0]?.name.join('.'),
                  errorFields: info.errorFields,
                })
            }}
            render={formInstance => (
              <>
                <section className="rounded-[1.25rem] border border-base-300 bg-base-50/50 p-5 lg:p-6">
                  <div className="mb-4">
                    <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
                      Section 1
                    </div>
                    <div className="mt-1 text-lg font-semibold text-base-content">基础信息</div>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Form.Item
                      form={formInstance}
                      name="releaseName"
                      label="发布名称"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="2026.05 release" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name="application"
                      label="应用名"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="rue-design" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name="environment"
                      label="环境"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="staging" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name="owner"
                      label="发布负责人"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="release-captain" />}
                    />
                  </div>
                </section>

                <section className="rounded-[1.25rem] border border-base-300 bg-base-50/50 p-5 lg:p-6">
                  <div className="mb-4">
                    <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
                      Section 2
                    </div>
                    <div className="mt-1 text-lg font-semibold text-base-content">发布策略</div>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Form.Item
                      form={formInstance}
                      name={['strategy', 'batchSize']}
                      label="灰度批次"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="10%" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name={['strategy', 'pauseWindow']}
                      label="观察窗口"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="15m" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name={['strategy', 'rollbackThreshold']}
                      label="回滚阈值"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="error rate > 2%" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name={['strategy', 'approvalWindow']}
                      label="审批窗口"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="30m" />}
                    />
                  </div>
                </section>

                <section className="rounded-[1.25rem] border border-base-300 bg-base-50/50 p-5 lg:p-6">
                  <div className="mb-4">
                    <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
                      Section 3
                    </div>
                    <div className="mt-1 text-lg font-semibold text-base-content">观测与审批</div>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Form.Item
                      form={formInstance}
                      name={['observability', 'dashboard']}
                      label="监控看板"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="Grafana release board" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name={['observability', 'alertChannel']}
                      label="告警通道"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="#release-alerts" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name={['approval', 'owner']}
                      label="审批负责人"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="ops-squad" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name={['approval', 'qaOwner']}
                      label="QA 负责人"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="qa-squad" />}
                    />
                  </div>
                </section>

                <section className="rounded-[1.25rem] border border-base-300 bg-base-50/50 p-5 lg:p-6">
                  <div className="mb-4">
                    <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
                      Section 4
                    </div>
                    <div className="mt-1 text-lg font-semibold text-base-content">回滚预案</div>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Form.Item
                      form={formInstance}
                      name={['rollback', 'ticket']}
                      label="回滚单号"
                      rules={[{ required: true }]}
                      extra="这里故意放在长表单靠后的位置，方便观察 scrollToFirstError。"
                      render={control => <Input {...control} placeholder="RB-2026-0514" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name={['rollback', 'owner']}
                      label="回滚负责人"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="rollback-owner" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name={['rollback', 'window']}
                      label="回滚窗口"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="20m" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name={['rollback', 'watchers']}
                      label="通知对象"
                      rules={[{ required: true }]}
                      render={control => (
                        <Input {...control} placeholder="platform / qa / support" />
                      )}
                    />
                  </div>
                </section>

                <div className="sticky bottom-0 rounded-[1.25rem] border border-base-300 bg-base-100/95 p-4 shadow-sm backdrop-blur">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-base-content/65">
                      留空深层字段后点击提交，会自动滚到首个错误项。
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="outlined"
                        onClick={() => jumpToField(['rollback', 'ticket'], '回滚单号')}
                      >
                        滚到回滚单号
                      </Button>
                      <Button color="primary" htmlType="submit">
                        提交长表单
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          />
        </div>
      </div>
    </div>
  )
}

const DynamicListShowcase: FC = () => {
  const [form] = Form.useForm()
  const members =
    (Form.useWatch('members', form) as Array<{ name?: string; role?: string }> | undefined) ?? []

  return (
    <div className="grid gap-6">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <Form
          form={form}
          className="content-start gap-5 rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm lg:p-7"
          initialValues={{
            members: [
              { name: 'Rue', role: 'Owner' },
              { name: 'Vapor', role: 'Reviewer' },
            ],
          }}
          render={formInstance => (
            <Form.List
              form={formInstance}
              name="members"
              rules={[
                {
                  validator: (_rule, value) => {
                    if (!Array.isArray(value) || value.length < 2) {
                      return '至少保持 2 名审批成员，才适合真实协作流程。'
                    }
                    return undefined
                  },
                },
              ]}
              render={(fields, operation, meta) => (
                <div className="grid gap-4">
                  {fields.length === 0 ? (
                    <div className="rounded-[1.25rem] border border-dashed border-base-300 bg-base-200/40 p-4 text-sm text-base-content/60">
                      暂无成员，点击下方按钮即可追加一组字段。
                    </div>
                  ) : null}

                  {fields.map((field, index) => (
                    <div
                      key={field.key}
                      className="rounded-[1.25rem] border border-base-300 bg-base-50/60 p-4 lg:p-5"
                    >
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
                            Member {index + 1}
                          </div>
                          <div className="mt-1 text-sm font-medium text-base-content">
                            审批成员 {index + 1}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {index > 0 ? (
                            <Button
                              size="sm"
                              type="outlined"
                              onClick={() => operation.move(field.name, field.name - 1)}
                            >
                              上移
                            </Button>
                          ) : null}
                          {index < fields.length - 1 ? (
                            <Button
                              size="sm"
                              type="outlined"
                              onClick={() => operation.move(field.name, field.name + 1)}
                            >
                              下移
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            type="text"
                            onClick={() => operation.remove(field.name)}
                          >
                            删除
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Form.Item
                          form={formInstance}
                          layout="vertical"
                          name={['members', field.name, 'name']}
                          label="成员名称"
                          rules={[{ required: true }]}
                          render={control => <Input {...control} placeholder="输入成员名称" />}
                        />
                        <Form.Item
                          form={formInstance}
                          layout="vertical"
                          name={['members', field.name, 'role']}
                          label="职责"
                          rules={[{ required: true }]}
                          render={control => (
                            <Input {...control} placeholder="Owner / Reviewer / QA" />
                          )}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-3 pt-1">
                    <Button
                      size="sm"
                      color="primary"
                      onClick={() => {
                        operation.add({ name: '新成员 ' + String(fields.length + 1), role: 'QA' })
                      }}
                    >
                      新增成员
                    </Button>
                    <Button
                      size="sm"
                      type="outlined"
                      onClick={() => operation.add({ name: 'Head reviewer', role: 'QA' }, 0)}
                    >
                      头部插入
                    </Button>
                  </div>

                  {meta.errors.length > 0 || meta.warnings.length > 0 ? (
                    <Form.ErrorList
                      errors={meta.errors}
                      warnings={meta.warnings}
                      className="rounded-[1.25rem] border border-error/15 bg-error/5 p-4 text-sm"
                    />
                  ) : null}
                </div>
              )}
            />
          )}
        />

        <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm lg:p-7">
          <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
            List snapshot
          </div>
          <div className="mt-3 inline-flex rounded-full bg-base-200 px-3 py-1 text-xs font-medium text-base-content/65">
            {members.length} members
          </div>
          <div className="mt-4 grid gap-3">
            {members.length > 0 ? (
              members.map((member, index) => (
                <div
                  key={String(index)}
                  className="rounded-[1.25rem] bg-base-200/70 p-4 text-sm text-base-content/80"
                >
                  <div className="text-xs uppercase tracking-[0.22em] text-base-content/45">
                    成员 {index + 1}
                  </div>
                  <div className="mt-2 text-base font-medium text-base-content">
                    {member?.name ? String(member.name) : '未命名成员'}
                  </div>
                  <div className="mt-1 text-xs text-base-content/55">
                    {member?.role ? String(member.role) : '未分配职责'}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.25rem] bg-base-200/70 p-4 text-sm text-base-content/60">
                当前列表为空。
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm lg:p-7">
        <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
          List behavior
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.25rem] bg-base-200/70 p-4">
            <div className="text-sm font-semibold text-base-content">列表级规则</div>
            <p className="mt-2 mb-0 text-sm leading-6 text-base-content/65">
              rules 挂在 Form.List 上，校验整个 members 数组。
            </p>
          </div>
          <div className="rounded-[1.25rem] bg-base-200/70 p-4">
            <div className="text-sm font-semibold text-base-content">重排操作</div>
            <p className="mt-2 mb-0 text-sm leading-6 text-base-content/65">
              operation.move 保持字段状态跟随成员顺序移动。
            </p>
          </div>
          <div className="rounded-[1.25rem] bg-base-200/70 p-4">
            <div className="text-sm font-semibold text-base-content">错误出口</div>
            <p className="mt-2 mb-0 text-sm leading-6 text-base-content/65">
              Form.ErrorList 只展示列表自身的错误，不和单个字段提示混在一起。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const InlineFiltersShowcase: FC = () => {
  const [form] = Form.useForm()
  const keyword = Form.useWatch('keyword', form) ?? ''
  const assignee = Form.useWatch('assignee', form) ?? ''
  const repository = Form.useWatch('repository', form) ?? ''
  const reviewer = Form.useWatch('reviewer', form) ?? ''
  const includeDrafts = !!Form.useWatch('includeDrafts', form)
  const submitted = ref('尚未执行检索。')

  return (
    <div className="grid gap-6">
      <Form
        form={form}
        className="rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm lg:p-7"
        initialValues={{
          keyword: 'runtime vapor',
          repository: 'rue-design',
          assignee: 'design',
          reviewer: 'infra',
          includeDrafts: false,
        }}
        onFinish={values => {
          submitted.value = formatJson(values)
        }}
        render={formInstance => (
          <>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <Form.Item
                form={formInstance}
                layout="vertical"
                name="keyword"
                label="关键词"
                render={control => <Input {...control} placeholder="搜索 issue / 页面 / API" />}
              />
              <Form.Item
                form={formInstance}
                layout="vertical"
                name="repository"
                label="仓库"
                render={control => <Input {...control} placeholder="rue-design" />}
              />
              <Form.Item
                form={formInstance}
                layout="vertical"
                name="assignee"
                label="负责人"
                render={control => <Input {...control} placeholder="team-design" />}
              />
              <Form.Item
                form={formInstance}
                layout="vertical"
                name="reviewer"
                label="评审人"
                render={control => <Input {...control} placeholder="infra" />}
              />
            </div>

            <div className="mt-2 flex flex-wrap items-end justify-between gap-4 border-t border-base-300 pt-4">
              <Form.Item
                form={formInstance}
                name="includeDrafts"
                valuePropName="checked"
                render={control => <Checkbox {...control}>包含草稿和实验分支</Checkbox>}
              />
              <div className="flex flex-wrap gap-2">
                <Button color="primary" htmlType="submit">
                  执行搜索
                </Button>
                <Button type="outlined" onClick={() => form.resetFields()}>
                  清空条件
                </Button>
                <Button
                  type="text"
                  onClick={() => {
                    form.setFieldsValue({
                      keyword: 'design tokens',
                      repository: 'app',
                      assignee: 'ui-platform',
                      reviewer: 'release',
                    })
                  }}
                >
                  填入示例
                </Button>
              </div>
            </div>
          </>
        )}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
            Query preview
          </div>
          <p className="mt-3 mb-0 text-sm text-base-content/65">
            这个示例更接近常见的高级搜索表单：字段采用网格布局，按钮区保持独立，search 和 reset
            仍由同一实例驱动。
          </p>
          <pre className="mt-4 whitespace-pre-wrap break-words rounded-[1.25rem] bg-base-200/70 p-4 text-xs leading-6 text-base-content/80">
            {buildQueryString({
              keyword: String(keyword),
              repository: String(repository),
              assignee: String(assignee),
              reviewer: String(reviewer),
              includeDrafts,
            }) || '暂无 query string'}
          </pre>
          <div className="mt-4 grid gap-3 text-sm text-base-content/80">
            <div className="rounded-[1.25rem] bg-base-200/70 p-4">
              关键词：{String(keyword) || '未填写'}
            </div>
            <div className="rounded-[1.25rem] bg-base-200/70 p-4">
              仓库：{String(repository) || '未填写'}
            </div>
            <div className="rounded-[1.25rem] bg-base-200/70 p-4">
              负责人 / 评审人：{String(assignee) || '未填写'} / {String(reviewer) || '未填写'}
            </div>
            <div className="rounded-[1.25rem] bg-base-200/70 p-4">
              包含草稿：{includeDrafts ? '是' : '否'}
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
            Last submit
          </div>
          <pre className="mt-4 whitespace-pre-wrap break-words rounded-[1.25rem] bg-base-200/70 p-4 text-xs leading-6 text-base-content/80">
            {submitted.value}
          </pre>
        </div>
      </div>
    </div>
  )
}

const formApiRows: ApiRow[] = [
  {
    prop: 'form',
    description: '显式注入 Form 实例，在当前 Rue runtime 下这是最稳定的共享方式。',
    type: 'FormInstance',
    defaultValue: '-',
  },
  {
    prop: 'initialValues',
    description: '挂载时写入初始值；后续可通过实例方法重置回该快照。',
    type: 'Record<string, any>',
    defaultValue: '-',
  },
  {
    prop: 'layout',
    description: '设置整体布局，可选 horizontal、vertical、inline。',
    type: 'horizontal | vertical | inline',
    defaultValue: 'horizontal',
  },
  {
    prop: 'component',
    description: '指定根节点标签，默认渲染为 form。',
    type: 'string | false',
    defaultValue: 'form',
  },
  {
    prop: 'name',
    description: '设置 Form 名称，会参与字段 id 生成以及 scrollToField 定位。',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'validateMessages',
    description: '覆盖默认校验模板，适合做团队统一文案或本地化。',
    type: 'FormValidateMessages',
    defaultValue: '-',
  },
  {
    prop: 'validateTrigger',
    description: '全局校验触发时机，可由 Form.Item 单独覆盖。',
    type: 'string | string[]',
    defaultValue: 'onChange',
  },
  {
    prop: 'scrollToFirstError',
    description: '提交失败后滚动到第一个错误字段，适合长表单。',
    type: 'boolean | ScrollIntoViewOptions',
    defaultValue: 'false',
  },
  {
    prop: 'preserve',
    description: '字段卸载后是否保持值，常用于条件区域和分页表单。',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    prop: 'render',
    description: '通过 render(form) 直接拿到实例并组织表单内容。',
    type: '(form: FormInstance) => any',
    defaultValue: '-',
  },
  {
    prop: 'onValuesChange',
    description: '任意字段变化时触发，返回变更值和全量值。',
    type: '(changedValues, allValues) => void',
    defaultValue: '-',
  },
  {
    prop: 'onFinish / onFinishFailed',
    description: '提交成功或失败时触发，便于保存 payload 或回显错误摘要。',
    type: '(values) => void / (info) => void',
    defaultValue: '-',
  },
]

const formItemApiRows: ApiRow[] = [
  {
    prop: 'name',
    description: '字段路径，支持字符串或数组路径。',
    type: 'NamePath',
    defaultValue: '-',
  },
  {
    prop: 'label',
    description: '字段标签，水平布局下默认追加冒号。',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'rules',
    description: '声明式校验规则，支持 required、type、pattern、自定义 validator。',
    type: 'FormRule[]',
    defaultValue: '-',
  },
  {
    prop: 'render',
    description: '最推荐的字段渲染方式，可拿到 controlProps、meta 与 form。',
    type: '(controlProps, meta, form) => any',
    defaultValue: '-',
  },
  {
    prop: 'dependencies',
    description: '声明上游依赖字段，上游变化时会重新触发当前项校验。',
    type: 'NamePath[]',
    defaultValue: '-',
  },
  {
    prop: 'validateTrigger',
    description: '覆盖单字段校验时机，例如 onBlur。',
    type: 'string | string[]',
    defaultValue: 'onChange',
  },
  {
    prop: 'valuePropName',
    description: '把字段值映射到 checked 等非 value 属性，适合 Checkbox。',
    type: 'string',
    defaultValue: 'value',
  },
  {
    prop: 'getValueProps / normalize',
    description: '分别控制“store -> 控件”和“控件 -> store”的值转换。',
    type: 'function / function',
    defaultValue: '-',
  },
  {
    prop: 'extra / help',
    description: '额外说明和帮助信息；未显式传 help 时会展示校验消息。',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'messageVariables',
    description: '修改校验模板中的占位变量，适合自定义 label 文案。',
    type: 'Record<string, string>',
    defaultValue: '-',
  },
  {
    prop: 'hasFeedback',
    description: '显示校验状态反馈图标，通常与 Input 联用。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'shouldUpdate',
    description: '把 Item 作为 render consumer 使用，按条件响应全表单变化。',
    type: 'boolean | (prev, next) => boolean',
    defaultValue: '-',
  },
  {
    prop: 'noStyle',
    description: '只保持字段绑定能力，不输出额外布局壳层。',
    type: 'boolean',
    defaultValue: 'false',
  },
]

const listAndHookRows: ApiRow[] = [
  {
    prop: 'Form.List name',
    description: '声明数组字段路径，驱动动态条目渲染。',
    type: 'NamePath',
    defaultValue: '-',
  },
  {
    prop: 'Form.List render',
    description: 'render(fields, operation, meta) 返回列表 UI。',
    type: '(fields, operation, meta) => any',
    defaultValue: '-',
  },
  {
    prop: 'Form.List rules',
    description: '为整个列表声明规则，通常与 Form.ErrorList 一起使用。',
    type: 'FormRule[]',
    defaultValue: '-',
  },
  {
    prop: 'operation.add / remove / move',
    description: '列表操作对象，负责增删改顺序。',
    type: 'FormListOperation',
    defaultValue: '-',
  },
  {
    prop: 'Form.ErrorList',
    description: '渲染列表级错误与警告，适合最小数量、重复值等规则。',
    type: 'FC<FormErrorListProps>',
    defaultValue: '-',
  },
  {
    prop: 'Form.useForm()',
    description: '创建或复用显式实例，适合跨按钮、摘要卡片和表单主体共享。',
    type: '() => [FormInstance]',
    defaultValue: '-',
  },
  {
    prop: 'Form.useWatch(name, form)',
    description: '订阅某个字段并在当前组件内响应式读取它。',
    type: '(name, form?) => any',
    defaultValue: '-',
  },
  {
    prop: 'form.validateFields()',
    description: '在命令式流程中提前执行一次校验。',
    type: '() => Promise<any>',
    defaultValue: '-',
  },
  {
    prop: 'form.getFieldsError()',
    description: '读取当前错误和警告快照，适合摘要面板。',
    type: '() => FieldError[]',
    defaultValue: '-',
  },
  {
    prop: 'form.scrollToField(name)',
    description: '手动滚动到指定字段，适合长表单和分步表单。',
    type: '(name, options?) => void',
    defaultValue: '-',
  },
  {
    prop: 'form.submit()',
    description: '从外部按钮或命令式操作触发一次提交流程。',
    type: '() => void',
    defaultValue: '-',
  },
]

const usageCards = [
  {
    eyebrow: '先记住',
    title: '默认值放在 Form 上',
    description:
      '字段被 Form.Item 接管后会进入受控模式。需要初始值时，优先放到 initialValues，而不是给 Input 传 defaultValue。',
    items: [
      '单字段初始化优先级低于 Form initialValues',
      '动态列表默认值放到 Form 或 Form.List',
      'resetFields 会回到 initialValues 快照',
    ],
  },
  {
    eyebrow: '先记住',
    title: 'Checkbox 不是 value',
    description:
      'Checkbox、Toggle 这类组件的值语义不是 value，而是 checked。需要通过 valuePropName 切换绑定属性。',
    items: ['Checkbox / Switch 类组件使用 checked', '否则会出现“值变了但控件没联动”的错觉'],
  },
  {
    eyebrow: '先记住',
    title: 'dependencies 和 shouldUpdate 分工不同',
    description:
      'dependencies 更适合“某个字段依赖另一个字段重新校验”，shouldUpdate 更适合“根据整张表的值决定是否渲染一个区域”。',
    items: [
      '确认密码用 dependencies',
      '条件区域和 JSON 预览用 shouldUpdate',
      '不要在同一职责上混用两者',
    ],
  },
  {
    eyebrow: '先记住',
    title: '显式传 form 更稳定',
    description:
      'Rue 当前 runtime 下，推荐始终显式持有并传递 form 实例。页面级按钮、摘要卡片、提交动作也都围绕这一个实例展开。',
    items: [
      '优先 Form.useForm()',
      'render(form) 里把 form 可以传给 Item / List',
      '不要依赖隐式祖先解析',
    ],
  },
]

const faqCards = [
  {
    eyebrow: 'FAQ',
    title: '为什么推荐显式传 form？',
    description:
      '因为 Rue 当前 runtime 还不支持稳定地自动解析最近 Form 实例。显式传递是当前最稳的写法。',
  },
  {
    eyebrow: 'FAQ',
    title: '为什么 Checkbox 不跟值同步？',
    description:
      '大多数时候是忘了把 Form.Item 的 valuePropName 改成 checked。Form 默认只会往 value 上注入值。',
  },
  {
    eyebrow: 'FAQ',
    title: '为什么 defaultValue 不生效？',
    description:
      '字段一旦被 Form.Item 接管，就会进入受控模式。应改用 Form 的 initialValues，或者通过 setFieldsValue 更新。',
  },
  {
    eyebrow: 'FAQ',
    title: '为什么 Form.List 里的 Item initialValue 不推荐？',
    description: '动态列表的初始结构应放在 Form 或 Form.List 上，而不是子 Item 上。',
  },
  {
    eyebrow: 'FAQ',
    title: '什么时候用 getValueProps + normalize？',
    description:
      '当显示值和存储值不一致时，例如 #2048、百分比、单位后缀、kebab-case slug，推荐一进一出都显式写出来。',
  },
  {
    eyebrow: 'FAQ',
    title: 'scrollToFirstError 为什么可能失效？',
    description:
      '如果你包装了自定义控件，需要确保 Form 注入的 id 最终落到真实 DOM 输入节点上，否则无法精确定位。',
  },
]

const FormPage: FC = () => {
  const tabBasic = ref<PreviewTabMode>('preview')
  const tabInstance = ref<PreviewTabMode>('preview')
  const tabValidation = ref<PreviewTabMode>('preview')
  const tabNormalize = ref<PreviewTabMode>('preview')
  const tabConditional = ref<PreviewTabMode>('preview')
  const tabNoStyle = ref<PreviewTabMode>('preview')
  const tabList = ref<PreviewTabMode>('preview')
  const tabScroll = ref<PreviewTabMode>('preview')
  const tabInline = ref<PreviewTabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1 className="mt-4 mb-0 text-4xl font-semibold tracking-tight text-base-content">
          Form 表单
        </h1>
        <p className="mt-4 mb-0 max-w-3xl text-sm leading-7 text-base-content/72">
          这个页面不再只给你一个“能跑”的表单，而是把表单最关键的使用思路补进 Rue
          当前稳定实现：基础提交、命令式实例、跨字段依赖、条件区域、动态列表、搜索表单，以及它们背后的使用约束。
        </p>

        <h2>何时使用</h2>
        <ul>
          <li>
            需要把多个输入控件组织成一个稳定的提交单元，并统一收集 values、errors 和 touched 状态。
          </li>
          <li>需要显式拿到 form 实例，在按钮、摘要面板、列表操作和业务动作之间共享同一份状态。</li>
          <li>需要处理动态数组字段，例如成员名单、规则条目、白名单或批量配置项。</li>
        </ul>

        <section className="not-prose my-8 grid gap-4 lg:grid-cols-2">
          {usageCards.map(card => (
            <GuideCard
              key={card.title}
              eyebrow={card.eyebrow}
              title={card.title}
              description={card.description}
              items={card.items}
            />
          ))}
        </section>

        <div className="not-prose rounded-[1.5rem] border border-base-300 bg-base-100 p-6 text-sm leading-7 text-base-content/75 shadow-sm">
          当前 Rue runtime 下，推荐通过 <code>Form.useForm()</code> 或{' '}
          <code>{'render={form => <Form.Item form={form} name="title" />}'}</code> 显式持有并传递{' '}
          <code>form</code>。 下面所有示例
          都按这个稳定路径组织，不再依赖隐式祖先解析；你也会在示例里反复看到几条关键规则：
          `initialValues` 优先于子字段默认值，`Checkbox` 要切到 `checked` 语义，`dependencies` 和
          `shouldUpdate` 分工不同。
        </div>

        <PreviewBlock
          title="Basic submit and validation"
          summary="基础提交、规则校验与 Checkbox 的 checked 绑定。"
          tab={tabBasic}
          preview={() => <BasicSubmitShowcase />}
          code={`<Form
  initialValues={{
    profile: { name: 'Rue Design', email: 'team@rue.dev' },
    agree: true,
  }}
  onFinish={values => {
    console.log(values)
  }}
  onFinishFailed={info => {
    console.log(info.errorFields)
  }}
  render={form => (
    <>
      <Form.Item
        form={form}
        name={['profile', 'name']}
        label="名称"
        rules={[{ required: true }]}
        render={control => <Input {...control} />}
      />

      <Form.Item
        form={form}
        name={['profile', 'email']}
        label="邮箱"
        rules={[{ required: true }, { type: 'email' }]}
        render={control => <Input {...control} />}
      />

      <Form.Item
        form={form}
        name="agree"
        label="发布确认"
        valuePropName="checked"
        render={control => <Checkbox {...control}>允许直接覆盖 staging 配置</Checkbox>}
      />

      <Button color="primary" htmlType="submit">保存表单</Button>
    </>
  )}
/>
`}
        />

        <PreviewBlock
          title="Form instance and reactive summary"
          summary="用 Form.useForm 和 Form.useWatch 把同一个表单实例共享给按钮和摘要面板。"
          tab={tabInstance}
          preview={() => <InstanceMethodsShowcase />}
          code={`const InstanceMethodsShowcase: FC = () => {
  const [form] = Form.useForm()
  const role = Form.useWatch('role', form) ?? 'viewer'
  const region = Form.useWatch('region', form) ?? 'cn-hz'
  const notes = Form.useWatch('notes', form) ?? ''
  const activity = ref('等待实例方法操作。')

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <Form
        form={form}
        className="content-start gap-5 rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm lg:p-7"
        initialValues={{
          role: 'viewer',
          region: 'cn-hz',
          notes: '仅开放只读权限',
        }}
        scrollToFirstError={true}
        validateMessages={{
          required: '请填写 \${label}',
        }}
        onFinish={values => {
          activity.value = 'submit()\\n' + formatJson(values)
        }}
        onFinishFailed={info => {
          activity.value =
            'submit() failed\\n' +
            formatJson(
              info.errorFields.map(field => ({
                name: field.name.join('.'),
                errors: field.errors,
                warnings: field.warnings,
              })),
            )
        }}
        render={formInstance => (
          <>
            <div className="grid gap-5 md:grid-cols-2">
              <Form.Item
                form={formInstance}
                name="role"
                label="角色"
                rules={[
                  { required: true },
                  {
                    pattern: /^(viewer|editor|admin)$/,
                    message: '角色只能是 viewer、editor 或 admin',
                  },
                ]}
                hasFeedback={true}
                render={control => <Input {...control} placeholder="viewer / editor / admin" />}
              />

              <Form.Item
                form={formInstance}
                name="region"
                label="区域"
                rules={[
                  { required: true },
                  {
                    pattern: /^(cn|us|eu)-[a-z]+$/,
                    message: '区域格式示例：cn-hz、us-east、eu-west',
                  },
                ]}
                hasFeedback={true}
                render={control => <Input {...control} placeholder="cn-hz" />}
              />
            </div>

            <Form.Item
              form={formInstance}
              name="notes"
              label="交付备注"
              rules={[{ required: true }, { min: 6 }]}
              render={control => <Input {...control} placeholder="写入审批说明或 rollout 策略" />}
            />

            <div className="flex flex-wrap gap-3 pt-1">
              <Button
                size="sm"
                onClick={() => {
                  form.setFieldValue('role', 'editor')
                  activity.value = "setFieldValue('role', 'editor')"
                }}
              >
                设为 editor
              </Button>
              <Button
                size="sm"
                type="outlined"
                onClick={() => {
                  form.setFieldsValue({
                    region: 'us-east',
                    notes: '需要双人复核',
                  })
                  activity.value = 'setFieldsValue({ region: "us-east", notes: "需要双人复核" })'
                }}
              >
                填充预设
              </Button>
              <Button
                size="sm"
                type="outlined"
                onClick={() => {
                  form.setFieldsValue({
                    role: 'guest',
                    region: 'hangzhou',
                    notes: '',
                  })
                  activity.value = 'setFieldsValue({ role: "guest", region: "hangzhou", notes: "" })'
                }}
              >
                填入异常值
              </Button>
              <Button
                size="sm"
                type="text"
                onClick={() => {
                  form.resetFields()
                  activity.value = 'resetFields()'
                }}
              >
                恢复初始值
              </Button>
              <Button
                size="sm"
                color="primary"
                onClick={() => {
                  form.submit()
                }}
              >
                程序化提交
              </Button>
              <Button
                size="sm"
                type="outlined"
                onClick={() => {
                  void form
                    .validateFields()
                    .then(values => {
                      activity.value = 'validateFields()\\n' + formatJson(values)
                    })
                    .catch(info => {
                      activity.value = 'validateFields() failed\\n' + formatJson(info.errorFields)
                    })
                }}
              >
                validateFields
              </Button>
            </div>
          </>
        )}
      />

      <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm lg:p-7">
        <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
          Reactive summary
        </div>
        <p className="mt-3 mb-0 text-sm text-base-content/65">
          这里把表单实例方法和 Watch Hooks
          两类示例：同一个实例被按钮、摘要卡片和提交流程共享，字段变化会同步反映到右侧。
        </p>
        <div className="mt-4 grid gap-3">
          <div className="rounded-[1.25rem] bg-base-200/70 p-4 text-sm">
            <div className="text-xs uppercase tracking-[0.22em] text-base-content/45">role</div>
            <div className="mt-2 text-lg font-semibold text-base-content">{String(role)}</div>
          </div>
          <div className="rounded-[1.25rem] bg-base-200/70 p-4 text-sm">
            <div className="text-xs uppercase tracking-[0.22em] text-base-content/45">region</div>
            <div className="mt-2 text-lg font-semibold text-base-content">{String(region)}</div>
          </div>
          <div className="rounded-[1.25rem] bg-base-200/70 p-4 text-sm">
            <div className="text-xs uppercase tracking-[0.22em] text-base-content/45">notes</div>
            <div className="mt-2 text-sm leading-6 text-base-content/80">
              {String(notes) || '未填写'}
            </div>
          </div>
        </div>
        <pre className="mt-4 whitespace-pre-wrap break-words rounded-box bg-neutral text-neutral-content p-4 text-xs leading-6">
          {activity.value}
        </pre>
      </div>
    </div>
  )
}
`}
        />

        <PreviewBlock
          title="Validation timing and dependencies"
          summary="把 validateTrigger、dependencies 和 warningOnly 放进一个更贴近注册/发布配置场景的表单里。"
          tab={tabValidation}
          preview={() => <ValidationDependenciesShowcase />}
          code={`const [form] = Form.useForm()

<Form
  form={form}
  validateMessages={{ required: '请填写 \${label}' }}
  render={formInstance => (
    <>
      <Form.Item
        form={formInstance}
        name="password"
        label="密码"
        validateTrigger="onBlur"
        rules={[{ required: true }, { min: 8 }]}
        hasFeedback={true}
        render={control => <Input {...control} />}
      />

      <Form.Item
        form={formInstance}
        name="confirm"
        label="确认密码"
        dependencies={['password']}
        validateTrigger="onBlur"
        rules={[
          { required: true },
          {
            validator: (_rule, value, values) => {
              if (!value) return '请再次输入密码'
              if (value !== values.password) return '两次输入的密码不一致'
            },
          },
        ]}
        hasFeedback={true}
        render={control => <Input {...control} />}
      />

      <Form.Item
        form={formInstance}
        name="website"
        label="回调域名"
        rules={[{ warningOnly: true, pattern: /^https://.+/, message: '建议使用 https:// 前缀' }]}
        render={control => <Input {...control} />}
      />
    </>
  )}
/>
`}
        />

        <PreviewBlock
          title="Normalize and value mapping"
          summary="演示 getValueProps、normalize 和 messageVariables 在实际业务表单里的配合方式。"
          tab={tabNormalize}
          preview={() => <NormalizeValueShowcase />}
          code={`<Form.Item
  form={form}
  name="issueId"
  label="Issue 编号"
  getValueProps={value => ({ value: value ? '#' + String(value) : '' })}
  normalize={value => String(value ?? '').replace(/^#/, '').replace(/D/g, '').slice(0, 6)}
  render={control => <Input {...control} />}
/>

<Form.Item
  form={form}
  name="slug"
  label="发布 slug"
  normalize={value =>
    String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/--+/g, '-')
  }
  rules={[{ required: true }, { pattern: /^[a-z0-9-]+$/ }]}
  render={control => <Input {...control} />}
/>

<Form.Item
  form={form}
  name="branch"
  label="目标分支"
  messageVariables={{ label: '目标分支' }}
  rules={[{ pattern: /^(main|release/[a-z0-9-]+)$/i, message: '\${label} 需为 main 或 release/*' }]}
  render={control => <Input {...control} />}
/>
`}
        />

        <PreviewBlock
          title="Conditional fields with shouldUpdate"
          summary="用 shouldUpdate 按需挂载额外区域，而不是让每个字段都承担条件渲染职责。"
          tab={tabConditional}
          preview={() => <ConditionalFieldsShowcase />}
          code={`<Form.Item
  shouldUpdate={(prev, next) => {
    return prev.enableCanary !== next.enableCanary || prev.publishMode !== next.publishMode
  }}
>
  {(allValues) =>
    allValues.enableCanary ? (
      <div>
        <Form.Item form={form} name="batchSize" label="首批流量" render={control => <Input {...control} />} />
        <Form.Item form={form} name="approveBy" label="审批人" render={control => <Input {...control} />} />
      </div>
    ) : (
      <div>未开启灰度发布，额外字段不会挂载。</div>
    )
  }
</Form.Item>
`}
        />

        <PreviewBlock
          title="Composite controls with noStyle"
          summary="一个视觉行里组合多个字段时，用外层 Item 负责排版，内部 noStyle Item 只做字段绑定。"
          tab={tabNoStyle}
          preview={() => <CompositeNoStyleShowcase />}
          code={`const [form] = Form.useForm()

<Form form={form} render={formInstance => (
  <>
    <div className="grid gap-3">
      <div>回调地址</div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <span>https://</span>
        <Form.Item
          form={formInstance}
          name="host"
          noStyle
          render={control => (
            <div className="min-w-0">
              <Input {...control} />
            </div>
          )}
        />
        <span>:443</span>
      </div>
    </div>

    <div className="grid gap-3">
      <div>资源路径</div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <span>/hooks/</span>
        <Form.Item
          form={formInstance}
          name="path"
          noStyle
          render={control => (
            <div className="min-w-0">
              <Input {...control} />
            </div>
          )}
        />
        <span>POST target</span>
      </div>
    </div>
  </>
)} />
`}
        />

        <PreviewBlock
          title="Dynamic list"
          summary="用 Form.List 组织动态数组字段，并补上列表级规则、重排操作和 ErrorList。"
          tab={tabList}
          preview={() => <DynamicListShowcase />}
          code={`const DynamicListShowcase: FC = () => {
  const [form] = Form.useForm()
  const members =
    (Form.useWatch('members', form) as Array<{ name?: string; role?: string }> | undefined) ?? []

  return (
    <div className="grid gap-6">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <Form
          form={form}
          className="content-start gap-5 rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm lg:p-7"
          initialValues={{
            members: [
              { name: 'Rue', role: 'Owner' },
              { name: 'Vapor', role: 'Reviewer' },
            ],
          }}
          render={formInstance => (
            <Form.List
              form={formInstance}
              name="members"
              rules={[
                {
                  validator: (_rule, value) => {
                    if (!Array.isArray(value) || value.length < 2) {
                      return '至少保持 2 名审批成员，才适合真实协作流程。'
                    }
                    return undefined
                  },
                },
              ]}
              render={(fields, operation, meta) => (
                <div className="grid gap-4">
                  {fields.length === 0 ? (
                    <div className="rounded-[1.25rem] border border-dashed border-base-300 bg-base-200/40 p-4 text-sm text-base-content/60">
                      暂无成员，点击下方按钮即可追加一组字段。
                    </div>
                  ) : null}

                  {fields.map((field, index) => (
                    <div
                      key={field.key}
                      className="rounded-[1.25rem] border border-base-300 bg-base-50/60 p-4 lg:p-5"
                    >
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
                            Member {index + 1}
                          </div>
                          <div className="mt-1 text-sm font-medium text-base-content">
                            审批成员 {index + 1}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {index > 0 ? (
                            <Button
                              size="sm"
                              type="outlined"
                              onClick={() => operation.move(field.name, field.name - 1)}
                            >
                              上移
                            </Button>
                          ) : null}
                          {index < fields.length - 1 ? (
                            <Button
                              size="sm"
                              type="outlined"
                              onClick={() => operation.move(field.name, field.name + 1)}
                            >
                              下移
                            </Button>
                          ) : null}
                          <Button size="sm" type="text" onClick={() => operation.remove(field.name)}>
                            删除
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Form.Item
                          form={formInstance}
                          layout="vertical"
                          name={['members', field.name, 'name']}
                          label="成员名称"
                          rules={[{ required: true }]}
                          render={control => <Input {...control} placeholder="输入成员名称" />}
                        />
                        <Form.Item
                          form={formInstance}
                          layout="vertical"
                          name={['members', field.name, 'role']}
                          label="职责"
                          rules={[{ required: true }]}
                          render={control => (
                            <Input {...control} placeholder="Owner / Reviewer / QA" />
                          )}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-3 pt-1">
                    <Button
                      size="sm"
                      color="primary"
                      onClick={() => {
                        operation.add({ name: '新成员 ' + String(fields.length + 1), role: 'QA' })
                      }}
                    >
                      新增成员
                    </Button>
                    <Button
                      size="sm"
                      type="outlined"
                      onClick={() => operation.add({ name: 'Head reviewer', role: 'QA' }, 0)}
                    >
                      头部插入
                    </Button>
                  </div>

                  {meta.errors.length > 0 || meta.warnings.length > 0 ? (
                    <Form.ErrorList
                      errors={meta.errors}
                      warnings={meta.warnings}
                      className="rounded-[1.25rem] border border-error/15 bg-error/5 p-4 text-sm"
                    />
                  ) : null}
                </div>
              )}
            />
          )}
        />

        <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm lg:p-7">
          <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
            List snapshot
          </div>
          <div className="mt-3 inline-flex rounded-full bg-base-200 px-3 py-1 text-xs font-medium text-base-content/65">
            {members.length} members
          </div>
          <div className="mt-4 grid gap-3">
            {members.length > 0 ? (
              members.map((member, index) => (
                <div
                  key={String(index)}
                  className="rounded-[1.25rem] bg-base-200/70 p-4 text-sm text-base-content/80"
                >
                  <div className="text-xs uppercase tracking-[0.22em] text-base-content/45">
                    成员 {index + 1}
                  </div>
                  <div className="mt-2 text-base font-medium text-base-content">
                    {member?.name ? String(member.name) : '未命名成员'}
                  </div>
                  <div className="mt-1 text-xs text-base-content/55">
                    {member?.role ? String(member.role) : '未分配职责'}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.25rem] bg-base-200/70 p-4 text-sm text-base-content/60">
                当前列表为空。
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm lg:p-7">
        <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
          List behavior
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.25rem] bg-base-200/70 p-4">
            <div className="text-sm font-semibold text-base-content">列表级规则</div>
            <p className="mt-2 mb-0 text-sm leading-6 text-base-content/65">
              rules 挂在 Form.List 上，校验整个 members 数组。
            </p>
          </div>
          <div className="rounded-[1.25rem] bg-base-200/70 p-4">
            <div className="text-sm font-semibold text-base-content">重排操作</div>
            <p className="mt-2 mb-0 text-sm leading-6 text-base-content/65">
              operation.move 保持字段状态跟随成员顺序移动。
            </p>
          </div>
          <div className="rounded-[1.25rem] bg-base-200/70 p-4">
            <div className="text-sm font-semibold text-base-content">错误出口</div>
            <p className="mt-2 mb-0 text-sm leading-6 text-base-content/65">
              Form.ErrorList 只展示列表自身的错误，不和单个字段提示混在一起。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
`}
        />

        <PreviewBlock
          title="Long form scrolling"
          summary="在可滚动长表单里同时展示 scrollToField 和 scrollToFirstError 的定位行为。"
          tab={tabScroll}
          preview={() => <LongFormScrollShowcase />}
          code={`const LongFormScrollShowcase: FC = () => {
  const [form] = Form.useForm()
  const activity = ref(
    '点击左侧按钮可调用 scrollToField；提交时会用 scrollToFirstError 自动滚到首个错误字段。',
  )

  const jumpToField = (name: string | Array<string | number>, label: string) => {
    form.scrollToField(name, { block: 'center', focus: true })
    activity.value = \`scrollToField -> \${label}\`
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
          Scroll actions
        </div>
        <p className="mt-3 mb-0 text-sm text-base-content/65">
          这个示例把手动 scrollToField
          和提交失败自动滚动放进同一个长表单容器里，方便直接比较两种行为。
        </p>
        <div className="mt-4 grid gap-2">
          <Button size="sm" onClick={() => jumpToField('releaseName', '发布名称')}>
            滚到发布名称
          </Button>
          <Button
            size="sm"
            type="outlined"
            onClick={() => jumpToField(['strategy', 'batchSize'], '灰度批次')}
          >
            滚到灰度批次
          </Button>
          <Button
            size="sm"
            type="outlined"
            onClick={() => jumpToField(['observability', 'dashboard'], '监控看板')}
          >
            滚到监控看板
          </Button>
          <Button
            size="sm"
            type="outlined"
            onClick={() => jumpToField(['rollback', 'ticket'], '回滚单号')}
          >
            滚到回滚单号
          </Button>
        </div>
        <pre className="mt-4 whitespace-pre-wrap break-words rounded-[1.25rem] bg-neutral p-4 text-xs leading-6 text-neutral-content">
          {activity.value}
        </pre>
      </div>

      <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-4 shadow-sm lg:p-5">
        <div
          className="overflow-y-auto overscroll-contain pr-2"
          style={{
            height: 'min(34rem, 72vh)',
            scrollBehavior: 'smooth',
            scrollbarGutter: 'stable',
          }}
        >
          <Form
            form={form}
            name="advanced-scroll-demo"
            className="pb-4"
            scrollToFirstError={{ block: 'center', focus: true }}
            initialValues={{
              application: 'rue-design',
              environment: 'staging',
              strategy: { batchSize: '10%', pauseWindow: '15m' },
              observability: { dashboard: '' },
            }}
            onFinish={values => {
              activity.value = '提交成功\\n' + formatJson(values)
            }}
            onFinishFailed={info => {
              activity.value =
                '校验失败，已定位到首个错误字段\\n' +
                formatJson({
                  firstError: info.errorFields[0]?.name.join('.'),
                  errorFields: info.errorFields,
                })
            }}
            render={formInstance => (
              <>
                <section className="rounded-[1.25rem] border border-base-300 bg-base-50/50 p-5 lg:p-6">
                  <div className="mb-4">
                    <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
                      Section 1
                    </div>
                    <div className="mt-1 text-lg font-semibold text-base-content">基础信息</div>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Form.Item
                      form={formInstance}
                      name="releaseName"
                      label="发布名称"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="2026.05 release" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name="application"
                      label="应用名"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="rue-design" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name="environment"
                      label="环境"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="staging" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name="owner"
                      label="发布负责人"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="release-captain" />}
                    />
                  </div>
                </section>

                <section className="rounded-[1.25rem] border border-base-300 bg-base-50/50 p-5 lg:p-6">
                  <div className="mb-4">
                    <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
                      Section 2
                    </div>
                    <div className="mt-1 text-lg font-semibold text-base-content">发布策略</div>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Form.Item
                      form={formInstance}
                      name={['strategy', 'batchSize']}
                      label="灰度批次"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="10%" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name={['strategy', 'pauseWindow']}
                      label="观察窗口"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="15m" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name={['strategy', 'rollbackThreshold']}
                      label="回滚阈值"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="error rate > 2%" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name={['strategy', 'approvalWindow']}
                      label="审批窗口"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="30m" />}
                    />
                  </div>
                </section>

                <section className="rounded-[1.25rem] border border-base-300 bg-base-50/50 p-5 lg:p-6">
                  <div className="mb-4">
                    <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
                      Section 3
                    </div>
                    <div className="mt-1 text-lg font-semibold text-base-content">观测与审批</div>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Form.Item
                      form={formInstance}
                      name={['observability', 'dashboard']}
                      label="监控看板"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="Grafana release board" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name={['observability', 'alertChannel']}
                      label="告警通道"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="#release-alerts" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name={['approval', 'owner']}
                      label="审批负责人"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="ops-squad" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name={['approval', 'qaOwner']}
                      label="QA 负责人"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="qa-squad" />}
                    />
                  </div>
                </section>

                <section className="rounded-[1.25rem] border border-base-300 bg-base-50/50 p-5 lg:p-6">
                  <div className="mb-4">
                    <div className="text-xs font-medium uppercase tracking-[0.22em] text-base-content/45">
                      Section 4
                    </div>
                    <div className="mt-1 text-lg font-semibold text-base-content">回滚预案</div>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Form.Item
                      form={formInstance}
                      name={['rollback', 'ticket']}
                      label="回滚单号"
                      rules={[{ required: true }]}
                      extra="这里故意放在长表单靠后的位置，方便观察 scrollToFirstError。"
                      render={control => <Input {...control} placeholder="RB-2026-0514" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name={['rollback', 'owner']}
                      label="回滚负责人"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="rollback-owner" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name={['rollback', 'window']}
                      label="回滚窗口"
                      rules={[{ required: true }]}
                      render={control => <Input {...control} placeholder="20m" />}
                    />
                    <Form.Item
                      form={formInstance}
                      name={['rollback', 'watchers']}
                      label="通知对象"
                      rules={[{ required: true }]}
                      render={control => (
                        <Input {...control} placeholder="platform / qa / support" />
                      )}
                    />
                  </div>
                </section>

                <div className="sticky bottom-0 rounded-[1.25rem] border border-base-300 bg-base-100/95 p-4 shadow-sm backdrop-blur">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-base-content/65">
                      留空深层字段后点击提交，会自动滚到首个错误项。
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="outlined"
                        onClick={() => jumpToField(['rollback', 'ticket'], '回滚单号')}
                      >
                        滚到回滚单号
                      </Button>
                      <Button color="primary" htmlType="submit">
                        提交长表单
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          />
        </div>
      </div>
    </div>
  )
}
`}
        />

        <PreviewBlock
          title="Advanced search"
          summary="把高级搜索表单整理成 Rue 实现：网格字段、独立按钮区、统一实例驱动。"
          tab={tabInline}
          preview={() => <InlineFiltersShowcase />}
          code={`const [form] = Form.useForm()

<Form
  form={form}
  initialValues={{
    keyword: 'runtime vapor',
    repository: 'rue-design',
    assignee: 'design',
    reviewer: 'infra',
    includeDrafts: false,
  }}
  onFinish={values => {
    console.log(values)
  }}
  render={formInstance => (
    <>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Form.Item form={formInstance} layout="vertical" name="keyword" label="关键词" render={control => <Input {...control} />} />
        <Form.Item form={formInstance} layout="vertical" name="repository" label="仓库" render={control => <Input {...control} />} />
        <Form.Item form={formInstance} layout="vertical" name="assignee" label="负责人" render={control => <Input {...control} />} />
        <Form.Item form={formInstance} layout="vertical" name="reviewer" label="评审人" render={control => <Input {...control} />} />
      </div>

      <Form.Item form={formInstance} name="includeDrafts" valuePropName="checked" render={control => <Checkbox {...control}>包含草稿和实验分支</Checkbox>} />

      <Button color="primary" htmlType="submit">执行搜索</Button>
      <Button type="outlined" onClick={() => form.resetFields()}>清空条件</Button>
    </>
  )}
/>
`}
        />

        <h2>使用说明</h2>
        <p>
          下面这些说明不是泛泛而谈，而是把表单里最容易踩坑、同时又和 Rue
          当前组件强相关的部分抽出来。先看这些规则，再回头看上面的示例，理解会快很多。
        </p>

        <section className="not-prose my-8 grid gap-4 lg:grid-cols-2">
          {faqCards.map(card => (
            <GuideCard
              key={card.title}
              eyebrow={card.eyebrow}
              title={card.title}
              description={card.description}
            />
          ))}
        </section>

        <h2 id="form-api">API</h2>
        <p>
          Form 当前推荐的心智模型仍然是显式实例驱动：页面或业务组件持有实例，Form
          负责布局与校验，Item / List 通过同一实例绑定字段。下表只列出 Rue
          当前最稳定、最值得依赖的那一层 API。
        </p>

        <ApiTable title="Form" rows={formApiRows} />
        <ApiTable title="Form.Item" rows={formItemApiRows} />
        <ApiTable title="Form.List and Hooks" rows={listAndHookRows} />
      </div>
    </SidebarPlayground>
  )
}

export default FormPage
