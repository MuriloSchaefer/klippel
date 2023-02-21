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


export default function SwitchListSecondary() {
  const [checked, setChecked] = React.useState(["wifi"]);

  const handleToggle = (value: string) => () => {
    const currentIndex = checked.indexOf(value);
    const newChecked = [...checked];

    if (currentIndex === -1) {
      newChecked.push(value);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    setChecked(newChecked);
  };

  return (
    <List sx={{ width: "100%" }}>
      <Paper variant="outlined" square sx={{ width: "100%", paddin: 1, '&:div + div': {
        borderTop: 0
      } }}>
        <ListItem>
          <ListItemText
            primary="Tecido externo"
            secondary={
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: 'space-between' }}>
                <FormControl sx={{ m: 1, minWidth: 120 }}>
                  <InputLabel htmlFor="grouped-native-select">Nome</InputLabel>
                  <Select
                    native
                    defaultValue=""
                    id="grouped-native-select"
                    label="Grouping"
                  >
                    <option aria-label="None" value="" />
                    <optgroup label="Mundial">
                      <option value={1}>PV</option>
                      <option value={2}>PV 2</option>
                    </optgroup>
                    <optgroup label="Similares">
                      <option value={3}>Malha PV</option>
                      <option value={4}>Santanense PV</option>
                    </optgroup>
                  </Select>
                </FormControl>

                <FormControl sx={{ m: 1, minWidth: 120 }}>
                  <InputLabel htmlFor="grouped-native-select">Cor</InputLabel>
                  <Select
                    native
                    defaultValue={1}
                    id="grouped-native-select"
                    label="Grouping"
                  >
                    <option value={1}>Chumbo</option>
                    <option value={1}>Mescla</option>
                  </Select>
                </FormControl>

                <Switch
                  edge="end"
                  onChange={handleToggle("wifi")}
                  checked={checked.indexOf("wifi") !== -1}
                  inputProps={{
                    "aria-labelledby": "switch-list-label-wifi",
                  }}
                />
              </Box>
            }
          />
        </ListItem>
      </Paper>
      
      <Paper variant="outlined" square sx={{ width: "100%", paddin: 1 }}>
        <ListItem>
          <ListItemText
            primary="Tecido interno"
            secondary={
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <FormControl sx={{ m: 1, minWidth: 120 }}>
                  <InputLabel htmlFor="grouped-native-select">Nome</InputLabel>
                  <Select
                    native
                    defaultValue=""
                    id="grouped-native-select"
                    label="Grouping"
                  >
                    <option aria-label="None" value="" />
                    <optgroup label="Mundial">
                      <option value={1}>PV</option>
                      <option value={2}>PV 2</option>
                    </optgroup>
                    <optgroup label="Similares">
                      <option value={3}>Malha PV</option>
                      <option value={4}>Santanense PV</option>
                    </optgroup>
                  </Select>
                </FormControl>

                <FormControl sx={{ m: 1, minWidth: 120 }}>
                  <InputLabel htmlFor="grouped-native-select">Cor</InputLabel>
                  <Select
                    native
                    defaultValue={1}
                    id="grouped-native-select"
                    label="Grouping"
                  >
                    <option value={1}>Chumbo</option>
                    <option value={1}>Mescla</option>
                  </Select>
                </FormControl>

                <Switch
                  edge="end"
                  onChange={handleToggle("wifi")}
                  checked={checked.indexOf("wifi") !== -1}
                  inputProps={{
                    "aria-labelledby": "switch-list-label-wifi",
                  }}
                />
              </Box>
            }
          />
        </ListItem>
      </Paper>
    </List>
  );
}
