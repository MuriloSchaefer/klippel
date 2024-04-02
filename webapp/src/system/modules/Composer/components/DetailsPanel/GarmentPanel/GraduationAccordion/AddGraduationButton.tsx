import { FormEvent, useCallback, useMemo, useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import AddSharpIcon from "@mui/icons-material/AddSharp";

import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IGraphModule } from "@kernel/modules/Graphs";

import useComposition from "../../../../hooks/useComposition";
import _, { max } from "lodash";
import type { GradeNode, HasGradeEdge } from "../../../../store/composition/state";

type AddGraduationPayload = Omit<GradeNode, "id" | "type" | "position">;

export const AddGraduationButton = ({
  compositionName,
  graphId,
}: {
  compositionName: string;
  graphId: string;
}) => {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const graphModule = useModule<IGraphModule>("Graph");

  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const {useGraph} = graphModule.hooks

  const composition = useComposition(compositionName, (c) => c?.selectedPart);
  const existingGrades = useGraph(graphId, (g) => {
    if (!g) return [];
    return Object.values(g.nodes)
      .filter((n): n is GradeNode => n.type === "GRADE")
      .map((n) => ({
        ...n,
        order: Object.values(g.edges).find(
          (e): e is HasGradeEdge => e.targetId === n.id
        )?.order,
      }));
  });
  const highestOrder = useMemo(()=> {
    if (!existingGrades.state) return 0
    return max(
      existingGrades.state
        .filter((g) => _.isNumber(g?.order))
        .map((grade) => grade.order)
    ) ?? 0
  }, [existingGrades])

  const formId = useMemo(() => _.uniqueId("new-process-form"), []);
  const [grade, setGrade] = useState<AddGraduationPayload>({
    abbreviation: "",
  });

  const handleSubmission = useCallback(
    (evt: FormEvent<HTMLFormElement>) => {
      evt.preventDefault();
      evt.stopPropagation();

      if (composition.state)
        composition.actions.addGrade(
          grade.abbreviation,
          highestOrder + 1
        );
    },
    [grade.label, grade.abbreviation, highestOrder, composition.state]
  );

  return (
    <PointerContainer
      component={
        <Box
          component={"form"}
          onSubmit={handleSubmission}
          id={formId}
          sx={{ display: "flex", flexDirection: "column", flexGrow: 2, gap: 1 }}
        >
          <FormControl>
            <TextField
              id="abbreviation"
              label="Abreviação"
              variant="standard"
              sx={{ marginBottom: 1 }}
              onChange={(evt) =>
                setGrade((old) => ({ ...old, abbreviation: evt.target.value }))
              }
              value={grade.abbreviation}
            />
          </FormControl>
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          type="submit"
          form={formId}
          value={"Submit"}
          color="success"
          key="accept"
          handleConfirm={() => null}
        />,
      ]}
    >
      <Button
        startIcon={<AddSharpIcon />}
        variant="outlined"
        size="small"
        sx={{ marginBottom: 1 }}
      >
        Adicionar Grade
      </Button>
    </PointerContainer>
  );
};

export default AddGraduationButton;
