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
}

export const Accordion = ({
  name,
  icon,
  summary,
  expanded,
  state,
  children,
  shortcutHint,
  sx,
  ...otherProps
}: AccordionProps) => {
  const biggerThan1024 = useMediaQuery("(min-width:1024px)");

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
      slotProps={{ heading: { component: 'div' } }}
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
