import React, { ReactNode, useEffect } from 'react';
import useModule from '@kernel/hooks/useModule';
import { Store } from '@kernel/modules/Store';
import { ShortcutContext } from '../contexts';
import { pushContext, popContext } from '../store/actions';

/**
 * ShortcutProvider creates a new shortcut context scope.
 * All shortcuts registered within this provider will be associated
 * with the specified contextId.
 * 
 * The context stack is managed via Redux actions, and this component
 * automatically pushes/pops the context when mounted/unmounted.
 * 
 * Example:
 * ```tsx
 * <ShortcutProvider contextId="Composer">
 *   <ComposerPanel />
 * </ShortcutProvider>
 * ```
 */

export interface ShortcutProviderProps {
  contextId: string;
  children: ReactNode;
}

const ShortcutProvider: React.FC<ShortcutProviderProps> = ({
  contextId,
  children,
}) => {
  const storeModule = useModule<Store>('Store');
  const { useAppDispatch } = storeModule.hooks;
  const dispatch = useAppDispatch();
  
  useEffect(() => {
    // Push context onto the stack when component mounts
    dispatch(pushContext(contextId));
    
    // Pop context from the stack when component unmounts
    return () => {
      dispatch(popContext(contextId));
    };
  }, [contextId, dispatch]);
  
  // Provide the context ID to child components via React Context
  return (
    <ShortcutContext.Provider value={{ contextId }}>
      {children}
    </ShortcutContext.Provider>
  );
};

export default ShortcutProvider;
