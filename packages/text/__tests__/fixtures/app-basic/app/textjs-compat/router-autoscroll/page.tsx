import Link from 'text/link'

export default function RouterAutoscrollIndexPage() {
  return (
    <>
      {Array.from({ length: 500 }).map((_, index) => (
        <div key={index}>{index}</div>
      ))}
      <Link href="/textjs-compat/router-autoscroll/focus-target" id="to-focus-target">
        To focus target
      </Link>
    </>
  )
}
