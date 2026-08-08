export interface ViewportState<S = any> {
    name: string
    title: string;
    type: string;
    group?: string
    extra?: S
  }
  export interface ViewportGroupState {
    name: string;
    color: string;
    /**
     * Human readable name for the group. `name` is an internal id (e.g.
     * `budget-3`), so without this the colour is the only affordance the user
     * gets for "these tabs belong together". Optional — groups created before
     * this existed have none.
     */
    label?: string;
  }
  export interface ViewportGroups {
    [name: string]: ViewportGroupState
  }
  export interface viewportManagerState {
    groups: ViewportGroups
    activeViewport: string;
    viewports: {[name: string]: ViewportState}
    dirtyViewports: {[name: string]: boolean}
  }