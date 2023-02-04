import React, { createContext, useMemo, useState } from "react";

export type SectionsMap = { [tabName: string]: React.ReactNode[] }

export type SectionsContextType = {
  sections: SectionsMap;
  setSections: (tabName: string, sections: React.ReactNode[]) => void;
};

export const SectionsContext = createContext<SectionsContextType>({
  sections: {},
  setSections: () => null,
});

export const SectionsProvider = ({
  children,
  default_sections
}: {
  children: React.ReactNode | React.ReactNode[];
  default_sections?: SectionsMap
}) => {
  const [currentSections, setSections] = useState<SectionsMap>(default_sections ?? {});

  

  function handleSetSections (tabName: string, sections: React.ReactNode[]){
    console.log(currentSections, tabName, sections)
    setSections({...currentSections, [tabName]: sections})
  }

  const memoizedValue = useMemo(()=>({ 
    sections: currentSections, 
    setSections: handleSetSections 
  }), [currentSections])

  return (
    <SectionsContext.Provider value={memoizedValue}>
      {children}
    </SectionsContext.Provider>
  );
};

export default SectionsProvider;
