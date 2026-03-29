import type { FC } from '@rue-js/rue'
import { RouterLink, useRoute } from '@rue-js/router'

const PostDetail: FC = () => {
  const route = useRoute()
  const id = route.value?.params?.id ?? ''
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title text-success">文章详情</h2>
          <p>
            文章 ID：<span className="font-mono text-primary">{id}</span>
          </p>
          <div className="card-actions">
            <RouterLink className="btn btn-neutral btn-sm" to="/posts">
              返回列表
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PostDetail
