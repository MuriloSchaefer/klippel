import React, { useCallback, useMemo } from "react";

// UI
import { TabContext } from "@mui/lab";
import { Box, BoxProps, IconButton, Tab, Tabs } from "@mui/material";
import HomeSharpIcon from "@mui/icons-material/HomeSharp";
import NotificationsSharpIcon from "@mui/icons-material/NotificationsSharp";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
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
import { OverridableComponent } from "@mui/material/OverridableComponent";

type GroupedViewports = {
  notGrouped: ViewportState[];
  [name: string]: ViewportState[];
};


const ViewportManagerContent = () => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;
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
    addViewport("Nova aba", "home", "group");
  }, []);

  const handleCloseViewport = useCallback((name: string) => {
    console.log(name);
    closeViewport(name);
  }, []);

  return (
    <>
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
                  borderColor: "red",
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
                    <IconButton size="small" component="span">
                      <CloseSharpIcon
                        sx={{ width: 0.5, marginLeft: 1 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloseViewport(vp.name);
                        }}
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
          role="viewport-notifications"
          aria-label="viewport notifications"
          sx={{ display: "flex", p: 1, alignItems: "center" }}
        >
          <NotificationsSharpIcon />
        </Box>
      </Box>

      <Box
        role="viewport-content"
        aria-label="viewport content"
        sx={{
          width: "100%",
          height: "100%",
        }}
      >
        <ViewportLoader />
      </Box>
    </>
  );
};

const ViewportManager = ({ sx, ...props }: BoxProps) => {
  return (
    <Box role="viewport-manager" sx={{ ...sx }} {...props}>
      <ViewportManagerContent />
    </Box>
  );
};

export default React.memo(ViewportManager);
