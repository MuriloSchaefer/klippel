import { createListenerMiddleware, PayloadAction } from "@reduxjs/toolkit";
import { loadMaterials, materialsLoaded } from "./actions";
import { MaterialsState } from "./state";

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: loadMaterials,
  effect: async ({payload}: PayloadAction<{  }>, listenerApi) => {
    const { dispatch} = listenerApi;

    // Mock api call
    const mockedMaterials: MaterialsState = {
        1: {
            id: 1,
            type: 'malha',
            suppliers: ['MundialTextil'],
            industry: 'MundialTextil',
            externalId: '05',
            externalURL: 'https://mundialtextil.com.br/produto/malha-pv-tubular-anti-pilling/',
            images: ['https://mundialtextil.com.br/wp-content/uploads/2019/01/malha-PV-TUBULAR.jpg'],
            
            schemaVersion: '0.0.1',
            attributes: {
                categoria: 'Tubular',
                nome: 'Malha PV',

                largura: {
                    amount: 120,
                    unit: 'centimetros7'
                },
                gramatura: {
                    quotient: {
                        amount: 170,
                        unit: 'gramas7'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'metrosquadrados17'
                    }
                },
                rendimento: {
                    quotient: {
                        amount: 2.5,
                        unit: 'metros5'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'kilogramas6'
                    }
                },
                trama: 'desconhecido',

                cor: {
                    id:'01',
                    hex: '#ffffff',
                    label: 'Branco'
                },
            },
            composition: {
                PES: 0.67,
                CV: 0.33
            },
            caracteristics: {
                'anti-pilling': true,
                'tubular': true,
            },
            stock: {
                amount: 10,
                unit: 'kilogramas6'
            }
        },
        2: {
            id: 2,
            type: 'malha',
            suppliers: ['MundialTextil'],
            industry: 'MundialTextil',
            externalId: '05',
            externalURL: 'https://mundialtextil.com.br/produto/malha-pv-tubular-anti-pilling/',
            images: ['https://mundialtextil.com.br/wp-content/uploads/2019/01/malha-PV-TUBULAR.jpg'],
            
            schemaVersion: '0.0.1',
            attributes: {
                categoria: 'Tubular',
                nome: 'Malha PV',
                largura: {
                    amount: 120,
                    unit: 'centimetros7'
                },
                gramatura: {
                    quotient: {
                        amount: 170,
                        unit: 'gramas7'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'metrosquadrados17'
                    }
                },
                rendimento: {
                    quotient: {
                        amount: 2.5,
                        unit: 'metros5'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'kilogramas6'
                    }
                },
                trama: 'desconhecido',

                cor: {
                    id:'01',
                    hex: '#000000',
                    label: 'Preto'
                },
            },
            composition: {
                PES: 0.67,
                CV: 0.33
            },
            caracteristics: {
                'anti-pilling': true,
                'tubular': true,
            },
            stock: {
                amount: 10,
                unit: 'kilogramas6'
            }
        },
        3: {
            id: 3,
            type: 'malha',
            suppliers: ['MundialTextil'],
            industry: 'MundialTextil',
            externalId: '05',
            externalURL: 'https://mundialtextil.com.br/produto/malha-pv-tubular-anti-pilling/',
            images: ['https://mundialtextil.com.br/wp-content/uploads/2019/01/malha-PV-TUBULAR.jpg'],
            
            schemaVersion: '0.0.1',
            attributes: {
                categoria: 'Tubular',
                nome: 'Malha PV',
                largura: {
                    amount: 120,
                    unit: 'centimetros7'
                },
                gramatura: {
                    quotient: {
                        amount: 170,
                        unit: 'gramas7'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'metrosquadrados17'
                    }
                },
                rendimento: {
                    quotient: {
                        amount: 2.5,
                        unit: 'metros5'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'kilogramas6'
                    }
                },
                trama: 'desconhecido',

                cor: {
                    id:'03',
                    hex: '#0000ff',
                    label: 'Royal'
                },
            },
            composition: {
                PES: 0.67,
                CV: 0.33
            },
            caracteristics: {
                'anti-pilling': true,
                'tubular': true,
            },
            stock: {
                amount: 10,
                unit: 'kilogramas6'
            }
        },
        4: {
            id: 4,
            type: 'malha',
            suppliers: ['MundialTextil'],
            industry: 'MundialTextil',
            externalId: '05',
            externalURL: 'https://mundialtextil.com.br/produto/malha-pv-tubular-anti-pilling/',
            images: ['https://mundialtextil.com.br/wp-content/uploads/2019/01/malha-PV-TUBULAR.jpg'],
            
            schemaVersion: '0.0.1',
            attributes: {
                categoria: 'Tubular',
                nome: 'Malha PV',
                largura: {
                    amount: 120,
                    unit: 'centimetros7'
                },
                gramatura: {
                    quotient: {
                        amount: 170,
                        unit: 'gramas7'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'metrosquadrados17'
                    }
                },
                rendimento: {
                    quotient: {
                        amount: 2.5,
                        unit: 'metros5'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'kilogramas6'
                    }
                },
                trama: 'desconhecido',

                cor: {
                    id:'04',
                    hex: '#000055',
                    label: 'Marinho'
                },
            },
            composition: {
                PES: 0.67,
                CV: 0.33
            },
            caracteristics: {
                'anti-pilling': true,
                'tubular': true,
            },
            stock: {
                amount: 10,
                unit: 'kilogramas6'
            }
        },
        5: {
            id: 5,
            type: 'malha',
            suppliers: ['MundialTextil'],
            industry: 'MundialTextil',
            externalId: '05',
            externalURL: 'https://mundialtextil.com.br/produto/malha-pv-tubular-anti-pilling/',
            images: ['https://mundialtextil.com.br/wp-content/uploads/2019/01/malha-PV-TUBULAR.jpg'],
            
            schemaVersion: '0.0.1',
            attributes: {
                categoria: 'Tubular',
                nome: 'Malha PV',
                largura: {
                    amount: 120,
                    unit: 'centimetros7'
                },
                gramatura: {
                    quotient: {
                        amount: 170,
                        unit: 'gramas7'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'metrosquadrados17'
                    }
                },
                rendimento: {
                    quotient: {
                        amount: 2.5,
                        unit: 'metros5'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'kilogramas6'
                    }
                },
                trama: 'desconhecido',

                cor: {
                    id:'04',
                    hex: '#ff0000',
                    label: 'Vermelho'
                },
            },
            composition: {
                PES: 0.67,
                CV: 0.33
            },
            caracteristics: {
            },
            stock: {
                amount: 10,
                unit: 'kilogramas6'
            }
        },

        6: {
            id: 6,
            type: 'malha',
            suppliers: ['MundialTextil'],
            industry: 'MundialTextil',
            externalId: '15',
            externalURL: 'https://mundialtextil.com.br/produto/malha-colegial/',
            images: ['https://mundialtextil.com.br/wp-content/uploads/2019/02/malha-CELESTE-15.jpg'],
            
            schemaVersion: '0.0.1',
            attributes: {
                categoria: 'Colegial',
                nome: 'Malha colegial',
                largura: {
                    amount: 152,
                    unit: 'centimetros7'
                },
                gramatura: {
                    quotient: {
                        amount: 295,
                        unit: 'gramas7'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'metrosquadrados17'
                    }
                },
                rendimento: {
                    quotient: {
                        amount: 2.23,
                        unit: 'metros5'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'kilogramas6'
                    }
                },
                trama: 'desconhecido',

                cor: {
                    id:'01',
                    hex: '#ffffff',
                    label: 'Branco'
                },
            },
            composition: {
                PES: 0.65,
                CO: 0.35
            },
            caracteristics: {
            },
            stock: {
                amount: 10,
                unit: 'kilogramas6'
            }
        },
        7: {
            id: 7,
            type: 'malha',
            suppliers: ['MundialTextil'],
            industry: 'MundialTextil',
            externalId: '15',
            externalURL: 'https://mundialtextil.com.br/produto/malha-colegial/',
            images: ['https://mundialtextil.com.br/wp-content/uploads/2019/02/malha-CELESTE-15.jpg'],
            
            schemaVersion: '0.0.1',
            attributes: {
                categoria: 'Colegial',
                nome: 'Malha colegial',

                largura: {
                    amount: 152,
                    unit: 'centimetros7'
                },
                gramatura: {
                    quotient: {
                        amount: 295,
                        unit: 'gramas7'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'metrosquadrados17'
                    }
                },
                rendimento: {
                    quotient: {
                        amount: 2.23,
                        unit: 'metros5'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'kilogramas6'
                    }
                },
                trama: 'desconhecido',

                cor: {
                    id:'02',
                    hex: '#000000',
                    label: 'Preto'
                },
            },
            composition: {
                PES: 0.65,
                CO: 0.35
            },
            caracteristics: {
            },
            stock: {
                amount: 10,
                unit: 'kilogramas6'
            }
        },

        8: {
            id: 8,
            type: 'malha',
            suppliers: ['MundialTextil'],
            industry: 'MundialTextil',
            externalId: '13',
            externalURL: 'https://mundialtextil.com.br/produto/piquet-ingles-pa/',
            images: ['https://mundialtextil.com.br/wp-content/uploads/2019/01/malha-BRANCO-INGLES-E-STRETCH.jpg'],
            
            schemaVersion: '0.0.1',
            attributes: {
                categoria: 'Piquet',
                nome: 'Piquet ingles PA',

                largura: {
                    amount: 184,
                    unit: 'centimetros7'
                },
                gramatura: {
                    quotient: {
                        amount: 165,
                        unit: 'gramas7'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'metrosquadrados17'
                    }
                },
                rendimento: {
                    quotient: {
                        amount: 3.30,
                        unit: 'metros5'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'kilogramas6'
                    }
                },
                trama: 'desconhecido',

                cor: {
                    id:'02',
                    hex: '#000000',
                    label: 'Preto'
                },
            },
            composition: {
                PES: 0.47,
                CO: 0.53
            },
            caracteristics: {
            },
            stock: {
                amount: 10,
                unit: 'kilogramas6'
            }
        },
        9: {
            id: 9,
            type: 'malha',
            suppliers: ['MundialTextil'],
            industry: 'MundialTextil',
            externalId: '13',
            externalURL: 'https://mundialtextil.com.br/produto/piquet-ingles-pa/',
            images: ['https://mundialtextil.com.br/wp-content/uploads/2019/01/malha-BRANCO-INGLES-E-STRETCH.jpg'],
            
            schemaVersion: '0.0.1',
            attributes: {
                categoria: 'Piquet',
                nome: 'Piquet ingles PA',

                largura: {
                    amount: 184,
                    unit: 'centimetros7'
                },
                gramatura: {
                    quotient: {
                        amount: 165,
                        unit: 'gramas7'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'metrosquadrados17'
                    }
                },
                rendimento: {
                    quotient: {
                        amount: 3.30,
                        unit: 'metros5'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'kilogramas6'
                    }
                },
                trama: 'desconhecido',

                cor: {
                    id:'03',
                    hex: '#0000ff',
                    label: 'Royal'
                },
            },
            composition: {
                PES: 0.47,
                CO: 0.53
            },
            caracteristics: {
            },
            stock: {
                amount: 10,
                unit: 'kilogramas6'
            }
        },

        10: {
            id: 10,
            type: 'linha',
            suppliers: ['MundialTextil'],
            industry: 'MundialTextil',
            externalId: '136',
            externalURL: 'https://mundialtextil.com.br/produto/piquet-ingles-pa/',
            images: ['https://mundialtextil.com.br/wp-content/uploads/2019/01/malha-BRANCO-INGLES-E-STRETCH.jpg'],
            
            schemaVersion: '0.0.1',
            attributes: {
                nome: 'Linha mundial',
                cor: {
                    id:'03',
                    hex: '#0000ff',
                    label: 'Royal'
                },
            },
            stock: {
                amount: 4,
                unit: 'unitario18'
            }
        },

        11: {
            id: 11,
            type: 'malha',
            suppliers: ['Sajama'],
            industry: 'Sajama',
            externalId: '05006',
            externalURL: 'https://www.sajama.com.br/malha-30/1-penteado',
            images: ['https://lirp.cdn-website.com/54ea075d/dms3rep/multi/opt/6494+AZUL+BB-3361c999-1920w.JPG'],
            
            schemaVersion: '0.0.1',
            attributes: {
                categoria: 'Tubular',
                nome: 'Malha 30/1 Penteada',

                largura: {
                    amount: 120,
                    unit: 'centimetros7'
                },
                gramatura: {
                    quotient: {
                        amount: 165,
                        unit: 'gramas7'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'metrosquadrados17'
                    }
                },
                rendimento: {
                    quotient: {
                        amount: 3.40,
                        unit: 'metros5'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'kilogramas6'
                    }
                },
                trama: 'desconhecido',

                cor: {
                    id:'6494',
                    hex: '#5eb2d9',
                    label: 'Azul BB'
                },
            },
            composition: {
                CO: 1
            },
            caracteristics: {
            },
            stock: {
                amount: 10,
                unit: 'kilogramas6'
            }
        },
        12: {
            id: 12,
            type: 'malha',
            suppliers: ['Sajama'],
            industry: 'Sajama',
            externalId: '05006',
            externalURL: 'https://www.sajama.com.br/malha-30/1-penteado',
            images: ['https://lirp.cdn-website.com/54ea075d/dms3rep/multi/opt/7374+LIM%C3%83O-f144e819-1920w.JPG'],
            
            schemaVersion: '0.0.1',
            attributes: {
                categoria: 'Tubular',
                nome: 'Malha 30/1 Penteada',

                largura: {
                    amount: 120,
                    unit: 'centimetros7'
                },
                gramatura: {
                    quotient: {
                        amount: 165,
                        unit: 'gramas7'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'metrosquadrados17'
                    }
                },
                rendimento: {
                    quotient: {
                        amount: 3.40,
                        unit: 'metros5'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'kilogramas6'
                    }
                },
                trama: 'desconhecido',

                cor: {
                    id:'7374',
                    hex: '#84E225',
                    label: 'Limão'
                },
            },
            composition: {
                CO: 1
            },
            caracteristics: {
            },
            stock: {
                amount: 10,
                unit: 'kilogramas6'
            }
        },


        13: {
            id: 13,
            type: 'tecido',
            suppliers: ['Doptex'],
            industry: 'Doptex',
            externalId: '1231',
            externalURL: 'https://www.doptex.com.br/produtos-e-servicos/tecidos/workwear/linha-shirting/tricoline-amelie/',
            images: ['https://www.doptex.com.br/site/wp-content/uploads/2021/11/1231-001-1215-Dark_Tricoline-Ame%CC%81lie-folded-up.png'],
            
            description: "#Aplicabilidade\n\nArtigo maquinetado de textura particular. Sua excelente composição alia conforto, resistência e mobilidade com baixa manutenção, além de oferecer proteção UV 25.",
            schemaVersion: '0.0.1',
            attributes: {
                categoria: 'Tricoline',
                nome: 'Tricoline Amélie',
                largura: {
                    amount: 135,
                    unit: 'centimetros7'
                },
                gramatura: {
                    quotient: {
                        amount: 139,
                        unit: 'gramas7'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'metrosquadrados17'
                    }
                },
                
                trama: 'Maquinetada',

                cor: {
                    id:'003-01',
                    hex: '#d4d4d4',
                    label: 'Branco'
                },
            },
            composition: {
                PES: 0.77,
                CO: 0.19,
                PUE: 0.04
            },
            caracteristics: {
                fio: 40,
                protecaoUV: true,
                agulha: '70/80 - Ponta Arredondada'
            },
            stock: {
                amount: 10,
                unit: 'kilogramas6'
            }
        },
        14: {
            id: 14,
            type: 'tecido',
            suppliers: ['Doptex'],
            industry: 'Doptex',
            externalId: '1231',
            externalURL: 'https://www.doptex.com.br/produtos-e-servicos/tecidos/workwear/linha-shirting/tricoline-amelie/',
            images: ['https://www.doptex.com.br/site/wp-content/uploads/2021/11/1231-001-1215-Dark_Tricoline-Ame%CC%81lie-folded-up.png'],
            
            description: "#Aplicabilidade\n\nArtigo maquinetado de textura particular. Sua excelente composição alia conforto, resistência e mobilidade com baixa manutenção, além de oferecer proteção UV 25.",
            schemaVersion: '0.0.1',
            attributes: {
                categoria: 'Tricoline',
                nome: 'Tricoline Amélie',
                largura: {
                    amount: 135,
                    unit: 'centimetros7'
                },
                gramatura: {
                    quotient: {
                        amount: 139,
                        unit: 'gramas7'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'metrosquadrados17'
                    }
                },
                
                trama: 'Maquinetada',

                cor: {
                    id:'004-8112',
                    hex: '#eaebe7',
                    label: 'Off White'
                },
            },
            composition: {
                PES: 0.77,
                CO: 0.19,
                PUE: 0.04
            },
            caracteristics: {
                fio: 40,
                protecaoUV: true,
                agulha: '70/80 - Ponta Arredondada'
            },
            stock: {
                amount: 0,
                unit: 'kilogramas6'
            }
        },
        15: {
            id: 15,
            type: 'tecido',
            suppliers: ['Doptex'],
            industry: 'Doptex',
            externalId: '1231',
            externalURL: 'https://www.doptex.com.br/produtos-e-servicos/tecidos/workwear/linha-shirting/tricoline-amelie/',
            images: ['https://www.doptex.com.br/site/wp-content/uploads/2021/11/1231-001-1215-Dark_Tricoline-Ame%CC%81lie-folded-up.png'],
            
            description: "#Aplicabilidade\n\nArtigo maquinetado de textura particular. Sua excelente composição alia conforto, resistência e mobilidade com baixa manutenção, além de oferecer proteção UV 25.",
            schemaVersion: '0.0.1',
            attributes: {
                categoria: 'Tricoline',
                nome: 'Tricoline Amélie',
                largura: {
                    amount: 135,
                    unit: 'centimetros7'
                },
                gramatura: {
                    quotient: {
                        amount: 139,
                        unit: 'gramas7'
                    },
                    dividend: {
                        amount: 1,
                        unit: 'metrosquadrados17'
                    }
                },
                
                trama: 'Maquinetada',

                cor: {
                    id:'001-1234',
                    hex: '#b4c1b9',
                    label: 'Ceu'
                },
            },
            composition: {
                PES: 0.77,
                CO: 0.19,
                PUE: 0.04
            },
            caracteristics: {
                fio: 40,
                protecaoUV: true,
                agulha: '70/80 - Ponta Arredondada'
            },
            stock: {
                amount: 10,
                unit: 'kilogramas6'
            }
        },
        
        16: {
            id: 16,
            type: 'botao',
            suppliers: ['Linhas General'],
            industry: 'Linhas General',
            externalId: '28',
            externalURL: 'https://linhasgeneral.com.br/inicio/28-botao-transparente-tamanho-18-c144-unitario18.html',
            images: ['https://linhasgeneral.com.br/135-large_default/botao-transparente-tamanho-18-c144-unitario18.jpg'],
            
            description: "Botão",
            schemaVersion: '0.0.1',
            attributes: {
                categoria: 'Transparente',
                nome: 'Botão Transparente',
                tamanho: 18,
                cor: {
                    id:'003-01',
                    hex: '#ffffffff',
                    label: 'Transparente'
                }
            },
            stock: {
                amount: 10,
                unit: 'unitario18'
            }
        },
        17: {
            id: 17,
            type: 'botao',
            suppliers: ['Linhas General'],
            industry: 'Linhas General',
            externalId: '28',
            externalURL: 'https://linhasgeneral.com.br/inicio/132-botao-transparente-tamanho-18-c144-unitario18.html',
            images: ['https://linhasgeneral.com.br/135-large_default/botao-transparente-tamanho-18-c144-unitario18.jpg'],
            
            description: "Botão",
            schemaVersion: '0.0.1',
            attributes: {
                categoria: 'Transparente',
                nome: 'Botão Transparente',
                tamanho: 20,
                cor: {
                    id:'003-01',
                    hex: '#ffffffff',
                    label: 'Transparente'
                }
            },
            stock: {
                amount: 10,
                unit: 'unitario18'
            }
        },

        18: {
            id: 18,
            type: 'papel',
            suppliers: ['KGepel'],
            industry: 'KGepel',
            externalId: '5902.007.110',
            externalURL: 'https://kgepel.com.br/linha-especial/sulfite-bobina-75g-914mm-c-50mt/',
            images: ['https://kgepel.com.br/wp-content/uploads/2023/10/BOBINAS-PLOTER-1-scaled.jpg'],
            
            description: "Descubra a excelência em impressão com nosso Sulfite em Bobina para Impressão Plotter, um produto de 75g que redefine os padrões de qualidade. Com uma largura padrão de 914mm e uma metragem linear de 50 metros, esse sulfite oferece a base perfeita para suas necessidades de impressão",
            schemaVersion: '0.0.1',
            attributes: {
                categoria: 'Bobina Plotter',
                nome: 'SULFITE BOBINA 75G 914MM c/ 50mt',
                comprimento: 50,
                comprimentoUnidade: 'm',
                largura: 914,
                larguraUnidade: 'mm'
            },
            stock: {
                amount: 40,
                unit: 'm'
            }
        },

        
    }

    dispatch(materialsLoaded(mockedMaterials)) // dispatch event
  },
});

export default middlewares;