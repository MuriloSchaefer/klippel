import { useAppSelector } from "@kernel/store/hooks";
import { UIState } from "../store/state";

/**
 * Retrieves the current composer ui state
 * @returns
 */
export const useComposerUIState = (): UIState =>
  useAppSelector((state) => state.ComposerUI);
export default useComposerUIState;
