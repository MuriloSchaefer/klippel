import { useCallback } from "react";
import _ from "lodash";

import DeleteForeverSharpIcon from "@mui/icons-material/DeleteForeverSharp";

import List from "@mui/material/List";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";

import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";

import AddGraduationButton from "./AddGraduationButton";
import {
  GradeNode,
  HasGradeEdge,
} from "../../../../store/composition/state";
import { CompositionInfo } from "../../../../interfaces";
import useComposition from "../../../../hooks/useComposition";

type DecoratedGrade = GradeNode & {order: number}

export default function GraduationList({
  compositionName,
  graphId,
}: CompositionInfo) {
  const graphModule = useModule<IGraphModule>("Graph");

  const { useGraph } = graphModule.hooks;

  const graduations = useGraph(graphId, (g) => {
    if (!g) return [];
    return Object.values(g.nodes)
      .filter((n): n is GradeNode => n.type === "GRADE")
      .map(
        (n) =>
          ({
            ...n,
            order: Object.values(g.edges).find(
              (e): e is HasGradeEdge => e.targetId === n.id
            )?.order!,
          })
      )
      .filter((n): n is DecoratedGrade => _.isNumber(n?.order))
      .sort((a, b) => a?.order - b?.order);
  });
  const composition = useComposition(compositionName, c=> c?.selectedPart)

  const handleGradeDeletion = useCallback((id: string)=> {
    composition.actions.removeGrade(id)
  }, [compositionName])

  if (!graduations.state) return <></> // TODO: add error handling

  return (
    <List sx={{ width: "100%" }} role="material-list">
      <AddGraduationButton
        graphId={graphId}
        compositionName={compositionName}
      />

      {graduations.state.map((grade) => {
          return (
            <Paper
              key={grade.id}
              variant="outlined"
              square
              sx={{
                width: "100%",
                padding: 1,
                "&:div + div": {
                  borderTop: 0,
                },
                display: "flex",
              }}
              role="grade-container"
            >
              <ListItem role="grade-info">
                <ListItemText
                  disableTypography={true}
                  primary={
                      <Typography>{grade.abbreviation}</Typography>
                  }
                />
              </ListItem>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  padding: 0,
                  justifyContent: "space-around",
                  alignContent: "space-evenly",
                }}
                role="actions"
              >
                <IconButton
                  color="error"
                  key="delete"
                  id="delete-material"
                  onClick={() => handleGradeDeletion(grade.id)}
                  sx={{ flexGrow: 2 }}
                >
                  <DeleteForeverSharpIcon />
                </IconButton>
              </Box>
            </Paper>
          );
        })}
    </List>
  );
}
