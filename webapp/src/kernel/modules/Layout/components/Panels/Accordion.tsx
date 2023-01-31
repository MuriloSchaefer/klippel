import {
  Accordion as MUIAccordion,
  AccordionDetails,
  AccordionProps as MUIAccordionProps,
  AccordionSummary,
  Box,
  SvgIconTypeMap,
  Typography,
} from "@mui/material";
import ExpandMoreSharp from "@mui/icons-material/ExpandMoreSharp";
import { OverridableComponent } from "@mui/material/OverridableComponent";
import SettingsInputCompositeSharp from "@mui/icons-material/SettingsInputCompositeSharp";

interface AccordionProps extends MUIAccordionProps {
  name: string;
  icon?: React.ReactNode;
  summary?: string;
  expanded?: boolean;
}

export const Accordion = ({
  name,
  icon,
  summary,
  expanded,
  children,
  sx,
  ...otherProps
}: AccordionProps) => {
  return (
    <MUIAccordion
      expanded={expanded ?? false}
      role={`accordion-${name}`}
      aria-label={`accordion ${name}`}
      sx={{width: 'max-content', minWidth: '100%', ...sx}}
      {...otherProps}
    >
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
          <Typography sx={{ width: "33%", flexShrink: 0 }}>{name}</Typography>
          {summary && (
            <Typography sx={{ color: "text.secondary" }}>{summary}</Typography>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Typography>{children}</Typography>
      </AccordionDetails>
    </MUIAccordion>
  );
};
