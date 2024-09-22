import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import Icon from "@mui/material/Icon";
import AccountCircleSharpIcon from "@mui/icons-material/AccountCircleSharp";
import Popover from "@mui/material/Popover";
import React, { useRef, useState } from "react";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import { Box, Typography } from "@mui/material";
import type { Workspace } from "@kernel/modules/Store/schemas/Workspace";

const Avatar = ({
  workspace,
  ref,
  onClick,
}: {
  workspace: Workspace;
  ref?: React.Ref<SVGSVGElement>;
  onClick?: (evt: React.MouseEvent<SVGSVGElement>) => void;
}) => {
  return workspace.logo ? (
    <Icon ref={ref} component="svg" onClick={onClick}>
      <img alt="avatar" width={18} height={18} src={workspace.logo} />
    </Icon>
  ) : (
    <AccountCircleSharpIcon ref={ref} onClick={onClick} />
  );
};

export default () => {
  const storeModule = useModule<Store>("Store");
  const { useCurrentWorkspace } = storeModule.hooks;
  const workspace = useCurrentWorkspace();

  const [anchorEl, setAnchorEl] = React.useState<SVGSVGElement | null>(null);

  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  if (!workspace) return null;
  return (
    <>
      <Avatar workspace={workspace} onClick={handleClick} />
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <ClickAwayListener onClickAway={handleClose}>
          <Box padding={1} sx={{ display: "flex", flexDirection: "column" }}>
            <Avatar workspace={workspace} />
            <Typography variant="h6">{workspace.name}</Typography>
          </Box>
        </ClickAwayListener>
      </Popover>
    </>
  );
};
