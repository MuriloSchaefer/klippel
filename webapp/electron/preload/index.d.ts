import { IcpApi } from "./typings";


declare global {
  interface Window {
    // electron: ElectronAPI
    electron: IcpApi
  }
}
