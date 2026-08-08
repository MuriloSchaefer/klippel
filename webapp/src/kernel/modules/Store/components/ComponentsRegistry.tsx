import React, {
  ComponentType,
  useMemo,
  useState,
} from "react";
import { ComponentRegistries, ComponentRegistryContext, ComponentTypeMap } from "../contexts/componentRegistry";


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
        getRegistry
      }),
      [currentRegistries]
    );
  
    // All mutators go through functional updates: two calls in the same tick
    // (e.g. a module creating a registry and then filling it in one
    // `startModule`) would otherwise both compute from the same stale
    // `currentRegistries`, and the second would silently undo the first.
    function createRegistry(name: string) {
      setRegistries((curr) => (name in curr ? curr : { ...curr, [name]: {} }));
    }
    function createRegistries(registries: ComponentRegistries) {
      setRegistries((curr) =>
        Object.entries(registries).reduce(
          (acc, [name, components]) =>
            name in acc ? acc : { ...acc, [name]: components },
          curr
        )
      );
    }
    function getComponent<T = any>(
      registryName: string,
      componentName: string
    ): ComponentType<T> {
      return currentRegistries[registryName][componentName];
    }
    function getRegistry<T = any>(
      registryName: string,
    ): ComponentTypeMap<T> {
      return currentRegistries[registryName];
    }
    function registerComponents<T = any>(
      components: {[registry: string]: {[name: string]: ComponentType<T>}}
    ) {
      setRegistries((curr) =>
        Object.entries(components).reduce(
          // Create the registry when it does not exist yet. Dropping the write
          // silently (the previous behaviour) made a registration that ran
          // before its `createRegistry` disappear with no error.
          (acc, [registry, comp]) => ({
            ...acc,
            [registry]: { ...(acc[registry] ?? {}), ...comp },
          }),
          curr
        )
      );
    }
  
    return (
      <ComponentRegistryContext.Provider value={memoizedValue}>
        {children}
      </ComponentRegistryContext.Provider>
    );
  };
  


export default ComponentsRegistryProvider;

