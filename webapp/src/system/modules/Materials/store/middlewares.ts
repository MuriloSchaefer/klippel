import { createListenerMiddleware } from "@reduxjs/toolkit";
import { saveSession, sessionSaved } from "./actions";
import { MaterialsModuleState } from "./state";
import { persistMaterialTypes } from "./materialTypes/slice";
import { persistMaterial } from "./materials/slice";

const middlewares = createListenerMiddleware();

middlewares.startListening({
  actionCreator: saveSession,
  effect: async (payload, listenerApi) => {
      const { dispatch, getState } = listenerApi;
      
      const {Materials: state} = getState() as { Materials: MaterialsModuleState }
      persistMaterialTypes(state.materialTypes)
      persistMaterial(state.materials)

      dispatch(sessionSaved()); // dispatch event
  }
})
export default middlewares