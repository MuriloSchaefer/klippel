import { createSelector } from "reselect";
import { MarkdownModuleState } from "./state";

const selectMarkdownModule = (state: {Markdown: MarkdownModuleState}) => state.Markdown

export const getMarkdown = (path: string) => createSelector(
    selectMarkdownModule,
    (state: MarkdownModuleState | undefined) => state && state.markdowns[path]
    )