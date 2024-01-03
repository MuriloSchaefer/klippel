import { createSelector } from "reselect";
import type {  ConverterState } from "./state";

export const selectConverterModule = (state: {Converter: ConverterState}) => state.Converter

export const selectSelectedNode = () => createSelector(
    selectConverterModule,
    (state: ConverterState | undefined) => state?.selectedNode
    )