/**
 * Hook to automatically register keyboard shortcuts for ribbon menu tabs
 * 
 * This hook:
 * 1. Watches the tabs state for changes
 * 2. Registers Alt+1, Alt+2, Alt+3... shortcuts for each tab
 * 3. Unregisters shortcuts when tabs are removed
 */

import { useEffect } from 'react';
import useModule from '@kernel/hooks/useModule';
import { Store } from '@kernel/modules/Store';
import { selectTabs } from '../store/ribbonMenu/selectors';
import { selectTab } from '../store/ribbonMenu/actions';
import { registerShortcut, unregisterShortcut } from '@kernel/modules/KeyboardShortcuts/store/actions';

export const useRibbonShortcuts = () => {
  const storeModule = useModule<Store>('Store');
  const { useAppSelector, useAppDispatch } = storeModule.hooks;
  
  const dispatch = useAppDispatch();
  const tabs = useAppSelector(selectTabs);

  useEffect(() => {
    if (!tabs) return;

    const tabEntries = Object.entries(tabs);
    
    // Register Alt+1, Alt+2, Alt+3... shortcuts for each tab (up to Alt+9)
    tabEntries.forEach(([tabName, tab], index) => {
      if (index < 9) { // Only register Alt+1 through Alt+9
        const shortcutNumber = index + 1;
        
        dispatch(registerShortcut({
          id: `layout.ribbon.tab.${tabName}`,
          key: `Alt+${shortcutNumber}`,
          contextId: 'Global',
          description: `Switch to ${tab.label} tab`,
          enabled: true,
          action: selectTab({ name: tabName }),
        }));
      }
    });

    console.log(`[Layout] Registered ${Math.min(tabEntries.length, 9)} ribbon tab shortcuts`);

    // Cleanup: Unregister shortcuts when tabs change
    return () => {
      tabEntries.forEach(([tabName], index) => {
        if (index < 9) {
          dispatch(unregisterShortcut(`layout.ribbon.tab.${tabName}`));
        }
      });
    };
  }, [tabs, dispatch]);
};

export default useRibbonShortcuts;
