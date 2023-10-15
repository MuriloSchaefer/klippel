import IconButton from "@mui/material/IconButton";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";

import useModule from "@kernel/hooks/useModule";
import type { ILayoutModule } from "@kernel/modules/Layout";

export const ConversorGraphSection = () => {
  const layoutModule = useModule<ILayoutModule>("Layout");
  const { useViewportManager } = layoutModule.hooks;

  const viewportManager = useViewportManager();

  return (
    <>
      <IconButton
        onClick={() =>
          viewportManager.functions.addViewport(
            "Grafo de conversão",
            "ConverterGraphViewport",
            undefined,
            "conversion-graph"
          )
        }
      >
        <CurrencyExchangeIcon />
      </IconButton>
    </>
  );
};

export default ConversorGraphSection;
