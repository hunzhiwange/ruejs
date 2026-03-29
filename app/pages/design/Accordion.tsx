import type { FC } from 'rue-js'
import { ref } from 'rue-js'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Accordion, Tabs } from '@rue-js/design'

const AccordionDemo: FC = () => {
  const tabRadio = ref<'preview' | 'code'>('preview')
  const tabDetails = ref<'preview' | 'code'>('preview')
  const tabArrow = ref<'preview' | 'code'>('preview')
  const tabPlus = ref<'preview' | 'code'>('preview')
  const tabJoin = ref<'preview' | 'code'>('preview')
  const tabArrayRadio = ref<'preview' | 'code'>('preview')
  const tabArrayDetails = ref<'preview' | 'code'>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Accordion 手风琴</h1>
        <p className="text-sm mt-3 mb-3">
          Accordion 用于显示和隐藏内容，但同一组中只能有一个项保持展开。
        </p>
        <div className="text-sm mb-3">
          <a href="https://daisyui.com/components/accordion/" target="_blank">
            查看 Accordion 静态样式
          </a>
        </div>

        <div className="alert mb-3">
          <p className="text-sm mt-3 mb-3">
            <svg
              class="size-4 ms-2 inline-block text-info"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <g fill="currentColor" stroke-linejoin="miter" stroke-linecap="butt">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="square"
                  stroke-miterlimit="10"
                  stroke-width="2"
                ></circle>
                <path
                  d="m12,17v-5.5c0-.276-.224-.5-.5-.5h-1.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="square"
                  stroke-miterlimit="10"
                  stroke-width="2"
                ></path>
                <circle cx="12" cy="7.25" r="1.25" fill="currentColor" stroke-width="2"></circle>
              </g>
            </svg>
          </p>
          <span>
            Accordion 使用与 collapse 组件相同的样式，但它通过 radio 输入或 details
            元素工作。你可以通过勾选/取消勾选隐藏的 radio 输入或为 details 元素设置 open
            属性来控制哪一项处于展开状态。
          </span>
        </div>

        <div className="alert mb-3">
          <p className="text-sm mt-3 mb-3">
            <svg
              class="size-4 ms-2 inline-block text-info"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <g fill="currentColor" stroke-linejoin="miter" stroke-linecap="butt">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="square"
                  stroke-miterlimit="10"
                  stroke-width="2"
                ></circle>
                <path
                  d="m12,17v-5.5c0-.276-.224-.5-.5-.5h-1.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="square"
                  stroke-miterlimit="10"
                  stroke-width="2"
                ></path>
                <circle cx="12" cy="7.25" r="1.25" fill="currentColor" stroke-width="2"></circle>
              </g>
            </svg>
          </p>
          <span>
            所有具有相同 name 的 radio 输入会协同工作，同一时间只有一个可以展开。如果页面上有多个
            Accordion 组，请为每组使用不同的 name。
          </span>
        </div>

        <div className="alert">
          <p className="text-sm mt-3 mb-3">
            <svg
              class="size-4 ms-2 inline-block text-info"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <g fill="currentColor" stroke-linejoin="miter" stroke-linecap="butt">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="square"
                  stroke-miterlimit="10"
                  stroke-width="2"
                ></circle>
                <path
                  d="m12,17v-5.5c0-.276-.224-.5-.5-.5h-1.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="square"
                  stroke-miterlimit="10"
                  stroke-width="2"
                ></path>
                <circle cx="12" cy="7.25" r="1.25" fill="currentColor" stroke-width="2"></circle>
              </g>
            </svg>
          </p>
          <span>如果希望折叠的内容能被浏览器搜索，请使用“Accordion using details”。</span>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Accordion using radio inputs
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'HTML代码' },
            ]}
            activeKey={tabRadio.value}
            onChange={k => (tabRadio.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabRadio.value === 'preview' ? (
            <div className="grid gap-3">
              <Accordion className="bg-base-100 border border-base-300" name="my-accordion-1" open>
                <Accordion.Title className="font-semibold">
                  How do I create an account?
                </Accordion.Title>
                <Accordion.Content className="text-sm">
                  Click the "Sign Up" button in the top right corner and follow the registration
                  process.
                </Accordion.Content>
              </Accordion>
              <Accordion className="bg-base-100 border border-base-300" name="my-accordion-1">
                <Accordion.Title className="font-semibold">
                  I forgot my password. What should I do?
                </Accordion.Title>
                <Accordion.Content className="text-sm">
                  Click on "Forgot Password" on the login page and follow the instructions sent to
                  your email.
                </Accordion.Content>
              </Accordion>
              <Accordion className="bg-base-100 border border-base-300" name="my-accordion-1">
                <Accordion.Title className="font-semibold">
                  How do I update my profile information?
                </Accordion.Title>
                <Accordion.Content className="text-sm">
                  Go to "My Account" settings and select "Edit Profile" to make changes.
                </Accordion.Content>
              </Accordion>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Accordion } from '@rue-js/design';
<Accordion className="bg-base-100 border border-base-300" name="my-accordion-1" open>
  <Accordion.Title className="font-semibold">How do I create an account?</Accordion.Title>
  <Accordion.Content className="text-sm">Click the "Sign Up" button in the top right corner and follow the registration process.</Accordion.Content>
</Accordion>
<Accordion className="bg-base-100 border border-base-300" name="my-accordion-1">
  <Accordion.Title className="font-semibold">I forgot my password. What should I do?</Accordion.Title>
  <Accordion.Content className="text-sm">Click on "Forgot Password" on the login page and follow the instructions sent to your email.</Accordion.Content>
</Accordion>
<Accordion className="bg-base-100 border border-base-300" name="my-accordion-1">
  <Accordion.Title className="font-semibold">How do I update my profile information?</Accordion.Title>
  <Accordion.Content className="text-sm">Go to "My Account" settings and select "Edit Profile" to make changes.</Accordion.Content>
</Accordion>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Accordion using details
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'HTML代码' },
            ]}
            activeKey={tabDetails.value}
            onChange={k => (tabDetails.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabDetails.value === 'preview' ? (
            <div className="grid gap-3">
              <Accordion
                use="details"
                className="bg-base-100 border border-base-300"
                name="my-accordion-det-1"
                open
              >
                <Accordion.Title as="summary" className="font-semibold">
                  How do I create an account?
                </Accordion.Title>
                <Accordion.Content className="text-sm">
                  Click the "Sign Up" button in the top right corner and follow the registration
                  process.
                </Accordion.Content>
              </Accordion>
              <Accordion
                use="details"
                className="bg-base-100 border border-base-300"
                name="my-accordion-det-1"
              >
                <Accordion.Title as="summary" className="font-semibold">
                  I forgot my password. What should I do?
                </Accordion.Title>
                <Accordion.Content className="text-sm">
                  Click on "Forgot Password" on the login page and follow the instructions sent to
                  your email.
                </Accordion.Content>
              </Accordion>
              <Accordion
                use="details"
                className="bg-base-100 border border-base-300"
                name="my-accordion-det-1"
              >
                <Accordion.Title as="summary" className="font-semibold">
                  How do I update my profile information?
                </Accordion.Title>
                <Accordion.Content className="text-sm">
                  Go to "My Account" settings and select "Edit Profile" to make changes.
                </Accordion.Content>
              </Accordion>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Accordion } from '@rue-js/design';
<Accordion use="details" className="bg-base-100 border border-base-300" name="my-accordion-det-1" open>
  <Accordion.Title as="summary" className="font-semibold">How do I create an account?</Accordion.Title>
  <Accordion.Content className="text-sm">Click the "Sign Up" button in the top right corner and follow the registration process.</Accordion.Content>
</Accordion>
<Accordion use="details" className="bg-base-100 border border-base-300" name="my-accordion-det-1">
  <Accordion.Title as="summary" className="font-semibold">I forgot my password. What should I do?</Accordion.Title>
  <Accordion.Content className="text-sm">Click on "Forgot Password" on the login page and follow the instructions sent to your email.</Accordion.Content>
</Accordion>
<Accordion use="details" className="bg-base-100 border border-base-300" name="my-accordion-det-1">
  <Accordion.Title as="summary" className="font-semibold">How do I update my profile information?</Accordion.Title>
  <Accordion.Content className="text-sm">Go to "My Account" settings and select "Edit Profile" to make changes.</Accordion.Content>
</Accordion>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Accordion with arrow icon
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'HTML代码' },
            ]}
            activeKey={tabArrow.value}
            onChange={k => (tabArrow.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabArrow.value === 'preview' ? (
            <div className="grid gap-3">
              <Accordion
                icon="arrow"
                className="bg-base-100 border border-base-300"
                name="my-accordion-2"
                open
              >
                <Accordion.Title className="font-semibold">
                  How do I create an account?
                </Accordion.Title>
                <Accordion.Content className="text-sm">
                  Click the "Sign Up" button in the top right corner and follow the registration
                  process.
                </Accordion.Content>
              </Accordion>
              <Accordion
                icon="arrow"
                className="bg-base-100 border border-base-300"
                name="my-accordion-2"
              >
                <Accordion.Title className="font-semibold">
                  I forgot my password. What should I do?
                </Accordion.Title>
                <Accordion.Content className="text-sm">
                  Click on "Forgot Password" on the login page and follow the instructions sent to
                  your email.
                </Accordion.Content>
              </Accordion>
              <Accordion
                icon="arrow"
                className="bg-base-100 border border-base-300"
                name="my-accordion-2"
              >
                <Accordion.Title className="font-semibold">
                  How do I update my profile information?
                </Accordion.Title>
                <Accordion.Content className="text-sm">
                  Go to "My Account" settings and select "Edit Profile" to make changes.
                </Accordion.Content>
              </Accordion>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Accordion } from '@rue-js/design';
<Accordion icon="arrow" className="bg-base-100 border border-base-300" name="my-accordion-2" open>
  <Accordion.Title className="font-semibold">How do I create an account?</Accordion.Title>
  <Accordion.Content className="text-sm">Click the "Sign Up" button in the top right corner and follow the registration process.</Accordion.Content>
</Accordion>
<Accordion icon="arrow" className="bg-base-100 border border-base-300" name="my-accordion-2">
  <Accordion.Title className="font-semibold">I forgot my password. What should I do?</Accordion.Title>
  <Accordion.Content className="text-sm">Click on "Forgot Password" on the login page and follow the instructions sent to your email.</Accordion.Content>
</Accordion>
<Accordion icon="arrow" className="bg-base-100 border border-base-300" name="my-accordion-2">
  <Accordion.Title className="font-semibold">How do I update my profile information?</Accordion.Title>
  <Accordion.Content className="text-sm">Go to "My Account" settings and select "Edit Profile" to make changes.</Accordion.Content>
</Accordion>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Accordion with plus/minus icon
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'HTML代码' },
            ]}
            activeKey={tabPlus.value}
            onChange={k => (tabPlus.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabPlus.value === 'preview' ? (
            <div className="grid gap-3">
              <Accordion
                icon="plus"
                className="bg-base-100 border border-base-300"
                name="my-accordion-3"
                open
              >
                <Accordion.Title className="font-semibold">
                  How do I create an account?
                </Accordion.Title>
                <Accordion.Content className="text-sm">
                  Click the "Sign Up" button in the top right corner and follow the registration
                  process.
                </Accordion.Content>
              </Accordion>
              <Accordion
                icon="plus"
                className="bg-base-100 border border-base-300"
                name="my-accordion-3"
              >
                <Accordion.Title className="font-semibold">
                  I forgot my password. What should I do?
                </Accordion.Title>
                <Accordion.Content className="text-sm">
                  Click on "Forgot Password" on the login page and follow the instructions sent to
                  your email.
                </Accordion.Content>
              </Accordion>
              <Accordion
                icon="plus"
                className="bg-base-100 border border-base-300"
                name="my-accordion-3"
              >
                <Accordion.Title className="font-semibold">
                  How do I update my profile information?
                </Accordion.Title>
                <Accordion.Content className="text-sm">
                  Go to "My Account" settings and select "Edit Profile" to make changes.
                </Accordion.Content>
              </Accordion>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Accordion } from '@rue-js/design';
<Accordion icon="plus" className="bg-base-100 border border-base-300" name="my-accordion-3" open>
  <Accordion.Title className="font-semibold">How do I create an account?</Accordion.Title>
  <Accordion.Content className="text-sm">Click the "Sign Up" button in the top right corner and follow the registration process.</Accordion.Content>
</Accordion>
<Accordion icon="plus" className="bg-base-100 border border-base-300" name="my-accordion-3">
  <Accordion.Title className="font-semibold">I forgot my password. What should I do?</Accordion.Title>
  <Accordion.Content className="text-sm">Click on "Forgot Password" on the login page and follow the instructions sent to your email.</Accordion.Content>
</Accordion>
<Accordion icon="plus" className="bg-base-100 border border-base-300" name="my-accordion-3">
  <Accordion.Title className="font-semibold">How do I update my profile information?</Accordion.Title>
  <Accordion.Content className="text-sm">Go to "My Account" settings and select "Edit Profile" to make changes.</Accordion.Content>
</Accordion>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Using Accordion and Join together
          </h2>
          <p className="text-sm mt-3 mb-3">
            to join the items together and handle border radius automatically
          </p>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'HTML代码' },
            ]}
            activeKey={tabJoin.value}
            onChange={k => (tabJoin.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabJoin.value === 'preview' ? (
            <div className="join join-vertical bg-base-100">
              <Accordion
                icon="arrow"
                className="join-item border border-base-300"
                name="my-accordion-4"
                open
              >
                <Accordion.Title className="font-semibold">
                  How do I create an account?
                </Accordion.Title>
                <Accordion.Content className="text-sm">
                  Click the "Sign Up" button in the top right corner and follow the registration
                  process.
                </Accordion.Content>
              </Accordion>
              <Accordion
                icon="arrow"
                className="join-item border border-base-300"
                name="my-accordion-4"
              >
                <Accordion.Title className="font-semibold">
                  I forgot my password. What should I do?
                </Accordion.Title>
                <Accordion.Content className="text-sm">
                  Click on "Forgot Password" on the login page and follow the instructions sent to
                  your email.
                </Accordion.Content>
              </Accordion>
              <Accordion
                icon="arrow"
                className="join-item border border-base-300"
                name="my-accordion-4"
              >
                <Accordion.Title className="font-semibold">
                  How do I update my profile information?
                </Accordion.Title>
                <Accordion.Content className="text-sm">
                  Go to "My Account" settings and select "Edit Profile" to make changes.
                </Accordion.Content>
              </Accordion>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Accordion } from '@rue-js/design';
<div className="join join-vertical bg-base-100">
  <Accordion icon="arrow" className="join-item border border-base-300" name="my-accordion-4" open>
    <Accordion.Title className="font-semibold">How do I create an account?</Accordion.Title>
    <Accordion.Content className="text-sm">Click the "Sign Up" button in the top right corner and follow the registration process.</Accordion.Content>
  </Accordion>
  <Accordion icon="arrow" className="join-item border border-base-300" name="my-accordion-4">
    <Accordion.Title className="font-semibold">I forgot my password. What should I do?</Accordion.Title>
    <Accordion.Content className="text-sm">Click on "Forgot Password" on the login page and follow the instructions sent to your email.</Accordion.Content>
  </Accordion>
  <Accordion icon="arrow" className="join-item border border-base-300" name="my-accordion-4">
    <Accordion.Title className="font-semibold">How do I update my profile information?</Accordion.Title>
    <Accordion.Content className="text-sm">Go to "My Account" settings and select "Edit Profile" to make changes.</Accordion.Content>
  </Accordion>
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Accordion using items array (radio)
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'TSX代码' },
            ]}
            activeKey={tabArrayRadio.value}
            onChange={k => (tabArrayRadio.value = k as 'preview' | 'code')}
            className="mb-3"
          />

          <div>
            {tabArrayRadio.value === 'preview' ? (
              <div class="grid gap-3">
                <Accordion
                  className="bg-base-100 border border-base-300"
                  name="my-accordion-arr-1"
                  items={[
                    {
                      title: 'How do I create an account?',
                      content:
                        'Click the "Sign Up" button in the top right corner and follow the registration process.',
                      open: true,
                    },
                    {
                      title: 'I forgot my password. What should I do?',
                      content:
                        'Click on "Forgot Password" on the login page and follow the instructions sent to your email.',
                    },
                    {
                      title: 'How do I update my profile information?',
                      content:
                        'Go to "My Account" settings and select "Edit Profile" to make changes.',
                    },
                  ]}
                />
              </div>
            ) : (
              <Code
                className="mt-2"
                lang="tsx"
                code={`import { Accordion } from '@rue-js/design';
<div class="grid gap-3">
  <Accordion className="bg-base-100 border border-base-300" name="my-accordion-arr-1" items={[
    { title: 'How do I create an account?', content: 'Click the "Sign Up" button in the top right corner and follow the registration process.', open: true },
    { title: 'I forgot my password. What should I do?', content: 'Click on "Forgot Password" on the login page and follow the instructions sent to your email.' },
    { title: 'How do I update my profile information?', content: 'Go to "My Account" settings and select "Edit Profile" to make changes.' },
  ]}/>
</div>`}
              />
            )}
          </div>
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Accordion using items array (details)
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'TSX代码' },
            ]}
            activeKey={tabArrayDetails.value}
            onChange={k => (tabArrayDetails.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          <div>
            {tabArrayDetails.value === 'preview' ? (
              <div class="grid gap-3">
                <Accordion
                  use="details"
                  className="bg-base-100 border border-base-300"
                  name="my-accordion-arr-2"
                  items={[
                    {
                      title: 'How do I create an account?',
                      content:
                        'Click the "Sign Up" button in the top right corner and follow the registration process.',
                      open: true,
                    },
                    {
                      title: 'I forgot my password. What should I do?',
                      content:
                        'Click on "Forgot Password" on the login page and follow the instructions sent to your email.',
                    },
                    {
                      title: 'How do I update my profile information?',
                      content:
                        'Go to "My Account" settings and select "Edit Profile" to make changes.',
                    },
                  ]}
                />
              </div>
            ) : (
              <Code
                className="mt-2"
                lang="tsx"
                code={`import { Accordion } from '@rue-js/design';
<div class="grid gap-3">
  <Accordion use="details" className="bg-base-100 border border-base-300" name="my-accordion-arr-2" items={[
    { title: 'How do I create an account?', content: 'Click the "Sign Up" button in the top right corner and follow the registration process.', open: true },
    { title: 'I forgot my password. What should I do?', content: 'Click on "Forgot Password" on the login page and follow the instructions sent to your email.' },
    { title: 'How do I update my profile information?', content: 'Go to "My Account" settings and select "Edit Profile" to make changes.' },
  ]}/>
</div>`}
              />
            )}
          </div>
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default AccordionDemo
