import React, {
  ComponentType,
  useMemo,
  useState,
} from "react";
import { ComponentRegistries, ComponentRegistryContext } from "../contexts/componentRegistry";


export const ComponentsRegistryProvider = ({
    children,
    default_registries,
  }: {
    children: React.ReactNode | React.ReactNode[];
    default_registries?: ComponentRegistries;
  }) => {
    const [currentRegistries, setRegistries] = useState<ComponentRegistries>(
      default_registries ?? {}
    );
  
    const memoizedValue = useMemo(
      () => ({
        registries: currentRegistries,
        createRegistry,
        createRegistries,
        getComponent,
        registerComponents,
      }),
      [currentRegistries]
    );
  
    function createRegistry(name: string) {
      setRegistries({ ...currentRegistries, [name]: {} });
    }
    function createRegistries(registries: ComponentRegistries) {
      setRegistries({ ...currentRegistries, ...registries });
    }
    function getComponent<T = any>(
      registryName: string,
      componentName: string
    ): ComponentType<T> {
      return currentRegistries[registryName][componentName];
    }
    function registerComponents<T = any>(
      components: {registry: {[name: string]: ComponentType<T>}}
    ) {
      const curr = currentRegistries
      const newValues = Object.entries(components).reduce((curr, [registry, comp]) => ({
        ...curr,
        [registry]: {...curr[registry], ...comp}
      }), {})

      setRegistries(newValues);
    }
  
    return (
      <ComponentRegistryContext.Provider value={memoizedValue}>
        {children}
      </ComponentRegistryContext.Provider>
    );
  };
  


export default ComponentsRegistryProvider;

