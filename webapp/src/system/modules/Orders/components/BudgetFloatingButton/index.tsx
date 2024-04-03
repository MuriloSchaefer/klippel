import * as React from "react";

import Box from "@mui/material/Box";
import Grow from "@mui/material/Grow";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Popper from "@mui/material/Popper";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import Paper from "@mui/material/Paper";

import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ClickAwayListener from "@mui/material/ClickAwayListener";

import useModule from "@kernel/hooks/useModule";
import type { ILayoutModule } from "@kernel/modules/Layout";
import type { Store } from "@kernel/modules/Store";

import type { IComposerModule } from "@system/modules/Composer";

import { labels } from "./constants";
import CreateBudgetButton from './CreateBudgetButton';
import AddToBudgetButton from "./AddToBudgetButton";


type Actions = "create-budget" | "add-to-budget";

export default function BudgetFloatingButton() {
  const storeModule = useModule<Store>("Store");
  const layoutModule = useModule<ILayoutModule>('Layout');
  const composerModule = useModule<IComposerModule>('Composer');

  const { useAppSelector} = storeModule.hooks
  const {useComposition} = composerModule.hooks
  const {selectActiveViewport} = layoutModule.store.selectors
  const activeViewport = useAppSelector(selectActiveViewport)
  const composition = useComposition({viewportName: activeViewport}, c=>c)

  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const [selected, setSelected] = React.useState<Actions>("create-budget");

  const handleMenuItemClick = (
    event: React.MouseEvent<HTMLLIElement, MouseEvent>,
    action: Actions
  ) => {
    setSelected(action);
    setOpen(false);
  };

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event: Event) => {
    if (
      anchorRef.current &&
      anchorRef.current.contains(event.target as HTMLElement)
    ) {
      return;
    }

    setOpen(false);
  };

  if (!composition.state) return <></> // TODO: what to do in this case? 

  return (
    <Box sx={{ position: "absolute", bottom: 10, right: 10 }}>
      <ButtonGroup
        variant="contained"
        ref={anchorRef}
        aria-label="budget button"
      >
        {selected === 'create-budget' && <CreateBudgetButton/>}
        {selected === 'add-to-budget' && <AddToBudgetButton/>}

        <Button size="small" aria-haspopup="menu" onClick={handleToggle}>
          <ArrowDropDownIcon />
        </Button>
      </ButtonGroup>
      <Popper
        sx={{
          zIndex: 1,
        }}
        open={open}
        anchorEl={anchorRef.current}
        role="budget-floating-buttons"
        transition
        disablePortal
      >
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin:
                placement === "bottom" ? "center top" : "center bottom",
            }}
          >
            <Paper>
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList id="split-button-menu" autoFocusItem>
                  <MenuItem
                    key="create-budget"
                    selected={"create-budget" === selected}
                    onClick={(event) =>
                      handleMenuItemClick(event, "create-budget")
                    }
                  >
                    {labels["create-budget"]}
                  </MenuItem>
                  <MenuItem
                    key="add-to-budget"
                    selected={"add-to-budget" === selected}
                    onClick={(event) =>
                      handleMenuItemClick(event, "add-to-budget")
                    }
                  >
                    {labels["add-to-budget"]}
                  </MenuItem>
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </Box>
  );
}
