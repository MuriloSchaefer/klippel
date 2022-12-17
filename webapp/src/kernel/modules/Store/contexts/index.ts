import { ListenerMiddlewareInstance } from "@reduxjs/toolkit";
import { createContext, Reducer } from "react";
import { AnyAction } from "redux";

export type ReducersMap = {[key: string]: Reducer<any, AnyAction>}

export type CurrentReducersContextType = {
    currentReducers: ReducersMap,  
    setCurrentReducers: (next: ReducersMap)=>void,
    registerMiddleware: (middleware: ListenerMiddlewareInstance)=>void,
    unRegisterMiddleware: (middleware: ListenerMiddlewareInstance)=>void
};

const CurrentReducersContext = createContext<CurrentReducersContextType>({
    currentReducers: {},
    setCurrentReducers: (next) => null,
    registerMiddleware: (middleware) => null,
    unRegisterMiddleware: (middleware) => null
});

export default CurrentReducersContext;
