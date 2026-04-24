import useModule from "@kernel/hooks/useModule";
import type { ConversionGraph, Value } from "../typings";
import { IGraphModule } from "@kernel/modules/Graphs";
import { CONVERSION_GRAPH_NAME } from "../constants";
import { convert } from "../utils/convert";

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
    convert: (from, to, initialParams) =>
      convert(conversionGraph.state!, from, to, initialParams),
  };
};

export default useConverter;
