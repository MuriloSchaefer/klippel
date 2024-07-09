import useModule from "@kernel/hooks/useModule";
import {
  CompoundNode,
  ConversionGraph,
  ConvertsToEdge,
  UnitNode,
  Value,
} from "../typings";
import { IGraphModule } from "@kernel/modules/Graphs";
import { CONVERSION_GRAPH_NAME } from "../constants";
import dfs from "@kernel/modules/Graphs/searchAlgs/dfs";
import { isNumber, isString } from "lodash";

import { compile, registerPlugin } from "jse-eval";

registerPlugin({
  name: "Square root",
  initEval(jseEval) {
    jseEval.addUnaryOp("sqrt", (x) => Math.sqrt(x));
  },
});

export type Converter = {
  state: ConversionGraph | undefined;
  convert: (
    from: Value,
    to: string | { quotient: string; dividend: string },
    initialParams?: { [name: string]: number | Value }
  ) => Value | undefined;
};

export const useConverter = (): Converter | undefined => {
  const graphModule = useModule<IGraphModule>("Graph");
  const { useGraph } = graphModule.hooks;

  const conversionGraph = useGraph<ConversionGraph>(
    CONVERSION_GRAPH_NAME,
    (g) => g
  );

  if (!conversionGraph.state) return undefined;

  return {
    state: conversionGraph.state,
    convert: (from, to, initialParams = {}) => {
      let fromNode: UnitNode | CompoundNode | undefined = undefined;
      let toNode: UnitNode | CompoundNode | undefined = undefined;
      
      if ("quotient" in from) {
        // finds the compound node
        fromNode = Object.values(conversionGraph.state?.nodes ?? {}).find(
          (n): n is CompoundNode =>
            n.type === "COMPOUND_UNIT" &&
            n.dividendUnitId === from.dividend.unit &&
            n.quotientUnitId === from.quotient.unit
        );
      } else {
        fromNode = conversionGraph.state?.nodes[from.unit] as UnitNode;
      }

      if (!isString(to)) {
        fromNode = Object.values(conversionGraph.state?.nodes ?? {}).find(
          (n): n is CompoundNode =>
            n.type === "COMPOUND_UNIT" &&
            n.dividendUnitId === to.dividend &&
            n.quotientUnitId === to.quotient
        );
      } else {
        toNode = conversionGraph.state?.nodes[to] as UnitNode;
      }
      if (!fromNode || !toNode) {
        console.warn("could not find starting/ending point");
        return;
      }
      if (!conversionGraph.state) {
        console.error("Conversion graph not found");
        return;
      }

      const { path } = dfs(
        conversionGraph.state,
        fromNode.id,
        (node, g, currFindings, visitedNodes) => {
          //validation
          return true; // evaluate all nodes as possible conversions, here the goal is to find the path only, not validate if conversion is possible
        },
        (node, graph, currFindings, visitedNodes) => {
          // stop criteria
          if (!toNode || node.id === toNode.id) return true;

          return false;
        },
        (node, graph) => {
          // neighbours to search next
          return Object.values(graph.edges)
            .filter(
              (e) =>
                graph.adjacencyList[node.id].outputs.includes(e.id) &&
                e.type === "CONVERTS_TO"
            )
            .map((e) => e.id);
        }
      );

      // walk through path found trying to do the conversion
      let value = { ...from };
      for (let i = 0; i < path.length - 1; i++) {
        let origin = path[i];
        let destination = path[i + 1];
        const transformation = Object.values(conversionGraph.state.edges).find(
          (e): e is ConvertsToEdge =>
            e.sourceId === origin &&
            e.targetId === destination &&
            e.type === "CONVERTS_TO"
        );
        if (!transformation) {
          console.error("Error while transforming units");
          return;
        }
        const expression =
          transformation.conversionType === "factor"
            ? `quantidade * ${transformation.factor}`
            : transformation.expression;

        const fn = compile(expression);
        const identifiers = [...expression.matchAll(/[a-zA-Z]\w*/g)]
          .map(([v]) => v)
          .filter(
            (v) =>
              ![
                "quantidade",
                "quantidadeQuociente",
                "quantidadeDividendo",
              ].includes(v)
          );

        let context: { [name: string]: number } = identifiers.reduce(
          (acc, curr) => {
            const param = initialParams[curr];
            if (param === undefined) return acc;
            if (isNumber(param)) {
              return { ...acc, [curr]: param };
            }
            if ("unit" in param) {
              return { ...acc, [curr]: param.amount };
            }
            if ("quotient" in param) {
              if (param.quotient.unit === destination) {
                return {
                  ...acc,
                  [curr]: param.quotient.amount / param.dividend.amount,
                };
              } else if (param.dividend.unit === destination) {
                return {
                  ...acc,
                  [curr]: param.dividend.amount / param.quotient.amount,
                };
              }
            }

            return acc;
          },
          {}
        );

        if ("unit" in value) {
          context["quantidade"] = value.amount;
        }
        if ("quotient" in value) {
          context["quantidadeQuociente"] = value.quotient.amount;
          context["quantidadeDividendo"] = value.dividend.amount;
        }

        if (Object.keys(context).length < identifiers.length) {
          console.error("missing context", {
            context,
            identifiers,
            expression,
          });
          return;
        }

        const newValue = fn(context) as number;
        value = { unit: destination, amount: newValue };
      }

      return value;
    },
  };
};

export default useConverter;
