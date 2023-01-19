import React, { ComponentType, createContext, MemoExoticComponent, useMemo, useState } from "react";
import { ViewportState } from "../../store/state";

export type ViewportType = MemoExoticComponent<ComponentType<ViewportState>>
export type ViewportTypeMap = { [name: string]: ViewportType }

export type ViewportTypesContextType = {
  types: ViewportTypeMap;
  addType: (name: string, component: ViewportType) => void;
  removeType: (name: string) => void;
};

export const ViewportTypeContext = createContext<ViewportTypesContextType>({
  types: {},
  addType: () => null,
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
    addType,
    removeType
  }), [currentTypes])

  function addType (name: string, component: ViewportType){
    setTypes({...currentTypes, [name]: component})
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
