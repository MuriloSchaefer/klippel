/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import { resetUIState } from '@helpers/puppeteer/closeOverlays';
import { openLogoPlacements, LOGO_PLACEMENT_ITEM_TESTID } from './LogoPlacementsButton.click.puppeteer';

export const SVGTOOLBOX_TESTID = 'svgtoolbox';
export const SVGTOOLBOX_CLIP_TESTID = 'svgtoolbox-clip';

const HANDLES = '#svg-editor #SVG-editor-tools .manipulation-handles';
// The placement <use> mounted into the editor content (unique with one placement).
const PLACEMENT_USE = '#svg-editor use[id^="logo-"]';
// Rects in paint order inside the handles group: 0=outline, 1=move, 2=scale.
const MOVE_RECT_INDEX = 1;
const SCALE_RECT_INDEX = 2;

type Point = { x: number; y: number };
type Tx = { x: number; y: number; scale: number; rotation: number; raw: string };

/** Open the placements pointer, select the first placement into the svgtoolbox,
 * then close the pointer so the editor handles are interactive (the pointer Modal
 * would otherwise intercept the drags). The toolbox state lives in the SVG toolkit
 * provider, so it survives the pointer closing. */
export const selectFirstPlacementForManipulation = async (
  page: Page,
  logoLabel: string,
) => {
  await openLogoPlacements(page, logoLabel);
  const selectSel = `[role="pointer-panel-content"] [data-testid="${LOGO_PLACEMENT_ITEM_TESTID}"] [data-testid="logo-placement-select"]`;
  await page.waitForSelector(selectSel);
  await page.click(selectSel);
  await resetUIState(page);
  await page.waitForSelector(`[data-testid="${SVGTOOLBOX_TESTID}"]`);
  await page.waitForSelector(HANDLES);
  // The main-copy DOM overlay (default top-left) sits ON TOP of the SVG and
  // covers the placement's handles. Drag it far right so the handles and clip
  // targets are hit-testable. The overlay uses setPointerCapture, so a plain
  // mouse drag tracks it.
  await moveMainCopyOut(page);
};

/** Drag the (single) main-copy overlay far to the right, off the placement. */
export const moveMainCopyOut = async (page: Page) => {
  const sel = '[data-testid="logo-main-copy"]';
  await page.waitForSelector(sel);
  const c = await page.$eval(sel, (el) => {
    const r = el.getBoundingClientRect();
    return { cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2 };
  });
  await page.mouse.move(c.cx, c.cy);
  await page.mouse.down();
  await page.mouse.move(c.cx + 10, c.cy, { steps: 2 });
  await page.mouse.move(c.cx + 600, c.cy, { steps: 12 });
  await page.mouse.up();
  await page.waitForFunction(
    (s: string) => {
      const el = document.querySelector(s);
      return !!el && el.getBoundingClientRect().left > 300;
    },
    {},
    sel,
  );
};

export const readPlacementTransform = (page: Page): Promise<Tx> =>
  page.$eval(PLACEMENT_USE, (el) => {
    const v = el.getAttribute('transform') ?? '';
    const t = /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/.exec(v);
    const s = /scale\(\s*(-?[\d.]+)/.exec(v);
    const r = /rotate\(\s*(-?[\d.]+)/.exec(v);
    return {
      x: t ? parseFloat(t[1]) : 0,
      y: t ? parseFloat(t[2]) : 0,
      scale: s ? parseFloat(s[1]) : 1,
      rotation: r ? parseFloat(r[1]) : 0,
      raw: v,
    };
  });

const handleCenter = (page: Page, kind: 'move' | 'scale' | 'rotate'): Promise<Point | null> =>
  page.evaluate(
    (handlesSel: string, k: string, moveI: number, scaleI: number) => {
      const root = document.querySelector(handlesSel);
      if (!root) return null;
      const el =
        k === 'rotate'
          ? root.querySelector('circle')
          : root.querySelectorAll('rect')[k === 'move' ? moveI : scaleI];
      if (!el) return null;
      const r = (el as Element).getBoundingClientRect();
      return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 };
    },
    HANDLES,
    kind,
    MOVE_RECT_INDEX,
    SCALE_RECT_INDEX,
  );

/** Drag a manipulation handle by a screen-pixel delta. The handle dispatches a
 * pointerdown then listens on window for pointermove/up, emitting onTransform on
 * release — which puppeteer's mouse input drives natively. */
export const dragManipHandle = async (
  page: Page,
  kind: 'move' | 'scale' | 'rotate',
  dx: number,
  dy: number,
) => {
  const c = await handleCenter(page, kind);
  if (!c) throw new Error(`manipulation handle "${kind}" not found`);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + dx, c.y + dy, { steps: 12 });
  await page.mouse.up();
};

/** Enter clip mode via the toolbox and pick a target element in the editor; the
 * pick hands the target id to the host's onClip → clipLogoPlacement. */
export const clipSelectedPlacementInto = async (page: Page, targetId: string) => {
  await page.click(`[data-testid="${SVGTOOLBOX_CLIP_TESTID}"]`);
  const target = `#svg-editor [id="${targetId}"]`;
  await page.waitForSelector(target);
  await page.click(target);
};

/** Wait until the placement <use> transform satisfies the predicate-by-field. */
export const waitForPlacementTransform = (
  page: Page,
  field: 'x' | 'y' | 'scale',
  cmp: 'increased',
  baseline: number,
) =>
  page.waitForFunction(
    (sel: string, f: string, base: number) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const v = el.getAttribute('transform') ?? '';
      const t = /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/.exec(v);
      const s = /scale\(\s*(-?[\d.]+)/.exec(v);
      const cur =
        f === 'scale' ? (s ? parseFloat(s[1]) : 1) : f === 'x' ? (t ? parseFloat(t[1]) : 0) : t ? parseFloat(t[2]) : 0;
      return cur > base + 0.5;
    },
    {},
    PLACEMENT_USE,
    field,
    baseline,
  );
