import { useCallback, useMemo } from "react";

import { useTheme } from "@mui/material";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";

import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";
import type { NodesHashMap } from "@kernel/modules/Graphs/store/state";

import useComposition from "../../hooks/useComposition";
import type { GradeNode } from "../../store/composition/state";

export type GradeEnhanced = {
  id: string;
  counter: number;
  abbreviation: string;
};

type GradesCounterProps = {
  readonly compositionName: string;
  readonly graphId: string;
};

export default function GradesCounter({
  compositionName,
  graphId,
}: GradesCounterProps) {
  const theme = useTheme();
  const graphModule = useModule<IGraphModule>("Graph");

  const { useGraph } = graphModule.hooks;

  const grades = useComposition({ compositionName }, (c) => c?.budget?.grades);
  const graph = useGraph(graphId, (g) =>
    Object.values(g?.nodes ?? {})
      .filter((n): n is GradeNode => n.type === "GRADE")
      .reduce((acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      }, {} as NodesHashMap<GradeNode>)
  );

  const enhancedGrades = useMemo(() => {
    if (!grades.state || !graph?.state) return [];
    return Object.entries(grades.state).map(([id, counter]) => {
      if (!graph?.state)
        return { id, counter, abbreviation: id } as GradeEnhanced;
      return {
        id,
        counter,
        abbreviation: graph.state[id].abbreviation,
      } as GradeEnhanced;
    });
  }, [grades.state, graph.state]);

  const total = useMemo(
    () => enhancedGrades.reduce((acc, curr) => acc + curr.counter, 0),
    [enhancedGrades]
  );

  const handleChange = useCallback(
    (gradeId: string, counter: number) => {
      grades.actions.changeGradeCounter(gradeId, counter);
    },
    [compositionName]
  );

  if (!grades.state || !graph.state) return <></>; //TODO: add loading

  return (
    <Box
      sx={{
        width: 'min-content',
        display: "flex",
        flexFlow: 'column',
        backgroundColor: theme.palette.background.paper,
        opacity: "0.9",
        borderRadius: 2,
        pointerEvents: 'all',
        border: `1px solid ${theme.palette.getContrastText(
          theme.palette.background.paper
        )}`,
      }}
      role="grades-counter"
    >
      {enhancedGrades.map((grade) => (
        <Box key={grade.id} sx={{ padding: 1 }}>
          <TextField
            id={grade.id}
            label={grade.abbreviation}
            variant="standard"
            value={grade.counter}
            sx={{ width: "40px" }}
            type="number"
            onChange={(evt) => handleChange(grade.id, +evt.target.value)}
          />
        </Box>
      ))}
      <Box key='total' sx={{ padding: 1 }}>
          <TextField
            id='total'
            label='Total'
            variant="standard"
            value={total}
            sx={{ width: "40px" }}
            disabled={true}
          />
        </Box>
    </Box>
  );
}
