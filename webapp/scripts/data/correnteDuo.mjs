/**
 * Catálogo Linhas Corrente — linha Duo (Coats Dual Duty): núcleo de
 * filamentos de poliéster de alta tenacidade revestido com fibras longas
 * de algodão.
 *
 * Fonte: https://linhascorrente.com.br/industria/linhas/duo/
 *   - Ficha do produto (oferta disponível + informações técnicas):
 *     .../uploads/2023/07/CS23_00058-Catalogo-Industria_00_dualduty.pdf
 *   - Cartela de cor: ver `correnteDuoCores.mjs`.
 *
 * O tipo `linha@0.0.5` usa `selector.extra = "cor"`, então cada combinação
 * (título × cor) é uma entrada de catálogo própria: 16 títulos × 355 cores.
 *
 * `externalId` agrupa variantes de um mesmo produto no Compositor. O produto
 * do fornecedor é o *título* (artigo + etiqueta), não o artigo sozinho — um
 * artigo cobre várias espessuras (1554 vai de Tex 150 a Tex 24), e agrupá-las
 * misturaria espessuras diferentes sob um seletor cuja única dimensão é a cor.
 */
import { CORRENTE_DUO_CORES } from "./correnteDuoCores.mjs";

const URL_DUO = "https://linhascorrente.com.br/industria/linhas/duo/";

/**
 * Os 16 títulos da tabela "Oferta disponível", cruzados com a tabela
 * "Informações técnicas" (dtex, carga à ruptura, alongamento, agulha).
 * `1541` é a variante Dual Duty Super Cotton, com valores técnicos próprios.
 */
export const CORRENTE_DUO_TITULOS = [
  { artigo: "1554", etiqueta: "020", tex: "Tex 150", metragem: "2.500 metros", dtex: "1495 a 1653", cargaRupturaMin: 4939, alongamento: "18 a 24", agulha: "140 - 160" },
  { artigo: "1554", etiqueta: "025", tex: "Tex 120", metragem: "2.500 metros", dtex: "1254 a 1386", cargaRupturaMin: 4851, alongamento: "20 a 26", agulha: "130 - 140" },
  { artigo: "1554", etiqueta: "030", tex: "Tex 105", metragem: "2.500 metros", dtex: "997 a 1101", cargaRupturaMin: 3352, alongamento: "18 a 24", agulha: "120 - 140" },
  { artigo: "1554", etiqueta: "065", tex: "Tex 46", metragem: "2.500 metros", dtex: "499 a 551", cargaRupturaMin: 1732, alongamento: "18 a 24", agulha: "100 - 120" },
  { artigo: "1554", etiqueta: "120", tex: "Tex 24", metragem: "2.500 metros", dtex: "256 a 282", cargaRupturaMin: 935, alongamento: "18 a 22", agulha: "80 - 90" },
  { artigo: "1569", etiqueta: "036", tex: "Tex 80", metragem: "5.000 metros", dtex: "826 a 912", cargaRupturaMin: 3175, alongamento: "18 a 24", agulha: "120 - 130" },
  { artigo: "1569", etiqueta: "050", tex: "Tex 60", metragem: "5.000 metros", dtex: "638 a 706", cargaRupturaMin: 2734, alongamento: "18 a 24", agulha: "100 - 120" },
  { artigo: "1569", etiqueta: "065", tex: "Tex 46", metragem: "5.000 metros", dtex: "499 a 551", cargaRupturaMin: 1732, alongamento: "18 a 24", agulha: "100 - 120" },
  { artigo: "1569", etiqueta: "075", tex: "Tex 40", metragem: "5.000 metros", dtex: "413 a 457", cargaRupturaMin: 1676, alongamento: "18 a 24", agulha: "90 - 100" },
  { artigo: "1569", etiqueta: "120", tex: "Tex 24", metragem: "5.000 metros", dtex: "256 a 282", cargaRupturaMin: 935, alongamento: "18 a 22", agulha: "80 - 90" },
  { artigo: "1583", etiqueta: "075", tex: "Tex 40", metragem: "10.000 metros", dtex: "413 a 457", cargaRupturaMin: 1676, alongamento: "18 a 24", agulha: "90 - 100" },
  { artigo: "1583", etiqueta: "120", tex: "Tex 24", metragem: "10.000 metros", dtex: "256 a 282", cargaRupturaMin: 935, alongamento: "18 a 22", agulha: "80 - 90" },
  { artigo: "1415", etiqueta: "120", tex: "Tex 24", metragem: "15.000 metros", dtex: "256 a 282", cargaRupturaMin: 935, alongamento: "18 a 22", agulha: "80 - 90" },
  { artigo: "1521", etiqueta: "120", tex: "Tex 24", metragem: "5.000 metros", dtex: "256 a 282", cargaRupturaMin: 935, alongamento: "18 a 22", agulha: "80 - 90" },
  { artigo: "1541", etiqueta: "050", tex: "Tex 60", metragem: "5.000 metros", dtex: "665 a 735", cargaRupturaMin: 1625, alongamento: "16 a 22", agulha: "100 - 120", superCotton: true },
  { artigo: "1541", etiqueta: "075", tex: "Tex 40", metragem: "5.000 metros", dtex: "424 a 468", cargaRupturaMin: 941, alongamento: "16 a 22", agulha: "90 - 100", superCotton: true },
];

/** Slug de id: `corrente-duo[-supercotton]-<artigo>-<etiqueta>-<cor>`. */
const slug = (titulo, codigoCor) =>
  [
    "corrente-duo",
    titulo.superCotton ? "supercotton" : null,
    titulo.artigo,
    titulo.etiqueta,
    codigoCor.toLowerCase(),
  ]
    .filter(Boolean)
    .join("-");

/**
 * Produto cartesiano título × cor, no formato do mock que
 * `generate-materials-fixture.mjs` consome (attributes/stock/suppliers).
 *
 * A cartela Coats identifica cada cor apenas pelo código — é assim que a
 * cor é pedida ao fornecedor —, então `label` repete o código em vez de
 * inventar um nome comercial que o catálogo não traz. `preco` fica de fora
 * pelo mesmo motivo: o PDF não publica preço.
 */
export const buildCorrenteDuoMateriais = () => {
  const out = [];
  for (const titulo of CORRENTE_DUO_TITULOS) {
    const nome = titulo.superCotton
      ? "Corrente Duo Supercotton"
      : "Corrente Duo";
    const descricaoTitulo =
      `Etiqueta ${titulo.etiqueta} · ${titulo.tex} · ` +
      `${titulo.metragem} · Cone`;
    for (const cor of CORRENTE_DUO_CORES) {
      out.push({
        id: slug(titulo, cor.codigo),
        type: "linha",
        suppliers: ["Linhas Corrente"],
        industry: "Linhas Corrente",
        externalId: `${titulo.artigo}-${titulo.etiqueta}`,
        externalURL: URL_DUO,
        schemaVersion: "0.0.5",
        attributes: {
          nome,
          titulo: descricaoTitulo,
          cor: { id: cor.codigo, hex: cor.hex, label: cor.codigo },
          artigo: titulo.artigo,
          etiqueta: titulo.etiqueta,
          tex: titulo.tex,
          metragem: titulo.metragem,
          suporte: "Cone",
          dtex: titulo.dtex,
          cargaRupturaMin: titulo.cargaRupturaMin,
          alongamento: titulo.alongamento,
          agulha: titulo.agulha,
        },
        // Sem `composition`: a ficha descreve a construção (núcleo de
        // poliéster, revestimento de algodão) mas não publica a proporção,
        // e um 50/50 chutado viraria custo errado no orçamento.
        stock: { amount: 0, unit: "unitario18" },
      });
    }
  }
  return out;
};

/** Versão de schema do tipo `linha` que estas entradas declaram. */
export const CORRENTE_DUO_TIPO_LINHA = {
  name: "linha",
  label: "Linha",
  version: "0.0.5",
  attributes: {
    nome: "string", titulo: "string", cor: "color", artigo: "string",
    etiqueta: "string", tex: "string", metragem: "string", suporte: "string",
    dtex: "string", cargaRupturaMin: "number", alongamento: "string",
    agulha: "string", preco: "number",
  },
  selector: { principal: "nome", extra: "cor" },
  stockUnit: "unitario18",
  consumptionUnit: "metros5",
};
