import { BudgetItemState } from "../store/state";

/**
 * How many garments a budget line is for: the sum of its grade amounts.
 *
 * The size curve is the single source of the quantity. A production run is
 * graded, so the number of pieces *is* what the curve calls for — there is no
 * separate figure to keep in step with it.
 *
 * Falls back to 1 when the variation carried no grades, so an ungraded piece is
 * still quotable rather than costing nothing.
 */
export const budgetItemAmount = (
  item: Pick<BudgetItemState, "grades">,
): number => {
  const total = item.grades?.reduce((sum, grade) => sum + grade.amount, 0) ?? 0;
  return total > 0 ? total : 1;
};
