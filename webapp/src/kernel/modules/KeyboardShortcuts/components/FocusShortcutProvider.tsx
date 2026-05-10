import React, { ReactNode, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import useModule from '@kernel/hooks/useModule';
import { Store } from '@kernel/modules/Store';
import { ShortcutContext } from '../contexts';
import { pushContext, popContext } from '../store/actions';

/**
 * FocusShortcutProvider scopes a contextId to a focus subtree.
 *
 * The context is pushed onto the keyboard-shortcuts stack only while focus
 * lives inside the wrapped subtree, and popped when focus leaves. Use this
 * for sibling regions (e.g. two accordions on the same screen) whose
 * shortcuts share keys — lifecycle-based ShortcutProvider would leave both
 * contexts active simultaneously.
 */

export interface FocusShortcutProviderProps {
  contextId: string;
  children: ReactNode;
}

const FocusShortcutProvider: React.FC<FocusShortcutProviderProps> = ({
  contextId,
  children,
}) => {
  const storeModule = useModule<Store>('Store');
  const { useAppDispatch } = storeModule.hooks;
  const dispatch = useAppDispatch();

  const wrapperRef = useRef<HTMLDivElement>(null);
  const isPushedRef = useRef(false);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;

    const handleFocusIn = (e: FocusEvent) => {
      if (!node.contains(e.target as Node)) return;
      if (isPushedRef.current) return;
      isPushedRef.current = true;
      dispatch(pushContext(contextId));
    };

    const handleFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Node | null;
      if (next && node.contains(next)) return;
      if (!isPushedRef.current) return;
      isPushedRef.current = false;
      dispatch(popContext(contextId));
    };

    node.addEventListener('focusin', handleFocusIn);
    node.addEventListener('focusout', handleFocusOut);

    return () => {
      node.removeEventListener('focusin', handleFocusIn);
      node.removeEventListener('focusout', handleFocusOut);
      if (isPushedRef.current) {
        isPushedRef.current = false;
        dispatch(popContext(contextId));
      }
    };
  }, [contextId, dispatch]);

  return (
    <ShortcutContext.Provider value={{ contextId }}>
      <Box ref={wrapperRef} sx={{ display: 'contents' }}>
        {children}
      </Box>
    </ShortcutContext.Provider>
  );
};

export default FocusShortcutProvider;
