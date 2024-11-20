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
  }
  export interface ViewportGroups {
    [name: string]: ViewportGroupState
  }
  export interface viewportManagerState {
    groups: ViewportGroups
    activeViewport: string;
    viewports: {[name: string]: ViewportState}
  }