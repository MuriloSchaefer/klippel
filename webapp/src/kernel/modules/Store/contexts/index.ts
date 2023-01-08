import { ListenerMiddlewareInstance } from "@reduxjs/toolkit";
import { createContext, Reducer } from "react";
import { AnyAction } from "redux";

export type ReducersMap = {[key: string]: Reducer<any, AnyAction>}

export type CurrentReducersContextType = {
    currentReducers: ReducersMap,  
    loadReducers: (next: ReducersMap)=>void,
    registerMiddleware: (middleware: ListenerMiddlewareInstance)=>void,
};

const CurrentReducersContext = createContext<CurrentReducersContextType>({
    currentReducers: {},
    loadReducers: (next) => null,
    registerMiddleware: (middleware) => null
});

export default CurrentReducersContext;
