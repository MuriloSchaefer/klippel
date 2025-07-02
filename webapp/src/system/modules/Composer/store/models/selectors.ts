import { createSelector } from "reselect";
import { ComposerModuleState, ModelsMap } from "../../typings";

export const selectComposer = <T = ComposerModuleState>(
  selector: (state: ComposerModuleState) => T
) =>
  createSelector(
    (state: { Composer: ComposerModuleState }) => state.Composer,
    (s) => s && selector(s)
  );
