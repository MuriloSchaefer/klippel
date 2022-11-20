export interface SVGState {
  raw: string;
  DOMid: string;
}

export interface SVGModuleState {
  svgs: {
    [id: string]: SVGState
  }
}
