import { Box, Tooltip, colors } from "@mui/material";
import { Icon } from "@mdi/react";
import {
  mdiCalendar,
  mdiCalendarClock,
  mdiChevronDown,
  mdiChevronUp,
} from "@mdi/js";
import type { Label } from "../types";
import LabelIcon from "./ui/LabelIcon";
import { getLabelColorSwatch } from "../utils/labelColors";

const FILTER_CLEAR_BUTTON_SX = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  overflow: "visible",
  background: "transparent",
  border: "none",
  p: 0,
  cursor: "pointer",
  color: "rgba(255,255,255,0.82)",
  "&::after": {
    content: '""',
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "120%",
    height: 1.5,
    backgroundColor: "currentColor",
    transform: "translate(-50%, -50%) rotate(-45deg)",
    borderRadius: 999,
    pointerEvents: "none",
    display: "block",
    zIndex: 0,
  },
  "&:hover": {
    color: "rgba(255,255,255,1)",
  },
  "& svg, & .MuiAvatar-root": {
    position: "relative",
    zIndex: 1,
    color: "inherit",
  },
};

type NoteListAccordionHeaderProps = {
  label: string;
  count: number;
  isExpanded: boolean;
  tooltip: string;
  onToggle: () => void;
  selectedLabel?: Label;
  onClearLabelFilter?: () => void;
  hasStartOrEndDateFilter?: boolean;
  activeDateRangeLabel?: string | null;
  onClearDateRangeFilter?: () => void;
  hasDueDateFilter?: boolean;
  activeDueDateLabel?: string | null;
  onClearDueDateFilter?: () => void;
};

const NoteListAccordionHeader = ({
  label,
  count,
  isExpanded,
  tooltip,
  onToggle,
  selectedLabel,
  onClearLabelFilter,
  hasStartOrEndDateFilter = false,
  activeDateRangeLabel = null,
  onClearDateRangeFilter,
  hasDueDateFilter = false,
  activeDueDateLabel = null,
  onClearDueDateFilter,
}: NoteListAccordionHeaderProps) => (
  <Box
    sx={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      px: 1.5,
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 0,
      backgroundColor: "rgba(255,255,255,0.03)",
    }}
  >
    <Tooltip title={tooltip} arrow>
      <Box
        component="button"
        type="button"
        onClick={onToggle}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          background: "transparent",
          border: "none",
          color: "inherit",
          cursor: "pointer",
          fontSize: "0.82rem",
          fontWeight: 700,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          p: 0,
        }}
      >
        <Icon path={isExpanded ? mdiChevronUp : mdiChevronDown} size={0.7} />
        {label} ({count})
      </Box>
    </Tooltip>
    {(selectedLabel || hasStartOrEndDateFilter || hasDueDateFilter) && (
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.75,
        }}
      >
        {selectedLabel && (
          <Tooltip title={`Remove label filter: ${selectedLabel.name}`} arrow>
            <Box
              component="button"
              type="button"
              onClick={onClearLabelFilter}
              sx={{
                ...FILTER_CLEAR_BUTTON_SX,
                color: getLabelColorSwatch(selectedLabel.color).background,
              }}
            >
              <LabelIcon
                icon={selectedLabel.icon}
                color={selectedLabel.color}
                size={0.65}
              />
            </Box>
          </Tooltip>
        )}
        {hasStartOrEndDateFilter && (
          <Tooltip
            title={
              activeDateRangeLabel
                ? `Remove date range filter: ${activeDateRangeLabel}`
                : "Remove date range filter"
            }
            arrow
          >
            <Box
              component="button"
              type="button"
              onClick={onClearDateRangeFilter}
              sx={{
                ...FILTER_CLEAR_BUTTON_SX,
                color: colors.blue[200],
              }}
            >
              <Icon path={mdiCalendar} size={0.7} />
            </Box>
          </Tooltip>
        )}
        {hasDueDateFilter && (
          <Tooltip
            title={
              activeDueDateLabel
                ? `Remove due date filter: ${activeDueDateLabel}`
                : "Remode due date filter"
            }
            arrow
          >
            <Box
              component="button"
              type="button"
              onClick={onClearDueDateFilter}
              sx={{
                ...FILTER_CLEAR_BUTTON_SX,
                color: colors.orange[400],
              }}
            >
              <Icon path={mdiCalendarClock} size={0.7} />
            </Box>
          </Tooltip>
        )}
      </Box>
    )}
  </Box>
);

export default NoteListAccordionHeader;
