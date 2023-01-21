import { createListenerMiddleware } from "@reduxjs/toolkit";
import { AnyAction } from "redux";

import { rightPanelClosed } from "@kernel/modules/LayoutModule/ations";
import { materialPropertiesChanged, materialSelectedEvent, materialUnSelectedEvent } from "./actions";

const middleware = createListenerMiddleware();

middleware.startListening({
  actionCreator: rightPanelClosed,
  effect: (action: AnyAction, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(materialUnSelectedEvent());
  },
});

middleware.startListening({
    actionCreator: materialPropertiesChanged,
    effect: (action: AnyAction, listenerApi) => {
      const { dispatch } = listenerApi;
      const { graphId, materialId, oldProperties, newProperties } =
        action.payload;
    //   dispatch(
    //     updateNode({
    //       graphId,
    //       node: {
    //         id: materialId,
    //         properties: { ...oldProperties, ...newProperties },
    //       } as Material,
    //     })
    //   );
    },
  });

//   middleware.startListening({
//     actionCreator: materialSelectedEvent,
//     effect: (action: AnyAction, listenerApi) => {
//       const { dispatch } = listenerApi;
//       dispatch(rightPanelOpened());
//     },
//   });

export default middleware;
