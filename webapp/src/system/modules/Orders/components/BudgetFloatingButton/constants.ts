import { ButtonProps } from "@mui/material/Button";

export const actions: {
  [id: string]: { id: string; label: string; color: ButtonProps["color"] };
} = {
  "create-budget": {
    id: "create-budget",
    label: "Criar orçamento",
    color: "info",
  },
  "add-to-budget": {
    id: "add-to-budget",
    label: "Adicionar ao orçamento",
    color: "info",
  },
  "convert-to-order": {
    id: "convert-to-order",
    label: "Converter em pedido",
    color: "success",
  },
  "delete-budget": {
    id: "delete-budget",
    label: "Deletar orçamento",
    color: "error",
  },
};
