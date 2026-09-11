import { type FC } from '@rue-js/rue'
import { useI18n } from '@rue-js/i18n'
import DocSearchBox from '../DocSearchBox'

const shouldRenderClientWidgets = !import.meta.env.SSR

const Header: FC = () => {
  const { _ } = useI18n()

  return (
    <header className="site-header fixed top-0 left-0 right-0 z-50 w-full">
      <div className="navbar bg-transparent max-w-[1400px] mx-auto w-full px-6 items-center">
        <div className="navbar-start gap-4">
          <a href="/" className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-lg ring-1 ring-white/30">
              <span className="text-white font-extrabold text-[32px] md:text-[50px]">R</span>
            </span>
            <span className="text-lg md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
              {_('后悔药 Rue.js')}
            </span>
          </a>
          {shouldRenderClientWidgets ? <DocSearchBox /> : null}
        </div>
        <nav className="navbar-center hidden md:flex" aria-label={_('主导航')}>
          <ul className="menu menu-horizontal px-1 text-sm">
            <li>
              <a href="/" className="btn btn-ghost btn-sm">
                {_('首页')}
              </a>
            </li>
            <li className="site-nav-dropdown relative">
              <button
                type="button"
                className="btn btn-ghost btn-sm site-nav-trigger"
                aria-haspopup="menu"
              >
                {_('文档')}
              </button>
              <ul className="site-nav-submenu menu bg-base-100 rounded-box z-50 w-35 p-2 dropdown-panel text-center">
                <li>
                  <a href="/guide/guide/introduction">{_('深度指南')}</a>
                </li>
                <li>
                  <a href="/examples/hello-world">{_('实战例子')}</a>
                </li>
                <li>
                  <a href="/guide/guide/quick-start">{_('快速上手')}</a>
                </li>
                <li>
                  <a href="/page/routing">{_('路由指南')}</a>
                </li>
                <li>
                  <a href="/page/glossary/index">{_('术语表')}</a>
                </li>
                <li>
                  <a href="/page/error-reference/index">{_('错误代码参考')}</a>
                </li>
              </ul>
            </li>
            <li>
              <a href="/api/api/index" className="btn btn-ghost btn-sm">
                API
              </a>
            </li>
            <li className="site-nav-dropdown relative">
              <button
                type="button"
                className="btn btn-ghost btn-sm site-nav-trigger"
                aria-haspopup="menu"
              >
                {_('生态')}
              </button>
              <ul className="site-nav-submenu menu bg-base-100 rounded-box z-50 w-35 p-2 dropdown-panel text-center">
                <li>
                  <a href="/page/partners/index">{_('合作伙伴')}</a>
                </li>
                <li>
                  <a href="/plugins">{_('插件')}</a>
                </li>
                <li>
                  <a href="/design/button">{_('组件库')}</a>
                </li>
                <li>
                  <a href="/guide/guide/scaling-up/tooling">{_('工具链')}</a>
                </li>
                <li>
                  <a href="/textjs">Text.js</a>
                </li>
                <li>
                  <a href="/page/ecosystem/newsletters">{_('新闻简报')}</a>
                </li>
              </ul>
            </li>
            <li className="site-nav-dropdown relative">
              <button
                type="button"
                className="btn btn-ghost btn-sm site-nav-trigger"
                aria-haspopup="menu"
              >
                {_('关于')}
              </button>
              <ul className="site-nav-submenu menu bg-base-100 rounded-box z-50 w-35 p-2 dropdown-panel text-center">
                <li>
                  <a href="/page/about/faq">{_('常见问题')}</a>
                </li>
                <li>
                  <a href="/page/about/team">{_('团队')}</a>
                </li>
                <li>
                  <a href="/page/about/releases">{_('版本发布')}</a>
                </li>
                <li>
                  <a href="/page/about/community-guide">{_('社区指南')}</a>
                </li>
                <li>
                  <a href="/page/about/coc">{_('行为规范')}</a>
                </li>
                <li>
                  <a href="/page/about/privacy">{_('隐私政策')}</a>
                </li>
              </ul>
            </li>
            <li>
              <a href="/page/sponsor/index" className="btn btn-ghost btn-sm">
                {_('赞助')}
              </a>
            </li>
            <li>
              <a href="/page/partners/index" className="btn btn-ghost btn-sm">
                {_('合作伙伴')}
              </a>
            </li>
          </ul>
        </nav>
        <div className="navbar-end gap-2 items-center">
          <a href="/settings" className="btn btn-ghost btn-sm">
            {_('设置')}
          </a>
        </div>
      </div>
    </header>
  )
}

const Footer: FC = () => {
  const { _ } = useI18n()

  return (
    <footer className="w-full bg-base-200 overflow-hidden">
      <div className="max-w-[1100px] mx-auto w-full px-6 py-12 grid gap-8 grid-cols-1 md:grid-cols-3">
        <div>
          <div className="text-base-content font-semibold mb-2">{_('文档')}</div>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/jsx/basic-elements" className="hover:underline">
                {_('深度指南')}
              </a>
            </li>
            <li>
              <a href="/examples/hello-world" className="hover:underline">
                {_('实战例子')}
              </a>
            </li>
            <li>
              <a href="/guide/guide/quick-start" className="hover:underline">
                {_('快速上手')}
              </a>
            </li>
            <li>
              <a href="/page/glossary/index" className="hover:underline">
                {_('术语表')}
              </a>
            </li>
            <li>
              <a href="/page/error-reference/index" className="hover:underline">
                {_('错误码参照表')}
              </a>
            </li>
          </ul>
        </div>
        <div>
          <div className="text-base-content font-semibold mb-2">{_('关于')}</div>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/page/about/faq" className="hover:underline">
                {_('常见问题')}
              </a>
            </li>
            <li>
              <a href="/page/about/team" className="hover:underline">
                {_('团队')}
              </a>
            </li>
            <li>
              <a href="/page/about/releases" className="hover:underline">
                {_('版本发布')}
              </a>
            </li>
            <li>
              <a href="/page/about/community-guide" className="hover:underline">
                {_('社区指南')}
              </a>
            </li>
          </ul>
        </div>
        <div>
          <div className="text-base-content font-semibold mb-2">{_('生态')}</div>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/plugins" className="hover:underline">
                {_('插件')}
              </a>
            </li>
            <li>
              <a href="/design/button" className="hover:underline">
                {_('组件库')}
              </a>
            </li>
            <li>
              <a href="/page/routing" className="hover:underline">
                {_('路由指南')}
              </a>
            </li>
            <li>
              <a href="/textjs" className="hover:underline">
                Text.js
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="text-center text-xs text-base-content/60 pb-8">
          © 2024-{new Date().getFullYear()} Xiangmin Liu
        </div>
      </div>
      <div className="mx-auto w-full px-6 pb-4 text-center">
        <div className="flex select-none items-end justify-center gap-6 whitespace-nowrap text-[clamp(12rem,28vw,26rem)] font-black leading-none bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent md:gap-10">
          <span>Rue</span>
          <span className="pl-1">.JS</span>
        </div>
      </div>
    </footer>
  )
}

const SiteLayout: FC<{ title?: string }> = props => {
  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <Header />
      <main className="min-h-[60vh] pt-24">
        <div className="max-w-[1400px] mx-auto px-6 py-10">{props.children}</div>
      </main>
      <Footer />
    </div>
  )
}

export default SiteLayout
