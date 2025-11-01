# Composer Module

## 1. Description
The Composer module is a graph-based system for modeling garments, materials, parts, and their relationships. It provides a flexible, extensible architecture for building and visualizing domain-specific graphs in fashion and manufacturing contexts.

## 2. Architecture
- **Graph State**: Centralized state for all nodes and edges, supporting multiple variations and undo/redo.
- **Node Types**: Each node type (e.g., Garment, Material, Part) is defined by a TypeScript type and rendered with a dedicated D3 component.
- **Edge Types**: Typed relationships (e.g., HAS_PART, MATERIAL_OF) for clarity and extensibility.
- **UI Integration**: React components for dialogs, accordions, lists, and graph editing.
- **D3 Rendering**: Custom D3 components for each node/edge type.
- **Hooks & Selectors**: For accessing and manipulating graph state.
- **Storage**: In-memory and disk-based persistence for graph data.

## 3. Exported Objects
### 3.1 Components
#### i. React
- `MaterialListAccordion`, `AddMaterialButton`, `GarmentDetails`, etc.
- Used for UI panels, dialogs, and graph management.
#### ii. D3
- `D3GarmentNode`, `D3MaterialNode`, etc.
- Used for SVG-based graph visualization and custom node/edge rendering.

### 3.2 Hooks
- `useGraph(variationId, selector)`: Access graph state for a variation.
- `useNode(nodeId)`: Get state/actions for a node.
- `useEdge(edgeId)`: Get state/actions for an edge.
- `useGraphActions()`: Graph-level actions (addNode, removeNode, addEdge, etc).
- `useGraphList()`: List all graph variations.

### 3.3 Selectors
- Functions to select and transform graph state, nodes, edges, and domain-specific data.
- Example: `selectMaterialNodes(graphState)`

## 4. Storage
- **In-memory**: Fast runtime access and manipulation of graph data.
- **Disk**: Persistent storage and retrieval of graph variations, nodes, and metadata.
- Uses serialization/deserialization for saving/loading.

## 5. Tests
### 5.1 Data
- Sample graph states, nodes, and edges for unit and integration tests.
### 5.2 Scripts
- Test scripts for validating graph rendering, node/edge creation, storage, and UI integration.
- Use Jest and React Testing Library for UI and logic tests.

---

Refer to the module's TypeScript typings, source code, and other module READMEs for further details, best practices, and integration patterns.
