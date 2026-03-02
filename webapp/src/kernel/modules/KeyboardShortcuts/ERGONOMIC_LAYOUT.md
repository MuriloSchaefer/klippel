# Ergonomic Keyboard Layout for Navigation Shortcuts

This diagram shows the recommended keyboard shortcuts for layout navigation, designed with ergonomic hand positioning in mind. The shortcuts consider that users often type with both hands, so shortcuts should be accessible from natural resting positions.

## Design Principles

1. **Home Row Focus**: Primary shortcuts use keys accessible from the home row position (ASDF JKL;)
2. **Left-Hand Modifiers**: Ctrl, Alt, Shift on the left for easy combination with right-hand keys
3. **Easy Reach**: Minimize finger travel distance for frequently used shortcuts
4. **Logical Grouping**: Related functions use adjacent or similar keys
5. **Avoid Conflicts**: Don't override common shortcuts (Ctrl+C, Ctrl+V, Ctrl+S, etc.)

## Keyboard Layout Diagram

```
┌─────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬──────────┐
│ Esc │ F1 │ F2 │ F3 │ F4 │ F5 │ F6 │ F7 │ F8 │ F9 │F10 │F11 │F12 │          │
│     │    │    │    │    │    │    │    │    │    │    │    │    │          │
└─────┴──┬─┴──┬─┴──┬─┴──┬─┴──┬─┴──┬─┴──┬─┴──┬─┴──┬─┴──┬─┴──┬─┴──┬─┴──┬───────┤
  │  `  │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │ 8  │ 9  │ 0  │ -  │ =  │ Backsp│
  │     │    │    │    │    │    │    │    │    │    │    │    │    │       │
  ├─────┴┬───┴┬───┴┬───┴┬───┴┬───┴┬───┴┬───┴┬───┴┬───┴┬───┴┬───┴┬───┴───────┤
  │ Tab  │ Q  │ W  │ E  │ R  │ T  │ Y  │ U  │ I  │ O  │ P  │ [  │ ]  │   \   │
  │Toggle│Qui-│Win-│    │Rib-│Tab │    │    │    │Open│Panel│    │    │       │
  │Sidebr│ck  │dow │    │bon │Nav │    │    │    │Menu│Nav │    │    │       │
  ├──────┴┬───┴┬───┴┬───┴┬───┴┬───┴┬───┴┬───┴┬───┴┬───┴┬───┴┬───┴┬──────────┤
  │ Caps  │ A  │ S  │ D  │ F  │ G  │ H  │ J  │ K  │ L  │ ;  │ '  │  Enter   │
  │       │All │Sec-│    │Foc-│    │Hid-│    │    │    │    │    │          │
  │       │    │tion│    │us  │    │den │    │    │    │    │    │          │
  ├───────┴──┬─┴──┬─┴──┬─┴──┬─┴──┬─┴──┬─┴──┬─┴──┬─┴──┬─┴──┬─┴──┬─┴──────────┤
  │ Shift    │ Z  │ X  │ C  │ V  │ B  │ N  │ M  │ ,  │ .  │ /  │   Shift    │
  │          │    │Clos│Copy│Paste│    │    │    │    │    │    │            │
  └───┬──────┴─┬──┴──┬─┴────┴────┴────┴────┴────┴──┬─┴───┬┴────┴┬───┬───────┘
      │ Ctrl   │ Alt │       Space                  │ Alt │ Ctrl │   │
      │Modifier│Modf │                              │     │      │   │
      └────────┴─────┴──────────────────────────────┴─────┴──────┘   │
                                                                      │
Arrow Keys:                                                           │
┌────┐                                                               │
│ ↑  │  Navigation within viewports/panels                           │
└─┬──┴──┬─┐                                                          │
┌─┤  ←  ├─┐                                                          │
│ │     │ │                                                          │
│ └─┬──┬┘ │                                                          │
│ ↓ │  │→ │                                                          │
└───┘  └──┘                                                          │
```

## Layout Navigation Shortcuts

### Primary Navigation (Left Hand + Right Hand Keys)

| Shortcut | Action | Context | Rationale |
|----------|--------|---------|-----------|
| **Alt+q** | Quick Command Palette | Global | Q = Quick, easy left hand reach |
| **Alt+w** | Window/Viewport Switcher | Global | W = Window, adjacent to Q |
| **Alt+r** | Ribbon Menu Toggle/Focus | Global | R = Ribbon, home row adjacent |
| **Alt+t** | Tab Navigation (Next) | Global | T = Tab, natural progression from R |
| **Alt+Shift+t** | Tab Navigation (Previous) | Global | Reverse of Alt+t |
| **Alt+p** | Panel Switcher | Global | P = Panel, right hand home area |
| **Alt+o** | Open Menu/Context Menu | Global | O = Open, next to P |
| **Alt+s** | Section Navigator | Global | S = Section, left hand home row |
| **Alt+a** | Select All/Show All | Global | A = All, leftmost home row |
| **Alt+f** | Focus Search/Filter | Global | F = Find/Focus, left hand home row |
| **Alt+h** | Toggle Hidden Elements | Global | H = Hidden, right hand home row |
| **Alt+[** | Previous Ribbon Tab | Ribbon | Left bracket for left navigation |
| **Alt+]** | Next Ribbon Tab | Ribbon | Right bracket for right navigation |

### Secondary Navigation (Ctrl + Key)

| Shortcut | Action | Context | Rationale |
|----------|--------|---------|-----------|
| **Ctrl+Tab** | Next Tab in Active Group | Global | Standard tab switching |
| **Ctrl+Shift+Tab** | Previous Tab in Active Group | Global | Standard reverse tab switching |
| **Ctrl+w** | Close Active Tab/Panel | Global | Standard close shortcut |
| **Ctrl+Shift+w** | Close All Tabs in Group | Global | Enhanced close all |
| **Ctrl+1 to Ctrl+9** | Jump to Tab 1-9 | Global | Direct tab access |
| **Ctrl+0** | Jump to Last Tab | Global | Completing the sequence |

### Viewport/Panel Navigation (Alt  + Arrow Keys)

| Shortcut | Action | Context | Rationale |
|----------|--------|---------|-----------|
| **Alt+↑** | Focus Previous Panel/Viewport | Global | Natural directional movement |
| **Alt+↓** | Focus Next Panel/Viewport | Global | Natural directional movement |
| **Alt+←** | Previous Section/Group | Global | Left = Previous |
| **Alt+→** | Next Section/Group | Global | Right = Next |
| **Ctrl+Alt+↑** | Move Panel Up | Global | Modifier for rearranging |
| **Ctrl+Alt+↓** | Move Panel Down | Global | Modifier for rearranging |
| **Ctrl+Alt+←** | Move Panel Left | Global | Modifier for rearranging |
| **Ctrl+Alt+→** | Move Panel Right | Global | Modifier for rearranging |

### Sidebar Navigation (Alt + Sidebar Keys)

| Shortcut | Action | Context | Rationale |
|----------|--------|---------|-----------|
| **Ctrl+b** | Toggle Left Sidebar | Global | B = Bar/sidebar, easy left reach |
| **Ctrl+Shift+b** | Toggle Right Sidebar | Global | Shift for right side |
| **Alt+b** | Focus Sidebar | Global | Focus without toggling |
| **Escape** | Return to Main Content | Sidebar | Universal escape |

### Panel/Section Specific (Contextual)

| Shortcut | Action | Context | Rationale |
|----------|--------|---------|-----------|
| **Alt+n** | New Item in Context | Context-specific | N = New |
| **Alt+e** | Edit Current Item | Context-specific | E = Edit |
| **Alt+d** | Delete/Remove Current Item | Context-specific | D = Delete |
| **Alt+i** | Show Info/Properties | Context-specific | I = Info |
| **Alt+m** | More Actions Menu | Context-specific | M = More/Menu |

### Ribbon Menu Specific

| Shortcut | Action | Context | Rationale |
|----------|--------|---------|-----------|
| **Alt** | Show Key Tips (like Office) | Ribbon | Standard ribbon behavior |
| **Alt+Home** | Go to Home Tab | Ribbon | Home = first tab |
| **Alt+End** | Go to Last Tab | Ribbon | End = last tab |
| **Ctrl+F1** | Collapse/Expand Ribbon | Ribbon | Standard ribbon shortcut |

## Hand Position Considerations

### Left Hand (Modifiers + Navigation)
```
Resting Position: Caps/Ctrl - A S D F

Primary modifiers:
- Pinky: Ctrl (or Caps Lock remapped to Ctrl)
- Ring: Shift
- Thumb: Alt (if keyboard has Alt next to Space)

Easily reached keys: Q W E R T A S D F Z X C V
```

### Right Hand (Actions + Selection)
```
Resting Position: J K L ;

Easily reached keys: Y U I O P [ ] H J K L M
Arrow keys: For directional navigation
```

## Conflict Avoidance

The following standard shortcuts are **preserved** and **not overridden**:

- **Ctrl+C**: Copy
- **Ctrl+V**: Paste
- **Ctrl+X**: Cut
- **Ctrl+S**: Save
- **Ctrl+Z**: Undo
- **Ctrl+Y**: Redo
- **Ctrl+A**: Select All (in text contexts)
- **Ctrl+F**: Find (in text contexts)
- **Ctrl+P**: Print
- **Ctrl+N**: New (context-specific, not global navigation)

## Usage in Code

Example of registering these shortcuts in the Layout module:

```typescript
const LayoutModule: IModule = {
  name: 'Layout',
  version: '1.0.0',
  depends_on: ['Store', 'KeyboardShortcuts'],
  shortcuts: [
    // Ribbon navigation
    {
      id: 'layout.ribbon.toggle',
      key: 'Alt+r',
      contextId: 'Global',
      action: '[Layout:Command] ToggleRibbon',
      description: 'Toggle ribbon menu visibility'
    },
    {
      id: 'layout.ribbon.next-tab',
      key: 'Alt+]',
      contextId: 'Ribbon',
      action: '[Layout:Command] NextRibbonTab',
      description: 'Navigate to next ribbon tab'
    },
    {
      id: 'layout.ribbon.prev-tab',
      key: 'Alt+[',
      contextId: 'Ribbon',
      action: '[Layout:Command] PrevRibbonTab',
      description: 'Navigate to previous ribbon tab'
    },
    // Viewport navigation
    {
      id: 'layout.viewport.next',
      key: 'Alt+↓',
      contextId: 'Global',
      action: '[Layout:Command] FocusNextViewport',
      description: 'Focus next viewport/panel'
    },
    {
      id: 'layout.viewport.prev',
      key: 'Alt+↑',
      contextId: 'Global',
      action: '[Layout:Command] FocusPrevViewport',
      description: 'Focus previous viewport/panel'
    },
    // Sidebar
    {
      id: 'layout.sidebar.toggle-left',
      key: 'Ctrl+b',
      contextId: 'Global',
      action: '[Layout:Command] ToggleLeftSidebar',
      description: 'Toggle left sidebar'
    },
    // Tab management
    {
      id: 'layout.tabs.next',
      key: 'Alt+t',
      contextId: 'Global',
      action: '[Layout:Command] NextTab',
      description: 'Switch to next tab'
    },
    {
      id: 'layout.tabs.prev',
      key: 'Alt+Shift+t',
      contextId: 'Global',
      action: '[Layout:Command] PrevTab',
      description: 'Switch to previous tab'
    },
  ]
};
```

## Testing Ergonomics

When implementing these shortcuts, test with users to ensure:

1. **Comfortable reach**: Keys should not require stretching or awkward hand positions
2. **No fatigue**: Frequent shortcuts should use strong fingers (index, middle)
3. **Memorability**: Shortcuts should be logical and easy to remember
4. **Discoverability**: Use keyboard hints/tooltips to teach shortcuts
5. **Customization**: Allow users to remap shortcuts for their preferences
