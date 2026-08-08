/**
 * A line in a budget. Identified by `${modelId}-${hash5}` rather than by the
 * model alone (the same model may appear in two budgets, or twice in one) and
 * not by `variationId` — that is `uniqueId("variation-instance-")`, regenerated
 * on every `openModel`, so it cannot survive a restart.
 */
export type BudgetItemState = {
    itemId: string;
    modelId: string;
    label: string;
    addedAt: number;
    /** How many of this piece the budget is for. Defaults to 1 when added. */
    amount: number;
    /**
     * Cost per produced unit, snapshotted from the variation's processes when
     * the item was added (Composer's `useVariationUnitCost`).
     *
     * Snapshotted rather than derived on render because the graph only exists
     * for variations that are currently open — a budget must still price the
     * lines whose viewports are closed. `undefined` when the variation had no
     * priced process at the time, which reads as "not priced", never as free.
     */
    unitCost?: number;
    /**
     * Production time per produced unit, in minutes, snapshotted alongside
     * `unitCost` and for the same reason: the variation's process graph only
     * exists while its viewport is open, so a closed line could not be timed.
     */
    unitMinutes?: number;
    /**
     * The size curve this quantity came from, snapshotted with the rest. A
     * budget line's `amount` is the sum of these — a run of garments is graded,
     * not a single number someone typed.
     */
    grades?: { label: string; amount: number }[];
    /** When `unitCost`/`unitMinutes` were captured, so a stale quote shows. */
    costCapturedAt?: number;
}

export type BudgetState = {
    id: string;
    label: string;
    /**
     * Mirrored onto the backing viewport group. Duplicated here on purpose:
     * reading it back through `Layout.viewportManager.groups` throws whenever
     * the group's session JSON has not rehydrated yet.
     */
    color: string;
    viewportGroup: string;
    items: { [itemId: string]: BudgetItemState };
    createdAt: number;
}
export type BudgetsManagerState = {
    [id: string]: BudgetState
}

export type OrderState = {}
export type OrdersManagerState = {
    [id: string]: OrderState
}

export type OrdersModuleState = {
    budgets: BudgetsManagerState
    orders: OrdersManagerState
    /**
     * When the module last wrote its session snapshot. Stamped by the
     * `sessionSaved` event, so "the save finished" is observable from Redux
     * rather than from a side channel.
     */
    lastSavedAt?: number
}

export const initialState: OrdersModuleState = {
    budgets: {},
    orders: {}
}
