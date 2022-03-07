import React, { useEffect, useState } from "react";

import StyledRibbon from "./styles";

enum RibbonTabs {
  COMPOSER = "composer",
}

export default (): React.ReactElement => {
  const [tabOpen, setTabOpen] = useState<RibbonTabs>(RibbonTabs.COMPOSER);

  useEffect(() => {
    console.log(tabOpen, setTabOpen, RibbonTabs);
  }, []);
  return <StyledRibbon />;
};
