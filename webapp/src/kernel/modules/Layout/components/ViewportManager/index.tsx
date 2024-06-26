import React, { MouseEvent, useCallback, useMemo } from "react";

// UI
import type { BoxProps } from "@mui/material";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import HomeSharpIcon from "@mui/icons-material/HomeSharp";
import CloseSharpIcon from "@mui/icons-material/CloseSharp";

// Kernel
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";

// Internals
import {
  selectActiveViewport,
  selectViewportStates,
} from "../../store/viewports/selectors";
import ViewportLoader from "./ViewportLoader";
import useViewportManager from "../../hooks/useViewportManager";
import { ViewportState } from "../../store/viewports/state";
import { VIEWPORT_NOTIFICATIONS_ID } from "../../constants";
import { selectAllGroups } from "../../store/viewports/groups/selectors";

type GroupedViewports = {
  notGrouped: ViewportState[];
  [name: string]: ViewportState[];
};


const ViewportManagerContent = ({ sx, ...props }: BoxProps) => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const groups = useAppSelector(selectAllGroups);

  const selectedViewport = useAppSelector(selectActiveViewport);
  const viewports = useAppSelector(selectViewportStates);

  const adaptedState = useMemo(
    () =>
      Object.entries(viewports).reduce(
        (map, [name, state]) => {
          if (name === "home") return map;
          if (state.group)
            return {
              ...map,
              [state.group]:
                state.group in map ? [...map[state.group], state] : [state],
            };
          return {
            ...map,
            notGrouped: [...map.notGrouped, state],
          };
        },
        { notGrouped: [] } as GroupedViewports
      ),
    [viewports]
  );

  const {
    functions: { addViewport, closeViewport, selectViewport },
  } = useViewportManager();

  const handleAddViewport = useCallback(() => {
    addViewport("Nova aba", "home", undefined, 'new-');
  }, []);

  const handleCloseViewport = useCallback((name: string) => {
    closeViewport(name);
  }, []);

  return (
    <Box role="viewport-manager" sx={{ ...sx, height: '100%', display: 'flex', flexDirection: 'column' }} {...props}>
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Tabs
          value={selectedViewport}
          aria-label="viewport tabs"
          role="viewport-tabs"
          sx={{ maxWidth: "100%" }}
        >
          <Tab
            value="home"
            key="home"
            icon={<HomeSharpIcon />}
            iconPosition="start"
            onClick={() => selectViewport("home")}
            id={"home"}
            sx={{ width: "fit-content", minWidth: 0, p: 1 }}
            //   label={<div>test</div>}
          />
          {Object.entries(adaptedState).map(([groupName, groupedViewports]) => {
            if (groupName === "notGrouped")
              return groupedViewports.map((vp) => (
                <Tab
                  value={vp.name}
                  key={`${vp.name}-tab`}
                  id={vp.name}
                  sx={{ width: "fit-content", p: 1 }}
                  onClick={(e: MouseEvent) => e.button != 2 ? selectViewport(vp.name) : handleCloseViewport(vp.name)}
                  label={
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>{vp.title}</span>
                      <CloseSharpIcon
                        sx={{ width: 0.3, marginLeft: 1, alignItems: "center" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloseViewport(vp.name);
                        }}
                      />
                    </Box>
                  }
                  draggable
                  wrapped
                />
              ));
            return groupedViewports.map((vp) => (
              <Tab
                value={vp.name}
                key={`${vp.name}-tab`}
                id={vp.name}
                sx={{
                  width: "fit-content",
                  p: 1,
                  borderTop: 2,
                  borderColor: groups[vp.group!].color, // CHORE: remove ! mark
                }}
                onClick={() => selectViewport(vp.name)}
                label={
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{vp.title}</span>
                    <IconButton size="small" component="span" onClick={(e) => {
                          e.stopPropagation();
                          handleCloseViewport(vp.name);
                        }}>
                      <CloseSharpIcon
                        sx={{ width: 0.5, marginLeft: 1 }}
                        
                      />
                    </IconButton>
                  </Box>
                }
                draggable="true"
                wrapped
              />
            ));
          })}

          <Tab
            value="new"
            key="new"
            icon={<AddBoxOutlinedIcon />}
            iconPosition="start"
            role={"add viewport"}
            aria-label="Add viewport"
            id={"new-viewport"}
            onClick={handleAddViewport}
            sx={{ width: "fit-content", minWidth: 0, p: 1 }}
            //   label={<div>test</div>}
          />
        </Tabs>
        <Box
          id={VIEWPORT_NOTIFICATIONS_ID}
          role="viewport-notifications"
          aria-label="viewport notifications"
          sx={{ display: "flex", p: 1, gap: 2, alignItems: "center" }}
        />
      </Box>

      <Box
        role="viewport-content"
        aria-label="viewport content"
        sx={{
          width: "100%",
          flexGrow: 1,
          overflow: 'auto'

        }}
      >
        <ViewportLoader />
      </Box>
    </Box>
  );
};

export default React.memo(ViewportManagerContent);
