import React, { ComponentType, createContext } from "react";

export type ComponentTypeMap<CT = any> = { [name: string]: ComponentType<CT> };
export type ComponentRegistries = { [name: string]: ComponentTypeMap };

export type ComponentRegistryType = {
  registries: ComponentRegistries;
  createRegistry: (name: string) => void;
  createRegistries: (registries: ComponentRegistries)=> void
  getComponent: <T = any>(
    registryName: string,
    componentName: string
  ) => ComponentType<T>;

  registerComponents: <T = any>(
    components: {[registry:string]: {[name: string]: ComponentType<T>}}
  ) => void;
};

export const ComponentRegistryContext = createContext<ComponentRegistryType>({
  registries: {},
  createRegistry: () => null,
  createRegistries: ()=>null,
  getComponent: () => React.memo(() => null),
  registerComponents: () => null
});

export default ComponentRegistryContext;