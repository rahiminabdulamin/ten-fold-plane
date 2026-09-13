# Work-item Property Interaction Repair

## Goal

Make editable work-item properties usable by pointer and keyboard in Table, List, and Kanban layouts without opening the work item when a property is pressed.

## Evidence

- State, Priority, and Member dropdowns each combine Headless UI combobox state with a second local `isOpen` state and a separately mounted Popper panel.
- Those panels are nested below transformed/linked layout content and are not registered with Headless UI's portal handling. The result is incorrect hit-testing or a panel that never becomes visible.
- List and Kanban wrap cards in `ControlLink`. Property clicks do not stop propagation at the property boundary, so they activate the card link.

## Design

Each property dropdown has one owner for each concern:

- Headless UI owns open/close, keyboard navigation, selection, and focus semantics.
- Popper owns fixed geometry from the actual trigger button.
- Headless UI `Portal` owns mounting the Popper panel outside transformed cards; `modal={false}` preserves normal pointer hit-testing.
- The property container stops click propagation only. It never calls `preventDefault`, which would cancel the combobox trigger.

The existing `ComboDropDown` render slot supplies Headless UI's `open` state. State, Priority, and Member panels render only while that state is open. Their custom local open state, outside-click detector, and manually toggled keyboard handler are removed.

## Requirements

1. Table State, Priority, and Assignee panels appear next to their trigger and accept ordinary pointer selection.
2. Searchable panels accept typing and arrow/Enter selection.
3. List and Kanban property presses neither navigate nor open the work-item detail view.
4. The card body still opens the work item.
5. Existing date and label behavior remains intact.

## Verification Matrix

| Layout | Interaction                                                                                     |
| ------ | ----------------------------------------------------------------------------------------------- |
| Table  | State, Priority, Assignee: open, type where searchable, pointer-select; dates remain selectable |
| List   | State, Priority, Assignee: pressing a property opens its panel and does not navigate            |
| Kanban | State, Priority, Assignee: pressing a property opens its panel and does not navigate            |
| All    | card title/body still opens the work item                                                       |
