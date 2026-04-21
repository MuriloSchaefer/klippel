# KeyboardShortcuts Skills

This folder contains LLM skills that teach how to use the KeyboardShortcuts module.

## Available Skills

### SKILL.md

Comprehensive skill guide for adding keyboard shortcuts to React components in the Klippel application.

**Topics Covered**:
- Overview and when to use this skill
- Prerequisites and core concepts
- Quick start guide
- 6 implementation patterns with code
- Naming conventions (IDs, keys, contexts)
- Best practices
- Troubleshooting
- Advanced topics
- Testing checklist
- Reference resources

**Use This Skill When**:
- Adding keyboard shortcuts to a new component
- Integrating existing components with keyboard support
- Creating toolbar buttons or menu items with shortcuts
- Building context-specific shortcuts
- Displaying visual hints for keyboard shortcuts

**Key Patterns Included**:

1. **Simple Button with Visual Hint** — Simplest approach for simple components
2. **Context-Scoped Shortcuts** — Shortcuts that only work in specific contexts
3. **Conditional/Dynamic Shortcuts** — Shortcuts enabled/disabled based on state
4. **Multiple Shortcuts** — Managing many related shortcuts together
5. **Shortcuts with Payloads** — Shortcuts that trigger actions with parameters
6. **Manual Hint Rendering** — Rendering hints without wrapping components

**Quick Reference**:

```typescript
// Get module
const keyboardShortcuts = useModule<KeyboardShortcuts>("KeyboardShortcuts");
const keyboardManager = keyboardShortcuts.managers.useKeyboardShortcutsManager();

// Register shortcut
useEffect(() => {
  keyboardManager.functions.registerShortcuts([{
    id: 'myModule.save',
    key: 'Ctrl+s',
    description: 'Save',
    contextId: 'Global',
    action: () => handleSave(),
    enabled: true,
  }]);
  
  return () => {
    keyboardManager.functions.unregisterShortcuts(['myModule.save']);
  };
}, []);

// Display hint
const { ShortcutHint } = keyboardShortcuts.components;
return (
  <ShortcutHint shortcutId="myModule.save" placement="bottom-right">
    <Button onClick={handleSave}>Save</Button>
  </ShortcutHint>
);
```

## Related Resources

- **Examples**: `../examples/` — Practical, ready-to-use code examples
- **Module Documentation**: `../README.md` — Module overview
- **Design Document**: `../DESIGN.md` — Architecture and design details
- **Architecture**: `../architecture.md` — System diagrams and flow

## How to Use This Skill

### For AI Coding Agents

Reference this skill when:
```
User: "Add a keyboard shortcut to save the document"
Agent: [Reads SKILL.md] → Implements shortcut using best practices
```

### For Developers

1. Read **SKILL.md** for comprehensive understanding
2. Review **../examples/** for your use case
3. Copy example code and adapt to your needs
4. Follow best practices from SKILL.md
5. Troubleshoot using troubleshooting section

## Skill Contents

### SKILL.md Sections

1. **Overview** — Purpose and when to use
2. **Prerequisites** — Required knowledge and setup
3. **Core Concepts** — Architecture overview
4. **Quick Start** — 3-step minimal example
5. **Implementation Patterns** — 6 different approaches
6. **Naming Conventions** — ID, key, and context formats
7. **Best Practices** — Do's and don'ts
8. **Troubleshooting** — Debugging common issues
9. **Advanced Topics** — Complex scenarios
10. **Testing Checklist** — Verification steps
11. **Reference Resources** — Related documentation

### Code Examples Included

The skill includes inline code examples for:
- Simple button shortcut
- Context-scoped shortcuts
- Conditional shortcuts
- Multiple shortcuts in one component
- Dynamic shortcuts from data
- Manual hint rendering

More complete examples are in `../examples/` folder.

## Quick Navigation

### By Use Case

- **"I need a shortcut for a button"** → Read: Quick Start, Pattern 1
- **"I have multiple shortcuts"** → Read: Pattern 4
- **"Shortcut should only work in an editor"** → Read: Pattern 2
- **"I'm generating shortcuts from data"** → Read: Pattern 5
- **"Wrapping component breaks layout"** → Read: Pattern 6

### By Experience Level

- **Beginner** → Quick Start + Pattern 1
- **Intermediate** → Patterns 2-4 + Best Practices
- **Advanced** → Patterns 5-6 + Advanced Topics
- **Debugging** → Troubleshooting section

### By Topic

- **Naming** → Naming Conventions section
- **Best Practices** → Best Practices section
- **Testing** → Testing Checklist section
- **Architecture** → Core Concepts section
- **Keyboard Keys** → Key Combination Format (in Naming Conventions)

## Integration with Copilot

This skill is discoverable by Copilot when:
1. Located in `docs/skills/` directory
2. Named `SKILL.md`
3. Follows Copilot skill format (headers, structure)

Copilot can reference this skill to:
- Provide accurate implementation guidance
- Ensure consistent coding patterns
- Avoid common mistakes
- Follow project conventions
- Generate proper cleanup code

## Key Takeaways

1. **Always cleanup**: useEffect must return cleanup function
2. **Use descriptive IDs**: `module.feature.action` format
3. **Manage contexts**: Scope shortcuts to avoid conflicts
4. **Test thoroughly**: Use Redux DevTools to verify
5. **Follow patterns**: Use provided patterns as templates

---

**Last Updated**: April 2026  
**Module**: KeyboardShortcuts  
**Status**: Complete with examples
