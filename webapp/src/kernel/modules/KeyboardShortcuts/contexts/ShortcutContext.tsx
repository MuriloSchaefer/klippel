import React, { createContext, useContext } from 'react';

/**
 * ShortcutContext tracks the current keyboard shortcut context scope.
 * This allows components to register shortcuts that are only active
 * within specific UI contexts (e.g., 'Composer', 'Layout', 'Materials').
 * 
 * The context stack is managed in Redux, but this React Context provides
 * the current context ID to child components for declarative shortcut registration.
 */

export interface ShortcutContextValue {
  contextId: string;
}

export const ShortcutContext = createContext<ShortcutContextValue>({
  contextId: 'Global',
});

/**
 * Hook to access the current shortcut context ID
 */
export const useShortcutContextId = (): string => {
  const context = useContext(ShortcutContext);
  return context.contextId;
};
