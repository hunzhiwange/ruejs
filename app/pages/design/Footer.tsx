import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Footer, Tabs } from '@rue-js/design'

const FooterDemo: FC = () => {
  const tabBasic = ref<'preview' | 'code'>('preview')
  const tabLogo = ref<'preview' | 'code'>('preview')
  const tabForm = ref<'preview' | 'code'>('preview')
  const tabSocial = ref<'preview' | 'code'>('preview')
  const tabLinks = ref<'preview' | 'code'>('preview')
  const tabLinks2 = ref<'preview' | 'code'>('preview')
  const tabLinks3 = ref<'preview' | 'code'>('preview')
  const tabCentered = ref<'preview' | 'code'>('preview')
  const tabTwo = ref<'preview' | 'code'>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Footer 页脚</h1>
        <p className="text-sm mt-3 mb-3">页脚（Footer）用于展示品牌信息、版权声明和导航链接。</p>

        <div className="text-sm">
          <a href="https://daisyui.com/components/footer/" target="_blank">
            查看 Footer 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Footer (vertical by default, horizontal for sm and up)
          </h2>
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
            <Footer className="p-10 bg-neutral text-neutral-content rounded sm:footer-horizontal">
              <nav>
                <h6 className="footer-title">Services</h6>
                <button className="link link-hover">Branding</button>
                <button className="link link-hover">Design</button>
                <button className="link link-hover">Marketing</button>
                <button className="link link-hover">Advertisement</button>
              </nav>
              <nav>
                <h6 className="footer-title">Company</h6>
                <button className="link link-hover">About us</button>
                <button className="link link-hover">Contact</button>
                <button className="link link-hover">Jobs</button>
                <button className="link link-hover">Press kit</button>
              </nav>
              <nav>
                <h6 className="footer-title">Legal</h6>
                <button className="link link-hover">Terms of use</button>
                <button className="link link-hover">Privacy policy</button>
                <button className="link link-hover">Cookie policy</button>
              </nav>
            </Footer>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Footer } from '@rue-js/design';
<Footer className="p-10 bg-neutral text-neutral-content rounded sm:footer-horizontal">
  <nav>
    <h6 className="footer-title">Services</h6>
    <button className="link link-hover">Branding</button>
    <button className="link link-hover">Design</button>
    <button className="link link-hover">Marketing</button>
    <button className="link link-hover">Advertisement</button>
  </nav>
  <nav>
    <h6 className="footer-title">Company</h6>
    <button className="link link-hover">About us</button>
    <button className="link link-hover">Contact</button>
    <button className="link link-hover">Jobs</button>
    <button className="link link-hover">Press kit</button>
  </nav>
  <nav>
    <h6 className="footer-title">Legal</h6>
    <button className="link link-hover">Terms of use</button>
    <button className="link link-hover">Privacy policy</button>
    <button className="link link-hover">Cookie policy</button>
  </nav>
</Footer>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Footer with a logo section
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabLogo.value}
            onChange={k => (tabLogo.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabLogo.value === 'preview' ? (
            <Footer className="p-10 bg-base-200 text-base-content rounded sm:footer-horizontal">
              <aside>
                <svg width="40" height="40" viewBox="0 0 24 24" className="fill-current">
                  <path d="M22.672 15.226l-2.432.811.841 2.515c.33 1.019-.209 2.127-1.23 2.456-1.15.325-2.148-.321-2.463-1.226l-.84-2.518-5.013 1.677.84 2.517c.391 1.203-.434 2.542-1.831 2.542-.88 0-1.601-.564-1.86-1.314l-.842-2.516-2.431.809c-1.135.328-2.145-.317-2.463-1.229-.329-1.018.211-2.127 1.231-2.456l2.432-.809-1.621-4.823-2.432.808c-1.355.384-2.558-.59-2.558-1.839 0-.817.509-1.582 1.327-1.846l2.433-.809-.842-2.515c-.33-1.02.211-2.129 1.232-2.458 1.02-.329 2.13.209 2.461 1.229l.842 2.515 5.011-1.677-.839-2.517c-.403-1.238.484-2.553 1.843-2.553.819 0 1.585.509 1.85 1.326l.841 2.517 2.431-.81c1.02-.33 2.131.211 2.461 1.229.332 1.018-.21 2.126-1.23 2.456l-2.433.809 1.622 4.823 2.433-.809c1.242-.401 2.557.484 2.557 1.838 0 .819-.51 1.583-1.328 1.847m-8.992-6.428l-5.01 1.675 1.619 4.828 5.011-1.674-1.62-4.829z"></path>
                </svg>
                <p className="text-sm mt-3 mb-3">
                  ACME Industries Ltd.
                  <br />
                  Providing reliable tech since 1992
                </p>
              </aside>
              <nav>
                <h6 className="footer-title">Services</h6>
                <button className="link link-hover">Branding</button>
                <button className="link link-hover">Design</button>
                <button className="link link-hover">Marketing</button>
                <button className="link link-hover">Advertisement</button>
              </nav>
              <nav>
                <h6 className="footer-title">Company</h6>
                <button className="link link-hover">About us</button>
                <button className="link link-hover">Contact</button>
                <button className="link link-hover">Jobs</button>
                <button className="link link-hover">Press kit</button>
              </nav>
              <nav>
                <h6 className="footer-title">Legal</h6>
                <button className="link link-hover">Terms of use</button>
                <button className="link link-hover">Privacy policy</button>
                <button className="link link-hover">Cookie policy</button>
              </nav>
            </Footer>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Footer className="p-10 bg-base-200 text-base-content rounded sm:footer-horizontal">
  <aside>
    <svg width="40" height="40" viewBox="0 0 24 24" className="fill-current">
      <path d="M22.672 15.226l-2.432.811.841 2.515c.33 1.019-.209 2.127-1.23 2.456-1.15.325-2.148-.321-2.463-1.226l-.84-2.518-5.013 1.677.84 2.517c.391 1.203-.434 2.542-1.831 2.542-.88 0-1.601-.564-1.86-1.314l-.842-2.516-2.431.809c-1.135.328-2.145-.317-2.463-1.229-.329-1.018.211-2.127 1.231-2.456l2.432-.809-1.621-4.823-2.432.808c-1.355.384-2.558-.59-2.558-1.839 0-.817.509-1.582 1.327-1.846l2.433-.809-.842-2.515c-.33-1.02.211-2.129 1.232-2.458 1.02-.329 2.13.209 2.461 1.229l.842 2.515 5.011-1.677-.839-2.517c-.403-1.238.484-2.553 1.843-2.553.819 0 1.585.509 1.85 1.326l.841 2.517 2.431-.81c1.02-.33 2.131.211 2.461 1.229.332 1.018-.21 2.126-1.23 2.456l-2.433.809 1.622 4.823 2.433-.809c1.242-.401 2.557.484 2.557 1.838 0 .819-.51 1.583-1.328 1.847m-8.992-6.428l-5.01 1.675 1.619 4.828 5.011-1.674-1.62-4.829z"></path>
    </svg>
    <p className="text-sm mt-3 mb-3">ACME Industries Ltd.<br />Providing reliable tech since 1992</p>
  </aside>
  <nav>
    <h6 className="footer-title">Services</h6>
    <button className="link link-hover">Branding</button>
    <button className="link link-hover">Design</button>
    <button className="link link-hover">Marketing</button>
    <button className="link link-hover">Advertisement</button>
  </nav>
  <nav>
    <h6 className="footer-title">Company</h6>
    <button className="link link-hover">About us</button>
    <button className="link link-hover">Contact</button>
    <button className="link link-hover">Jobs</button>
    <button className="link link-hover">Press kit</button>
  </nav>
  <nav>
    <h6 className="footer-title">Legal</h6>
    <button className="link link-hover">Terms of use</button>
    <button className="link link-hover">Privacy policy</button>
    <button className="link link-hover">Cookie policy</button>
  </nav>
</Footer>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Footer with a form
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabForm.value}
            onChange={k => (tabForm.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabForm.value === 'preview' ? (
            <Footer className="p-10 bg-base-200 text-base-content rounded sm:footer-horizontal">
              <nav>
                <h6 className="footer-title">Services</h6>
                <button className="link link-hover">Branding</button>
                <button className="link link-hover">Design</button>
                <button className="link link-hover">Marketing</button>
                <button className="link link-hover">Advertisement</button>
              </nav>
              <nav>
                <h6 className="footer-title">Company</h6>
                <button className="link link-hover">About us</button>
                <button className="link link-hover">Contact</button>
                <button className="link link-hover">Jobs</button>
                <button className="link link-hover">Press kit</button>
              </nav>
              <nav>
                <h6 className="footer-title">Legal</h6>
                <button className="link link-hover">Terms of use</button>
                <button className="link link-hover">Privacy policy</button>
                <button className="link link-hover">Cookie policy</button>
              </nav>
              <form>
                <h6 className="footer-title">Newsletter</h6>
                <fieldset className="w-80">
                  <label>Enter your email address</label>
                  <div className="join">
                    <input
                      type="text"
                      placeholder="username@site.com"
                      className="input input-bordered join-item"
                    />
                    <button className="join-item btn btn-primary">Subscribe</button>
                  </div>
                </fieldset>
              </form>
            </Footer>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Footer className="p-10 bg-base-200 text-base-content rounded sm:footer-horizontal">
  <nav>
    <h6 className="footer-title">Services</h6>
    <button className="link link-hover">Branding</button>
    <button className="link link-hover">Design</button>
    <button className="link link-hover">Marketing</button>
    <button className="link link-hover">Advertisement</button>
  </nav>
  <nav>
    <h6 className="footer-title">Company</h6>
    <button className="link link-hover">About us</button>
    <button className="link link-hover">Contact</button>
    <button className="link link-hover">Jobs</button>
    <button className="link link-hover">Press kit</button>
  </nav>
  <nav>
    <h6 className="footer-title">Legal</h6>
    <button className="link link-hover">Terms of use</button>
    <button className="link link-hover">Privacy policy</button>
    <button className="link link-hover">Cookie policy</button>
  </nav>
  <form>
    <h6 className="footer-title">Newsletter</h6>
    <fieldset className="w-80">
      <label>Enter your email address</label>
      <div className="join">
        <input type="text" placeholder="username@site.com" className="input input-bordered join-item" />
        <button className="join-item btn btn-primary">Subscribe</button>
      </div>
    </fieldset>
  </form>
</Footer>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Footer with logo and social icons
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabSocial.value}
            onChange={k => (tabSocial.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabSocial.value === 'preview' ? (
            <Footer className="p-10 bg-neutral text-neutral-content rounded sm:footer-horizontal">
              <aside>
                <svg width="40" height="40" viewBox="0 0 24 24" className="fill-current">
                  <path d="M22.672 15.226l-2.432.811.841 2.515c.33 1.019-.209 2.127-1.23 2.456-1.15.325-2.148-.321-2.463-1.226l-.84-2.518-5.013 1.677.84 2.517c.391 1.203-.434 2.542-1.831 2.542-.88 0-1.601-.564-1.86-1.314l-.842-2.516-2.431 .809c-1.135 .328-2.145-.317-2.463-1.229-.329-1.018 .211-2.127 1.231-2.456l2.432-.809-1.621-4.823-2.432 .808c-1.355 .384-2.558-.59-2.558-1.839 0-.817 .509-1.582 1.327-1.846l2.433-.809-.842-2.515c-.33-1.02 .211-2.129 1.232-2.458 1.02-.329 2.13 .209 2.461 1.229l.842 2.515 5.011-1.677-.839-2.517c-.403-1.238 .484-2.553 1.843-2.553.819 0 1.585 .509 1.85 1.326l.841 2.517 2.431-.81c1.02-.33 2.131 .211 2.461 1.229.332 1.018-.21 2.126-1.23 2.456l-2.433 .809 1.622 4.823 2.433-.809c1.242-.401 2.557 .484 2.557 1.838 0 .819-.51 1.583-1.328 1.847m-8.992-6.428l-5.01 1.675 1.619 4.828 5.011-1.674-1.62-4.829z"></path>
                </svg>
                <p className="text-sm mt-3 mb-3">
                  ACME Industries Ltd.
                  <br />
                  Providing reliable tech since 1992
                </p>
              </aside>
              <nav>
                <h6 className="footer-title">Social</h6>
                <div className="grid grid-flow-col gap-4">
                  <button>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      className="fill-current"
                    >
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693 .188-1.452 .232-2.224 .084 .626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646 .962-.695 1.797-1.562 2.457-2.549z"></path>
                    </svg>
                  </button>
                  <button>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      className="fill-current"
                    >
                      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897 .266-4.356 2.62-4.385 8.816 .029 6.185 .484 8.549 4.385 8.816 3.6 .245 11.626 .246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"></path>
                    </svg>
                  </button>
                  <button>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      className="fill-current"
                    >
                      <path d="M9 8h-3v4h3v12h5v-12h3.642l .358-4h-4v-1.667c0-.955 .192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"></path>
                    </svg>
                  </button>
                </div>
              </nav>
            </Footer>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Footer className="p-10 bg-neutral text-neutral-content rounded sm:footer-horizontal">
  <aside>
    <svg width="40" height="40" viewBox="0 0 24 24" className="fill-current">
      <path d="M22.672 15.226l-2.432.811.841 2.515c.33 1.019-.209 2.127-1.23 2.456-1.15.325-2.148-.321-2.463-1.226l-.84-2.518-5.013 1.677.84 2.517c.391 1.203-.434 2.542-1.831 2.542-.88 0-1.601-.564-1.86-1.314l-.842-2.516-2.431 .809c-1.135 .328-2.145-.317-2.463-1.229-.329-1.018 .211-2.127 1.231-2.456l2.432-.809-1.621-4.823-2.432 .808c-1.355 .384-2.558-.59-2.558-1.839 0-.817 .509-1.582 1.327-1.846l2.433-.809-.842-2.515c-.33-1.02 .211-2.129 1.232-2.458 1.02-.329 2.13 .209 2.461 1.229l.842 2.515 5.011-1.677-.839-2.517c-.403-1.238 .484-2.553 1.843-2.553.819 0 1.585 .509 1.85 1.326l.841 2.517 2.431-.81c1.02-.33 2.131 .211 2.461 1.229.332 1.018-.21 2.126-1.23 2.456l-2.433 .809 1.622 4.823 2.433-.809c1.242-.401 2.557 .484 2.557 1.838 0 .819-.51 1.583-1.328 1.847m-8.992-6.428l-5.01 1.675 1.619 4.828 5.011-1.674-1.62-4.829z"></path>
    </svg>
    <p className="text-sm mt-3 mb-3">ACME Industries Ltd.<br />Providing reliable tech since 1992</p>
  </aside>
  <nav>
    <h6 className="footer-title">Social</h6>
    <div className="grid grid-flow-col gap-4">
      <button>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className="fill-current">
          <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693 .188-1.452 .232-2.224 .084 .626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646 .962-.695 1.797-1.562 2.457-2.549z"></path>
        </svg>
      </button>
      <button>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className="fill-current">
          <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897 .266-4.356 2.62-4.385 8.816 .029 6.185 .484 8.549 4.385 8.816 3.6 .245 11.626 .246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"></path>
        </svg>
      </button>
      <button>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className="fill-current">
          <path d="M9 8h-3v4h3v12h5v-12h3.642l .358-4h-4v-1.667c0-.955 .192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"></path>
        </svg>
      </button>
    </div>
  </nav>
</Footer>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Footer with links and social icons
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabLinks.value}
            onChange={k => (tabLinks.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabLinks.value === 'preview' ? (
            <Footer className="p-10 bg-base-300 text-base-content rounded sm:footer-horizontal">
              <nav>
                <h6 className="footer-title">Services</h6>
                <button className="link link-hover">Branding</button>
                <button className="link link-hover">Design</button>
                <button className="link link-hover">Marketing</button>
                <button className="link link-hover">Advertisement</button>
              </nav>
              <nav>
                <h6 className="footer-title">Company</h6>
                <button className="link link-hover">About us</button>
                <button className="link link-hover">Contact</button>
                <button className="link link-hover">Jobs</button>
                <button className="link link-hover">Press kit</button>
              </nav>
              <nav>
                <h6 className="footer-title">Social</h6>
                <div className="grid grid-flow-col gap-4">
                  <button>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      className="fill-current"
                    >
                      <path d="M24 4.557c-.883.392-1.832 .656-2.828 .775 1.017-.609 1.798-1.574 2.165-2.724-.951 .564-2.005 .974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693 .188-1.452 .232-2.224 .084 .626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646 .962-.695 1.797-1.562 2.457-2.549z"></path>
                    </svg>
                  </button>
                  <button>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      className="fill-current"
                    >
                      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897 .266-4.356 2.62-4.385 8.816 .029 6.185 .484 8.549 4.385 8.816 3.6 .245 11.626 .246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"></path>
                    </svg>
                  </button>
                  <button>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      className="fill-current"
                    >
                      <path d="M9 8h-3v4h3v12h5v-12h3.642l .358-4h-4v-1.667c0-.955 .192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"></path>
                    </svg>
                  </button>
                </div>
              </nav>
            </Footer>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Footer className="p-10 bg-base-300 text-base-content rounded sm:footer-horizontal">
  <nav>
    <h6 className="footer-title">Services</h6>
    <button className="link link-hover">Branding</button>
    <button className="link link-hover">Design</button>
    <button className="link link-hover">Marketing</button>
    <button className="link link-hover">Advertisement</button>
  </nav>
  <nav>
    <h6 className="footer-title">Company</h6>
    <button className="link link-hover">About us</button>
    <button className="link link-hover">Contact</button>
    <button className="link link-hover">Jobs</button>
    <button className="link link-hover">Press kit</button>
  </nav>
  <nav>
    <h6 className="footer-title">Social</h6>
    <div className="grid grid-flow-col gap-4">
      <button>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className="fill-current">
          <path d="M24 4.557c-.883.392-1.832 .656-2.828 .775 1.017-.609 1.798-1.574 2.165-2.724-.951 .564-2.005 .974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693 .188-1.452 .232-2.224 .084 .626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646 .962-.695 1.797-1.562 2.457-2.549z"></path>
        </svg>
      </button>
      <button>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className="fill-current">
          <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897 .266-4.356 2.62-4.385 8.816 .029 6.185 .484 8.549 4.385 8.816 3.6 .245 11.626 .246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"></path>
        </svg>
      </button>
      <button>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className="fill-current">
          <path d="M9 8h-3v4h3v12h5v-12h3.642l .358-4h-4v-1.667c0-.955 .192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"></path>
        </svg>
      </button>
    </div>
  </nav>
</Footer>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Links and social icons (two rows)
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabLinks2.value}
            onChange={k => (tabLinks2.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabLinks2.value === 'preview' ? (
            <Footer className="p-10 bg-neutral text-neutral-content rounded sm:grid-rows-2 sm:footer-horizontal">
              <nav>
                <h6 className="footer-title">Services</h6>
                <button className="link link-hover">Branding</button>
                <button className="link link-hover">Design</button>
                <button className="link link-hover">Marketing</button>
                <button className="link link-hover">Advertisement</button>
              </nav>
              <nav>
                <h6 className="footer-title">Company</h6>
                <button className="link link-hover">About us</button>
                <button className="link link-hover">Contact</button>
                <button className="link link-hover">Jobs</button>
                <button className="link link-hover">Press kit</button>
              </nav>
              <nav>
                <h6 className="footer-title">Legal</h6>
                <button className="link link-hover">Terms of use</button>
                <button className="link link-hover">Privacy policy</button>
                <button className="link link-hover">Cookie policy</button>
              </nav>
              <nav>
                <h6 className="footer-title">Social</h6>
                <button className="link link-hover">Twitter</button>
                <button className="link link-hover">Instagram</button>
                <button className="link link-hover">Facebook</button>
                <button className="link link-hover">GitHub</button>
              </nav>
              <nav>
                <h6 className="footer-title">Explore</h6>
                <button className="link link-hover">Features</button>
                <button className="link link-hover">Enterprise</button>
                <button className="link link-hover">Security</button>
                <button className="link link-hover">Pricing</button>
              </nav>
              <nav>
                <h6 className="footer-title">Apps</h6>
                <button className="link link-hover">Mac</button>
                <button className="link link-hover">Windows</button>
                <button className="link link-hover">Linux</button>
                <button className="link link-hover">Android</button>
              </nav>
            </Footer>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Footer className="p-10 bg-neutral text-neutral-content rounded sm:grid-rows-2 sm:footer-horizontal">
  <nav>
    <h6 className="footer-title">Services</h6>
    <button className="link link-hover">Branding</button>
    <button className="link link-hover">Design</button>
    <button className="link link-hover">Marketing</button>
    <button className="link link-hover">Advertisement</button>
  </nav>
  <nav>
    <h6 className="footer-title">Company</h6>
    <button className="link link-hover">About us</button>
    <button className="link link-hover">Contact</button>
    <button className="link link-hover">Jobs</button>
    <button className="link link-hover">Press kit</button>
  </nav>
  <nav>
    <h6 className="footer-title">Legal</h6>
    <button className="link link-hover">Terms of use</button>
    <button className="link link-hover">Privacy policy</button>
    <button className="link link-hover">Cookie policy</button>
  </nav>
  <nav>
    <h6 className="footer-title">Social</h6>
    <button className="link link-hover">Twitter</button>
    <button className="link link-hover">Instagram</button>
    <button className="link link-hover">Facebook</button>
    <button className="link link-hover">GitHub</button>
  </nav>
  <nav>
    <h6 className="footer-title">Explore</h6>
    <button className="link link-hover">Features</button>
    <button className="link link-hover">Enterprise</button>
    <button className="link link-hover">Security</button>
    <button className="link link-hover">Pricing</button>
  </nav>
  <nav>
    <h6 className="footer-title">Apps</h6>
    <button className="link link-hover">Mac</button>
    <button className="link link-hover">Windows</button>
    <button className="link link-hover">Linux</button>
    <button className="link link-hover">Android</button>
  </nav>
</Footer>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Centered footer with logo and social icons
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabLinks3.value}
            onChange={k => (tabLinks3.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabLinks3.value === 'preview' ? (
            <Footer className="footer footer-horizontal footer-center bg-primary text-primary-content p-10">
              <aside>
                <svg
                  width="50"
                  height="50"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  fillRule="evenodd"
                  clipRule="evenodd"
                  className="inline-block fill-current"
                >
                  <path d="M22.672 15.226l-2.432.811.841 2.515c.33 1.019-.209 2.127-1.23 2.456-1.15.325-2.148-.321-2.463-1.226l-.84-2.518-5.013 1.677.84 2.517c.391 1.203-.434 2.542-1.831 2.542-.88 0-1.601-.564-1.86-1.314l-.842-2.516-2.431.809c-1.135.328-2.145-.317-2.463-1.229-.329-1.018.211-2.127 1.231-2.456l2.432-.809-1.621-4.823-2.432.808c-1.355.384-2.558-.59-2.558-1.839 0-.817.509-1.582 1.327-1.846l2.433-.809-.842-2.515c-.33-1.02.211-2.129 1.232-2.458 1.02-.329 2.13.209 2.461 1.229l.842 2.515 5.011-1.677-.839-2.517c-.403-1.238.484-2.553 1.843-2.553.819 0 1.585.509 1.85 1.326l.841 2.517 2.431-.81c1.02-.33 2.131.211 2.461 1.229.332 1.018-.21 2.126-1.23 2.456l-2.433.809 1.622 4.823 2.433-.809c1.242-.401 2.557.484 2.557 1.838 0 .819-.51 1.583-1.328 1.847m-8.992-6.428l-5.01 1.675 1.619 4.828 5.011-1.674-1.62-4.829z"></path>
                </svg>
                <p className="font-bold">
                  ACME Industries Ltd.
                  <br />
                  Providing reliable tech since 1992
                </p>
                <p className="text-sm mt-3 mb-3">
                  Copyright © {new Date().getFullYear()} - All right reserved
                </p>
              </aside>
              <nav>
                <div className="grid grid-flow-col gap-4">
                  <a>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      className="fill-current"
                    >
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"></path>
                    </svg>
                  </a>
                  <a>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      className="fill-current"
                    >
                      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"></path>
                    </svg>
                  </a>
                  <a>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      className="fill-current"
                    >
                      <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"></path>
                    </svg>
                  </a>
                </div>
              </nav>
            </Footer>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Footer className="footer footer-horizontal footer-center bg-primary text-primary-content p-10">
  <aside>
    <svg
      width="50"
      height="50"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fillRule="evenodd"
      clipRule="evenodd"
      className="inline-block fill-current">
      <path
        d="M22.672 15.226l-2.432.811.841 2.515c.33 1.019-.209 2.127-1.23 2.456-1.15.325-2.148-.321-2.463-1.226l-.84-2.518-5.013 1.677.84 2.517c.391 1.203-.434 2.542-1.831 2.542-.88 0-1.601-.564-1.86-1.314l-.842-2.516-2.431.809c-1.135.328-2.145-.317-2.463-1.229-.329-1.018.211-2.127 1.231-2.456l2.432-.809-1.621-4.823-2.432.808c-1.355.384-2.558-.59-2.558-1.839 0-.817.509-1.582 1.327-1.846l2.433-.809-.842-2.515c-.33-1.02.211-2.129 1.232-2.458 1.02-.329 2.13.209 2.461 1.229l.842 2.515 5.011-1.677-.839-2.517c-.403-1.238.484-2.553 1.843-2.553.819 0 1.585.509 1.85 1.326l.841 2.517 2.431-.81c1.02-.33 2.131.211 2.461 1.229.332 1.018-.21 2.126-1.23 2.456l-2.433.809 1.622 4.823 2.433-.809c1.242-.401 2.557.484 2.557 1.838 0 .819-.51 1.583-1.328 1.847m-8.992-6.428l-5.01 1.675 1.619 4.828 5.011-1.674-1.62-4.829z"></path>
    </svg>
    <p className="font-bold">
      ACME Industries Ltd.
      <br />
      Providing reliable tech since 1992
    </p>
    <p className="text-sm mt-3 mb-3">Copyright © {new Date().getFullYear()} - All right reserved</p>
  </aside>
  <nav>
    <div className="grid grid-flow-col gap-4">
      <a>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          className="fill-current">
          <path
            d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"></path>
        </svg>
      </a>
      <a>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          className="fill-current">
          <path
            d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"></path>
        </svg>
      </a>
      <a>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          className="fill-current">
          <path
            d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"></path>
        </svg>
      </a>
    </div>
  </nav>
</Footer>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Centered footer with social icons
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
            <Footer className="p-10 bg-base-200 text-base-content rounded footer-horizontal footer-center">
              <nav className="grid grid-flow-col gap-4">
                <button className="link link-hover">About us</button>
                <button className="link link-hover">Contact</button>
                <button className="link link-hover">Jobs</button>
                <button className="link link-hover">Press kit</button>
              </nav>
              <nav className="grid grid-flow-col gap-4">
                <button>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    className="fill-current"
                  >
                    <path d="M24 4.557c-.883.392-1.832 .656-2.828 .775 1.017-.609 1.798-1.574 2.165-2.724-.951 .564-2.005 .974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693 .188-1.452 .232-2.224 .084 .626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646 .962-.695 1.797-1.562 2.457-2.549z"></path>
                  </svg>
                </button>
                <button>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    className="fill-current"
                  >
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897 .266-4.356 2.62-4.385 8.816 .029 6.185 .484 8.549 4.385 8.816 3.6 .245 11.626 .246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"></path>
                  </svg>
                </button>
                <button>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    className="fill-current"
                  >
                    <path d="M9 8h-3v4h3v12h5v-12h3.642l .358-4h-4v-1.667c0-.955 .192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"></path>
                  </svg>
                </button>
              </nav>
              <aside>
                <p className="text-sm mt-3 mb-3">
                  Copyright © {new Date().getFullYear()} - All right reserved by ACME Industries Ltd
                </p>
              </aside>
            </Footer>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Footer className="p-10 bg-base-200 text-base-content rounded footer-horizontal footer-center">
  <nav className="grid grid-flow-col gap-4">
    <button className="link link-hover">About us</button>
    <button className="link link-hover">Contact</button>
    <button className="link link-hover">Jobs</button>
    <button className="link link-hover">Press kit</button>
  </nav>
  <nav className="grid grid-flow-col gap-4">
    <button>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className="fill-current">
        <path d="M24 4.557c-.883.392-1.832 .656-2.828 .775 1.017-.609 1.798-1.574 2.165-2.724-.951 .564-2.005 .974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693 .188-1.452 .232-2.224 .084 .626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646 .962-.695 1.797-1.562 2.457-2.549z"></path>
      </svg>
    </button>
    <button>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className="fill-current">
        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897 .266-4.356 2.62-4.385 8.816 .029 6.185 .484 8.549 4.385 8.816 3.6 .245 11.626 .246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"></path>
      </svg>
    </button>
    <button>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className="fill-current">
        <path d="M9 8h-3v4h3v12h5v-12h3.642l .358-4h-4v-1.667c0-.955 .192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"></path>
      </svg>
    </button>
  </nav>
  <aside>
    <p className="text-sm mt-3 mb-3">Copyright © {new Date().getFullYear()} - All right reserved by ACME Industries Ltd</p>
  </aside>
</Footer>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Two footer</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabTwo.value}
            onChange={k => (tabTwo.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabTwo.value === 'preview' ? (
            <div className="w-full">
              <Footer className="footer sm:footer-horizontal bg-base-200 text-base-content p-10">
                <nav>
                  <h6 className="footer-title">Services</h6>
                  <a className="link link-hover">Branding</a>
                  <a className="link link-hover">Design</a>
                  <a className="link link-hover">Marketing</a>
                  <a className="link link-hover">Advertisement</a>
                </nav>
                <nav>
                  <h6 className="footer-title">Company</h6>
                  <a className="link link-hover">About us</a>
                  <a className="link link-hover">Contact</a>
                  <a className="link link-hover">Jobs</a>
                  <a className="link link-hover">Press kit</a>
                </nav>
                <nav>
                  <h6 className="footer-title">Legal</h6>
                  <a className="link link-hover">Terms of use</a>
                  <a className="link link-hover">Privacy policy</a>
                  <a className="link link-hover">Cookie policy</a>
                </nav>
              </Footer>
              <Footer className="footer bg-base-200 text-base-content border-base-300 border-t px-10 py-4">
                <aside className="grid-flow-col items-center">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    className="fill-current"
                  >
                    <path d="M22.672 15.226l-2.432.811.841 2.515c.33 1.019-.209 2.127-1.23 2.456-1.15.325-2.148-.321-2.463-1.226l-.84-2.518-5.013 1.677.84 2.517c.391 1.203-.434 2.542-1.831 2.542-.88 0-1.601-.564-1.86-1.314l-.842-2.516-2.431.809c-1.135.328-2.145-.317-2.463-1.229-.329-1.018.211-2.127 1.231-2.456l2.432-.809-1.621-4.823-2.432.808c-1.355.384-2.558-.59-2.558-1.839 0-.817.509-1.582 1.327-1.846l2.433-.809-.842-2.515c-.33-1.02.211-2.129 1.232-2.458 1.02-.329 2.13.209 2.461 1.229l.842 2.515 5.011-1.677-.839-2.517c-.403-1.238.484-2.553 1.843-2.553.819 0 1.585.509 1.85 1.326l.841 2.517 2.431-.81c1.02-.33 2.131.211 2.461 1.229.332 1.018-.21 2.126-1.23 2.456l-2.433.809 1.622 4.823 2.433-.809c1.242-.401 2.557.484 2.557 1.838 0 .819-.51 1.583-1.328 1.847m-8.992-6.428l-5.01 1.675 1.619 4.828 5.011-1.674-1.62-4.829z"></path>
                  </svg>
                  <p className="text-sm mt-3 mb-3">
                    ACME Industries Ltd.
                    <br />
                    Providing reliable tech since 1992
                  </p>
                </aside>
                <nav className="md:place-self-center md:justify-self-end">
                  <div className="grid grid-flow-col gap-4">
                    <a>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        className="fill-current"
                      >
                        <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"></path>
                      </svg>
                    </a>
                    <a>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        className="fill-current"
                      >
                        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"></path>
                      </svg>
                    </a>
                    <a>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        className="fill-current"
                      >
                        <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"></path>
                      </svg>
                    </a>
                  </div>
                </nav>
              </Footer>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="w-full">
<Footer className="footer sm:footer-horizontal bg-base-200 text-base-content p-10">
  <nav>
    <h6 className="footer-title">Services</h6>
    <a className="link link-hover">Branding</a>
    <a className="link link-hover">Design</a>
    <a className="link link-hover">Marketing</a>
    <a className="link link-hover">Advertisement</a>
  </nav>
  <nav>
    <h6 className="footer-title">Company</h6>
    <a className="link link-hover">About us</a>
    <a className="link link-hover">Contact</a>
    <a className="link link-hover">Jobs</a>
    <a className="link link-hover">Press kit</a>
  </nav>
  <nav>
    <h6 className="footer-title">Legal</h6>
    <a className="link link-hover">Terms of use</a>
    <a className="link link-hover">Privacy policy</a>
    <a className="link link-hover">Cookie policy</a>
  </nav>
</Footer>
<Footer className="footer bg-base-200 text-base-content border-base-300 border-t px-10 py-4">
  <aside className="grid-flow-col items-center">
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fillRule="evenodd"
      clipRule="evenodd"
      className="fill-current">
      <path
        d="M22.672 15.226l-2.432.811.841 2.515c.33 1.019-.209 2.127-1.23 2.456-1.15.325-2.148-.321-2.463-1.226l-.84-2.518-5.013 1.677.84 2.517c.391 1.203-.434 2.542-1.831 2.542-.88 0-1.601-.564-1.86-1.314l-.842-2.516-2.431.809c-1.135.328-2.145-.317-2.463-1.229-.329-1.018.211-2.127 1.231-2.456l2.432-.809-1.621-4.823-2.432.808c-1.355.384-2.558-.59-2.558-1.839 0-.817.509-1.582 1.327-1.846l2.433-.809-.842-2.515c-.33-1.02.211-2.129 1.232-2.458 1.02-.329 2.13.209 2.461 1.229l.842 2.515 5.011-1.677-.839-2.517c-.403-1.238.484-2.553 1.843-2.553.819 0 1.585.509 1.85 1.326l.841 2.517 2.431-.81c1.02-.33 2.131.211 2.461 1.229.332 1.018-.21 2.126-1.23 2.456l-2.433.809 1.622 4.823 2.433-.809c1.242-.401 2.557.484 2.557 1.838 0 .819-.51 1.583-1.328 1.847m-8.992-6.428l-5.01 1.675 1.619 4.828 5.011-1.674-1.62-4.829z"></path>
    </svg>
    <p className="text-sm mt-3 mb-3">
      ACME Industries Ltd.
      <br />
      Providing reliable tech since 1992
    </p>
  </aside>
  <nav className="md:place-self-center md:justify-self-end">
    <div className="grid grid-flow-col gap-4">
      <a>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          className="fill-current">
          <path
            d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"></path>
        </svg>
      </a>
      <a>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          className="fill-current">
          <path
            d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"></path>
        </svg>
      </a>
      <a>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          className="fill-current">
          <path
            d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"></path>
        </svg>
      </a>
    </div>
  </nav>
</Footer>
</div>`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default FooterDemo
