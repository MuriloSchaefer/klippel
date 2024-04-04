import {useEffect, useRef, useState} from "react";

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

import { actions } from "./constants";
import CreateBudgetButton from "./CreateBudgetButton";
import AddToBudgetButton from "./AddToBudgetButton";
import ConvertToOrderButton from "./ConvertToOrderButton";
import DeleteBudgetButton from "./DeleteBudgetButton";
import { BudgetFloatingButtonActions } from "../../typings";

type BudgetFloatingButtonProps = {
  readonly allowedActions: BudgetFloatingButtonActions[];
};

export default function BudgetFloatingButton({
  allowedActions = [
    "create-budget",
    "add-to-budget",
    "convert-to-order",
    "delete-budget",
  ],
}: BudgetFloatingButtonProps) {
  const storeModule = useModule<Store>("Store");
  const layoutModule = useModule<ILayoutModule>("Layout");
  const composerModule = useModule<IComposerModule>("Composer");

  const { useAppSelector } = storeModule.hooks;
  const { useComposition } = composerModule.hooks;
  const { selectActiveViewport } = layoutModule.store.selectors;
  const activeViewport = useAppSelector(selectActiveViewport);
  const composition = useComposition(
    { viewportName: activeViewport },
    (c) => c
  );

  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<BudgetFloatingButtonActions>(
    allowedActions[0] ?? "create-budget"
  );
  useEffect(()=>{
    if (allowedActions.length && !allowedActions.includes(selected)){
      setSelected(allowedActions[0])
    }
  }, [allowedActions])

  const handleMenuItemClick = (
    event: React.MouseEvent<HTMLLIElement, MouseEvent>,
    action: BudgetFloatingButtonActions
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

  if (!composition.state || !allowedActions.length) return <></>; // TODO: what to do in this case?

  return (
    <Box sx={{ position: "absolute", bottom: 10, right: 10 }}>
      <ButtonGroup
        variant="contained"
        ref={anchorRef}
        aria-label="budget button"
      >
        {selected === "create-budget" && <CreateBudgetButton />}
        {selected === "add-to-budget" && <AddToBudgetButton />}
        {selected === "convert-to-order" && <ConvertToOrderButton />}
        {selected === "delete-budget" && <DeleteBudgetButton />}
        <Button
          size="small"
          aria-haspopup="menu"
          onClick={handleToggle}
          color={actions[selected].color}
        >
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
                  {allowedActions.map((allowed) => {
                    const info = actions[allowed];
                    return (
                      <MenuItem
                        key={info.id}
                        selected={info.id === selected}
                        onClick={(event) =>
                          handleMenuItemClick(
                            event,
                            info.id as BudgetFloatingButtonActions
                          )
                        }
                        color={info.color}
                      >
                        {info.label}
                      </MenuItem>
                    );
                  })}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </Box>
  );
}
