import React from "react";
import { ViewportState } from "../../store/viewports/state";
import { Accordion } from "../Panels/Accordion";
import DetailsPanel from "../Panels/DetailsPanel";
import SettingsPanel from "../Panels/SettingsPanel";
import TodaySharp from '@mui/icons-material/TodaySharp';

const HomeViewport = ({ name, title, type, group }: ViewportState) => {
  return (
    <>
      <SettingsPanel>
        <>
        <Accordion name="Agenda" icon={<TodaySharp />} expanded={true}><></></Accordion>
        <Accordion name="Recebimentos" summary="Recebimentos do mês"><></></Accordion>
        <Accordion name="Andamento" summary="Pedidos em produção"><></></Accordion>
        </>
      </SettingsPanel>
      <DetailsPanel>
        <>Detalhes</>
      </DetailsPanel>
    </>
  );
};

export default React.memo(HomeViewport);
