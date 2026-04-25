# Change: Cache Material Cost Computation in the Composition Graph

**Context:** [Composition Graph — structure & conventions](../architecture/composition-graph.ts)
**Prerequisite:** [Converter — expose `convert` as a pure utility](../../../Converter/docs/changes/expose-convert-util.md)
**Status**: Implemented

---

## Persist material cost computation in the graph

### Motivation

`useMaterialCostComputation` currently recomputes the full aggregated cost for
a MaterialNode on every render via `useMemo`. It traverses all CONSUMES edges,
checks ElectiveNode toggles, and runs unit conversions through the
ConversionGraph. Nothing is stored — every component mount re-runs the full
traversal. This does not scale as the number of materials and processes grows.

### Data model change

Add `computedCost?: CompoundValue` to `MaterialNode`. This field stores the
persisted result of the cost aggregation and is the single source of truth for
readers. It must be kept in sync by the update mechanism described below.

### Computation function

Extract the aggregation logic from `useMaterialCostComputation` into a pure
function `computeMaterialCost` (e.g. in `../utils/computeMaterialCost.ts`).
Signature:

```ts
computeMaterialCost({
  materialNodeId,
  graphState,
  materialState,
  conversionGraphState,
}): { cost: CompoundValue | undefined, audit: CostAudit | undefined }
```

The function calls `converterModule.utils.convert` directly (no hooks). The
hook becomes a thin wrapper that reads `node.computedCost` for display and
derives `steps` from `node.costAudit` for the accordion trace UI.

### Propagation on change

Any change to the graph (node added/updated/removed, edge added/updated/removed,
graph loaded) resets a shared debounced function. When the debounce settles, it
computes `computeMaterialCost` for **every** MaterialNode currently in the graph
and emits a `postGraphChangeComputationFinished` event carrying the full results
map. The event handler for that event is the only place that writes
`computedCost` and `costAudit` back to Redux state via `updateNode`.

Graph change events that reset the debounce:

| Event |
|---|
| `graphLoaded` (variationId) |
| `nodeAdded`, `nodeUpdated`, `nodeRemoved` |
| `edgeAdded`, `edgeUpdated`, `edgeRemoved` |

Because the Redux writes only happen inside the `postGraphChangeComputationFinished`
handler — which is not itself a graph-change event — no cyclic trigger is
possible and no loop guard is needed.

### Converter access outside React

The debounced computation function runs outside React, so it cannot use hooks.
This requires extracting the `convert` function from `useConverter` into a
standalone pure utility and exposing it on `IConverterModule.utils.convert`.
`useConverter` then becomes a thin wrapper that passes its graph state to that
utility. See the full change spec:
[Converter — expose `convert` as a pure utility](../../../Converter/docs/changes/expose-convert-util.md)

With this in place the debounced function calls:
```ts
converterModule.utils.convert(conversionGraphState, from, to, initialParams)
```
and `traceConversion` drops its `converter` parameter entirely, accepting the
conversion graph directly instead.

---

## Computation audit log

### Motivation

Cost computations involve multiple implicit decisions: which material attributes
were used, how units were normalised before conversion, which conversion
expression was applied, and what intermediate values produced the final number.
Without a structured audit trail these decisions are invisible to the user and
impossible to verify or debug after the fact.

### What the audit log must capture

For each MaterialNode computation the log records three layers:

**1. Material context**
- All attributes present on the material record at computation time
  (e.g. largura, gramatura, categoria, cor, trama).
- For each attribute that carries a unit (compound attributes): the raw
  stored value and the automatically normalised value used in expressions
  (e.g. `largura: 135 cm → 1.3500 m`). These normalisations must be flagged
  explicitly (⚠) so auditors know the expression did not receive the raw value.
- Derived scalar variables injected into conversion expressions
  (e.g. `gramaturaQuociente = 0.139`, `gramaturaDividendo = 1`).

**2. Per-process computation steps** (one entry per active ConsumesEdge)
- Process label and whether it was skipped (elective disabled).
- Original consumption amount as declared on the ConsumesEdge (e.g. `1.00 m² / un`).
- Any automatic attribute normalisations triggered for this step (⚠).
- The ordered list of unit conversion steps taken to reach the target unit:
  - Source unit → target unit transition label.
  - The symbolic expression applied (e.g. `(quantidadeQuociente / quantidadeDividendo) * (gramaturaQuociente / gramaturaDividendo)`).
  - The concrete attribute values substituted into the expression.
  - The concrete quantity values substituted into the expression.
  - The numeric result of that step.
- Converted amount after all steps (e.g. `0.14 Kg`).
- Running accumulated total after this process (e.g. `0.14 Kg / un`).

**3. Final summary**
- Total `computedCost` (CompoundValue) for the MaterialNode.
- Timestamp of when the computation ran.

### Data model

Extend `MaterialNode` with a `costAudit` field alongside `computedCost`:

```ts
costAudit?: {
  computedAt: string;                 // ISO timestamp
  materialAttributes: AttributeAudit[];
  steps: ProcessStepAudit[];
}

AttributeAudit: {
  name: string;
  rawValue: unknown;
  rawUnit?: string;
  normalisedValue?: number;
  normalisedUnit?: string;
  wasNormalised: boolean;
  injectedVariables?: { [varName: string]: number };
}

ProcessStepAudit: {
  processLabel: string;
  skipped: boolean;                   // elective was disabled
  skipReason?: string;
  originalAmount: CompoundValue;
  attributeNormalisations: AttributeNormalisationAudit[];
  conversionSteps: ConversionStepAudit[];
  convertedAmount: number;
  convertedUnit: string;
  runningTotal: number;
}

AttributeNormalisationAudit: {
  attributeName: string;
  originalValue: number;
  originalUnit: string;
  normalisedValue: number;
  normalisedUnit: string;
}

ConversionStepAudit: {
  fromUnit: string;
  toUnit: string;
  expression: string;                 // symbolic, e.g. "(qQ / qD) * (gQ / gD)"
  attributeValues: { [varName: string]: number };
  quantityValues: { [varName: string]: number };
  result: number;
}
```

### Rendering example

```
Auditoria de Custo - material-4h42az
Material: 10 Kg

Atributos do Material (Variáveis de Contexto):
categoria = Tricoline
nome = Tricoline Amélie
largura = 135 cm
⚠ Esta variável será convertida automaticamente para a unidade de destino nas expressões
gramatura: 0.139 Kg / m²
  → gramaturaQuociente = 0.139 (usado nas expressões)
  → gramaturaDividendo = 1 (usado nas expressões)

Passos de Computação:
Passo 1: Corte
  Consumo original: 1.00 m² / un
  ⚠ Conversões Automáticas de Atributos:
    largura: 135 cm → 1.3500 m
  Passos de Conversão:
  1. m² / un → Kg / un
     Expressão: (quantidadeQuociente / quantidadeDividendo) * (gramaturaQuociente / gramaturaDividendo)
     Atributos do material: gramaturaQuociente=0.14, gramaturaDividendo=1.00
     Valores calculados: quantidade=1.00, quantidadeQuociente=1.00, quantidadeDividendo=1.00
     Resultado: 0.1390
  Convertido para: 0.14 Kg
  Total acumulado: 0.14 Kg / un
```

### Production of the audit log

`computeMaterialCost` (the extracted pure function) must return both the
`CompoundValue` result and a fully populated `costAudit` object. The
`postGraphChangeComputationFinished` handler stores both on each node via
`updateNode`. No separate pass is needed.

The `steps` currently returned by `useMaterialCostComputation` for the
accordion UI can be derived from `costAudit.steps` rather than recomputed,
collapsing the two into a single source of truth.
