/**
 * KeyboardShortcutsTrayIcon - SystemTray icon for toggling keyboard hint visibility
 */

import React, { useCallback } from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import KeyboardHideIcon from '@mui/icons-material/KeyboardHide';

import useModule from '@kernel/hooks/useModule';
import { Store } from '@kernel/modules/Store';
import { toggleShowHints } from '../store/actions';
import { selectShowHints } from '../store/selectors';

const KeyboardShortcutsTrayIcon: React.FC = () => {
  const storeModule = useModule<Store>('Store');
  const { useAppSelector, useAppDispatch } = storeModule.hooks;
  
  const showHints = useAppSelector(selectShowHints);
  const dispatch = useAppDispatch();
  
  const handleToggle = useCallback(() => {
    dispatch(toggleShowHints());
  }, [dispatch]);
  
  return (
    <Tooltip 
      title={showHints ? 'Hide keyboard shortcuts' : 'Show keyboard shortcuts'}
      arrow
    >
      <IconButton
        color={showHints ? 'primary' : 'default'}
        aria-label="toggle keyboard shortcuts visibility"
        onClick={handleToggle}
        size="small"
      >
        {showHints ? (
          <KeyboardIcon fontSize="small" />
        ) : (
          <KeyboardHideIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default React.memo(KeyboardShortcutsTrayIcon);
