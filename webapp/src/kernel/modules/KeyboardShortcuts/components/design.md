# Components Design

This folder contains presentational React components for the KeyboardShortcuts module.

## Overview

Components are pure UI elements that:
- Display keyboard shortcut information
- Provide visual feedback for shortcuts
- Manage shortcut context scopes
- Integrate shortcut registration with UI elements

## Files

- `KeyboardListener.tsx` - Global keyboard event listener
- `ShortcutButton.tsx` - Button component with integrated shortcut
- `ShortcutProvider.tsx` - Context provider for shortcut scopes
- `ShortcutOverlay.tsx` - Visual overlay showing active shortcuts

## KeyboardListener Component

The global listener dispatches Redux actions when keys are pressed:

```typescript
// KeyboardListener.tsx
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { keyPressed } from '../store/actions';
import { formatKeyEvent } from '../utils/formatKeyEvent';

/**
 * Global keyboard event listener component
 * Should be mounted once at the app root level
 */
export const KeyboardListener: React.FC = () => {
  const dispatch = useDispatch();
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }
      
      // Normalize key event to string format
      const key = formatKeyEvent(event);
      
      // Dispatch keyPressed command action
      // Middleware will handle the rest
      dispatch(keyPressed({
        key,
        originalEvent: event,
        timestamp: Date.now()
      }));
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dispatch]);
  
  // This component renders nothing
  return null;
};
```

**Integration in App:**

```typescript
// In kernel/App.tsx
import { KeyboardListener } from './modules/KeyboardShortcuts/components/KeyboardListener';

const App = (): React.ReactElement => {
  return (
    <ErrorBoundary fallbackRender={fallbackRender}>
      <DynamicStore>
        <ModulesProvider>
          <KeyboardListener />  {/* Add global listener */}
          <Layout />
        </ModulesProvider>
      </DynamicStore>
    </ErrorBoundary>
  );
};
```

## ShortcutButton Component

Automatically wraps buttons with shortcut registration and visual indicators:

```typescript
interface ShortcutButtonProps extends ButtonProps {
  shortcutKey?: string;              // The keyboard shortcut
  shortcutLabel?: string;            // Override label for display
  shortcutContext?: string;          // Override context (defaults to current)
  shortcutPriority?: number;         // Override priority
  actionType: string;                // Redux action type to dispatch
  actionPayload?: any;               // Optional payload for the action
  showShortcut?: boolean;            // Show key hint on button (default: true)
}

// Usage example:
<ShortcutButton
  shortcutKey="q"
  actionType="composer/addKeyframe"
  showShortcut={true}
>
  Add Keyframe
</ShortcutButton>
```

**Implementation:**

```typescript
import React from 'react';
import { Button, ButtonProps, Box } from '@mui/material';
import { useDispatch } from 'react-redux';
import { useShortcut } from '../hooks/useShortcut';
import { useShortcutContext } from '../hooks/useShortcutContext';

export const ShortcutButton: React.FC<ShortcutButtonProps> = ({
  shortcutKey,
  shortcutLabel,
  shortcutContext,
  shortcutPriority,
  actionType,
  actionPayload,
  showShortcut = true,
  children,
  onClick,
  ...buttonProps
}) => {
  const dispatch = useDispatch();
  const currentContext = useShortcutContext();
  const context = shortcutContext || currentContext;
  
  const handleAction = React.useCallback(() => {
    // Dispatch the Redux action
    dispatch({
      type: actionType,
      payload: actionPayload,
      meta: { triggeredBy: 'user-click' }
    });
  }, [dispatch, actionType, actionPayload]);
  
  // Register the shortcut
  useShortcut({
    key: shortcutKey,
    actionType,
    actionPayload,
    label: shortcutLabel || (typeof children === 'string' ? children : ''),
    context,
    priority: shortcutPriority,
    enabled: !buttonProps.disabled
  }, [actionType, actionPayload, buttonProps.disabled]);
  
  const handleClick = (e: React.MouseEvent) => {
    handleAction();
    onClick?.(e);
  };
  
  return (
    <Button
      {...buttonProps}
      onClick={handleClick}
      sx={{
        position: 'relative',
        ...buttonProps.sx
      }}
    >
      {children}
      {showShortcut && shortcutKey && (
        <Box
          component="span"
          sx={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            fontSize: '0.7rem',
            opacity: 0.7,
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: 'white',
            padding: '1px 4px',
            borderRadius: '3px',
            fontFamily: 'monospace'
          }}
        >
          {shortcutKey.toUpperCase()}
        </Box>
      )}
    </Button>
  );
};
```

## ShortcutProvider Component

Defines a shortcut context scope for child components:

```typescript
import React from 'react';
import { ShortcutContext } from '../contexts';

interface ShortcutProviderProps {
  context: string;          // Context name
  children: React.ReactNode;
  enabled?: boolean;        // Whether this context is active (default: true)
}

export const ShortcutProvider: React.FC<ShortcutProviderProps> = ({
  context,
  children,
  enabled = true
}) => {
  const dispatch = useDispatch();
  const parentContext = React.useContext(ShortcutContext);
  
  const fullContext = parentContext 
    ? `${parentContext}.${context}`
    : context;
  
  React.useEffect(() => {
    if (enabled) {
      // Dispatch pushContext action
      dispatch(pushContext(fullContext));
      
      return () => {
        // Dispatch popContext action on unmount
        dispatch(popContext(fullContext));
      };
    }
  }, [fullContext, enabled, dispatch]);
  
  return (
    <ShortcutContext.Provider value={fullContext}>
      {children}
    </ShortcutContext.Provider>
  );
};
```

**Usage:**

```typescript
// In a component
<ShortcutProvider context="Composer.Viewport">
  <ViewportComponent>
    <ShortcutProvider context="Timeline">
      <TimelineComponent>
        <ShortcutButton 
          shortcutKey="q" 
          actionType="timeline:add-keyframe"
        >
          Add Keyframe
        </ShortcutButton>
      </TimelineComponent>
    </ShortcutProvider>
  </ViewportComponent>
</ShortcutProvider>
```

## ShortcutOverlay Component

Displays active shortcuts as an overlay (like AoE4's command panel):

```typescript
export const ShortcutOverlay: React.FC<{
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  visible?: boolean;
}> = ({ position = 'bottom-right', visible = true }) => {
  const activeShortcuts = useActiveShortcuts();
  const currentContext = useShortcutContext();
  
  if (!visible || activeShortcuts.length === 0) return null;
  
  // Group by category
  const grouped = groupBy(activeShortcuts, s => s.metadata?.category || 'General');
  
  return (
    <Paper
      sx={{
        position: 'fixed',
        [position.split('-')[0]]: 20,
        [position.split('-')[1]]: 20,
        padding: 2,
        maxWidth: 300,
        zIndex: 1000
      }}
    >
      <Typography variant="h6" gutterBottom>
        Active Shortcuts
      </Typography>
      {Object.entries(grouped).map(([category, shortcuts]) => (
        <Box key={category} mb={2}>
          <Typography variant="subtitle2" color="textSecondary">
            {category}
          </Typography>
          <Stack spacing={0.5}>
            {shortcuts.map(shortcut => (
              <Box
                key={shortcut.key}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="body2">{shortcut.label}</Typography>
                <Kbd>{shortcut.key}</Kbd>
              </Box>
            ))}
          </Stack>
        </Box>
      ))}
    </Paper>
  );
};
```

## Best Practices

### Component Design

1. **Keep components presentational** - No business logic, only UI and event handling
2. **Use hooks for logic** - Call `useShortcut`, `useShortcutContext`, etc. for coordination
3. **Don't pass hooks as props** - Call hooks directly inside the component
4. **Minimize component state** - Derive values from props, selectors, or module hooks
5. **Prefer useMemo** - For derived/computed values instead of useState + useEffect

### Shortcut Integration

1. **Use ShortcutButton** - For actions that have both UI button and keyboard trigger
2. **Use ShortcutProvider** - To establish context scopes (e.g., Viewport, Timeline)
3. **Use useShortcut hook** - For shortcuts without associated UI elements
4. **Always specify actionType** - Use the action creator's `.type` property

### Visual Feedback

1. **Show key hints** - Use `showShortcut={true}` on ShortcutButton
2. **Display overlay** - Use ShortcutOverlay in complex UIs for discoverability
3. **Context-aware display** - Only show relevant shortcuts for the current context
