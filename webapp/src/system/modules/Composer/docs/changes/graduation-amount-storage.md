# Change: Store Graduation Amounts for Process Time Computation

**Context:** [Composition Graph — structure & conventions](../architecture/composition-graph.ts)  
**Status**: Draft
**Prerequisite of:** [Compute Process Time for the Composition Graph](process-time-computation.md)  

---

## Persist graduation amounts in the graph

### Motivation

Process time computation may depend on the number of garments produced for each graduation. That information is currently not stored on graduation nodes, so the timing calculus cannot be fully derived from the composition graph state alone.

### Data model change

Extend `GraduationNode` with an `amount?: number` field representing the planned quantity for that graduation.

- `amount` stores the number of garments for the graduation unit.
- it must default to `0` when a graduation is created or when the field is absent.
- the value is persisted directly as part of the graph node payload.

Example:

```ts
export type GraduationNode = Node & {
  type: "GRADUATION";
  label: string;
  graduationId: string;
  order?: number;
  amount?: number; // number of garments for this graduation
}
```

### Composition graph change

The graduation quantity becomes part of the graph model itself.

- `GraduationNode` now carries `amount` in its serialized state.
- graph snapshots and persisted variations include the graduation amount.
- loading a graph restores the amount field, so process time computation can reevaluate using historic graduation quantities.
- absent values are treated as `0` to avoid introducing invalid undefined state into timing calculations.

This means the graph is the authoritative source of grade quantities, not derived UI state.

### UI integration

Allow the user to set the graduation amount in the side panel inside `GraduationListAccordion`.

- expose a numeric input alongside the graduation label or inside the detail view for each graduation item
- render the current `node.amount ?? 0`
- on change, persist the new value through `variation.actions.updateGraduation(node.id, { amount: newValue })`
- debounce updates as needed to avoid noisy state writes

A UI sketch for `GraduationListAccordion`:

- list each graduation item
- show label, order, and `amount` fields
- allow inline editing of `amount` with a number input
- keep the existing graduation reorder and rename controls

### Process time dependency

`computeProcessTime` should read `GraduationNode.amount` when evaluating the number of garments for each grade.

This ensures time computations can account for production volume per graduation and remain fully reproducible from the composition graph state.
