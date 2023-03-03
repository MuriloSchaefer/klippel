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
            name: 'malha',
            label: 'Malha'
        },
        tecido: {
            name: 'tecido',
            label: 'Tecido'
        },
        linha: {
            name: 'linha',
            label: 'Linha'
        },
        agulha: {
            name: 'agulha',
            label: 'Agulha'
        },
        pate: {
            name: 'pate',
            label: 'Pate'
        }
    }

    dispatch(materialTypesLoaded(mockedTypes)) // dispatch event
  },
});

export default middlewares;