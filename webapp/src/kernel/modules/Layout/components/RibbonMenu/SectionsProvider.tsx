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
  console.log(default_sections)
  const [currentSections, setSections] = useState<SectionsMap>(default_sections ?? {});

  const memoizedValue = useMemo(()=>({ sections: currentSections, setSections: handleSetSections }), [currentSections])

  function handleSetSections (tabName: string, sections: React.ReactNode[]){
    setSections({...currentSections, [tabName]: sections})
  }

  return (
    <SectionsContext.Provider value={memoizedValue}>
      {children}
    </SectionsContext.Provider>
  );
};

export default SectionsProvider;
