import React, { useLayoutEffect, useMemo, useState } from "react";

// TODO: how to make below modules dynamic?
import graphModule from "@kernel/modules/Graphs";
import layoutModule from "@kernel/modules/Layout";
import storeModule from "@kernel/modules/Store";

// Kernel modules
import SVG from "@kernel/modules/SVG";
import pointerModule from "@kernel/modules/Pointer";
import Markdown from "@kernel/modules/Markdown";
import KeyboardShortcuts from "@kernel/modules/KeyboardShortcuts";

import converterModule from "@system/modules/Converter";
import materialsModule from "@system/modules/Materials";
import composerModule from "@system/modules/Composer";

import module from "..";
import { GRAPH_NAME, MODULE_NAME } from "../constants";
import useGraph from "@kernel/modules/Graphs/hooks/useGraph";
import { ModulesMap } from "./Provider";
import { IModule } from "../../base";

type InitializerProps = {
  afterLoadComponent: React.ReactElement | React.ReactElement[];
  bootLog: (log: string) => void;
  logName: string;
};
const KERNEL_LOGS = "logs/kernel";
const getDailyLogFileName = () => {
  const dt = new Date();
  return `${KERNEL_LOGS}/${dt.getFullYear()}/${
    dt.getMonth() + 1
  }/${dt.getDate()}`;
};

const PreInit = (props: Omit<InitializerProps, "bootLog">) => {
  const { useLog } = storeModule.hooks;
  const dt = new Date();
  const logName = `${getDailyLogFileName()}/boot.log`;

  const bootLog = useLog(MODULE_NAME, logName);

  bootLog?.(`New boot ---- ${dt.toLocaleString()}`);
  return <Initializer {...props} bootLog={bootLog} logName={logName} />;
};

const Initializer = ({
  bootLog,
  logName,
  afterLoadComponent,
}: InitializerProps) => {
  const moduleManager = module.managers.modules();
  const graph = useGraph(GRAPH_NAME, (g) => g?.id);

  const [storeInitialized, setStoreInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [graphInitialized, setGraphInitialized] = useState(false);
  const [staticModulesLoaded, setStaticModulesLoaded] = useState(0);
  const [kernelModulesLoaded, setKernelModulesLoaded] = useState(0);
  const [extraModulesLoaded, setExtraModulesLoaded] = useState(0);

  const staticModules: ModulesMap["kernel"] = useMemo(
    () => ({
      [module.name]: module,
      [graphModule.name]: graphModule,
      [KeyboardShortcuts.name]: KeyboardShortcuts,
      [layoutModule.name]: layoutModule,
    }),
    [],
  );

  const extraModules: ModulesMap = {
    kernel: {
      [SVG.name]: SVG,
      [pointerModule.name]: pointerModule,
      [Markdown.name]: Markdown,
    },
    system: {
      [converterModule.name]: converterModule,
      [materialsModule.name]: materialsModule,
      [composerModule.name]: composerModule,
      // [ordersModule.name]: ordersModule
    },
  };

  const graphsManager = graphModule.managers.graphs();
  const { createGraph, resetGraph } = graphsManager.functions;

  // LOAD STATIC MODULES

  useLayoutEffect(() => {
    // initialization logic (we may separate it in a custom hook)
    const mod = Object.keys(staticModules)[staticModulesLoaded];
    if (mod && !moduleManager.functions.isModuleLoaded(mod))
      loadStaticModule(staticModules[mod]);
  }, [staticModulesLoaded, storeInitialized]);

  useLayoutEffect(() => {
    if (storeInitialized) return;
    if (staticModulesLoaded === Object.keys(staticModules).length) {
      bootLog(
        `Loading store module  module=${storeModule.name} version=(${storeModule.version})`,
      );
      moduleManager.functions.reloadModule(storeModule.name);
      setStoreInitialized(true);
      bootLog(
        `Store module loaded  module=${storeModule.name} version=(${storeModule.version})`,
      );
    }
  }, [storeInitialized, staticModulesLoaded]);

  // LOAD KERNEL MODULES
  useLayoutEffect(() => {
    if (!storeInitialized) return;

    // all static modules are loaded and we can now load the kernel ones
    const modName = Object.keys(extraModules.kernel)[kernelModulesLoaded];
    if (modName && !moduleManager.functions.isModuleLoaded(modName))
      loadKernelModule(extraModules.kernel[modName]);
  }, [storeInitialized, kernelModulesLoaded]);

  // LOAD EXTRA MODULES
  useLayoutEffect(() => {
    if (kernelModulesLoaded === Object.keys(extraModules.kernel).length) {
      // all kernel modules are loaded and we can now load the extra ones

      const modName = Object.keys(extraModules.system)[extraModulesLoaded];
      if (modName && !moduleManager.functions.isModuleLoaded(modName))
        loadExtraSystemModule(extraModules.system[modName]);
    }
  }, [kernelModulesLoaded, extraModulesLoaded]);

  // SET INITIALIZATION COMPLETE
  useLayoutEffect(() => {
    if (extraModulesLoaded === Object.keys(extraModules.system).length) {
      Object.values({
        ...staticModules,
        ...extraModules.kernel,
        ...extraModules.system,
      }).forEach((mod) => {
        moduleManager.functions.postBootInitialization(mod.name);
      });
      setIsInitializing(false);
    }
  }, [extraModulesLoaded]);

  // CREATE GRAPH
  useLayoutEffect(() => {
    if (!isInitializing && !graph.state) {
      createGraph(GRAPH_NAME);
      setGraphInitialized(true);
    }
  }, [isInitializing]);

  // POPULATE GRAPH
  useLayoutEffect(() => {
    // once all modules are loaded
    //  now we create the modules graph and add all loaded modules as nodes
    if (graphInitialized && !graph.state) {
      createGraph(GRAPH_NAME);
    }
    if (!graphInitialized) return;
    resetGraph(GRAPH_NAME);

    const rootNode = { id: "root", type: "ROOT" };

    graph.actions.addNode(rootNode);

    Object.values(staticModules).forEach((mod) =>
      graph.actions.addNode(
        {
          id: mod.name,
          type: "STATIC_MODULE",
        },
        {
          inputs: {
            root: {
              id: `root->${mod.name}`,
              type: "DEPENDS_ON",
              sourceId: "root",
              targetId: mod.name,
            },
          },
          outputs: {},
        },
      ),
    );
    Object.values(extraModules.kernel).forEach((mod) => {
      mod.depends_on.push("Loader"); // all modules depends on the loader
      const dependencies = mod.depends_on.reduce((inputs, dependency) => {
        const dependencyEdge = {
          id: `${dependency}->${mod.name}`,
          type: "DEPENDS_ON",
          sourceId: dependency,
          targedId: mod.name,
        };
        return { ...inputs, [dependency]: dependencyEdge };
      }, {});
      graph.actions.addNode(
        {
          id: mod.name,
          type: "EXTRA_KERNEL_MODULE",
        },
        { inputs: dependencies, outputs: {} },
      );
    });

    Object.values(extraModules.system).forEach((mod) => {
      mod.depends_on.push("Loader"); // all modules depends on the loader
      const dependencies = mod.depends_on.reduce((inputs, dependency) => {
        const dependencyEdge = {
          id: `${dependency}->${mod.name}`,
          type: "DEPENDS_ON",
          sourceId: dependency,
          targedId: mod.name,
        };
        return { ...inputs, [dependency]: dependencyEdge };
      }, {});
      graph.actions.addNode(
        {
          id: mod.name,
          type: "EXTRA_SYSTEM_MODULE",
        },
        { inputs: dependencies, outputs: {} },
      );
    });
    setIsInitializing(false);
  }, [graphInitialized]);

  // HELPERS
  function loadStaticModule(mod: IModule) {
    bootLog(
      `Loading static module  module=${mod.name} version=(${mod.version})`,
    );
    moduleManager.functions.loadModule(mod, bootLog);
    setStaticModulesLoaded((old) => old + 1);
    bootLog(
      `Static module loaded  module=${mod.name} version=(${mod.version})`,
    );
  }
  function loadKernelModule(mod: IModule) {
    bootLog(
      `Loading kernel module  module=${mod.name} version=(${mod.version})`,
    );
    moduleManager.functions.loadModule(mod, bootLog);
    setKernelModulesLoaded((old) => old + 1);
    bootLog(
      `kernel module loaded  module=${mod.name} version=(${mod.version})`,
    );
  }
  function loadExtraSystemModule(mod: IModule) {
    bootLog(
      `Loading extra module  module=${mod.name} version=(${mod.version})`,
    );
    moduleManager.functions.loadModule(mod, bootLog);
    setExtraModulesLoaded((old) => old + 1);
    bootLog(`Extra module loaded  module=${mod.name} version=(${mod.version})`);
  }

  useLayoutEffect(() => {
    if (!isInitializing) {
      bootLog("Boot complete! \r\n");
    }
  }, [isInitializing]);

  if (isInitializing) return <div>Iniciando sistema</div>;

  return afterLoadComponent;
};

export default React.memo(PreInit);
