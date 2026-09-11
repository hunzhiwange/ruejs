import { renderToString } from '@rue-js/server-renderer'
import type { FC } from '@rue-js/rue'
import About from './pages/About'
import Counter from './pages/Counter'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import './style.css'

const ServerShell: FC = props => (
  <main class="shell">
    <nav class="nav">
      <a href="/">Home</a>
      <a href="/about">About</a>
      <a href="/dashboard">Dashboard</a>
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
const DashboardDocument: FC = () => (
  <ServerShell>
    <Dashboard />
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
  return {
    html:
      url === '/'
        ? await renderToString(HomeDocument)
        : url === '/about'
          ? await renderToString(AboutDocument)
          : url === '/dashboard'
            ? await renderToString(DashboardDocument)
            : url === '/counter'
              ? await renderToString(CounterDocument)
              : await renderToString(NotFoundDocument),
    status: ['/', '/about', '/dashboard', '/counter'].includes(url) ? 200 : 404,
  }
}
