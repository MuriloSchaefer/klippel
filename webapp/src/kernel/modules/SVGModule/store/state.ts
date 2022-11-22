export interface ProxyState {
  id: string;

  fill?: string;
  stroke?: string;
}

export interface SVGState {
  raw: string;
  path: string;
  DOMid: string;
  proxies: {
    [id: string]: ProxyState
  }
}

export interface SVGModuleState {
  svgs: {
    [id: string]: SVGState
  }
}
