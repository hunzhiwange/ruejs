'use client'

import { ref } from '@rue-js/rue'

export default function LikeButton({ initialLikes = 12 }: { initialLikes?: number }) {
  const liked = ref(false)
  const likes = ref(initialLikes)

  function handleClick() {
    const nextLiked = !liked.value
    liked.value = nextLiked
    likes.value += nextLiked ? 1 : -1
  }

  return (
    <button
      className={`like-button${liked.value ? ' liked' : ''}`}
      type="button"
      onClick={handleClick}
    >
      {liked.value ? 'Liked' : 'Like'} · {likes.value}
    </button>
  )
}
