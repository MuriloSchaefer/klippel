export interface ViewportState {
    name: string
    title: string;
    type: string;
    group?: string
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