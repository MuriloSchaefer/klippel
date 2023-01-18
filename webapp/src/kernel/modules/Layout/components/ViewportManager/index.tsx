import { TabContext } from "@mui/lab";
import { Box, IconButton, Tab, Tabs } from "@mui/material";
import HomeSharpIcon from "@mui/icons-material/HomeSharp";
import NotificationsSharpIcon from "@mui/icons-material/NotificationsSharp";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
import React from "react";

const ViewportManager = () => {
  const viewport = "home";
  return (
    <Box role="viewport-manager" sx={{ width: "100%" }}>
      <TabContext value={viewport}>
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Tabs
            value={viewport}
            aria-label="viewport tabs"
            role="viewport-tabs"
            sx={{ minWidth: 0 }}
          >
            <Tab
              value="home"
              key="home"
              icon={<HomeSharpIcon />}
              iconPosition="start"
              id={"home-viewport"}
              sx={{ width: "fit-content", minWidth: 0, p: 1 }}
              //   label={<div>test</div>}
              wrapped
            />

            <Box
              role="grouped-tab-container"
              sx={{ borderTop: 1, borderTopColor: "#ff0000" }}
            >
              <Tab
                value="viewport1"
                key="viewport1"
                id={"viewport1"}
                sx={{ width: "fit-content", p: 1 }}
                label="test"
                draggable
                wrapped
              />
              <Tab
                value="viewport2"
                key="viewport2"
                id={"viewport2"}
                sx={{ width: "fit-content", p: 1 }}
                label="test2"
                draggable
                wrapped
              />
            </Box>
            <Box
              role="grouped-tab-container"
              sx={{ borderTop: 1, borderTopColor: "#00ff00" }}
            >
              <Tab
                value="viewport1"
                key="viewport1"
                id={"viewport1"}
                sx={{
                  width: "fit-content",
                  p: 1,
                }}
                label={<Box>test</Box>}
                wrapped
              />
              <Tab
                value="viewport2"
                key="viewport2"
                id={"viewport2"}
                sx={{
                  width: "fit-content",
                  p: 1,
                }}
                label={<div>test 2</div>}
                wrapped
              />
            </Box>
            <IconButton color="primary" aria-label="create viewport">
              <AddBoxOutlinedIcon />
            </IconButton>
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
        ></Box>
      </TabContext>
    </Box>
  );
};

export default React.memo(ViewportManager);
