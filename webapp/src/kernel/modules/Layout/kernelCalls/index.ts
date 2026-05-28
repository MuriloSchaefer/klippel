// graphs manager
import {
  MODULE_NAME,
  SECTIONS_REGISTRY_NAME,
  SYSTEM_TRAY_REGISTRY_NAME,
  VIEWPORT_TYPE_REGISTRY_NAME,
} from "../constants";
import layoutMiddleware from "../store/middlewares";
import ribbonMenuMiddleware from "../store/ribbonMenu/middlewares";
import viewportMiddleware from "../store/viewports/middlewares";
import viewportGroupsMiddleware from "../store/viewports/groups/middlewares";
import panelsMiddleware from "../store/panels/middlewares";

import slice, { sessionSaver } from "../store/slice";
import { PostBootInitializationProps, StartModuleProps } from "@kernel/modules/base";
import HomeViewport from "../components/ViewportManager/HomeViewport";
import PeersIndicator from "../components/SystemTray/PeersIndicator";
import SyncLogsIndicator from "../components/SystemTray/SyncLogsIndicator";
import { switchTheme } from "../store/actions";
import { type PaletteMode } from "@mui/material";
import { collapseSettings, expandSettings, closeDetails, openDetails } from "../store/panels/actions";

export const startModule = ({
  dispatch,
  managers: { storeManager, componentRegistryManager },
  storage,
}: StartModuleProps) => {
  // configure session saver
  const store = storeManager.functions.getStore()
  storage.registerSessionSaveListener(
    store ? sessionSaver(store) : ()=>console.log('Missing store. skipping session save!')
  );

  storeManager.functions.loadReducer(MODULE_NAME, slice.reducer);

  const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)");
  const storedTheme = localStorage.getItem("theme");
  if (darkThemeMq.matches && !storedTheme) {
    dispatch(switchTheme({ theme: "dark" }));
  } else if (storedTheme) {
    dispatch(switchTheme({ theme: storedTheme as PaletteMode }));
  }

  storeManager.functions.registerMiddleware(layoutMiddleware);
  storeManager.functions.registerMiddleware(ribbonMenuMiddleware);
  storeManager.functions.registerMiddleware(viewportMiddleware);
  storeManager.functions.registerMiddleware(viewportGroupsMiddleware);
  storeManager.functions.registerMiddleware(panelsMiddleware);

  componentRegistryManager.functions.createRegistries({
    [SECTIONS_REGISTRY_NAME]: {},
    [VIEWPORT_TYPE_REGISTRY_NAME]: {
      home: HomeViewport,
    },
    [SYSTEM_TRAY_REGISTRY_NAME]: {
      // Jazz sync diagnostics — live next to the workspace selector
      // so users can see at a glance whether sync is healthy and
      // drill into the cojson event stream without DevTools.
      peersIndicator: PeersIndicator,
      syncLogsIndicator: SyncLogsIndicator,
    }
  });
};

export const postBootInitialization = ({managers: { storeManager, keyboardManager, ribbonMenuManager },}: PostBootInitializationProps) => {
  Object.entries(ribbonMenuManager.tabs ?? {}).forEach(([name, tab], index) => {
    const contextId = `${MODULE_NAME}/RibbonMenu`
    const id = `${contextId}/${index}`
    keyboardManager.functions.registerShortcuts([
      {
        id: id,
        key: 'Alt+' + (index + 1),
        contextId: contextId,
        action: () => document.getElementById(id)?.click(),
        description: 'Seleciona tab ' + name,
        enabled: true,
      }
    ], {context: 'RibbonMenu'})
  });

  keyboardManager.functions.registerShortcuts([
    {
      id: 'layout.viewport.close',
      key: 'Ctrl+w',
      contextId: `${MODULE_NAME}/ViewportManager`,
      action: () => {
        const activeTab = document.querySelector('[role="viewport-tabs"] [aria-selected="true"]');
        const closeBtn = activeTab?.querySelector('[data-testid="close-viewport-btn"]');
        closeBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      },
      description: 'Close the active viewport tab',
      enabled: true,
    },
    {
      id: 'layout.viewport.add',
      key: 'Ctrl+n',
      contextId: `${MODULE_NAME}/ViewportManager`,
      action: () => {
        const btn = document.getElementById('new-viewport') as HTMLElement | null;
        btn?.click();
      },
      description: 'Add a new viewport tab',
      enabled: true,
    },
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
      id: `layout.viewport.switch.${n}`,
      key: `Ctrl+${n}`,
      contextId: `${MODULE_NAME}/ViewportManager`,
      action: () => {
        const tabsRoot = document.querySelector('[role="viewport-tabs"]');
        if (!tabsRoot) return;
        const allTabs = Array.from(tabsRoot.querySelectorAll('[role="tab"]'));
        const viewportTabs = allTabs.filter(
          (el) => el.id !== 'home' && el.id !== 'new-viewport',
        ) as HTMLElement[];
        viewportTabs[n - 1]?.click();
      },
      description: `Switch to viewport ${n}`,
      enabled: true,
    })),
  ], {context: `${MODULE_NAME}/ViewportManager`})

  keyboardManager.functions.registerShortcuts([
    {
      id: 'layout.panels.settings.toggle',
      key: 'Ctrl+b',
      contextId: 'Global',
      action: () => {
        const store = storeManager.functions.getStore();
        if (!store) return;
        const current = store.getState()?.Layout?.panels?.settings?.state ?? 'expanded';
        store.dispatch(current === 'expanded' ? collapseSettings() : expandSettings());
      },
      description: 'Toggle settings panel (expand/collapse)',
      enabled: true,
    },
    {
      id: 'layout.panels.details.toggle',
      key: 'Ctrl+Alt+b',
      contextId: 'Global',
      action: () => {
        const store = storeManager.functions.getStore();
        if (!store) return;
        const current = store.getState()?.Layout?.panels?.details?.state ?? 'closed';
        store.dispatch(current === 'opened' ? closeDetails() : openDetails());
      },
      description: 'Toggle details panel (open/close)',
      enabled: true,
    },
  ], {context: 'Global'})

  keyboardManager.functions.registerShortcuts([
    {
      id: 'global.input.blur',
      key: 'Escape',
      contextId: 'Global',
      action: () => {
        // If a popover listbox (Autocomplete / Select) is open, MUI handles
        // Esc by closing the listbox and keeping the input focused. Skip the
        // blur so Esc layers: first Esc closes the listbox, next Esc blurs.
        if (document.querySelector('ul[role="listbox"]')) return;
        const el = document.activeElement as HTMLElement | null;
        if (!el) return;
        const isTextEntry =
          el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.isContentEditable === true;
        if (isTextEntry) el.blur();
      },
      description: 'Remove focus from the active input or textarea',
      enabled: true,
    },
  ], {context: 'Global'})

  keyboardManager.functions.registerShortcuts([
    {
      id: 'layout.systemtray.theme.toggle',
      key: 'Ctrl+Shift+t',
      contextId: 'Global',
      action: () => {
        const store = storeManager.functions.getStore();
        if (!store) return;
        const current = store.getState()?.Layout?.theme ?? 'dark';
        store.dispatch(switchTheme({ theme: current === 'dark' ? 'light' : 'dark' }));
      },
      description: 'Toggle between light and dark theme',
      enabled: true,
    },
  ], {context: 'Global'})
}
