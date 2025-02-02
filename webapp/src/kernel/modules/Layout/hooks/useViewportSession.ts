import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { Directory } from "@kernel/modules/Store/typings";
import { getViewportState } from "../store/viewports/selectors";

const SESSION_PATH = ".session";

export default function (
  viewportName: string,
  save: (viewportDir: Directory) => void,
  load: (viewportDir: Directory) => object = () => ({})
) {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector, useDirectory } = storeModule.hooks;
  const sessionDir = useDirectory(`${SESSION_PATH}/viewports/${viewportName}`);
  const viewportState = useAppSelector(getViewportState(viewportName));

  return {
    save: () => {
      const state = sessionDir.openFile("state.js", "w+");
      state.write(JSON.stringify(viewportState), { encoding: "utf-8" });
      save(sessionDir);
    },
    load: () => {
      const state = sessionDir.openFile("state.js", "w+");
      return {
        ...JSON.parse(state.read().toString()),
        ...load(sessionDir),
      };
    },
    sessionDir,
  };
}
