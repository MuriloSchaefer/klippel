/**
 * What the renderer knows about the *shape* of its catalog mirror — as
 * opposed to `materials`, which holds the rows themselves.
 *
 * This slice exists because a windowed client can no longer answer "how many
 * materials are there" by counting what it has. It holds a page; the catalog
 * is elsewhere. Every count the UI shows, and every decision about whether
 * there is more to fetch, is read from here.
 */
export interface MaterialsWindowState {
  /** Materials in the catalog, as of the last window read or delta tick. */
  total: number;
  /** Materials matching `query` — equals `total` when the query is empty. */
  matched: number;
  /**
   * Ids of the current view in server rank order: the ranked browse list, or
   * the active query's results. **Not** every id in the slice — pinned rows
   * and lazily-resolved ones are in `materials` without being part of the
   * view, exactly as a model's material can be resident without appearing in
   * the stock grid's current page.
   */
  resultIds: string[];
  /** Offset the next page starts at. */
  nextOffset: number;
  /** Page size in use. */
  limit: number;
  /** Whether `nextOffset < matched`. */
  hasMore: boolean;
  /** A request is in flight — the grid shows its loading affordance. */
  loading: boolean;
  /** Query the resident results were produced by. Empty ⇒ browse view. */
  query: string;
  /**
   * Materials pinned into the mirror by open models. Kept so a later page
   * request re-sends them: main re-pins on every read, which is what stops a
   * pinned row from being evicted by a `reset`.
   *
   * Flattened from `pins` — the union, de-duplicated, in insertion order.
   * Stored rather than selected because every window request sends it and the
   * middlewares read it off the state directly.
   */
  pinnedIds: string[];
  /**
   * Pins by owner — a variation id, or `ADHOC_PIN_OWNER` for a pin nobody
   * claimed. A tab that closes releases exactly its own rows, which is what
   * makes "keep what other tabs reference" a statement the mirror can act on
   * instead of an assumption that only ever grew.
   */
  pins: { [owner: string]: string[] };
  /** True once a first window answer has landed for this workspace. */
  initialized: boolean;
}

/** Owner recorded for a pin that named none — a one-off `ensureMaterialsLoaded`. */
export const ADHOC_PIN_OWNER = "__adhoc__";

export const initialState: MaterialsWindowState = {
  total: 0,
  matched: 0,
  resultIds: [],
  nextOffset: 0,
  limit: 100,
  hasMore: false,
  loading: false,
  query: "",
  pinnedIds: [],
  pins: {},
  initialized: false,
};
