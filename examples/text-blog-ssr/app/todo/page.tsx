import ClientTodoApp from '../../components/ClientTodoApp'
import SiteHeader from '../../components/SiteHeader'

export default function TodoPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="page-heading">
          <p className="eyebrow">Client-side example</p>
          <h1>Todo app</h1>
          <p>
            A client page that demonstrates local state, form input, filtering, and list mutations
            with Rue hooks.
          </p>
          <div className="intro-actions">
            <a className="button secondary" href="/">
              Back home
            </a>
          </div>
        </section>

        <ClientTodoApp />
      </main>
    </>
  )
}
