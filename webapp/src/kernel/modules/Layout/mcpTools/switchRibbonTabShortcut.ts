import type { KeyInput } from 'puppeteer-core';
import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { findRibbonTabIndexByLabel } from './switchRibbonTabShortcut.puppeteer';

export const switchRibbonTabShortcutTool = {
  name: 'switchRibbonTabShortcut',
  description: 'Switch to a ribbon menu tab via the Alt+<index> shortcut, by 1-based index or by visible label.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      tabIndex: { type: 'number', description: '1-based index of the ribbon tab to activate (maps to Alt+<tabIndex>)' },
      label: { type: 'string', description: 'Visible label of the ribbon tab to activate (e.g. "Compositor")' },
    },
  },
  async execute({ tabIndex, label }: { tabIndex?: number; label?: string }) {
    if (tabIndex == null && !label) {
      throw new Error('switchRibbonTabShortcut requires either tabIndex or label');
    }
    const page = await getPage();
    let resolvedIndex = tabIndex;
    if (resolvedIndex == null) {
      resolvedIndex = (await findRibbonTabIndexByLabel(page, label!)) ?? undefined;
      if (resolvedIndex == null) {
        throw new Error(`Ribbon tab not found (label="${label}")`);
      }
    }
    await page.bringToFront();
    await page.keyboard.down('Alt');
    await page.keyboard.press(`${resolvedIndex}` as KeyInput);
    await page.keyboard.up('Alt');
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
