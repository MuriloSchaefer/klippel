import { createSelector } from "reselect";
import { ComposerModuleState } from "../../typings";

const selectComposerModule = (state: { Composer: ComposerModuleState }) => state.Composer;

export const selectComposer = <T = ComposerModuleState>(
  selector: (state: ComposerModuleState) => T
) =>
  createSelector(
    selectComposerModule,
    (composerState: ComposerModuleState | undefined) => composerState ? selector(composerState) : undefined
  );
