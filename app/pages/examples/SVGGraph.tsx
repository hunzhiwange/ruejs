import { type FC, computed, reactive, ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

type Stat = { label: string; value: number }

function valueToPoint(value: number, index: number, total: number) {
  const x = 0
  const y = -value * 0.8
  const angle = ((Math.PI * 2) / total) * index
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const tx = x * cos - y * sin + 100
  const ty = x * sin + y * cos + 100
  return { x: tx, y: ty }
}

const AxisLabel: FC<{ stat: Stat; index: number; total: number }> = props => {
  const point = computed(() => valueToPoint(+props.stat.value + 10, props.index, props.total))
  return (
    <text x={point.get().x} y={point.get().y}>
      {props.stat.label}
    </text>
  )
}

const PolyGraph: FC<{ stats: Stat[] }> = props => {
  const points = computed(() => {
    const total = props.stats.length
    return props.stats
      .map((stat, i) => {
        const { x, y } = valueToPoint(stat.value, i, total)
        return `${x},${y}`
      })
      .join(' ')
  })
  return (
    <g>
      <polygon points={points.get()}></polygon>
      <circle cx={100} cy={100} r={80}></circle>
      {props.stats.map((stat, index) => (
        <AxisLabel key={stat.label + index} stat={stat} index={index} total={props.stats.length} />
      ))}
    </g>
  )
}

const SVGGraph: FC = () => {
  const newLabel = ref('')
  const stats = reactive<Stat[]>([
    { label: 'A', value: 100 },
    { label: 'B', value: 100 },
    { label: 'C', value: 100 },
    { label: 'D', value: 100 },
    { label: 'E', value: 100 },
    { label: 'F', value: 100 },
  ])

  const activeTab = ref<'preview' | 'code'>('preview')

  const add = (e: any) => {
    e.preventDefault()
    if (!newLabel.value.trim()) return
    stats.push({ label: newLabel.value, value: 100 })
    newLabel.value = ''
  }
  const remove = (stat: Stat) => {
    if (stats.length > 3) {
      stats.splice(stats.indexOf(stat), 1)
    } else {
      alert("Can't delete more!")
    }
  }

  const updateValue = (s: Stat, e: any) => {
    s.value = Number((e.target as HTMLInputElement).value)
  }

  return (
    <SidebarPlayground>
      <style>{`
.rue-svg-graph { padding: 10px; }
.rue-svg-graph polygon { fill: #42b983; opacity: 0.75; }
.rue-svg-graph circle { fill: transparent; stroke: #999; }
.rue-svg-graph text { font-size: 10px; fill: #666; }
.rue-svg-graph label { display: inline-block; margin-left: 10px; width: 20px; }
.rue-svg-graph #raw {  background: #f5f5f5; padding: 10px; }
`}</style>
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">SVG 图像（移植自 Vue）</h1>

      <div role="tablist" className="tabs tabs-box">
        <button
          role="tab"
          className={`tab ${activeTab.value === 'preview' ? 'tab-active' : ''}`}
          onClick={() => {
            activeTab.value = 'preview'
          }}
        >
          效果
        </button>
        <button
          role="tab"
          className={`tab ${activeTab.value === 'code' ? 'tab-active' : ''}`}
          onClick={() => {
            activeTab.value = 'code'
          }}
        >
          代码
        </button>
      </div>

      <div className="mt-4 grid md:grid-cols-1 gap-6 items-start">
        {activeTab.value === 'code' && (
          <div className="card bg-base-100 shadow overflow-auto h-[360px] md:h-[720px]">
            <Code
              className="h-full"
              lang="tsx"
              code={`import { type FC, ref, reactive, computed } from '@rue-js/rue';

type Stat = { label: string; value: number };

function valueToPoint(value: number, index: number, total: number) {
  const x = 0;
  const y = -value * 0.8;
  const angle = ((Math.PI * 2) / total) * index;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tx = x * cos - y * sin + 100;
  const ty = x * sin + y * cos + 100;
  return { x: tx, y: ty };
}

const AxisLabel: FC<{ stat: Stat; index: number; total: number }> = (props) => {
  const point = computed(() => valueToPoint(+props.stat.value + 10, props.index, props.total));
  return <text x={point.value.x} y={point.value.y}>{props.stat.label}</text>;
};

const PolyGraph: FC<{ stats: Stat[] }> = (props) => {
  const points = computed(() => {
    const total = props.stats.length;
    return props.stats
      .map((stat, i) => {
        const { x, y } = valueToPoint(stat.value, i, total);
        return '\${x},\${y}';
      })
      .join(' ');
  });
  return (
    <g>
      <polygon points={points.value}></polygon>
      <circle cx={100} cy={100} r={80}></circle>
      {props.stats.map((stat, index) => (
        <AxisLabel key={stat.label + index} stat={stat} index={index} total={props.stats.length} />
      ))}
    </g>
  );
};

const SVGGraph: FC = () => {
  const newLabel = ref('');
  const stats = reactive<Stat[]>([
    { label: 'A', value: 100 },
    { label: 'B', value: 100 },
    { label: 'C', value: 100 },
    { label: 'D', value: 100 },
    { label: 'E', value: 100 },
    { label: 'F', value: 100 },
  ]);
  const add = (e: any) => { e.preventDefault(); if (!newLabel.value.trim()) return; stats.push({ label: newLabel.value, value: 100 }); newLabel.value = ''; };
  const remove = (stat: Stat) => { if (stats.length > 3) { stats.splice(stats.indexOf(stat), 1); } else { alert("Can't delete more!"); } };
  const updateValue = (s: Stat, e: any) => { s.value = Number((e.target as HTMLInputElement).value); };
  return (
      <>
      <style>{\`
.rue-svg-graph { padding: 10px; }
.rue-svg-graph polygon { fill: #42b983; opacity: 0.75; }
.rue-svg-graph circle { fill: transparent; stroke: #999; }
.rue-svg-graph text { font-size: 10px; fill: #666; }
.rue-svg-graph label { display: inline-block; margin-left: 10px; width: 20px; }
.rue-svg-graph .raw { padding: 10px; }
\`}</style>
      <div className="card bg-base-100 shadow">
        <div className="card-body grid gap-4 rue-svg-graph">
          <svg width={200} height={200}>
            <PolyGraph stats={stats} />
          </svg>
          <div className="grid gap-3">
            {stats.map(stat => (
              <div key={stat.label} className="flex items-center gap-3">
                <label>{stat.label}</label>
                <input
                  type="range"
                  className="range range-primary flex-1"
                  value={stat.value}
                  min={0}
                  max={100}
                  onInput={(e: any) => updateValue(stat, e)}
                />
                <span className="w-10 text-right">{stat.value}</span>
                <button className="btn btn-error btn-sm" onClick={() => remove(stat)}>
                  X
                </button>
              </div>
            ))}
          </div>
          <form className="flex items-center gap-2" onSubmit={add}>
            <input
              name="newlabel"
              className="input input-bordered"
              value={newLabel.value}
              onInput={(e: any) => {
                newLabel.value = (e.target as HTMLInputElement).value
              }}
            />
            <button className="btn btn-success" onClick={add}>
              Add a Stat
            </button>
          </form>
          <pre className="raw">{JSON.stringify(stats, null, 2)}</pre>
        </div>
      </div>
    </>
  );
};

export default SVGGraph;`}
            />
          </div>
        )}

        {activeTab.value === 'preview' && (
          <div className="card bg-base-100 shadow">
            <div className="card-body grid gap-4 rue-svg-graph">
              <svg width={200} height={200}>
                <PolyGraph stats={stats} />
              </svg>
              <div className="grid gap-3">
                {stats.map(stat => (
                  <div key={stat.label} className="flex items-center gap-3">
                    <label>{stat.label}</label>
                    <input
                      type="range"
                      className="range range-primary flex-1"
                      value={stat.value}
                      min={0}
                      max={100}
                      onInput={(e: any) => updateValue(stat, e)}
                    />
                    <span className="w-10 text-right">{stat.value}</span>
                    <button className="btn btn-error btn-sm" onClick={() => remove(stat)}>
                      X
                    </button>
                  </div>
                ))}
              </div>
              <form className="flex items-center gap-2" onSubmit={add}>
                <input
                  name="newlabel"
                  className="input input-bordered"
                  value={newLabel.value}
                  onInput={(e: any) => {
                    newLabel.value = (e.target as HTMLInputElement).value
                  }}
                />
                <button className="btn btn-success" onClick={add}>
                  Add a Stat
                </button>
              </form>
              <pre className="raw">{JSON.stringify(stats, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default SVGGraph
