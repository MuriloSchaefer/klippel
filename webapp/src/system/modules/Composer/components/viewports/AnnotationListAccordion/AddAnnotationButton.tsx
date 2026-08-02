import { Button, Typography } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { useVariationActions } from "../../../hooks/useVariationActions";
import { MODULE_NAME } from "../../../constants";

export default function AddAnnotationButton({
  variationId,
  garmentId,
}: Readonly<{ variationId: string; garmentId: string }>) {
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutHint } = keyboardShortcutsModule.components;
  const { actions } = useVariationActions({ variationId });

  return (
    <Button
      id="composer-add-annotation"
      data-testid="add-annotation"
      aria-label="add-annotation"
      variant="outlined"
      color="primary"
      onClick={() => actions.addAnnotation({ garmentId })}
    >
      <ShortcutHint
        placement="top-center"
        shortcutId={`${MODULE_NAME}/AnnotationList/addAnnotation`}
      >
        <Typography>Adicionar Anotação</Typography>
      </ShortcutHint>
    </Button>
  );
}
