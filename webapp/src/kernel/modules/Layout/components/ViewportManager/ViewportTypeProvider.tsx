import React, { ComponentType, createContext, MemoExoticComponent, useMemo, useState } from "react";
import { ViewportState } from "../../store/viewports/state";

export type ViewportType = MemoExoticComponent<ComponentType<ViewportState>>
export type ViewportTypeMap = { [name: string]: ViewportType }

export type ViewportTypesContextType = {
  types: ViewportTypeMap;
  addTypes: (components: {[name:string]: ViewportType}) => void;
  removeType: (name: string) => void;
};

export const ViewportTypeContext = createContext<ViewportTypesContextType>({
  types: {},
  addTypes: () => null,
  removeType: () => null,
});

export const ViewportTypeProvider = ({
  children,
  default_types
}: {
  children: React.ReactNode | React.ReactNode[];
  default_types?: ViewportTypeMap
}) => {
  const [currentTypes, setTypes] = useState<ViewportTypeMap>(default_types ?? {});

  const memoizedValue = useMemo(()=>({ 
    types: currentTypes, 
    addTypes,
    removeType
  }), [currentTypes])

  function addTypes (types: {[name: string]: ViewportType}){
    setTypes({...currentTypes, ...types})
  }
  function removeType (name: string){
    const newTypes = {...currentTypes}
    delete newTypes[name]
    setTypes(newTypes)
  }

  return (
    <ViewportTypeContext.Provider value={memoizedValue}>
      {children}
    </ViewportTypeContext.Provider>
  );
};

export default ViewportTypeProvider;
