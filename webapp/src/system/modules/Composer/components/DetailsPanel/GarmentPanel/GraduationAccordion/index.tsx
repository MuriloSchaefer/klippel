import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";

import useModule from "@kernel/hooks/useModule";
import type { ILayoutModule } from "@kernel/modules/Layout";

import type { CompositionInfo } from "../../../../interfaces";
import GraduationList from "./GraduationList";

export default (props: CompositionInfo) => {
  const layoutModule = useModule<ILayoutModule>("Layout");

  const { Accordion } = layoutModule.components;
  return (
    <Accordion
      name="Graduação"
      icon={<OpenInFullRoundedIcon />}
      summary="Graduação da peça"
      sx={{ flexGrow: 1 }}
    >
      <GraduationList {...props}/>
    </Accordion>
  );
};
