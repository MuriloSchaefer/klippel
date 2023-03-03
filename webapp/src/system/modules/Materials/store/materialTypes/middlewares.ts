import { createListenerMiddleware, PayloadAction } from "@reduxjs/toolkit";
import { loadMaterialTypes, materialTypesLoaded } from "./actions";

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: loadMaterialTypes,
  effect: async ({payload}: PayloadAction<{  }>, listenerApi) => {
    const { dispatch} = listenerApi;

    // Mock api call
    const mockedTypes = {
        malha: {
            label: 'Malha'
        },
        tecido: {
            label: 'Tecido'
        },
        linha: {
            label: 'Linha'
        },
        agulha: {
            label: 'Agulha'
        },
        pate: {
            label: 'Pate'
        }
    }

    dispatch(materialTypesLoaded(mockedTypes)) // dispatch event
  },
});

export default middlewares;