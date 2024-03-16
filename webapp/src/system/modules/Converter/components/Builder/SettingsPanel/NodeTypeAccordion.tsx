import _ from "lodash";

import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";

import NewUnitButton from "./NewUnitButton";
import NewScaleButton from "./NewScaleButton";
import NewCompositeUnitButton from "./NewCompositeUnitButton";

export default () => {
  return (
    <List
      role="list-options"
      sx={{
        paddingRight: 5,
        overflow: "auto",
      }}
    >
      <ListItem key="unit" disableGutters>
        <NewUnitButton />
      </ListItem>

      <ListItem key="compositeUnit" disableGutters>
        <NewCompositeUnitButton />
      </ListItem>

      <ListItem key="scale" disableGutters>
        <NewScaleButton />
      </ListItem>
    </List>
  );
};
