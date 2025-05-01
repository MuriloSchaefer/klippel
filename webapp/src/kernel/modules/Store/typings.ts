import { Action, ThunkAction } from "@reduxjs/toolkit";

export type AppDispatch = any;
export type RootState = ReturnType<(...args: any) => any>; 
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;