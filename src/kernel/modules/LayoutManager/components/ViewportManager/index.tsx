import React from "react";

// kernel imports

// internal imports
import { useViewportManager } from "../../hooks/useViewportManager";
import useViewport from "../../hooks/useViewport";
import ViewportTabs, {
  AddViewportTab,
  TabsHeader,
  ViewportTab,
} from "./components/Tabs";

/**
 * Component responsible for managing multiple viewports
 * @returns a React element for the viewport
 */
const ViewportManager = (): React.ReactElement => {
  const viewportManager = useViewportManager();
  const viewport = useViewport(viewportManager.state.activeTab);

  const handleAddTab = (): void => {
    viewportManager.hooks.addViewport("New Tab", <>New Tab</>);
  };

  const handleTabSelection = (id: string): void => {
    viewportManager.hooks.selectViewport(id);
  };

  const handleTabClose = (id: string): void => {
    viewportManager.hooks.removeViewport(id);
  };

  return (
    <ViewportTabs>
      <TabsHeader>
        {viewportManager.state.tabs.map((tab) => (
          <ViewportTab
            active={viewportManager.state.activeTab === tab.id}
            onClick={() => handleTabSelection(tab.id)}
            onClose={(e) => {
              e.stopPropagation();
              handleTabClose(tab.id);
            }}
            key={tab.id}
          >
            {tab.title}
          </ViewportTab>
        ))}
        <AddViewportTab onClick={handleAddTab} />
      </TabsHeader>

      <div style={{ gridArea: "content", padding: "15px" }}>
        {viewport && viewport.content}
      </div>
    </ViewportTabs>
  );
};

ViewportManager.defaultProps = {
  children: null,
};

export default ViewportManager;
