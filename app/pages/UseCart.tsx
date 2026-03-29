import { type FC, onBeforeCreate, onBeforeUnmount, onCreated, onMounted } from '@rue-js/rue'
import { useCart } from '../hooks/useCart'
const UseCart: FC = () => {
  const cart = useCart()
  const products = [
    { id: 1, name: '苹果', price: 3 },
    { id: 2, name: '香蕉', price: 2 },
    { id: 3, name: '橘子', price: 4 },
  ]
  onBeforeCreate(() => {
    console.info('UseCart beforeCreate')
  })
  onCreated(() => {
    console.info('UseCart created')
  })
  onMounted(() => {
    console.info('UseCart mounted')
  })
  onBeforeUnmount(() => {
    console.info('UseCart will unmount, cleanup here')
  })
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">购物车示例（useCart）</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map(pr => (
              <div key={pr.id} className="card bg-base-100 border">
                <div className="card-body flex-row items-center justify-between gap-4">
                  <span className="text-base-content">
                    {pr.name} ￥{pr.price}
                  </span>
                  <button className="btn btn-primary btn-sm" onClick={() => cart.add(pr)}>
                    加入
                  </button>
                </div>
              </div>
            ))}
          </div>
          <h3 className="mt-4 text-xl font-semibold">购物车</h3>
          {cart.items.value.length === 0 ? (
            <div className="alert">购物车为空</div>
          ) : (
            <ul className="divide-y divide-base-200 mt-2">
              {cart.items.value.map(i => (
                <li key={i.id} className="flex items-center justify-between py-3">
                  <span className="text-base-content">
                    {i.name} <span className="badge badge-neutral ml-1">x {i.qty}</span>
                  </span>
                  <button
                    className="btn btn-error btn-ghost btn-sm"
                    onClick={() => cart.remove(i.id)}
                  >
                    移除
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-right text-lg font-medium">总价：￥{cart.total.get()}</p>
          <div className="card-actions justify-end">
            <button className="btn btn-outline" onClick={cart.clear}>
              清空
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
export default UseCart
