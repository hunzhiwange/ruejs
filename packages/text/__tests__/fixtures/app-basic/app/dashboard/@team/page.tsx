import SlotCounter from './slot-counter'
export default function TeamSlot() {
  return (
    <div data-testid="team-slot">
      <h2>Team Members</h2>
      <SlotCounter />
      <ul>
        <li>Alice</li>
        <li>Bob</li>
        <li>Charlie</li>
      </ul>
    </div>
  )
}
