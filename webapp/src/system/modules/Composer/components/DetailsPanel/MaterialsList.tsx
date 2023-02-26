import * as React from "react";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Switch from "@mui/material/Switch";
import WifiIcon from "@mui/icons-material/Wifi";
import BluetoothIcon from "@mui/icons-material/Bluetooth";
import {
  Box,
  FormControl,
  InputLabel,
  Paper,
  Select,
} from "@mui/material";
import { IndexedFormula } from "rdflib";
import { RDF, SELF } from "../../constants";
import EditableFields from "../editableFields";


export default function MaterialsList({ selectedPart, interpreter }: { selectedPart: string, interpreter: IndexedFormula }) {

  const materials = interpreter.statementsMatching(
    SELF(selectedPart), SELF('madeOf'), undefined
  )

  return (
    <List sx={{ width: "100%" }}>
      {materials.map(material => {
        const subject = material.object.value.replace('_:#', '')
        const label = interpreter.any(SELF(subject), RDF('label'), undefined)
        // console.log(editableFields)
        return <Paper variant="outlined" square sx={{
          width: "100%", paddin: 1, '&:div + div': {
            borderTop: 0
          }
        }}>
          <ListItem>
            <ListItemText
              primary={label?.value}
              secondary={
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: 'space-between' }}>
                  <EditableFields subject={subject} interpreter={interpreter} />
                </Box>
              }
            />
          </ListItem>
        </Paper>
      })}
    </List>
  );
}
