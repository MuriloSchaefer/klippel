import { createContext, Ref } from "react";

export type ViewportsContextType = {
  viewport: Ref<HTMLElement>;
};

const ViewportContext = createContext<ViewportsContextType>({
  viewport: null,
});

export default ViewportContext;
