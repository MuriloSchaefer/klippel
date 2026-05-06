const NodeEnvironment = require('jest-environment-node').TestEnvironment;
const puppeteer = require('puppeteer-core');
const fs = require('node:fs');
const path = require('node:path');

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT || 9222);
const SHOT_DIR = process.env.KLIPPEL_FAILSHOT_DIR || '/tmp/klippel-failshots';

class ScreenshotOnFailureEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context);
    this.testPath = context.testPath;
    this.failures = [];
  }

  async handleTestEvent(event) {
    if (event.name === 'test_fn_failure' || event.name === 'hook_failure') {
      const test = event.test || event.hook;
      const names = [];
      let n = test;
      while (n) { if (n.name && n.name !== 'ROOT_DESCRIBE_BLOCK') names.unshift(n.name); n = n.parent; }
      const label = names.join(' > ') || 'unknown';
      this.failures.push(label);
      try {
        fs.mkdirSync(SHOT_DIR, { recursive: true });
        const browser = await puppeteer.connect({
          browserURL: `http://localhost:${CDP_PORT}`,
          defaultViewport: null,
        });
        const pages = await browser.pages();
        const page = pages.find((p) => !p.url().startsWith('devtools://')) || pages[0];
        const fileBase = path.basename(this.testPath).replace(/\W+/g, '_') + '__' + label.replace(/\W+/g, '_');
        const file = path.join(SHOT_DIR, fileBase + '.png');
        await page.screenshot({ path: file, fullPage: false });
        // eslint-disable-next-line no-console
        console.log('[screenshot-on-failure] saved ' + file);
        browser.disconnect();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[screenshot-on-failure] could not capture: ' + (err && err.message));
      }
    }
  }
}

module.exports = ScreenshotOnFailureEnvironment;
