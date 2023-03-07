import { createSelector } from "reselect";
import { ComposerState, CompositionState } from "./state";

const selectComposerModule = (state: { Composer: ComposerState }) =>
  state.Composer;

export const selectCompositionState = (name: string) =>
  createSelector(
    selectComposerModule,
    (state: ComposerState | undefined) =>
      state && state.compositionsManager.compositions[name]
  );

export const selectCompositionStateByViewportName = <O=CompositionState | undefined>(
  viewport: string,
  selector?: (state: CompositionState | undefined) => O
) => {
  const defaultSelector = (state: CompositionState | undefined) => state;
  const usedSelector = selector ?? defaultSelector;

  return createSelector(
    selectComposerModule,
    (state: ComposerState | undefined) =>
      state &&
      usedSelector(Object.values(state.compositionsManager.compositions).find(
        (comp) => comp.viewportName === viewport
      ))

  );
};

export const selectCompositionStateByGraphId = <O=CompositionState | undefined>(
  graphId: string,
  selector?: (state: CompositionState | undefined) => O
) => {
  const defaultSelector = (state: CompositionState | undefined) => state;
  const usedSelector = selector ?? defaultSelector;

  return createSelector(
    selectComposerModule,
    (state: ComposerState | undefined) =>
      state &&
      usedSelector(Object.values(state.compositionsManager.compositions).find(
        (comp) => comp.graphId === graphId
      ))

  );
};
