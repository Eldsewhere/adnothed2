import {
  Badge,
  Box,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  colors,
} from "@mui/material";
import type { MouseEvent } from "react";
import { Icon } from "@mdi/react";
import {
  mdiCalendar,
  mdiCalendarClock,
  mdiCheckboxMultipleMarked,
  mdiChevronDown,
  mdiChevronUp,
  mdiEyeOffOutline,
  mdiEyeOutline,
  mdiFilter,
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
  px: 0,
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
  hasTextFilter?: boolean;
  onClearTextFilter?: () => void;
  selectMode?: boolean;
  selectedCount?: number;
  onToggleSelectMode?: () => void;
  selectDisabled?: boolean;
  onOpenDateFilter?: (event: MouseEvent<HTMLElement>) => void;
  hasDateFilter?: boolean;
  dateFilterDisabled?: boolean;
  interactionDisabled?: boolean;
  revealAllSpoilers?: boolean;
  onToggleRevealAllSpoilers?: () => void;
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
  hasTextFilter = false,
  onClearTextFilter,
  selectMode = false,
  selectedCount = 0,
  onToggleSelectMode,
  selectDisabled = false,
  onOpenDateFilter,
  hasDateFilter = false,
  dateFilterDisabled = false,
  interactionDisabled = false,
  revealAllSpoilers = false,
  onToggleRevealAllSpoilers,
}: NoteListAccordionHeaderProps) => {
  const hasFilterButtons = Boolean(
    selectedLabel ||
    hasStartOrEndDateFilter ||
    hasDueDateFilter ||
    hasTextFilter,
  );

  return (
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
            opacity: 1,
          }}
        >
          <Icon path={isExpanded ? mdiChevronUp : mdiChevronDown} size={0.7} />
          {label} ({count})
        </Box>
      </Tooltip>
      {(onToggleSelectMode ||
        onOpenDateFilter ||
        selectedLabel ||
        hasStartOrEndDateFilter ||
        hasDueDateFilter ||
        hasTextFilter) && (
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          }}
        >
          <Stack direction="row" spacing={2} >
            {selectedLabel && (
              <Tooltip
                title={`Remove label filter: ${selectedLabel.name}`}
                arrow
              >
                <Box
                  component="button"
                  type="button"
                  onClick={interactionDisabled ? undefined : onClearLabelFilter}
                  disabled={interactionDisabled}
                  sx={{
                    ...FILTER_CLEAR_BUTTON_SX,
                    color: getLabelColorSwatch(selectedLabel.color).background,
                    cursor: interactionDisabled ? "not-allowed" : "pointer",
                    opacity: interactionDisabled ? 0.55 : 1,
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
                  onClick={interactionDisabled ? undefined : onClearDateRangeFilter}
                  disabled={interactionDisabled}
                  sx={{
                    ...FILTER_CLEAR_BUTTON_SX,
                    color: colors.blue[200],
                    cursor: interactionDisabled ? "not-allowed" : "pointer",
                    opacity: interactionDisabled ? 0.55 : 1,
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
                    ? `Remove schedule note filter: ${activeDueDateLabel}`
                    : "Remove schedule note filter"
                }
                arrow
              >
                <Box
                  component="button"
                  type="button"
                  onClick={interactionDisabled ? undefined : onClearDueDateFilter}
                  disabled={interactionDisabled}
                  sx={{
                    ...FILTER_CLEAR_BUTTON_SX,
                    color: colors.orange[400],
                    cursor: interactionDisabled ? "not-allowed" : "pointer",
                    opacity: interactionDisabled ? 0.55 : 1,
                  }}
                >
                  <Icon path={mdiCalendarClock} size={0.7} />
                </Box>
              </Tooltip>
            )}
            {hasTextFilter && (
              <Tooltip title={"Remove note text filter"} arrow>
                <Box
                  component="button"
                  type="button"
                  onClick={interactionDisabled ? undefined : onClearTextFilter}
                  disabled={interactionDisabled}
                  sx={{
                    ...FILTER_CLEAR_BUTTON_SX,
                    color: colors.teal[200],
                    cursor: interactionDisabled ? "not-allowed" : "pointer",
                    opacity: interactionDisabled ? 0.55 : 1,
                  }}
                >
                  <Icon path={mdiFilter} size={0.7} />
                </Box>
              </Tooltip>
            )}
          </Stack>
          {hasFilterButtons && onOpenDateFilter && (
            <Divider
              orientation="vertical"
              flexItem
              sx={{ borderColor: "rgba(255,255,255,0.16)" }}
            />
          )}
          {onToggleRevealAllSpoilers && (
            <Tooltip
              title={
                revealAllSpoilers
                  ? "Hide all spoilers temporarily"
                  : "Reveal all spoilers temporarily"
              }
              arrow
            >
              <span>
                <IconButton
                  aria-label={
                    revealAllSpoilers
                      ? "Hide all spoilers temporarily"
                      : "Reveal all spoilers temporarily"
                  }
                  color={revealAllSpoilers ? "primary" : "default"}
                  size="small"
                  onClick={interactionDisabled ? undefined : onToggleRevealAllSpoilers}
                  disabled={interactionDisabled}
                >
                  <Icon
                    path={revealAllSpoilers ? mdiEyeOutline : mdiEyeOffOutline}
                    size={0.8}
                  />
                </IconButton>
              </span>
            </Tooltip>
          )}
          {onOpenDateFilter && (
            <Tooltip title="Filter by date" arrow>
              <span>
                <IconButton
                  aria-label="Filter by date"
                  color={hasDateFilter ? "primary" : "default"}
                  size="small"
                  onClick={interactionDisabled ? undefined : onOpenDateFilter}
                  disabled={dateFilterDisabled || interactionDisabled}
                >
                  <Icon path={mdiCalendar} size={0.8} />
                </IconButton>
              </span>
            </Tooltip>
          )}
          {onToggleSelectMode && (
            <Tooltip
              title={
                selectMode ? "Cancel select mode" : "Select multiple notes"
              }
              arrow
            >
              <span>
                <IconButton
                  aria-label="Toggle select mode"
                  color={selectMode ? "primary" : "default"}
                  size="small"
                  onClick={interactionDisabled ? undefined : onToggleSelectMode}
                  disabled={selectDisabled || interactionDisabled}
                >
                  <Badge
                    badgeContent={selectedCount}
                    color="primary"
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    sx={{
                      "& .MuiBadge-badge": {
                        backgroundColor: "primary",
                        color: colors.grey[900],
                        minWidth: 12,
                        height: 12,
                        fontSize: "0.5rem",
                      },
                    }}
                  >
                    <Icon path={mdiCheckboxMultipleMarked} size={0.8} />
                  </Badge>
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      )}
    </Box>
  );
};

export default NoteListAccordionHeader;
