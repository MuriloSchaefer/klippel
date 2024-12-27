import { IcpApi } from "../electron/preload/typings";

export type OmitFirstArg<F> = F extends (x: any, ...args: infer P) => infer R ? (...args: P) => R : never;

declare global {
  interface Window {
    // electron: ElectronAPI
    electron: IcpApi
  }
}