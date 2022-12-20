import { GraphState } from "@kernel/modules/Graphs/store/state";
import { Node } from "@kernel/modules/Graphs/interfaces/Node";

import { GRAPH_NAME } from "../constants";

type LoadingStatus = "not-started" | "started" | "finished" | "failed"

interface ModuleProperties {
    name: string;
    status: LoadingStatus
}

export interface ModuleNode extends Node{
    type: "Module";
    properties:ModuleProperties
}

export interface ModulesGraphState extends GraphState {
    nodes: {
      [id: string]: ModuleNode;
    };
  }

export interface LoaderState {
  modulesCount: number;
  modulesGraph: string
}

export const loaderInitialState: LoaderState = {
  modulesCount: 1,
  modulesGraph: GRAPH_NAME
};
