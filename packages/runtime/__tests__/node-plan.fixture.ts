export const fixture = `
import { signal } from '@rue-js/rue';
export const title = signal('safe & <sound>');
export const active = signal(true);
export const rows = signal([{id: 1, label: 'one'}, {id: 2, label: 'two'}]);
export const clicks = signal(0);
const Child = props => <strong>{props.label}{props.children}</strong>;
export const View = () => <main data-ready aria-hidden={false} title={title.get()}>
  <svg viewBox="0 0 10 10"><text>{title.get()}</text><foreignObject><div>html</div></foreignObject></svg>
  <button onClick={() => clicks.set(clicks.get() + 1)}>{title.get()}</button>
  {active.get() ? <b>yes</b> : <i>no</i>}
  <ul>{rows.get().map(row => <li key={row.id}>{row.label}</li>)}</ul>
  <Child label={title.get()}><em>slot</em></Child>
</main>;`
