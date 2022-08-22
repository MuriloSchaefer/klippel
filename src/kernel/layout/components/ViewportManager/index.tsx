import React, { useEffect } from "react";

// kernel imports
import { useViewportManager } from "@kernel/hooks/useViewportManager";

// internal imports
import useViewport from "@kernel/hooks/useViewport";
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

  useEffect(() => {
    if (!viewportManager.state.tabs.length) {
      // add welcome screen in case no tabs are open yet
      viewportManager.hooks.addViewport("Bem-Vindo", <div>Bem vindo</div>);
    }
  }, [viewportManager.state]);

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
