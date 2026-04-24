import type { ConversionGraph, CompoundNode, UnitNode, Value, ConvertsToEdge } from "../typings";
import dfs from "@kernel/modules/Graphs/searchAlgs/dfs";
import { isNumber, isString } from "lodash";
import { compile, registerPlugin } from "jse-eval";

registerPlugin({
  name: "Square root",
  initEval(jseEval) {
    jseEval.addUnaryOp("sqrt", (x) => Math.sqrt(x));
  },
});

export function convert(
  conversionGraph: ConversionGraph,
  from: Value,
  to: string | { quotient: string; dividend: string },
  initialParams: { [name: string]: number | Value } = {}
): Value | undefined {
  let fromNode: UnitNode | CompoundNode | undefined = undefined;
  let toNode: UnitNode | CompoundNode | undefined = undefined;

  if ("quotient" in from) {
    fromNode = Object.values(conversionGraph?.nodes ?? {}).find(
      (n): n is CompoundNode =>
        n.type === "COMPOUND_UNIT" &&
        n.dividendUnitId === from.dividend.unit &&
        n.quotientUnitId === from.quotient.unit
    );
  } else {
    fromNode = conversionGraph?.nodes[from.unit] as UnitNode;
  }

  if (!isString(to)) {
    toNode = Object.values(conversionGraph?.nodes ?? {}).find(
      (n): n is CompoundNode =>
        n.type === "COMPOUND_UNIT" &&
        n.dividendUnitId === to.dividend &&
        n.quotientUnitId === to.quotient
    );
  } else {
    toNode = conversionGraph?.nodes[to] as UnitNode;
  }

  if (!fromNode || !toNode) {
    console.warn("could not find starting/ending point");
    return;
  }

  const variablesAvailable = Object.entries(initialParams).reduce((acc, [name, value]) => {
    if (isNumber(value)) {
      return acc;
    }
    if (typeof value === "object" && "unit" in value) {
      return { ...acc, [name]: value.amount };
    }
    if (typeof value === "object" && "quotient" in value) {
      return {
        ...acc,
        [`${name}Quociente`]: value.quotient.amount,
        [`${name}Dividendo`]: value.dividend.amount,
      };
    }
    return acc;
  }, {} as { [name: string]: number });

  const { path } = dfs(
    conversionGraph,
    fromNode.id,
    (node, g, currFindings, visitedNodes, lastNode) => {
      if (node.id === fromNode!.id) return true;
      const transformation = Object.values(g.edges).find(
        (e): e is ConvertsToEdge =>
          e.sourceId === visitedNodes.at(-2)?.id &&
          e.targetId === lastNode &&
          e.type === "CONVERTS_TO"
      );
      if (!transformation) {
        console.debug("conversion edge not found");
        return false;
      }

      const expression =
        transformation.conversionType === "factor"
          ? `quantidade * ${transformation.factor}`
          : transformation.expression;

      const identifiers = [...expression.matchAll(/[a-zA-Z]\w*/g)]
        .map(([v]) => v)
        .filter(
          (v) =>
            !["quantidade", "quantidadeQuociente", "quantidadeDividendo"].includes(v)
        );

      const allParamsAvailable = identifiers.every((id) =>
        Object.keys(variablesAvailable).includes(id)
      );
      if (!allParamsAvailable) {
        console.debug("missing params for conversion", {
          needed: identifiers,
          available: Object.keys(variablesAvailable),
        });
      }
      return allParamsAvailable;
    },
    (node, graph, currFindings, visitedNodes) =>
      !toNode || node.id === toNode.id,
    (node, graph) => {
      return Object.values(graph.edges)
        .filter(
          (e) =>
            graph.adjacencyList[node.id].outputs.includes(e.id) &&
            e.type === "CONVERTS_TO"
        )
        .map((e) => e.id);
    }
  );

  if (toNode && path.at(-1) !== toNode.id) {
    console.error(
      `Could not find conversion path from ${fromNode.id} to ${toNode.id}: `,
      { path, fromNode, toNode, initialParams }
    );
    throw new Error(`Não foi possível converter ${fromNode.id} para ${toNode.id} `);
  }

  let value = { ...from };
  for (let i = 0; i < path.length - 1; i++) {
    let origin = path[i];
    let destination = path[i + 1];
    let destinationNode = conversionGraph.nodes[destination];
    if (!destinationNode) {
      console.error("Error while transforming units: destination node missing");
      return;
    }
    const transformation = Object.values(conversionGraph.edges).find(
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
          !["quantidade", "quantidadeQuociente", "quantidadeDividendo"].includes(v)
      );

    let context: { [name: string]: number } = identifiers.reduce(
      (acc, curr) => {
        const param = variablesAvailable[curr];
        if (param === undefined) return acc;
        if (isNumber(param)) {
          return { ...acc, [curr]: param };
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
      console.error("missing context", { context, identifiers, expression });
      return;
    }

    const newValue = fn(context) as number;
    value = { unit: destination, amount: newValue };
  }

  return value;
}
