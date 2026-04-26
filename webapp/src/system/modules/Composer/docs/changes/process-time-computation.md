# Change: Compute Process Time for the Composition Graph

**Context:** [Composition Graph — structure & conventions](../architecture/composition-graph.ts)
**Prerequisite:** 
    - [Cache Material Cost Computation in the Composition Graph](cache-cost-computation.md)
    - [Graduation amount storage](graduation-amount-storage.md)
**Status**: Draft

---

## Persist process time computation in the graph

### Motivation

The Composer currently computes process durations ad hoc in UI hooks or derived selectors. This means every render can recompute the same process timings from the graph and related attributes, even though the underlying process definitions and material context change infrequently. For performance and consistency, process time should be computed once per graph change and stored on the process node.

### Data model change

Extend `ProcessNode` with `computedTime?: ProcessTimeValue` and `timeAudit?: ProcessTimeAudit`.

- `computedTime` stores the final computed duration for the process.
- `timeAudit` records how that value was derived for debugging and user inspection.

This field becomes the single source of truth for downstream UI and reporting components.

### Composition graph change

The composition graph model will continue to represent process and material nodes with the same topology, but `ProcessNode` will gain new persisted metadata.

- `ProcessNode` now carries `computedTime` and `timeAudit` in its serialized state.
- The graph state snapshot therefore includes computed timing results in the node payload, not only in UI selectors.
- Loading a graph should restore these fields when available, but always recompute them on any graph change to ensure they are consistent with the current model.
- The shared post-change computation mechanism writes back into graph state through `updateNode`, meaning the graph state itself is the authoritative container for process timing and audit information.

This keeps process timing aligned with the graph and avoids having timing stored outside of the graph model.

### Computation function

Extract the timing logic into a pure function such as `computeProcessTime` in `../utils/computeProcessTime.ts`.
Signature:

```ts
computeProcessTime({
  processNodeId,
  graphState,
  processState,
  materialState,
  conversionGraphState,
}): { time: ProcessTimeValue | undefined; audit: ProcessTimeAudit | undefined }
```

The function must use pure utilities only and must not depend on React hooks.

### Scope of computation

The computation should evaluate every `ProcessNode` in the current graph and derive the time taken by each process using:

- process-specific inputs and settings stored on the node
- attributes from connected material nodes where applicable
- elective toggles that may disable or change process behavior
- unit conversions performed through the conversion graph when process timing depends on units

### Propagation on change

The same graph-change debounced mechanism used for material cost should also trigger process time recomputation. Graph change events include:

- `graphLoaded`
- `nodeAdded`, `nodeUpdated`, `nodeRemoved`
- `edgeAdded`, `edgeUpdated`, `edgeRemoved`

When graph changes settle, the shared computation workflow should:

1. compute `computeProcessTime` for every `ProcessNode`
2. emit a `postGraphChangeComputationFinished` event with the full process time result map
3. handle that event once to write `computedTime` and `timeAudit` back into Redux state via `updateNode`

Because the state writes happen only in the post-change event handler, the write does not re-trigger the debounce loop.

### Converter access outside React

If process time calculation requires unit normalization or conversion, it must also use the extracted pure conversion utility on `IConverterModule.utils.convert`, just like material cost computation.

This ensures the pure `computeProcessTime` function can run outside of React and remain testable.

## Audit log for process time

### Motivation

Users need visibility into why a process duration was computed as it was, especially when the process depends on material attributes, elective toggles, or unit conversions. A structured audit trail prevents silent surprises and supports debugging.

### What the audit log must capture

For each `ProcessNode` computation, the audit log should record:

1. Process context
   - process label and node id
   - input parameters or fields used to compute duration
   - whether the process is elective and whether it was enabled or skipped

2. Material/context dependencies
   - connected material node attributes used in the timing calculation
   - any automatic unit normalizations or conversions applied to those attributes

3. Computation steps
   - the ordered steps taken to compute the final duration
   - conversion or normalization expressions used
   - intermediate values and their units
   - the final computed duration

4. Final summary
   - `computedTime` value
   - timestamp when the computation ran

### Data model

Extend `ProcessNode` with a `timeAudit` field alongside `computedTime`:

```ts
interface ProcessTimeAudit {
  computedAt: string;                 // ISO timestamp
  processLabel: string;
  processNodeId: string;
  enabled: boolean;
  inputParameters: Record<string, unknown>;
  materialDependencies?: AttributeAudit[];
  steps: ProcessTimeStepAudit[];
}

interface ProcessTimeStepAudit {
  description: string;
  sourceValue?: number;
  sourceUnit?: string;
  normalizedValue?: number;
  normalizedUnit?: string;
  conversionExpression?: string;
  resultValue?: number;
  resultUnit?: string;
}
```

This audit record should be produced by `computeProcessTime` and stored on the node together with `computedTime`.

### UI consumption

UI components should read `ProcessNode.computedTime` for display and derive any step-by-step trace from `ProcessNode.timeAudit.steps`.

This keeps computation and presentation aligned, avoids duplicate derived logic, and preserves a single source of truth for process timing.
