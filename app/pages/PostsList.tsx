import type { FC } from 'rue-js'
import { RouterLink } from 'rue-router'

const PostsList: FC = () => (
  <div className="max-w-2xl mx-auto p-6">
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h2 className="card-title text-primary">文章列表</h2>
        <ul className="space-y-2">
          <li>
            <RouterLink className="btn btn-primary btn-sm" to="/posts/1">
              查看 1
            </RouterLink>
          </li>
          <li>
            <RouterLink className="btn btn-info btn-sm" to="/posts/2">
              查看 2
            </RouterLink>
          </li>
          <li>
            <RouterLink className="btn btn-secondary btn-sm" to="/posts/3">
              查看 3
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>
  </div>
)

export default PostsList
