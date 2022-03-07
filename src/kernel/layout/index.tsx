import React, { useState } from "react";
import RibbonMenu from "./RibbonMenu";
import { Theme, ThemeContext } from "./ThemeContext";

export default (): React.ReactElement => {
  const [theme, setTheme] = useState<Theme>(Theme.Dark);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
        
    </ThemeContext.Provider>
  );
};
