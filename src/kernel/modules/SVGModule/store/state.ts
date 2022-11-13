export interface SVGState {
  raw: string;
}

export interface SVGModuleState {
  svgs: {
    [id: string]: SVGState
  }
}
