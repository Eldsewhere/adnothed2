import type { MouseEvent as ReactMouseEvent } from "react";
import { Box, Tooltip, colors } from "@mui/material";
import { Icon } from "@mdi/react";
import {
  mdiArchive,
  mdiBell,
  mdiCheckboxMarkedOutline,
  mdiClockCheckOutline,
  mdiClockOutline,
  mdiPin,
} from "@mdi/js";
import type { Note, Status } from "../../types";
import { formatDueDate } from "../../utils/formatTimestamp";

type NoteTimestampMetaIconsProps = {
  note: Note;
  status?: Status;
  noteIconColor: string;
  checkboxProgress: { percentage: number } | null;
  shouldShowCompleteIcon: boolean;
  shouldShowDueDateIcon: boolean;
  shouldUsePriorityDueDate: boolean;
  onOpenActionsMenu: (
    event: ReactMouseEvent<HTMLElement>,
    note: Note,
    openStatusPicker?: boolean,
  ) => void;
};

const NoteTimestampMetaIcons = ({
  note,
  status,
  noteIconColor,
  checkboxProgress,
  shouldShowCompleteIcon,
  shouldShowDueDateIcon,
  shouldUsePriorityDueDate,
  onOpenActionsMenu,
}: NoteTimestampMetaIconsProps) => (
  <>
    {shouldShowDueDateIcon && (
      <Tooltip
        title={shouldUsePriorityDueDate ? "Scheduled" : "Scheduled date"}
        aria-label={undefined}
        arrow
      >
        <Box
          component="span"
          sx={{
            ml: 0.5,
            display: "inline-flex",
            alignItems: "center",
            color: noteIconColor,
          }}
        >
          <Icon path={mdiClockOutline} size={0.5} />
        </Box>
      </Tooltip>
    )}
    {shouldShowCompleteIcon && (
      <Tooltip
        title={
          note.due !== undefined
            ? `Completed: ${formatDueDate(note.due)}`
            : "Completed"
        }
        aria-label={undefined}
        arrow
      >
        <Box
          component="span"
          sx={{
            ml: 0.5,
            display: "inline-flex",
            color: noteIconColor,
          }}
        >
          <Icon path={mdiClockCheckOutline} size={0.5} />
        </Box>
      </Tooltip>
    )}
    {note.archived && (
      <Tooltip title="Archived" aria-label={undefined} arrow>
        <Box
          component="span"
          sx={{
            ml: 0.5,
            display: "inline-flex",
            color: colors.red[300],
          }}
        >
          <Icon path={mdiArchive} size={0.5} />
        </Box>
      </Tooltip>
    )}
    {note.emoji && (
      <Tooltip title={status ? status.name : "Note status"} arrow>
        <Box
          component="span"
          role="img"
          aria-label={status ? status.name : "Note status"}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event: ReactMouseEvent<HTMLElement>) => {
            event.stopPropagation();
            onOpenActionsMenu(event, note, true);
          }}
          sx={{
            ml: 0.5,
            display: "inline-flex",
            alignItems: "center",
            fontSize: "0.85rem",
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          {note.emoji}
        </Box>
      </Tooltip>
    )}
    {note.hasNotification && (
      <Tooltip title="Notified" aria-label={undefined} arrow>
        <Box
          component="span"
          sx={{
            ml: 0.5,
            display: "inline-flex",
            color: noteIconColor,
          }}
        >
          <Icon path={mdiBell} size={0.5} />
        </Box>
      </Tooltip>
    )}
    {note.pinned && (
      <Tooltip title="Pinned" aria-label={undefined} arrow>
        <Box
          component="span"
          sx={{
            ml: 0.5,
            display: "inline-flex",
            color: noteIconColor,
          }}
        >
          <Icon path={mdiPin} size={0.5} />
        </Box>
      </Tooltip>
    )}
    {checkboxProgress && (
      <Box
        component="span"
        sx={{
          ml: 0.75,
          display: "inline-flex",
          alignItems: "center",
          gap: 0.25,
          color: noteIconColor,
        }}
      >
        <Icon path={mdiCheckboxMarkedOutline} size={0.5} />
        <Box component="span">{checkboxProgress.percentage}%</Box>
      </Box>
    )}
  </>
);

export default NoteTimestampMetaIcons;
