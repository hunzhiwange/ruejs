import { renderToString } from '@rue-js/server-renderer'
import type { FC } from '@rue-js/rue'
import About from './pages/About'
import Counter from './pages/Counter'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import { staticRoutes } from './main'
import './style.css'

export { staticRoutes }

const ServerShell: FC = props => (
  <main class="shell">
    <nav class="nav">
      <a href="/">Home</a>
      <a href="/about">About</a>
      <a href="/counter">Counter</a>
    </nav>
    {props.children}
  </main>
)

const HomeDocument: FC = () => (
  <ServerShell>
    <Home />
  </ServerShell>
)
const AboutDocument: FC = () => (
  <ServerShell>
    <About />
  </ServerShell>
)
const CounterDocument: FC = () => (
  <ServerShell>
    <Counter />
  </ServerShell>
)
const NotFoundDocument: FC = () => (
  <ServerShell>
    <NotFound />
  </ServerShell>
)

export const render = async (url: string) => {
  if (url === '/') return renderToString(HomeDocument)
  if (url === '/about') return renderToString(AboutDocument)
  if (url === '/counter') return renderToString(CounterDocument)
  return renderToString(NotFoundDocument)
}
