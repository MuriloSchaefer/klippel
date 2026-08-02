import { useState } from "react";
import type { AccordionProps as MUIAccordionProps } from "@mui/material/Accordion";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import SvgIcon from "@mui/material/SvgIcon";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import MUIAccordion from "@mui/material/Accordion";

import ExpandMoreSharp from "@mui/icons-material/ExpandMoreSharp";
import SettingsInputCompositeSharp from "@mui/icons-material/SettingsInputCompositeSharp";
import useMediaQuery from "@mui/material/useMediaQuery";
import { ErrorBoundary } from "react-error-boundary";
import { fallbackRender } from "@kernel/App";
import { ShortcutHint } from "@kernel/modules/KeyboardShortcuts/components";

interface AccordionProps extends MUIAccordionProps {
  name: string;
  icon?: React.ReactNode;
  summary?: string | React.ReactNode;
  shortcutHint?: string;
  state?: "expanded" | "collapsed"; // if the settings panel is collapsed or not
  expanded?: boolean; // state naming conflicts with expanded prop
  /**
   * Called once the accordion finishes expanding, with the content (details)
   * element. Lets each caller move focus to its first row / primary control on
   * open. No-op when omitted. Use `focusFirstRow` for the common list behavior.
   */
  focusOnOpen?: (content: HTMLElement | null) => void;
}

/**
 * Default `focusOnOpen` behavior: focus the first list "row" inside the
 * accordion content. Rows opt in with an explicit `tabindex="0"`. Many lists
 * also render an "add" control (a `<button tabindex="0">`) *before* the rows,
 * so prefer the first non-button tab stop (the real row); fall back to that
 * control — and then any enabled button/input — when the list is empty.
 */
export const focusFirstRow = (content: HTMLElement | null) => {
  if (!content) return;
  const tabStops = Array.from(
    content.querySelectorAll<HTMLElement>('[tabindex="0"]'),
  );
  const firstRow = tabStops.find(
    (el) => el.tagName !== "BUTTON" && !el.closest("button"),
  );
  (
    firstRow ??
    tabStops[0] ??
    content.querySelector<HTMLElement>(
      'button:not([disabled]), input:not([disabled])',
    )
  )?.focus();
};

export const Accordion = ({
  name,
  icon,
  summary,
  expanded,
  state,
  children,
  shortcutHint,
  focusOnOpen,
  sx,
  ...otherProps
}: AccordionProps) => {
  const biggerThan1024 = useMediaQuery("(min-width:1024px)");

  // Mirrors the expand/collapse transition so callers (and e2e drivers) can wait
  // for the settled state instead of the `aria-expanded` flip, which lands ~300ms
  // before the transition — and before `focusOnOpen` runs.
  const [transitionState, setTransitionState] = useState<
    "collapsed" | "entering" | "entered" | "exiting"
  >(otherProps.defaultExpanded ? "entered" : "collapsed");

  // Hand the caller the details content node once the expand transition ends,
  // so it can focus its first row. (onEntered, not onChange: only fires after a
  // user-initiated open, never on a defaultExpanded mount.)
  const handleEntered = (node: HTMLElement) => {
    setTransitionState("entered");
    if (!focusOnOpen) return;
    // The transition runs for ~300ms after the click, during which focus may
    // legitimately have moved elsewhere — e.g. a pointer panel opened from this
    // accordion, whose first input is already being typed into. Claim focus only
    // when it is still on the accordion itself (its summary) or nowhere.
    const active = document.activeElement as HTMLElement | null;
    const root = node.closest(`[role="accordion-${name}"]`);
    if (active && active !== document.body && !root?.contains(active)) return;
    focusOnOpen(
      node.querySelector<HTMLElement>("[data-accordion-content]") ?? node,
    );
  };

  if (state === "collapsed")
    return <SvgIcon>{icon ?? <SettingsInputCompositeSharp />}</SvgIcon>;

  const summaryContainer = (
    <AccordionSummary
      expandIcon={<ExpandMoreSharp />}
      aria-controls={`accordion-${name}-content`}
    >
      <Box
        sx={{
          display: "flex",
          overflow: "hidden",
          gap: 2,
        }}
      >
        {icon ?? <SettingsInputCompositeSharp />}
        <Typography component="div" sx={{ flexShrink: 0 }}>
          {name}
        </Typography>
        {typeof summary == "string" ? (
          <Typography component="div" sx={{ color: "text.secondary" }}>
            {summary}
          </Typography>
        ) : (
          summary
        )}
      </Box>
    </AccordionSummary>
  );
  return (
    <MUIAccordion
      role={`accordion-${name}`}
      aria-label={`accordion ${name}`}
      data-accordion-state={transitionState}
      slotProps={{
        heading: { component: "div" },
        transition: {
          onEnter: () => setTransitionState("entering"),
          onEntered: handleEntered,
          onExit: () => setTransitionState("exiting"),
          onExited: () => setTransitionState("collapsed"),
        },
      }}
      sx={{
        width: "100%",
        overflowX: "auto",
        border: "2px solid transparent",
        borderRadius: 1,
        transition: "border-color 0.15s, box-shadow 0.15s",
        "&:focus-within": {
          borderColor: "primary.main",
          boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.light}`,
        },
        ...sx,
      }}
      {...otherProps}
    >
      {shortcutHint ? (
        <ShortcutHint shortcutId={shortcutHint} placement="bottom-right">
          {summaryContainer}
        </ShortcutHint>
      ) : (
        summaryContainer
      )}
      <AccordionDetails
        data-accordion-content={name}
        tabIndex={-1}
        sx={{ "&:focus": { outline: "none" } }}
      >
        <ErrorBoundary fallbackRender={fallbackRender}>
          {children}
        </ErrorBoundary>
      </AccordionDetails>
    </MUIAccordion>
  );
};
