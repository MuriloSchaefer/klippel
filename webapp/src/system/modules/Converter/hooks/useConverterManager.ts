import _ from "lodash";
import { createSelector } from "reselect";

import useModule from "@kernel/hooks/useModule";
import type { Store } from "@kernel/modules/Store";
import type { IGraphModule } from "@kernel/modules/Graphs";
import type { ILayoutModule } from "@kernel/modules/Layout";

import { CompoundNode, ConversionGraph, ConvertsToEdge, DividendEdge, ExpressionConversion, LinearConversion, QuotientEdge, ScaleNode, UnitNode } from "../typings";
import { CONVERSION_GRAPH_NAME } from "../constants";
import { selectNode } from "../store/actions";
import { ConverterState } from "../store/state";
import { selectConverterModule } from "../store/selectors";

export type ConverterManager<R> = {
  addUnit: (name: string, abbreviation: string, scale?: string) => void;
  updateUnit: (
    id: string,
    name: string,
    abbreviation: string,
    scale?: string
  ) => void;
  addCompoundUnit: (quotientUnit: string, dividendUnit: string) => void;
  updateCompoundUnit: (id:string, quotientUnit: string, dividendUnit: string) => void;
  addScale: (name: string) => void;
  selectNode: (nodeId: string) => void;
  addConversion: (type: ConvertsToEdge["conversionType"], from: string, to: string, factor?: number, expression?: string) => void;
  state: R;
};

/**
 * Manages conversion graph
 * @returns ConverterManager
 */
export const useConverterManager = <R = ConverterState>(
  selector: (args_0: ConverterState) => R | undefined
): ConverterManager<R | undefined> => {
  const storeModule = useModule<Store>("Store");
  const graphModule = useModule<IGraphModule>("Graph");
  const layoutModule = useModule<ILayoutModule>("Layout");

  const { useGraph } = graphModule.hooks;
  const graph = useGraph<ConversionGraph>(
    CONVERSION_GRAPH_NAME,
    (g) => g as ConversionGraph
  );
  const panelsManager = layoutModule.hooks.usePanelsManager();

  const { useAppDispatch, useAppSelector } = storeModule.hooks;
  const dispatch = useAppDispatch();

  const innerSelector = createSelector(selectConverterModule, selector);
  const state = useAppSelector(innerSelector);

  const _innerState = useAppSelector(selectConverterModule);

  return {
    state,
    selectNode: (nodeId: string) => {
      dispatch(selectNode(nodeId));
      panelsManager.functions.openDetails();
    },
    addUnit: (name, abbreviation, scale) => {
      const unitId = _.uniqueId(name.toLowerCase().replace(" ", ""));
      graph.actions.addNode({
        type: "UNIT",
        id: unitId,
        name,
        position: { x: 0, y: 0 },
        abbreviation,
      } as UnitNode);
      console.log(scale);
      if (scale) {
        console.log("add scale");
        graph.actions.addEdge({
          id: `${unitId} -> ${scale}`,
          type: "BELONGS_TO",
          sourceId: unitId,
          targetId: scale,
        });
      }
    },
    updateUnit: (id, name, abbreviation, scale) => {
      graph.actions.updateNode({ id, name, abbreviation });
      const belongsToEdge = graph.state?.adjacencyList[id].outputs
        .filter((o) => graph.state?.edges[o].type === "BELONGS_TO")
        .map((o) => graph.state?.edges[o])
        .pop();
      if (scale) {
        if (belongsToEdge && belongsToEdge.targetId !== scale)
          graph.actions.removeEdge(belongsToEdge.id);
        
        graph.actions.addEdge({
          id: `${id} -> ${scale}`,
          type: "BELONGS_TO",
          sourceId: id,
          targetId: scale,
        });
      } else if (belongsToEdge) graph.actions.removeEdge(belongsToEdge.id);
    },
    addCompoundUnit: (quotiendUnit, dividendUnit) => {
      const quotient = graph.state?.nodes[quotiendUnit] as UnitNode
      const dividend = graph.state?.nodes[dividendUnit] as UnitNode
      const unitId = `${quotient.abbreviation} / ${dividend.abbreviation}`;
      const exists = graph.state?.nodes[unitId]
      if (exists) {
        console.error('unit already exists! skipping it.')
        return
      }
      const node: CompoundNode = {
        id: unitId,
        type: 'COMPOUND_UNIT',
        position: {x:0, y:0},
        quotientUnitId: quotiendUnit,
        dividendUnitId: dividendUnit,
        abbreviation: unitId,
        name: `${quotient.name} per ${dividend.name}`
      }
      const quotientEdge: QuotientEdge = {
        id: `${unitId}->${quotiendUnit}`,
        type: 'QUOTIENT',
        sourceId: unitId,
        targetId: quotiendUnit,
      }
      const dividendEdge: DividendEdge = {
        id: `${unitId}->${dividendUnit}`,
        type: 'DIVIDEND',
        sourceId: unitId,
        targetId: dividendUnit,
      }

      graph.actions.addNode(node)

      graph.actions.addEdge(quotientEdge)
      graph.actions.addEdge(dividendEdge)
    },
    updateCompoundUnit: (id, quotientUnit, dividendUnit) => {

    },
    addScale: (name) => {
      graph.actions.addNode({
        type: "SCALE",
        id: _.uniqueId(name.toLowerCase().replace(" ", "")),
        name,
        position: { x: 0, y: 0 },
      } as ScaleNode);
    },
    addConversion: (type, from, to, factor, expression) => {
      console.log(type, from, to, factor, expression)
      let edge: LinearConversion | ExpressionConversion;
      if (type === "factor"){
        if (!factor){
          console.error('Factor required to add factor conversion! Skipping')
          return
        }
        edge = {
          type: 'CONVERTS_TO',
          conversionType: 'factor',
          factor,
          id: `${from}->${to}`,
          sourceId: from,
          targetId: to
        }
      } else {
        if(!expression){
          console.error('Expression required to add expression conversion! Skipping')
          return
        }
        edge = {
          type: 'CONVERTS_TO',
          conversionType: 'expression',
          expression,
          id: `${from}-[conv]->${to}`,
          sourceId: from,
          targetId: to
        }
      }
      graph.actions.addEdge(edge)
    }
  };
};

export default useConverterManager;
