/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const UPLOAD_SVG_BINDING = 'u' as const;

export const armChooserAndPressUploadBinding = async (
  page: Page,
  filePath: string,
) => {
  // Press 'u' inside the Composer/SVGEmptyState context: the registered action
  // calls upload-svg-button.click(), which proxies to inputRef.click() and
  // opens the chooser. waitForFileChooser races the keypress so the chooser
  // is intercepted before Chromium hands off to the OS dialog.
  const [chooser] = await Promise.all([
    page.waitForFileChooser({ timeout: 10_000 }),
    page.keyboard.press(UPLOAD_SVG_BINDING),
  ]);
  await chooser.accept([filePath]);
};
