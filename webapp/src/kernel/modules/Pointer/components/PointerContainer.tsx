import React, {
  MouseEvent,
  cloneElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ErrorBoundary } from "react-error-boundary";

import type { IconButtonProps } from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Modal from "@mui/material/Modal";
import Paper from "@mui/material/Paper";
import CloseSharpIcon from "@mui/icons-material/CloseSharp";
import DragIndicatorSharpIcon from "@mui/icons-material/DragIndicatorSharp";

import useDraggable from "../hooks/useDraggable";
import { fallbackRender } from "@kernel/App";
import useModule from "@kernel/hooks/useModule";
import type { Store } from "@kernel/modules/Store";
import { pushContext, popContext } from "@kernel/modules/KeyboardShortcuts/store/actions";
import ShortcutHint from "@kernel/modules/KeyboardShortcuts/components/ShortcutHint";
import { pushContainer, popContainer, focusContainer } from "../store/actions";
import { getContainerHandlerMap } from "../pointerContainerRegistry";
import { POINTER_CONTAINER_CONTEXT_ID } from "../constants";
import type { PointerState } from "../store/state";

export interface PointerContainerActionProps extends IconButtonProps {
  closeContainer?: (e: MouseEvent) => void;
}

export interface PointerContainerProps {}

let instanceCounter = 0;

const ModalContent = ({
  component,
  position,
  actions,
  handleClose,
  onInteract,
  isFocused,
}: {
  handleClose: (e: MouseEvent) => void;
  onInteract: () => void;
  component: React.ReactElement<PointerContainerProps>;
  position: {
    x: number;
    y: number;
  };
  actions: React.ReactElement<PointerContainerActionProps>[];
  isFocused: boolean;
}) => {
  const { innerWidth: width, innerHeight: height } = window;
  const windowCenter = [width / 2, height / 2];

  const getQuadrant = (x: number, y: number) => {
    const deltaX = x - windowCenter[0];
    const deltaY = y - windowCenter[1];

    if (deltaX < 0) {
      return deltaY < 0 ? 1 : 3;
    } else {
      return deltaY < 0 ? 2 : 4;
    }
  };

  const quadrant = useMemo(
    () => getQuadrant(position.x, position.y),
    []
  );

  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const selector = [
      "input:not([type='hidden']):not([disabled])",
      "textarea:not([disabled])",
      "select:not([disabled])",
      "[contenteditable='true']",
    ].join(",");
    const first = root.querySelector<HTMLElement>(selector);
    first?.focus();
  }, []);

  return (
    <Paper
      sx={{
        position: "fixed",
        margin: 1,
        left: position.x,
        top: position.y,
        transform: `translate(${quadrant % 2 === 0 ? "-100%" : "0"}, ${
          quadrant > 2 ? "-100%" : "0"
        })`,
        transition: "width 1s ease-in-out, border-color 120ms ease-in-out, box-shadow 120ms ease-in-out",
        transformOrigin: "bottom right",
        border: "2px solid",
        borderColor: isFocused ? "primary.main" : "transparent",
      }}
      elevation={isFocused ? 12 : 6}
      onMouseDown={onInteract}
    >
      <Box
        sx={{
          display: "flex",
          flexGrow: 1,
          flexDirection: quadrant % 2 == 1 ? "row" : "row-reverse",
        }}
        onClick={(evt) => evt.stopPropagation()}
      >
        <Box
          role="pointer-panel-actions"
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-evenly",
            alignContent: "space-between",
            borderLeft: `1px solid rgba(0,0,0, ${quadrant % 2 == 1 ? 0 : 0.1})`,
            borderRight: `1px solid rgba(0,0,0, ${
              quadrant % 2 == 1 ? 0.1 : 0
            })`,
          }}
        >
          <IconButton sx={{ cursor: "grab" }} size="small" id="drag-panel">
            <DragIndicatorSharpIcon />
          </IconButton>

          {actions.map((a, index) => {
            const cloned = cloneElement(a, {
              size: "small",
              closeContainer: handleClose,
            });
            return index === 0 ? (
              <ShortcutHint
                key={index}
                shortcutId="pointer.container.confirmAndClose"
                placement="top-right"
              >
                {cloned}
              </ShortcutHint>
            ) : (
              cloned
            );
          })}

          <ShortcutHint
            shortcutId="pointer.container.close"
            placement="bottom-right"
          >
            <IconButton
              color="error"
              key="reject"
              onClick={handleClose}
              size="small"
              id="close-panel"
            >
              <CloseSharpIcon />
            </IconButton>
          </ShortcutHint>
        </Box>
        <Box
          ref={contentRef}
          role="pointer-panel-content"
          sx={{
            padding: 1,
            display: "flex",
            justifyContent: "center",
            alignContent: "center",
          }}
        >
          <ErrorBoundary fallbackRender={fallbackRender}>
            {component}
          </ErrorBoundary>
        </Box>
      </Box>
    </Paper>
  );
};

export const PointerContainer = ({
  children,
  onClose,
  onConfirm,
  actions,
  skipRefocus = false,
  ...props
}: {
  children: React.ReactElement;
  component: React.ReactElement<PointerContainerProps>;
  actions: React.ReactElement<PointerContainerActionProps>[];
  onClose?: (event: MouseEvent) => void;
  onConfirm?: () => void;
  skipRefocus?: boolean;
}) => {
  const [open, setOpen] = useState(false);

  const storeModule = useModule<Store>('Store');
  const dispatch = storeModule.hooks.useAppDispatch();
  const focusStack = storeModule.hooks.useAppSelector(
    (state: any) => (state.Pointer as PointerState | undefined)?.containerFocusStack ?? []
  );
  const focusStackRef = useRef(focusStack);
  focusStackRef.current = focusStack;

  const instanceId = useRef(`pointer-container-${instanceCounter++}`);
  const isFocused =
    focusStack.length > 0 &&
    focusStack[focusStack.length - 1] === instanceId.current;
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const { innerWidth: width, innerHeight: height } = window;
  const windowCenter = [width / 2, height / 2];

  const { position, setPosition, listeners } = useDraggable({
    initialPosition: { x: windowCenter[0], y: windowCenter[1] },
  });

  const doClose = useCallback(() => {
    const stack = focusStackRef.current;
    const isLast = stack.length === 1 && stack[0] === instanceId.current;
    setOpen(false);
    getContainerHandlerMap().delete(instanceId.current);
    dispatch(popContainer(instanceId.current));
    if (isLast) dispatch(popContext());
    const toRestore = previousFocusRef.current;
    previousFocusRef.current = null;
    if (!skipRefocus && toRestore && document.contains(toRestore)) {
      // Defer until after the modal has unmounted so focus isn't pulled back
      // into MUI's lingering focus traps.
      setTimeout(() => toRestore.focus(), 0);
    }
  }, [dispatch, skipRefocus]);

  const handleClose = useCallback((e: MouseEvent) => {
    doClose();
    e?.stopPropagation?.();
    onClose?.(e);
  }, [doClose, onClose]);

  const handleOpen = useCallback((e: MouseEvent) => {
    const isFirst = focusStackRef.current.length === 0;
    const target = e.currentTarget as HTMLElement | null;
    const active = document.activeElement as HTMLElement | null;
    previousFocusRef.current =
      active && active !== document.body ? active : target;
    const isKeyboardClick =
      e.detail === 0 || (e.clientX === 0 && e.clientY === 0);
    if (isKeyboardClick && target) {
      const rect = target.getBoundingClientRect();
      setPosition({ x: rect.right, y: rect.bottom });
    } else {
      setPosition({ x: e.clientX, y: e.clientY });
    }
    setOpen(true);
    getContainerHandlerMap().set(instanceId.current, {
      close: doClose,
      confirm: (): boolean => {
        const firstAction = actionsRef.current?.[0];
        if (firstAction?.props?.disabled) return false;
        const firstActionHandler = (firstAction?.props as { handleConfirm?: () => void } | undefined)?.handleConfirm;
        firstActionHandler?.();
        onConfirmRef.current?.();
        return true;
      },
    });
    dispatch(pushContainer(instanceId.current));
    if (isFirst) dispatch(pushContext(POINTER_CONTAINER_CONTEXT_ID));
    e.stopPropagation();
  }, [doClose, dispatch, setPosition]);

  const handleInteract = useCallback(() => {
    dispatch(focusContainer(instanceId.current));
  }, [dispatch]);

  return (
    <>
      <Modal
        open={open}
        keepMounted={true}
        onClose={(_event: object, reason: string) => {
          // Esc is handled by the keyboard shortcut (with input-blur
          // precedence). Ignore MUI's auto-close on escape so the shortcut is
          // the single source of truth.
          if (reason === 'escapeKeyDown') return;
          handleClose(_event as MouseEvent);
        }}
        disableEnforceFocus
        role="pointer-panel"
        sx={{
          width: "min-content",
          touchAction: "none",
        }}
        slotProps={{ backdrop: {} }}
        slots={{
          backdrop: () => null,
        }}
        {...listeners}
      >
        {open ? (
          <ModalContent
            position={position}
            handleClose={handleClose}
            onInteract={handleInteract}
            actions={actions}
            isFocused={isFocused}
            {...props}
          />
        ) : (
          <Box></Box>
        )}
      </Modal>
      {cloneElement(children, { onClick: handleOpen } as any)}
    </>
  );
};

export default PointerContainer;
