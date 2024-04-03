

export type BudgetState = {
    viewportGroup: string;
    id: string;
    label: string;
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
}

export const initialState: OrdersModuleState = {
    budgets: {},
    orders: {}
}