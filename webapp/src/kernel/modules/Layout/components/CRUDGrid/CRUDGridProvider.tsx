import React, { createContext, useMemo, useState } from "react";
import { GridRowsProp, GridValidRowModel } from "@mui/x-data-grid";

export type CRUDGridContextType = GridRowsProp;

export const CRUDGridContext = createContext<{
  rows: readonly GridValidRowModel[];
  setRows: React.Dispatch<React.SetStateAction<readonly GridValidRowModel[]>>;
}>({
  rows: [],
  setRows: () => null,
});

export const CRUDGridProvider = ({
  children,
  initialRows,
}: {
  children: React.ReactElement;
  initialRows?: GridRowsProp;
}) => {
  const [rows, setRows] = useState<GridRowsProp>(
    (initialRows ?? []).map((entry) => ({ ...entry, state: "untouched" }))
  );
  const values = useMemo(
    () => ({
      rows,
      setRows,
    }),
    [rows]
  );

  return <CRUDGridContext.Provider value={values}>{children}</CRUDGridContext.Provider>;
};

export default React.memo(CRUDGridProvider);
