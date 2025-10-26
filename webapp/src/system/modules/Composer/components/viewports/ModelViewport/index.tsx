import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import SaveSharpIcon from "@mui/icons-material/SaveSharp";
import AccountTreeSharpIcon from "@mui/icons-material/AccountTreeSharp";
import CompositionTree from "../CompositionTree/CompositionTree";
import useVariation from "../../../hooks/useVariation";
import useActiveViewport from "@kernel/modules/Layout/hooks/useActiveViewport";

export default function ModelViewport() {
  const layoutModule = useModule<ILayoutModule>("Layout");
  const { ViewportNotificationsTray, SettingsPanel, Accordion } =
    layoutModule.components;

  const activeVP = useActiveViewport();
  const variation = useVariation({ variationId: activeVP.extra.variationId });


  return (
    <>
      <ViewportNotificationsTray>
        <SaveSharpIcon
          fontSize="small"
          onClick={() => console.log("save model")}
          sx={{ ":hover": { cursor: "pointer", color: "primary.main" } }}
        />
      </ViewportNotificationsTray>

      <SettingsPanel>
        <Accordion
          name="Composição"
          icon={<AccountTreeSharpIcon />}
          summary="composição da peça"
        >
          <CompositionTree variationId={activeVP.extra.variationId} />
        </Accordion>
      </SettingsPanel>
      <>test</>
    </>
  );
}
