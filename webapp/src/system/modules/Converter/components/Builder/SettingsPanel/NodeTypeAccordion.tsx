import _ from "lodash";

import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";

import NewUnitButton from "./NewUnitButton";
import NewScaleButton from "./NewScaleButton";

export default () => {

  const NODE_TYPES = [
    {key: 'unit', component: <NewUnitButton />},
    {key: 'scale', component: <NewScaleButton />},
  ];

  return (
    <List
      role="list-options"
      sx={{
        paddingRight: 5,
        overflow: "auto",
      }}
    >
      {NODE_TYPES.map(({key, component}) => (
        <ListItem key={key} disableGutters>{component}</ListItem>
      ))}
    </List>
  );
};
