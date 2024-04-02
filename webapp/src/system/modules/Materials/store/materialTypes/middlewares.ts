import { createListenerMiddleware, PayloadAction } from "@reduxjs/toolkit";
import { loadMaterialTypes, materialTypesLoaded } from "./actions";
import { MaterialTypesState } from "./state";

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: loadMaterialTypes,
  effect: async ({payload}: PayloadAction<{  }>, listenerApi) => {
    const { dispatch} = listenerApi;

    // Mock api call
    const mockedTypes: MaterialTypesState = {
        malha: {
            name: 'malha',
            label: 'Malha',
            latestSchema: '0.0.1',
            schemas: {
                '0.0.1': {
                    version: '0.0.1',
                    attributes: {
                        fornecedor: 'string',
                        categoria: 'string',
                        nome: 'string',
                        cor: 'color',
                        
                        largura: 'number',
                        larguraUnidade: 'string',

                        gramatura: 'number',
                        gramaturaUnidade: 'string',

                        rendimento: 'number',
                        rendimentoUnidade: 'string',

                        trama: 'string'
                    },
                    selector: {
                        principal: 'nome',
                        extra: 'cor'
                    }
                }
            },
            
        },
        tecido: {
            name: 'tecido',
            label: 'Tecido',
            latestSchema: '0.0.1',
            schemas: {
                '0.0.1': {
                    version: '0.0.1',
                    attributes: {
                        categoria: 'string',
                        nome: 'string',
                        cor: 'color',

                        largura: 'number',
                        larguraUnidade: 'string',
                        
                        gramatura: 'number',
                        gramaturaUnidade: 'string',

                        trama: 'string'
                    },
                    selector: {
                        principal: 'nome',
                        extra: 'cor'
                    }
                }
            },
        },
        linha: {
            name: 'linha',
            label: 'Linha',
            latestSchema: '0.0.1',
            schemas: {
                '0.0.1': {
                    version: '0.0.1',
                    attributes: {
                        nome: 'string',
                        cor: 'color',
                    },
                    selector: {
                        principal: 'nome',
                        extra: 'cor'
                    }
                }
            },
        },
        agulha: {
            name: 'agulha',
            label: 'Agulha',
            latestSchema: '0.0.1',
            schemas: {
                '0.0.1': {
                    version: '0.0.1',
                    attributes: {
                        fornecedor: 'string',
                        categoria: 'string',
                        nome: 'string',
                        espessura: 'number'
                    },
                    selector: {
                        principal: 'nome',
                        extra: 'espessura'
                    }
                }
            },
        },
        botao: {
            name: 'botao',
            label: 'Botão',
            latestSchema: '0.0.1',
            schemas: {
                '0.0.1': {
                    version: '0.0.1',
                    attributes: {
                        categoria: 'string',
                        nome: 'string',
                        tamanho: 'number',
                        cor: 'color'
                    },
                    selector: {
                        principal: 'nome',
                        extra: 'tamanho'
                    }
                }
            },
        },
        papel: {
            name: 'papel',
            label: 'Papel',
            latestSchema: '0.0.1',
            schemas: {
                '0.0.1': {
                    version: '0.0.1',
                    attributes: {
                        categoria: 'string',
                        nome: 'string',
                        comprimento: 'number',
                        comprimentoUnidade: 'string',
                        largura: 'number',
                        larguraUnidade: 'string'
                    },
                    selector: {
                        principal: 'categoria',
                        extra: 'nome'
                    }
                }
            },
        },
    }

    dispatch(materialTypesLoaded(mockedTypes)) // dispatch event
  },
});

export default middlewares;