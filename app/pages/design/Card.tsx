import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Badge, Button, Card, Tabs } from '@rue-js/design'

const CardDemo: FC = () => {
  const tabBasic = ref<'preview' | 'code'>('preview')
  const tabPricing = ref<'preview' | 'code'>('preview')
  const tabSizes = ref<'preview' | 'code'>('preview')
  const tabBorder = ref<'preview' | 'code'>('preview')
  const tabDash = ref<'preview' | 'code'>('preview')
  const tabBadge = ref<'preview' | 'code'>('preview')
  const tabBottomImage = ref<'preview' | 'code'>('preview')
  const tabCentered = ref<'preview' | 'code'>('preview')
  const tabImageOverlay = ref<'preview' | 'code'>('preview')
  const tabNoImage = ref<'preview' | 'code'>('preview')
  const tabCustomColor = ref<'preview' | 'code'>('preview')
  const tabNeutralCentered = ref<'preview' | 'code'>('preview')
  const tabActionTop = ref<'preview' | 'code'>('preview')
  const tabSideImage = ref<'preview' | 'code'>('preview')
  const tabResponsiveSide = ref<'preview' | 'code'>('preview')
  const tabCompound = ref<'preview' | 'code'>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Card 卡片</h1>
        <p className="text-sm mt-3 mb-3">卡片用于以易读的方式分组和展示内容。</p>
        <div className="text-sm">
          <a href="https://daisyui.com/components/card/" target="_blank">
            查看 Card 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Card</h2>
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
            <Card className="w-96 bg-base-100 shadow-sm">
              <figure>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp"
                  alt="Shoes"
                />
              </figure>
              <div className="card-body">
                <h2 className="card-title">Card Title</h2>
                <p className="text-sm mt-3 mb-3">
                  A card component has a figure, a body part, and inside body there are title and
                  actions parts
                </p>
                <div className="justify-end card-actions">
                  <Button variant="primary">Buy Now</Button>
                </div>
              </div>
            </Card>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Card, Button } from '@rue-js/design';
<Card className="bg-base-100 w-96 shadow-sm">
  <figure>
    <img src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp" alt="Shoes" />
  </figure>
  <div className="card-body">
    <h2 className="card-title">Card Title</h2>
    <p className="text-sm mt-3 mb-3">A card component has a figure, a body part, and inside body there are title and actions parts</p>
    <div className="card-actions justify-end">
      <Button variant="primary">Buy Now</Button>
    </div>
  </div>
</Card>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 使用复合子组件（Card.Body/Title/Actions/Figure）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabCompound.value}
            onChange={k => (tabCompound.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabCompound.value === 'preview' ? (
            <Card className="w-96 bg-base-100 shadow-sm">
              <Card.Figure>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp"
                  alt="Shoes"
                />
              </Card.Figure>
              <Card.Body>
                <Card.Title>Card Title</Card.Title>
                <p className="text-sm mt-3 mb-3">
                  A card component has a figure, a body part, and inside body there are title and
                  actions parts
                </p>
                <Card.Actions className="justify-end">
                  <Button variant="primary">Buy Now</Button>
                </Card.Actions>
              </Card.Body>
            </Card>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Card, Button } from '@rue-js/design';
<Card className="w-96 bg-base-100 shadow-sm">
  <Card.Figure>
    <img src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp" alt="Shoes" />
  </Card.Figure>
  <Card.Body>
    <Card.Title>Card Title</Card.Title>
    <p className="text-sm mt-3 mb-3">A card component has a figure, a body part, and inside body there are title and actions parts</p>
    <Card.Actions className="justify-end">
      <Button variant="primary">Buy Now</Button>
    </Card.Actions>
  </Card.Body>
</Card>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Pricing Card
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabPricing.value}
            onChange={k => (tabPricing.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabPricing.value === 'preview' ? (
            <Card className="w-96 bg-base-100 shadow-sm">
              <div className="card-body">
                <span className="badge badge-xs badge-warning">Most Popular</span>
                <div className="flex justify-between">
                  <h2 className="text-3xl font-bold">Premium</h2>
                  <span className="text-xl">$29/mo</span>
                </div>
                <ul className="mt-6 flex flex-col gap-2 text-xs">
                  <li>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="size-4 me-2 inline-block text-success"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>High-resolution image generation</span>
                  </li>
                  <li>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="size-4 me-2 inline-block text-success"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Customizable style templates</span>
                  </li>
                  <li>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="size-4 me-2 inline-block text-success"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Batch processing capabilities</span>
                  </li>
                  <li>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="size-4 me-2 inline-block text-success"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>AI-driven image enhancements</span>
                  </li>
                  <li className="opacity-50">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="size-4 me-2 inline-block text-base-content/50"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="line-through">Seamless cloud integration</span>
                  </li>
                  <li className="opacity-50">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="size-4 me-2 inline-block text-base-content/50"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="line-through">Real-time collaboration tools</span>
                  </li>
                </ul>
                <div className="mt-6">
                  <Button variant="primary" block>
                    Subscribe
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Card className="w-96 bg-base-100 shadow-sm">
  <div className="card-body">
    <span className="badge badge-xs badge-warning">Most Popular</span>
    <div className="flex justify-between">
      <h2 className="text-3xl font-bold">Premium</h2>
      <span className="text-xl">$29/mo</span>
    </div>
    <ul className="mt-6 flex flex-col gap-2 text-xs">
      <li><svg xmlns="http://www.w3.org/2000/svg" className="size-4 me-2 inline-block text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg><span>High-resolution image generation</span></li>
      <li><svg xmlns="http://www.w3.org/2000/svg" className="size-4 me-2 inline-block text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg><span>Customizable style templates</span></li>
      <li><svg xmlns="http://www.w3.org/2000/svg" className="size-4 me-2 inline-block text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg><span>Batch processing capabilities</span></li>
      <li><svg xmlns="http://www.w3.org/2000/svg" className="size-4 me-2 inline-block text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg><span>AI-driven image enhancements</span></li>
      <li className="opacity-50"><svg xmlns="http://www.w3.org/2000/svg" className="size-4 me-2 inline-block text-base-content/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg><span className="line-through">Seamless cloud integration</span></li>
      <li className="opacity-50"><svg xmlns="http://www.w3.org/2000/svg" className="size-4 me-2 inline-block text-base-content/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg><span className="line-through">Real-time collaboration tools</span></li>
    </ul>
    <div className="mt-6">
      <Button variant="primary" block>Subscribe</Button>
    </div>
  </div>
</Card>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Card sizes</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabSizes.value}
            onChange={k => (tabSizes.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabSizes.value === 'preview' ? (
            <div className="grid gap-6">
              <Card size="xs" className="w-96 bg-base-100 shadow-sm">
                <div className="card-body">
                  <h2 className="card-title">Xsmall Card</h2>
                  <p className="text-sm mt-3 mb-3">
                    A card component has a figure, a body part, and inside body there are title and
                    actions parts
                  </p>
                  <div className="justify-end card-actions">
                    <Button variant="primary">Buy Now</Button>
                  </div>
                </div>
              </Card>
              <Card size="sm" className="w-96 bg-base-100 shadow-sm">
                <div className="card-body">
                  <h2 className="card-title">Small Card</h2>
                  <p className="text-sm mt-3 mb-3">
                    A card component has a figure, a body part, and inside body there are title and
                    actions parts
                  </p>
                  <div className="justify-end card-actions">
                    <Button variant="primary">Buy Now</Button>
                  </div>
                </div>
              </Card>
              <Card size="md" className="w-96 bg-base-100 shadow-sm">
                <div className="card-body">
                  <h2 className="card-title">Medium Card</h2>
                  <p className="text-sm mt-3 mb-3">
                    A card component has a figure, a body part, and inside body there are title and
                    actions parts
                  </p>
                  <div className="justify-end card-actions">
                    <Button variant="primary">Buy Now</Button>
                  </div>
                </div>
              </Card>
              <Card size="lg" className="w-96 bg-base-100 shadow-sm">
                <div className="card-body">
                  <h2 className="card-title">Large Card</h2>
                  <p className="text-sm mt-3 mb-3">
                    A card component has a figure, a body part, and inside body there are title and
                    actions parts
                  </p>
                  <div className="justify-end card-actions">
                    <Button variant="primary">Buy Now</Button>
                  </div>
                </div>
              </Card>
              <Card size="xl" className="w-96 bg-base-100 shadow-sm">
                <div className="card-body">
                  <h2 className="card-title">Xlarge Card</h2>
                  <p className="text-sm mt-3 mb-3">
                    A card component has a figure, a body part, and inside body there are title and
                    actions parts
                  </p>
                  <div className="justify-end card-actions">
                    <Button variant="primary">Buy Now</Button>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Card size="xs" className="w-96 bg-base-100 shadow-sm"><div className="card-body"><h2 className="card-title">Xsmall Card</h2><p className="text-sm mt-3 mb-3">A card component has a figure, a body part, and inside body there are title and actions parts</p><div className="card-actions justify-end"><Button variant="primary">Buy Now</Button></div></div></Card>
<Card size="sm" className="w-96 bg-base-100 shadow-sm"><div className="card-body"><h2 className="card-title">Small Card</h2><p className="text-sm mt-3 mb-3">A card component has a figure, a body part, and inside body there are title and actions parts</p><div className="card-actions justify-end"><Button variant="primary">Buy Now</Button></div></div></Card>
<Card size="md" className="w-96 bg-base-100 shadow-sm"><div className="card-body"><h2 className="card-title">Medium Card</h2><p className="text-sm mt-3 mb-3">A card component has a figure, a body part, and inside body there are title and actions parts</p><div className="card-actions justify-end"><Button variant="primary">Buy Now</Button></div></div></Card>
<Card size="lg" className="w-96 bg-base-100 shadow-sm"><div className="card-body"><h2 className="card-title">Large Card</h2><p className="text-sm mt-3 mb-3">A card component has a figure, a body part, and inside body there are title and actions parts</p><div className="card-actions justify-end"><Button variant="primary">Buy Now</Button></div></div></Card>
<Card size="xl" className="w-96 bg-base-100 shadow-sm"><div className="card-body"><h2 className="card-title">Xlarge Card</h2><p className="text-sm mt-3 mb-3">A card component has a figure, a body part, and inside body there are title and actions parts</p><div className="card-actions justify-end"><Button variant="primary">Buy Now</Button></div></div></Card>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Card with a card-border
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabBorder.value}
            onChange={k => (tabBorder.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabBorder.value === 'preview' ? (
            <Card border className="w-96 bg-base-100">
              <div className="card-body">
                <h2 className="card-title">Card Title</h2>
                <p className="text-sm mt-3 mb-3">
                  A card component has a figure, a body part, and inside body there are title and
                  actions parts
                </p>
                <div className="justify-end card-actions">
                  <Button variant="primary">Buy Now</Button>
                </div>
              </div>
            </Card>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Card border className="bg-base-100 w-96">
  <div className="card-body">
    <h2 className="card-title">Card Title</h2>
    <p className="text-sm mt-3 mb-3">A card component has a figure, a body part, and inside body there are title and actions parts</p>
    <div className="card-actions justify-end"><Button variant="primary">Buy Now</Button></div>
  </div>
</Card>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Card with a dash border
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabDash.value}
            onChange={k => (tabDash.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabDash.value === 'preview' ? (
            <Card dash className="w-96 bg-base-100">
              <div className="card-body">
                <h2 className="card-title">Card Title</h2>
                <p className="text-sm mt-3 mb-3">
                  A card component has a figure, a body part, and inside body there are title and
                  actions parts
                </p>
                <div className="justify-end card-actions">
                  <Button variant="primary">Buy Now</Button>
                </div>
              </div>
            </Card>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Card dash className="bg-base-100 w-96">
  <div className="card-body">
    <h2 className="card-title">Card Title</h2>
    <p className="text-sm mt-3 mb-3">A card component has a figure, a body part, and inside body there are title and actions parts</p>
    <div className="card-actions justify-end"><Button variant="primary">Buy Now</Button></div>
  </div>
</Card>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Card with badge
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabBadge.value}
            onChange={k => (tabBadge.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabBadge.value === 'preview' ? (
            <Card className="w-96 bg-base-100 shadow-sm">
              <figure>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp"
                  alt="Shoes"
                />
              </figure>
              <div className="card-body">
                <h2 className="card-title">
                  Card Title <Badge variant="secondary">NEW</Badge>
                </h2>
                <p className="text-sm mt-3 mb-3">
                  A card component has a figure, a body part, and inside body there are title and
                  actions parts
                </p>
                <div className="justify-end card-actions">
                  <Badge outline>Fashion</Badge>
                  <Badge outline>Products</Badge>
                </div>
              </div>
            </Card>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Card className="bg-base-100 w-96 shadow-sm">
  <figure><img src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp" alt="Shoes" /></figure>
  <div className="card-body">
    <h2 className="card-title">Card Title <div className="badge badge-secondary">NEW</div></h2>
    <p className="text-sm mt-3 mb-3">A card component has a figure, a body part, and inside body there are title and actions parts</p>
    <div className="card-actions justify-end">
      <div className="badge badge-outline">Fashion</div>
      <div className="badge badge-outline">Products</div>
    </div>
  </div>
</Card>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Card with bottom image
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabBottomImage.value}
            onChange={k => (tabBottomImage.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabBottomImage.value === 'preview' ? (
            <Card className="w-96 bg-base-100 shadow-sm">
              <div className="card-body">
                <h2 className="card-title">Card Title</h2>
                <p className="text-sm mt-3 mb-3">
                  A card component has a figure, a body part, and inside body there are title and
                  actions parts
                </p>
              </div>
              <figure>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp"
                  alt="Shoes"
                />
              </figure>
            </Card>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Card className="bg-base-100 w-96 shadow-sm">
  <div className="card-body">
    <h2 className="card-title">Card Title</h2>
    <p className="text-sm mt-3 mb-3">A card component has a figure, a body part, and inside body there are title and actions parts</p>
  </div>
  <figure><img src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp" alt="Shoes" /></figure>
</Card>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Card with centered content and paddings
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabCentered.value}
            onChange={k => (tabCentered.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabCentered.value === 'preview' ? (
            <Card className="w-96 bg-base-100 shadow-sm">
              <figure className="px-10 pt-10">
                <img
                  src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp"
                  alt="Shoes"
                  className="rounded-box"
                />
              </figure>
              <div className="card-body items-center text-center">
                <h2 className="card-title">Card Title</h2>
                <p className="text-sm mt-3 mb-3">
                  A card component has a figure, a body part, and inside body there are title and
                  actions parts
                </p>
                <div className="card-actions">
                  <Button variant="primary">Buy Now</Button>
                </div>
              </div>
            </Card>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Card className="bg-base-100 w-96 shadow-sm">
  <figure className="px-10 pt-10">
    <img src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp" alt="Shoes" className="rounded-xl" />
  </figure>
  <div className="card-body items-center text-center">
    <h2 className="card-title">Card Title</h2>
    <p className="text-sm mt-3 mb-3">A card component has a figure, a body part, and inside body there are title and actions parts</p>
    <div className="card-actions">
      <Button variant="primary">Buy Now</Button>
    </div>
  </div>
</Card>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Card with image overlay
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabImageOverlay.value}
            onChange={k => (tabImageOverlay.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabImageOverlay.value === 'preview' ? (
            <Card imageFull className="w-96 bg-base-100 shadow-sm">
              <figure>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp"
                  alt="Shoes"
                />
              </figure>
              <div className="card-body">
                <h2 className="card-title">Card Title</h2>
                <p className="text-sm mt-3 mb-3">
                  A card component has a figure, a body part, and inside body there are title and
                  actions parts
                </p>
                <div className="justify-end card-actions">
                  <Button variant="primary">Buy Now</Button>
                </div>
              </div>
            </Card>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Card imageFull className="bg-base-100 w-96 shadow-sm">
  <figure><img src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp" alt="Shoes" /></figure>
  <div className="card-body">
    <h2 className="card-title">Card Title</h2>
    <p className="text-sm mt-3 mb-3">A card component has a figure, a body part, and inside body there are title and actions parts</p>
    <div className="card-actions justify-end"><Button variant="primary">Buy Now</Button></div>
  </div>
</Card>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Card with no image
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabNoImage.value}
            onChange={k => (tabNoImage.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabNoImage.value === 'preview' ? (
            <Card className="w-96 bg-base-100 shadow-sm">
              <div className="card-body">
                <h2 className="card-title">Card title!</h2>
                <p className="text-sm mt-3 mb-3">
                  A card component has a figure, a body part, and inside body there are title and
                  actions parts
                </p>
                <div className="justify-end card-actions">
                  <Button variant="primary">Buy Now</Button>
                </div>
              </div>
            </Card>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Card className="bg-base-100 w-96 shadow-sm">
  <div className="card-body">
    <h2 className="card-title">Card title!</h2>
    <p className="text-sm mt-3 mb-3">A card component has a figure, a body part, and inside body there are title and actions parts</p>
    <div className="card-actions justify-end"><Button variant="primary">Buy Now</Button></div>
  </div>
</Card>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Card with custom color
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabCustomColor.value}
            onChange={k => (tabCustomColor.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabCustomColor.value === 'preview' ? (
            <Card className="w-96 bg-primary text-primary-content">
              <div className="card-body">
                <h2 className="card-title">Card title!</h2>
                <p className="text-sm mt-3 mb-3">
                  A card component has a figure, a body part, and inside body there are title and
                  actions parts
                </p>
                <div className="justify-end card-actions">
                  <Button>Buy Now</Button>
                </div>
              </div>
            </Card>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Card className="bg-primary text-primary-content w-96">
  <div className="card-body">
    <h2 className="card-title">Card title!</h2>
    <p className="text-sm mt-3 mb-3">A card component has a figure, a body part, and inside body there are title and actions parts</p>
    <div className="card-actions justify-end"><Button>Buy Now</Button></div>
  </div>
</Card>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Centered card with neutral color
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabNeutralCentered.value}
            onChange={k => (tabNeutralCentered.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabNeutralCentered.value === 'preview' ? (
            <Card className="w-96 bg-neutral text-neutral-content">
              <div className="card-body items-center text-center">
                <h2 className="card-title">Cookies!</h2>
                <p className="text-sm mt-3 mb-3">We are using cookies for no reason.</p>
                <div className="justify-end card-actions">
                  <Button variant="primary">Accept</Button>
                  <Button variant="ghost">Deny</Button>
                </div>
              </div>
            </Card>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Card className="bg-neutral text-neutral-content w-96">
  <div className="card-body items-center text-center">
    <h2 className="card-title">Cookies!</h2>
    <p className="text-sm mt-3 mb-3">We are using cookies for no reason.</p>
    <div className="card-actions justify-end">
      <Button variant="primary">Accept</Button>
      <Button variant="ghost">Deny</Button>
    </div>
  </div>
</Card>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Card with action on top
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabActionTop.value}
            onChange={k => (tabActionTop.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabActionTop.value === 'preview' ? (
            <Card className="w-96 bg-base-100 shadow-sm">
              <div className="card-body">
                <div className="justify-end card-actions">
                  <Button square size="sm">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </Button>
                </div>
                <p className="text-sm mt-3 mb-3">We are using cookies for no reason.</p>
              </div>
            </Card>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Card className="bg-base-100 w-96 shadow-sm">
  <div className="card-body">
    <div className="card-actions justify-end">
      <Button square size="sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </Button>
    </div>
    <p className="text-sm mt-3 mb-3">We are using cookies for no reason.</p>
  </div>
</Card>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Card with image on side
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabSideImage.value}
            onChange={k => (tabSideImage.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabSideImage.value === 'preview' ? (
            <Card side className="bg-base-100 shadow-sm">
              <figure>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1635805737707-575885ab0820.webp"
                  alt="Movie"
                />
              </figure>
              <div className="card-body">
                <h2 className="card-title">New movie is released!</h2>
                <p className="text-sm mt-3 mb-3">Click the button to watch on Jetflix app.</p>
                <div className="justify-end card-actions">
                  <Button variant="primary">Watch</Button>
                </div>
              </div>
            </Card>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Card side className="bg-base-100 shadow-sm">
  <figure><img src="https://img.daisyui.com/images/stock/photo-1635805737707-575885ab0820.webp" alt="Movie" /></figure>
  <div className="card-body">
    <h2 className="card-title">New movie is released!</h2>
    <p className="text-sm mt-3 mb-3">Click the button to watch on Jetflix app.</p>
    <div className="card-actions justify-end"><Button variant="primary">Watch</Button></div>
  </div>
</Card>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Responsive card (vertical on small screen, horizontal on large screen)
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabResponsiveSide.value}
            onChange={k => (tabResponsiveSide.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabResponsiveSide.value === 'preview' ? (
            <Card className="bg-base-100 shadow-sm lg:card-side">
              <figure>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1494232410401-ad00d5433cfa.webp"
                  alt="Album"
                />
              </figure>
              <div className="card-body">
                <h2 className="card-title">New album is released!</h2>
                <p className="text-sm mt-3 mb-3">Click the button to listen on Spotiwhy app.</p>
                <div className="justify-end card-actions">
                  <Button variant="primary">Listen</Button>
                </div>
              </div>
            </Card>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Card className="lg:card-side bg-base-100 shadow-sm">
  <figure><img src="https://img.daisyui.com/images/stock/photo-1494232410401-ad00d5433cfa.webp" alt="Album" /></figure>
  <div className="card-body">
    <h2 className="card-title">New album is released!</h2>
    <p className="text-sm mt-3 mb-3">Click the button to listen on Spotiwhy app.</p>
    <div className="card-actions justify-end"><Button variant="primary">Listen</Button></div>
  </div>
</Card>`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default CardDemo
