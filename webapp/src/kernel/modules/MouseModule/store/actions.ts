import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";

// UI Events
/**
 * Expand the documentation on point x, y of the screen
 */
export const floatingDocumentationExpanded = createAction<{
  content: unknown;
  x: number;
  y: number;
}>(`[${MODULE_NAME}:UI] Floating Documentation Expanded`);

export const floatingDocumentationCollapsed = createAction(
  `[${MODULE_NAME}:UI] Floating Documentation Collapsed`
);

export const floatingShortcutsCreated = createAction<{
  id: string;
}>(`[${MODULE_NAME}:UI] Floating Shortcuts Created`);
export const floatingShortcutsDeleted = createAction<{
  id: string;
}>(`[${MODULE_NAME}:UI] Floating Shortcuts Deleted`);

export const floatingShortcutsOpened = createAction<{
  id: string;
  x: number;
  y: number;
}>(`[${MODULE_NAME}:UI] Floating Shortcuts Opened`);

export const floatingShortcutsClosed = createAction<{
  id: string;
}>(`[${MODULE_NAME}:UI] Floating Shortcuts Closed`);
