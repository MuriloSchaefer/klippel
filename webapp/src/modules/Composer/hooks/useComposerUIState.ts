import { useAppSelector } from "@kernel/store/hooks";
import { createSelector } from "reselect";
import { UIState } from "../store/state";

/**
 * Retrieves the current composer ui state
 * @returns
 */
export const useComposerUIState = <R = UIState>(
  uiSelector: (ui: UIState) => R
): R => {
  const selector = createSelector((state: any) => state.ComposerUI, uiSelector);

  return useAppSelector(selector);
};
export default useComposerUIState;
