import { type FC, ref } from '@rue-js/rue'

const count = ref(0)

const VaporJSXDemo: FC = () => (
  <div className="max-w-sm mx-auto p-6">
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h2 className="card-title text-primary">Vapor JSX Demo</h2>
        <div className="flex items-center gap-3">
          <button className="btn btn-primary btn-sm" onClick={() => count.value++}>
            加1
          </button>
          <span id="n" className="text-2xl font-bold text-primary">
            {count.value}
          </span>
        </div>
      </div>
    </div>
  </div>
)

export default VaporJSXDemo
