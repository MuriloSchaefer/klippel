import { createSelector } from "reselect";
import { ComposerModuleState } from "../../typings";

export const selectComposer = <T = ComposerModuleState>(
  selector: (state: ComposerModuleState) => T
) =>
  createSelector(
    (state: { Composer: ComposerModuleState }) => state.Composer,
    (s) => s && selector(s)
  );
