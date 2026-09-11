import { Suspense } from '@rue-js/rue'
async function SlowContent() {
  await new Promise(resolve => setTimeout(resolve, 1500))
  return <p id="inline-content">Inline content ready</p>
}
export default function InlineStreamPage() {
  return (
    <main>
      <h1>Inline Stream</h1>
      <Suspense fallback={<p id="inline-loading">Loading inline</p>}>
        <SlowContent />
      </Suspense>
    </main>
  )
}
