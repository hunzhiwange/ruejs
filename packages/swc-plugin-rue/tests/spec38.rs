//! SWC 插件转换行为测试（spec38）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn transforms_spec38() {
    let src = r##"
import { type FC, useEffect, useState } from 'rue-js'
import { RouterLink, useRoute } from '@rue-js/router'

const ThemePicker: FC<{ value: string; onChange: (t: string) => void }> = props => {
  const themes = [
    'light',
    'dark',
    'cupcake',
    'bumblebee',
    'emerald',
    'corporate',
    'synthwave',
    'retro',
    'cyberpunk',
    'valentine',
    'halloween',
    'garden',
    'forest',
    'aqua',
    'lofi',
    'pastel',
    'fantasy',
    'wireframe',
    'black',
    'luxury',
    'dracula',
    'cmyk',
    'autumn',
    'business',
    'acid',
    'lemonade',
    'night',
    'coffee',
    'winter',
    'dim',
    'nord',
    'sunset',
  ]
  const labels: Record<string, string> = {
    light: '亮色',
    dark: '暗色',
    cupcake: '纸杯蛋糕',
    bumblebee: '大黄蜂',
    emerald: '祖母绿',
    corporate: '企业',
    synthwave: '合成波',
    retro: '复古',
    cyberpunk: '赛博朋克',
    valentine: '情人节',
    halloween: '万圣节',
    garden: '花园',
    forest: '森林',
    aqua: '海洋蓝',
    lofi: '低保真',
    pastel: '粉彩',
    fantasy: '奇幻',
    wireframe: '线框',
    black: '黑色',
    luxury: '奢华',
    dracula: '德古拉',
    cmyk: 'CMYK',
    autumn: '秋天',
    business: '商务',
    acid: '酸性',
    lemonade: '柠檬水',
    night: '夜间',
    coffee: '咖啡',
    winter: '冬季',
    dim: '昏暗',
    nord: '北欧',
    sunset: '日落',
  }
  return (
    <select
      aria-label="切换主题"
      className="select select-bordered select-sm bg-transparent"
      value={props.value}
      onChange={(e: Event) => props.onChange((e.currentTarget as HTMLSelectElement).value)}
    >
      {themes.map(name => (
        <option key={name} value={name}>
          {labels[name] ? `${labels[name]} (${name})` : name}
        </option>
      ))}
    </select>
  )
}

const Header: FC<{ theme: string; setTheme: (t: string) => void }> = p => {
  const [open, setOpen] = useState<string | null>(null)
  const route = useRoute()
  useEffect(() => {
    setOpen(null)
  }, [route.value.path])
  useEffect(() => {
    const g: any = globalThis
    const handler = (e: any) => {
      const el = e.target as HTMLElement
      if (!el || !(el.closest && el.closest('.dropdown'))) setOpen(null)
    }
    if (g && g.addEventListener) g.addEventListener('pointerdown', handler)
    return () => {
      if (g && g.removeEventListener) g.removeEventListener('pointerdown', handler)
    }
  }, [])
  return (
    <header className="site-header fixed top-0 left-0 right-0 z-50 w-full">
      <div className="navbar bg-transparent max-w-[1400px] mx-auto w-full px-6 items-center">
        <div className="navbar-start">
          <RouterLink to="/" className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-lg ring-1 ring-white/30">
              <span className="text-white font-extrabold text-[32px] md:text-[50px]">R</span>
            </span>
            <span className="text-1xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
              Rue.js
            </span>
          </RouterLink>
        </div>
        <div className="navbar-center hidden md:flex">
          <ul className="menu menu-horizontal px-1 text-sm">
            <li>
              <RouterLink to="/" className="btn btn-ghost btn-sm">
                首页
              </RouterLink>
            </li>
            <li
              className={`dropdown relative ${open.value === 'docs' ? 'dropdown-open' : ''}`}
              onMouseEnter={() => setOpen('docs')}
              onMouseLeave={() => setOpen(null)}
            >
              <RouterLink to="/page" className="btn btn-ghost btn-sm">
                文档
              </RouterLink>
              <ul
                className="dropdown-content menu bg-base-100 rounded-box z-50 w-35 p-2 shadow dropdown-panel top-full left-1/2 -translate-x-1/2 text-center"
                onMouseLeave={() => setOpen(null)}
              >
                <li>
                  <RouterLink to="/guide/guide/introduction" onMouseDown={() => setOpen(null)}>
                    深度指南
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/examples/hello-world" onMouseDown={() => setOpen(null)}>
                    实战例子
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/guide/guide/quick-start" onMouseDown={() => setOpen(null)}>
                    快速上手
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/page/routing" onMouseDown={() => setOpen(null)}>
                    路由指南
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/page/glossary/index" onMouseDown={() => setOpen(null)}>
                    术语表
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/page/error-reference/index" onMouseDown={() => setOpen(null)}>
                    错误代码参考
                  </RouterLink>
                </li>
              </ul>
            </li>
            <li>
              <RouterLink to="/api/api/index" className="btn btn-ghost btn-sm">
                API
              </RouterLink>
            </li>
            <li
              className={`dropdown relative ${open.value === 'ecosystem' ? 'dropdown-open' : ''}`}
              onMouseEnter={() => setOpen('ecosystem')}
              onMouseLeave={() => setOpen(null)}
            >
              <RouterLink to="" className="btn btn-ghost btn-sm">
                生态
              </RouterLink>
              <ul
                className="dropdown-content menu bg-base-100 rounded-box z-50 w-35 p-2 shadow dropdown-panel top-full left-1/2 -translate-x-1/2 text-center"
                onMouseLeave={() => setOpen(null)}
              >
                <li>
                  <RouterLink to="/page/partners/index" onMouseDown={() => setOpen(null)}>
                    合作伙伴
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/plugins" onMouseDown={() => setOpen(null)}>
                    插件
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/design/button" onMouseDown={() => setOpen(null)}>
                    组件库
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/page/guide/scaling-up/tooling" onMouseDown={() => setOpen(null)}>
                    工具链
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/page/ecosystem/newsletters" onMouseDown={() => setOpen(null)}>
                    新闻简报
                  </RouterLink>
                </li>
              </ul>
            </li>
            <li
              className={`dropdown relative ${open.value === 'about' ? 'dropdown-open' : ''}`}
              onMouseEnter={() => setOpen('about')}
              onMouseLeave={() => setOpen(null)}
            >
              <RouterLink to="/rue/guide" className="btn btn-ghost btn-sm">
                关于
              </RouterLink>
              <ul
                className="dropdown-content menu bg-base-100 rounded-box z-50 w-35 p-2 shadow dropdown-panel top-full left-1/2 -translate-x-1/2 text-center"
                onMouseLeave={() => setOpen(null)}
              >
                <li>
                  <RouterLink to="/page/about/faq" onMouseDown={() => setOpen(null)}>
                    常见问题
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/page/about/team" onMouseDown={() => setOpen(null)}>
                    团队
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/page/about/releases" onMouseDown={() => setOpen(null)}>
                    版本发布
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/page/about/community-guide" onMouseDown={() => setOpen(null)}>
                    社区指南
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/page/about/coc" onMouseDown={() => setOpen(null)}>
                    行为规范
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/page/about/privacy" onMouseDown={() => setOpen(null)}>
                    隐私政策
                  </RouterLink>
                </li>
              </ul>
            </li>
            <li>
              <RouterLink to="/page/sponsor/index" className="btn btn-ghost btn-sm">
                赞助
              </RouterLink>
            </li>
            <li>
              <RouterLink to="/page/partners/index" className="btn btn-ghost btn-sm">
                合作伙伴
              </RouterLink>
            </li>
          </ul>
        </div>
        <div className="navbar-end gap-2 items-center">
          <div className="md:hidden">
            <ThemePicker value={p.theme} onChange={p.setTheme} />
          </div>
          <div className="hidden md:block">
            <ThemePicker value={p.theme} onChange={p.setTheme} />
          </div>
        </div>
      </div>
    </header>
  )
}

const Footer: FC = () => (
  <footer className="w-full bg-base-200">
    <div className="max-w-[1100px] mx-auto w-full px-6 py-12 grid gap-8 grid-cols-1 md:grid-cols-3">
      <div>
        <div className="text-base-content font-semibold mb-2">文档</div>
        <ul className="space-y-2 text-sm">
          <li>
            <RouterLink to="/jsx/basic-elements" className="hover:underline">
              深度指南
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/examples/hello-world" className="hover:underline">
              实战例子
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/guide/guide/quick-start" className="hover:underline">
              快速上手
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/page/glossary/index" className="hover:underline">
              术语表
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/page/error-reference/index" className="hover:underline">
              错误码参照表
            </RouterLink>
          </li>
        </ul>
      </div>
      <div>
        <div className="text-base-content font-semibold mb-2">关于</div>
        <ul className="space-y-2 text-sm">
          <li>
            <RouterLink to="/page/about/faq" className="hover:underline">
              常见问题
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/page/about/team" className="hover:underline">
              团队
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/page/about/releases" className="hover:underline">
              版本发布
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/page/about/community-guide" className="hover:underline">
              社区指南
            </RouterLink>
          </li>
        </ul>
      </div>
      <div>
        <div className="text-base-content font-semibold mb-2">生态</div>
        <ul className="space-y-2 text-sm">
          <li>
            <RouterLink to="/plugins" className="hover:underline">
              插件
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/design/button" className="hover:underline">
              组件库
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/page/routing" className="hover:underline">
              路由指南
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>
    <div className="max-w-[1100px] mx-auto px-6">
      <div className="text-center text-xs text-base-content/60 pb-8">
        © {new Date().getFullYear()} Rue.js
      </div>
    </div>
  </footer>
)

const SiteLayout: FC<{ title?: string }> = props => {
  const [theme, setTheme] = useState<string>(() => {
    const saved = localStorage.getItem('rue.theme')
    return saved || 'light'
  })
  useEffect(() => {
    localStorage.setItem('rue.theme', theme.value)
  }, [theme.value])
  return (
    <div className="min-h-screen bg-base-100 text-base-content" data-theme={theme.value}>
      <Header theme={theme.value} setTheme={t => setTheme(t)} />
      <main className="min-h-[60vh] pt-24">
        <div className="max-w-[1100px] mx-auto px-6 py-10">{props.children}</div>
      </main>
      <Footer />
    </div>
  )
}

export default SiteLayout
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, useEffect, useState, _$vaporWithHookId, useSetup } from 'rue-js';
import { RouterLink, useRoute } from '@rue-js/router';
const ThemePicker: FC<{
    value: string;
    onChange: (t: string) => void;
}> = (props)=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const themes = [
            'light',
            'dark',
            'cupcake',
            'bumblebee',
            'emerald',
            'corporate',
            'synthwave',
            'retro',
            'cyberpunk',
            'valentine',
            'halloween',
            'garden',
            'forest',
            'aqua',
            'lofi',
            'pastel',
            'fantasy',
            'wireframe',
            'black',
            'luxury',
            'dracula',
            'cmyk',
            'autumn',
            'business',
            'acid',
            'lemonade',
            'night',
            'coffee',
            'winter',
            'dim',
            'nord',
            'sunset'
        ];
        const labels: Record<string, string> = {
            light: '亮色',
            dark: '暗色',
            cupcake: '纸杯蛋糕',
            bumblebee: '大黄蜂',
            emerald: '祖母绿',
            corporate: '企业',
            synthwave: '合成波',
            retro: '复古',
            cyberpunk: '赛博朋克',
            valentine: '情人节',
            halloween: '万圣节',
            garden: '花园',
            forest: '森林',
            aqua: '海洋蓝',
            lofi: '低保真',
            pastel: '粉彩',
            fantasy: '奇幻',
            wireframe: '线框',
            black: '黑色',
            luxury: '奢华',
            dracula: '德古拉',
            cmyk: 'CMYK',
            autumn: '秋天',
            business: '商务',
            acid: '酸性',
            lemonade: '柠檬水',
            night: '夜间',
            coffee: '咖啡',
            winter: '冬季',
            dim: '昏暗',
            nord: '北欧',
            sunset: '日落'
        };
        return {
            themes: themes,
            labels: labels
        };
    }));
    const { themes: themes, labels: labels } = _$useSetup;
    return (<select aria-label="切换主题" className="select select-bordered select-sm bg-transparent" value={props.value} onChange={(e: Event)=>props.onChange((e.currentTarget as HTMLSelectElement).value)}>
      {themes.map((name)=>(<option key={name} value={name}>
          {labels[name] ? `${labels[name]} (${name})` : name}
        </option>))}
    </select>);
};
const Header: FC<{
    theme: string;
    setTheme: (t: string) => void;
}> = (p)=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const [open, setOpen] = _$vaporWithHookId("useState:1:0", ()=>useState<string | null>(null));
        const route = useRoute();
        _$vaporWithHookId("useEffect:1:1", ()=>useEffect(()=>{
                setOpen(null);
            }, [
                route.value.path
            ]));
        _$vaporWithHookId("useEffect:1:2", ()=>useEffect(()=>{
                const g: any = globalThis;
                const handler = (e: any)=>{
                    const el = e.target as HTMLElement;
                    if (!el || !(el.closest && el.closest('.dropdown'))) setOpen(null);
                };
                if (g && g.addEventListener) g.addEventListener('pointerdown', handler);
                return ()=>{
                    if (g && g.removeEventListener) g.removeEventListener('pointerdown', handler);
                };
            }, []));
        return {
            open: open,
            setOpen: setOpen,
            route: route
        };
    }));
    const { open: open, setOpen: setOpen, route: route } = _$useSetup;
    return (<header className="site-header fixed top-0 left-0 right-0 z-50 w-full">
      <div className="navbar bg-transparent max-w-[1400px] mx-auto w-full px-6 items-center">
        <div className="navbar-start">
          <RouterLink to="/" className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-lg ring-1 ring-white/30">
              <span className="text-white font-extrabold text-[32px] md:text-[50px]">R</span>
            </span>
            <span className="text-1xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
              Rue.js
            </span>
          </RouterLink>
        </div>
        <div className="navbar-center hidden md:flex">
          <ul className="menu menu-horizontal px-1 text-sm">
            <li>
              <RouterLink to="/" className="btn btn-ghost btn-sm">
                首页
              </RouterLink>
            </li>
            <li className={`dropdown relative ${open.value === 'docs' ? 'dropdown-open' : ''}`} onMouseEnter={()=>setOpen('docs')} onMouseLeave={()=>setOpen(null)}>
              <RouterLink to="/page" className="btn btn-ghost btn-sm">
                文档
              </RouterLink>
              <ul className="dropdown-content menu bg-base-100 rounded-box z-50 w-35 p-2 shadow dropdown-panel top-full left-1/2 -translate-x-1/2 text-center" onMouseLeave={()=>setOpen(null)}>
                <li>
                  <RouterLink to="/guide/guide/introduction" onMouseDown={()=>setOpen(null)}>
                    深度指南
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/examples/hello-world" onMouseDown={()=>setOpen(null)}>
                    实战例子
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/guide/guide/quick-start" onMouseDown={()=>setOpen(null)}>
                    快速上手
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/page/routing" onMouseDown={()=>setOpen(null)}>
                    路由指南
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/page/glossary/index" onMouseDown={()=>setOpen(null)}>
                    术语表
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/page/error-reference/index" onMouseDown={()=>setOpen(null)}>
                    错误代码参考
                  </RouterLink>
                </li>
              </ul>
            </li>
            <li>
              <RouterLink to="/api/api/index" className="btn btn-ghost btn-sm">
                API
              </RouterLink>
            </li>
            <li className={`dropdown relative ${open.value === 'ecosystem' ? 'dropdown-open' : ''}`} onMouseEnter={()=>setOpen('ecosystem')} onMouseLeave={()=>setOpen(null)}>
              <RouterLink to="" className="btn btn-ghost btn-sm">
                生态
              </RouterLink>
              <ul className="dropdown-content menu bg-base-100 rounded-box z-50 w-35 p-2 shadow dropdown-panel top-full left-1/2 -translate-x-1/2 text-center" onMouseLeave={()=>setOpen(null)}>
                <li>
                  <RouterLink to="/page/partners/index" onMouseDown={()=>setOpen(null)}>
                    合作伙伴
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/plugins" onMouseDown={()=>setOpen(null)}>
                    插件
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/design/button" onMouseDown={()=>setOpen(null)}>
                    组件库
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/page/guide/scaling-up/tooling" onMouseDown={()=>setOpen(null)}>
                    工具链
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/page/ecosystem/newsletters" onMouseDown={()=>setOpen(null)}>
                    新闻简报
                  </RouterLink>
                </li>
              </ul>
            </li>
            <li className={`dropdown relative ${open.value === 'about' ? 'dropdown-open' : ''}`} onMouseEnter={()=>setOpen('about')} onMouseLeave={()=>setOpen(null)}>
              <RouterLink to="/rue/guide" className="btn btn-ghost btn-sm">
                关于
              </RouterLink>
              <ul className="dropdown-content menu bg-base-100 rounded-box z-50 w-35 p-2 shadow dropdown-panel top-full left-1/2 -translate-x-1/2 text-center" onMouseLeave={()=>setOpen(null)}>
                <li>
                  <RouterLink to="/page/about/faq" onMouseDown={()=>setOpen(null)}>
                    常见问题
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/page/about/team" onMouseDown={()=>setOpen(null)}>
                    团队
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/page/about/releases" onMouseDown={()=>setOpen(null)}>
                    版本发布
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/page/about/community-guide" onMouseDown={()=>setOpen(null)}>
                    社区指南
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/page/about/coc" onMouseDown={()=>setOpen(null)}>
                    行为规范
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/page/about/privacy" onMouseDown={()=>setOpen(null)}>
                    隐私政策
                  </RouterLink>
                </li>
              </ul>
            </li>
            <li>
              <RouterLink to="/page/sponsor/index" className="btn btn-ghost btn-sm">
                赞助
              </RouterLink>
            </li>
            <li>
              <RouterLink to="/page/partners/index" className="btn btn-ghost btn-sm">
                合作伙伴
              </RouterLink>
            </li>
          </ul>
        </div>
        <div className="navbar-end gap-2 items-center">
          <div className="md:hidden">
            <ThemePicker value={p.theme} onChange={p.setTheme}/>
          </div>
          <div className="hidden md:block">
            <ThemePicker value={p.theme} onChange={p.setTheme}/>
          </div>
        </div>
      </div>
    </header>);
};
const Footer: FC = ()=>(<footer className="w-full bg-base-200">
    <div className="max-w-[1100px] mx-auto w-full px-6 py-12 grid gap-8 grid-cols-1 md:grid-cols-3">
      <div>
        <div className="text-base-content font-semibold mb-2">文档</div>
        <ul className="space-y-2 text-sm">
          <li>
            <RouterLink to="/jsx/basic-elements" className="hover:underline">
              深度指南
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/examples/hello-world" className="hover:underline">
              实战例子
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/guide/guide/quick-start" className="hover:underline">
              快速上手
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/page/glossary/index" className="hover:underline">
              术语表
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/page/error-reference/index" className="hover:underline">
              错误码参照表
            </RouterLink>
          </li>
        </ul>
      </div>
      <div>
        <div className="text-base-content font-semibold mb-2">关于</div>
        <ul className="space-y-2 text-sm">
          <li>
            <RouterLink to="/page/about/faq" className="hover:underline">
              常见问题
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/page/about/team" className="hover:underline">
              团队
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/page/about/releases" className="hover:underline">
              版本发布
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/page/about/community-guide" className="hover:underline">
              社区指南
            </RouterLink>
          </li>
        </ul>
      </div>
      <div>
        <div className="text-base-content font-semibold mb-2">生态</div>
        <ul className="space-y-2 text-sm">
          <li>
            <RouterLink to="/plugins" className="hover:underline">
              插件
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/design/button" className="hover:underline">
              组件库
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/page/routing" className="hover:underline">
              路由指南
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>
    <div className="max-w-[1100px] mx-auto px-6">
      <div className="text-center text-xs text-base-content/60 pb-8">
        © {new Date().getFullYear()} Rue.js
      </div>
    </div>
  </footer>);
const SiteLayout: FC<{
    title?: string;
}> = (props)=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const [theme, setTheme] = _$vaporWithHookId("useState:1:3", ()=>useState<string>(()=>{
                const saved = localStorage.getItem('rue.theme');
                return saved || 'light';
            }));
        _$vaporWithHookId("useEffect:1:4", ()=>useEffect(()=>{
                localStorage.setItem('rue.theme', theme.value);
            }, [
                theme.value
            ]));
        return {
            theme: theme,
            setTheme: setTheme
        };
    }));
    const { theme: theme, setTheme: setTheme } = _$useSetup;
    return (<div className="min-h-screen bg-base-100 text-base-content" data-theme={theme.value}>
      <Header theme={theme.value} setTheme={(t)=>setTheme(t)}/>
      <main className="min-h-[60vh] pt-24">
        <div className="max-w-[1100px] mx-auto px-6 py-10">{props.children}</div>
      </main>
      <Footer/>
    </div>);
};
export default SiteLayout;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec38.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
