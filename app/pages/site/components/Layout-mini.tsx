import { type FC } from 'rue-js'
import { RouterLink } from '@rue-js/router'

const SiteLayout: FC<{ title?: string }> = props => {
  return (
    <ul className="min-h-screen bg-base-100 text-base-content">
      <li>
        <RouterLink to="/" className="hover:underline">
          首页
        </RouterLink>
      </li>
      <li>
        <RouterLink to="/plugins" className="hover:underline">
          插件
        </RouterLink>
      </li>
      <li>
        <RouterLink to="/about" className="hover:underline">
          关于
        </RouterLink>
      </li>
      <li>
        <RouterLink to="/guide/guide/essentials/class-and-style" className="hover:underline">
          文档
        </RouterLink>
      </li>

      <li>
        <RouterLink to="/guide/guide/essentials/component-basics" className="hover:underline">
          文档2
        </RouterLink>
      </li>

      <div className="border-t border-base-300">{props.children}</div>
    </ul>
  )
}

export default SiteLayout
