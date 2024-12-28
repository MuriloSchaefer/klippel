import { Action, ThunkAction } from "@reduxjs/toolkit";
import { StorageAPI } from "../../../../electron/preload/storage/typings";
import { OmitFirstArg } from "typings";

export type AppDispatch = any;
export type RootState = ReturnType<(...args: any) => any>; 
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;


export type File = {
  fd: number,
  stats: any,
  read: OmitFirstArg<StorageAPI['read']>
  write: OmitFirstArg<StorageAPI['write']>
  close: OmitFirstArg<StorageAPI['close']>
}

export type Directory = {
  path: string,
  stats: any,
  search: (q: string, ext: string)=>any
  list: ()=>void
  createDir: (name: string)=>void
  deleteDir: (name: string)=>void
  createFile: (name: string, buffer: Buffer)=>void
  deleteFile: (name: string)=>void
}