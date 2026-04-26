# KeyboardShortcuts Module Architecture Diagrams

This document contains standard diagrams using Mermaid notation, which is widely supported in VS Code, GitHub, and other markdown-aware tools.

## 1. Initialization Flow (BPMN-Style Process Diagram)

```mermaid
graph TB
    Start([Application Startup]) --> LoadModules[Load Modules via ModulesProvider]
    LoadModules --> CreateStore[Create DynamicStore with KeyboardShortcuts slice]
    CreateStore --> StartKernel[Call startModule on KeyboardShortcuts]
    
    StartKernel --> IterateModules{Iterate Loaded Modules}
    IterateModules --> CheckShortcuts{Module has shortcuts field?}
    
    CheckShortcuts -->|Yes| DispatchRegister[Dispatch registerShortcut action for each shortcut]
    CheckShortcuts -->|No| NextModule[Continue to next module]
    
    DispatchRegister --> MiddlewareIntercept[Listener Middleware intercepts action]
    MiddlewareIntercept --> ValidateShortcut{Validate shortcut definition}
    
    ValidateShortcut -->|Valid| ReducerUpdate[Reducer adds to state.shortcuts]
    ValidateShortcut -->|Invalid| LogError[Log error and skip]
    
    ReducerUpdate --> NextModule
    LogError --> NextModule
    NextModule --> IterateModules
    
    IterateModules -->|All modules processed| Complete([Initialization Complete])
    
    style Start fill:#d5e8d4,stroke:#82b366,stroke-width:2px
    style Complete fill:#d5e8d4,stroke:#82b366,stroke-width:2px
    style DispatchRegister fill:#dae8fc,stroke:#6c8ebf,stroke-width:2px
    style ReducerUpdate fill:#dae8fc,stroke:#6c8ebf,stroke-width:2px
    style ValidateShortcut fill:#fff2cc,stroke:#d6b656,stroke-width:2px
    style CheckShortcuts fill:#fff2cc,stroke:#d6b656,stroke-width:2px
```

### Example: Composer Module Registration

```typescript
// Composer module defines shortcuts in IModule interface
const ComposerModule: IModule = {
  name: 'Composer',
  version: '1.0.0',
  depends_on: ['Store', 'KeyboardShortcuts'],
  shortcuts: [
    {
      id: 'composer.save',
      key: 'Ctrl+s',
      contextId: 'Composer',
      action: 'Composer:save',
      description: 'Save current composition'
    },
    {
      id: 'composer.undo',
      key: 'Ctrl+z',
      contextId: 'Composer',
      action: 'Composer:undo'
    }
  ]
};
```

### Redux State After Initialization

```typescript
{
  shortcuts: {
    'composer.save': {
      id: 'composer.save',
      key: 'Ctrl+s',
      contextId: 'Composer',
      action: 'Composer:save',
      description: 'Save current composition',
      enabled: true
    },
    'composer.undo': {
      id: 'composer.undo',
      key: 'Ctrl+z',
      contextId: 'Composer',
      action: 'Composer:undo',
      enabled: true
    }
  },
  contextStack: ['Global'],
  enabled: true
}
```

## 2. Module Consumption Flow (Data Flow Diagram)

```mermaid
flowchart LR
    Composer[Composer Module]
    Layout[Layout Module]
    Materials[Materials Module]
    Custom[Custom Module]
    
    KS["KeyboardShortcuts Module
    Redux Store
    Listener Middleware
    Hooks API"]
    
    Store[(Redux Store)]
    
    Composer -->|1. Define shortcuts| KS
    Layout -->|1. Define shortcuts| KS
    Materials -->|2a. Runtime hooks| KS
    Custom -->|2b. Runtime manager| KS
    
    KS -->|Store| Store
    
    Store -.->|3. Dispatch events| Composer
    Store -.->|3. Dispatch events| Layout
    KS -.->|3. Query state| Materials
    KS -.->|3. Manage state| Custom
    
    style KS fill:#dae8fc,stroke:#6c8ebf,stroke-width:3px
    style Store fill:#f8cecc,stroke:#b85450,stroke-width:2px
    style Composer fill:#fff2cc,stroke:#d6b656,stroke-width:2px
    style Layout fill:#fff2cc,stroke:#d6b656,stroke-width:2px
    style Materials fill:#fff2cc,stroke:#d6b656,stroke-width:2px
    style Custom fill:#fff2cc,stroke:#d6b656,stroke-width:2px
```

### Interaction Patterns

1. **Static Registration (Phase 1a)**: Modules define shortcuts in their `IModule.shortcuts` field
   - Processed during module initialization
   - Shortcuts automatically registered before module starts

2. **Dynamic Registration (Phase 1b)**: Modules register shortcuts at runtime
   - Using `useShortcut` hook (React components)
   - Using `useShortcutManager` (imperative API)
   - Allows conditional/dynamic shortcut registration

3. **Event Listening (Phase 3a)**: Modules listen for keyboard events
   - Subscribe to `KeyPressed:event` actions
   - Use middleware to intercept and handle events
   - Redux-first pattern for event handling

4. **State Querying (Phase 3b)**: Modules query shortcut state
   - Use selectors to get active shortcuts
   - Use selectors to check context stack
   - Read-only access to global shortcut state

## 3. Context Stack Management (State Diagram)

```mermaid
stateDiagram-v2
    [*] --> Global: App Starts
    
    Global --> Composer: pushContext('Composer')
    Composer --> Global: popContext()
    
    Global --> Layout: pushContext('Layout')
    Layout --> Global: popContext()
    
    Composer --> ComposerDialog: pushContext('ComposerDialog')
    ComposerDialog --> Composer: popContext()
    
    Layout --> LayoutSettings: pushContext('LayoutSettings')
    LayoutSettings --> Layout: popContext()
    
    note right of Global
        contextStack: ['Global']
        Active shortcuts: Global only
    end note
    
    note right of Composer
        contextStack: ['Global', 'Composer']
        Active shortcuts: Global + Composer
    end note
    
    note right of ComposerDialog
        contextStack: ['Global', 'Composer', 'ComposerDialog']
        Active shortcuts: All three contexts
    end note
```

### Context Stack Rules

- Context stack is a LIFO (Last In, First Out) stack
- Always starts with 'Global' context at the base
- Active shortcuts = union of all shortcuts in the current context stack
- Nested contexts inherit parent context shortcuts
- When a key is pressed, middleware searches from top of stack downward
- First matching shortcut wins (allows context-specific overrides)

## 4. Runtime Keyboard Event Flow (Sequence Diagram)

```mermaid
sequenceDiagram
    participant User
    participant KL as KeyboardListener Component
    participant MW as Listener Middleware
    participant Store as Redux Store
    participant Module as Consumer Module
    
    User->>KL: Press Ctrl+s
    KL->>KL: formatKeyEvent('Ctrl+s')
    KL->>Store: dispatch(KeyPressed:event)
    
    Store->>MW: Action intercepted
    MW->>MW: Get current context stack
    MW->>MW: Find matching shortcut
    
    alt Shortcut found
        MW->>MW: Get action from shortcut definition
        MW->>Store: dispatch(action from shortcut)
        Store->>Module: Module receives action
        Module->>Module: Execute handler
        Module-->>User: Action completed
    else No shortcut found
        MW-->>KL: No match, event ignored
    end
```

### Event Processing Steps

1. **Capture**: KeyboardListener captures browser keyboard event
2. **Normalize**: formatKeyEvent converts to standard string format
3. **Dispatch**: KeyPressed:event action dispatched to Redux
4. **Intercept**: Listener middleware intercepts the event
5. **Match**: Search active shortcuts for matching key combo
6. **Execute**: Dispatch the action defined in the matching shortcut
7. **Handle**: Consumer module handles the dispatched action

## 5. API Usage Patterns (Component Diagram)

```mermaid
flowchart TB
    Component[React Component]
    Handler[Event Handler]
    
    Hook1[useShortcut]
    Hook2[useShortcutContext]
    Hook3[useActiveShortcuts]
    Manager[useShortcutManager]
    
    Actions[Action Creators]
    Selectors[Selectors]
    Middleware[Listener Middleware]
    Reducer[Reducer]
    
    State[(Redux State)]
    
    Component -->|Register| Hook1
    Component -->|Query context| Hook2
    Component -->|Get shortcuts| Hook3
    Component -->|Imperative API| Manager
    
    Hook1 --> Actions
    Hook2 --> Selectors
    Hook3 --> Selectors
    Manager --> Actions
    
    Actions --> Middleware
    Middleware --> Reducer
    Reducer --> State
    Selectors --> State
    
    State -.->|Re-render| Component
    Handler -.->|Called| Component
    
    style Component fill:#fff2cc,stroke:#d6b656,stroke-width:2px
    style State fill:#f8cecc,stroke:#b85450,stroke-width:2px
    style Hook1 fill:#dae8fc,stroke:#6c8ebf,stroke-width:2px
    style Hook2 fill:#dae8fc,stroke:#6c8ebf,stroke-width:2px
    style Hook3 fill:#dae8fc,stroke:#6c8ebf,stroke-width:2px
    style Manager fill:#dae8fc,stroke:#6c8ebf,stroke-width:2px
```

## 6. BPMN-Style Shortcut Registration Process

```mermaid
flowchart TB
    Start([Module Defines Shortcuts])
    
    Start --> Gateway1{Registration Method?}
    
    Gateway1 -->|Static: IModule.shortcuts| Task1[Add to Module Definition]
    Gateway1 -->|Dynamic: useShortcut| Task2[Call Hook in Component]
    Gateway1 -->|Dynamic: Manager| Task3[Call Manager Function]
    
    Task1 --> Task4[Module Loader Processes Definition]
    Task2 --> Task5[Hook Dispatches registerShortcut]
    Task3 --> Task6[Manager Dispatches registerShortcut]
    
    Task4 --> Task5
    Task5 --> Task7[Action Enters Redux Pipeline]
    Task6 --> Task7
    
    Task7 --> Task8[Middleware Intercepts Action]
    Task8 --> Gateway2{Valid Shortcut?}
    
    Gateway2 -->|Yes| Task9[Check for Conflicts]
    Gateway2 -->|No| Error1[Log Error & Reject]
    
    Task9 --> Gateway3{Conflict Found?}
    
    Gateway3 -->|Yes| Task10[Dispatch ConflictDetected Event]
    Gateway3 -->|No| Task11[Reducer Updates State]
    
    Task10 --> Gateway4{Override Allowed?}
    Gateway4 -->|Yes| Task11
    Gateway4 -->|No| Error2[Reject Registration]
    
    Task11 --> Task12[Dispatch ShortcutRegistered Event]
    Task12 --> End([Registration Complete])
    
    Error1 --> EndError([Registration Failed])
    Error2 --> EndError
    
    style Start fill:#d5e8d4,stroke:#82b366,stroke-width:2px
    style End fill:#d5e8d4,stroke:#82b366,stroke-width:2px
    style EndError fill:#f8cecc,stroke:#b85450,stroke-width:2px
    style Gateway1 fill:#fff2cc,stroke:#d6b656,stroke-width:2px
    style Gateway2 fill:#fff2cc,stroke:#d6b656,stroke-width:2px
    style Gateway3 fill:#fff2cc,stroke:#d6b656,stroke-width:2px
    style Gateway4 fill:#fff2cc,stroke:#d6b656,stroke-width:2px
    style Task8 fill:#dae8fc,stroke:#6c8ebf,stroke-width:2px
    style Task11 fill:#dae8fc,stroke:#6c8ebf,stroke-width:2px
```

## 7. Class Diagram: Module API Structure

```mermaid
classDiagram
    class IModule {
        +string name
        +string version
        +string[] depends_on
        +Shortcut[] shortcuts
    }
    
    class Shortcut {
        +string id
        +string key
        +string contextId
        +string action
        +string description
        +boolean enabled
    }
    
    class KeyboardShortcutsState {
        +Record~string, Shortcut~ shortcuts
        +string[] contextStack
        +boolean enabled
    }
    
    class ShortcutManager {
        +registerShortcut(shortcut)
        +unregisterShortcut(id)
        +pushContext(contextId)
        +popContext()
        +getContextStack()
        +getShortcutsForContext(contextId)
        +getAllShortcuts()
        +setEnabled(enabled)
    }
    
    class useShortcut {
        <<React Hook>>
        +register(key, action, options)
        +unregister()
    }
    
    class useShortcutContext {
        <<React Hook>>
        +getCurrentContext()
        +pushContext(contextId)
        +popContext()
    }
    
    class useActiveShortcuts {
        <<React Hook>>
        +getActiveShortcuts()
        +getShortcutsByContext(contextId)
    }
    
    IModule "1" --> "*" Shortcut: defines
    KeyboardShortcutsState "1" --> "*" Shortcut: stores
    ShortcutManager ..> KeyboardShortcutsState: manages
    useShortcut ..> ShortcutManager: uses
    useShortcutContext ..> ShortcutManager: uses
    useActiveShortcuts ..> KeyboardShortcutsState: reads
```

## Diagram Rendering

These diagrams use [Mermaid](https://mermaid.js.org/) syntax and can be rendered in:
- **VS Code**: Install "Markdown Preview Mermaid Support" or "Mermaid Markdown Syntax Highlighting" extensions
- **GitHub/GitLab**: Native markdown preview support
- **Documentation tools**: Docusaurus, MkDocs, Hugo, etc.
- **Draw.io**: File → Import → Mermaid
- **Online**: https://mermaid.live/

## Diagram Types Used

1. **Flowchart/BPMN** (`graph TB/LR`): Process flows and decision trees
2. **State Diagram** (`stateDiagram-v2`): Context stack state transitions
3. **Sequence Diagram** (`sequenceDiagram`): Runtime event flows
4. **Class Diagram** (`classDiagram`): API structure and relationships

All diagrams follow standard notation conventions:
- Circles/Ovals: Start/End points (BPMN events)
- Rectangles: Processes/Tasks
- Diamonds: Decision gates/Conditions
- Dashed lines: Data flow/Query operations
- Solid lines: Control flow/Commands
- Database cylinders: Data storage
