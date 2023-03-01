import AccountTreeSharpIcon from "@mui/icons-material/AccountTreeSharp";
import ShortTextSharpIcon from "@mui/icons-material/ShortTextSharp";
import ListSharpIcon from "@mui/icons-material/ListSharp";
import SellSharpIcon from "@mui/icons-material/SellSharp";
import AccessTimeSharpIcon from "@mui/icons-material/AccessTimeSharp";

import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import React, { useCallback, useMemo } from "react";

import { Store } from "@kernel/modules/Store";

import MaterialsList from './MaterialsList'
import ProcessesList from './ProcessesList'
import { CompositionState } from "../../store/state";
import useComposition from "../../hooks/useComposition";
import useRDFInterpreter from "../../hooks/useRDFInterpreter";
import { RDF, SELF } from "../../constants";

const ComposerDetailsPanel = () => {
  const layoutModule = useModule<ILayoutModule>("Layout");
  const storeModule = useModule<Store>("Store");

  const { DetailsPanel, Accordion } = layoutModule.components;


  const { useAppSelector } = storeModule.hooks;
  const { selectActiveViewport } = layoutModule.store.selectors;
  const activeViewport = useAppSelector(selectActiveViewport);


  const selector = useCallback((c: CompositionState | undefined) => ({
    model: c?.model,
    selectedPart: c?.selectedPart
  }), [])
  const composition = useComposition(activeViewport!, selector);
  const interpreter = useMemo(() => useRDFInterpreter(composition.state?.model), [composition.state?.model])

  if (!composition.state?.selectedPart || !interpreter) return null;

  const title = interpreter.any(SELF(composition.state.selectedPart), RDF('label'), undefined)

  return (
    <DetailsPanel title={title?.value ?? composition.state.selectedPart}>
      <Accordion
        name="Materiais"
        icon={<ListSharpIcon />}
        summary="Lista de materiais"
      >
        <MaterialsList selectedPart={composition.state.selectedPart} interpreter={interpreter}/>
      </Accordion>
      <Accordion
        name="Processos"
        icon={<ListSharpIcon />}
        summary="Lista de processos"
      >
        <ProcessesList />
      </Accordion>
    </DetailsPanel>
  );
};

export default React.memo(ComposerDetailsPanel);
