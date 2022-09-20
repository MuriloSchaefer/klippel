import React, { createContext, Dispatch, SetStateAction } from "react";

export type ViewportContentMap = {
  [id: string]: React.ReactElement;
};

export type ViewportContentContextProps = {
  viewports: ViewportContentMap;
  setViewports: Dispatch<SetStateAction<ViewportContentMap>>;
};

const ViewportContentContext = createContext<ViewportContentContextProps>({
  viewports: {},
  setViewports: () => null,
});

export default ViewportContentContext;
