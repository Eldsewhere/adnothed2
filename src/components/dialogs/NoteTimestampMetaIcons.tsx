import { useState, type MouseEvent as ReactMouseEvent } from "react";
import { Box, Tooltip, colors } from "@mui/material";
import { Icon } from "@mdi/react";
import {
  mdiArchive,
  mdiBell,
  mdiCheckBold,
  mdiCheckboxMarkedOutline,
  mdiClockCheckOutline,
  mdiClockOutline,
  mdiEyeOffOutline,
  mdiEyeOutline,
  mdiFormatListBulleted,
  mdiPin,
} from "@mdi/js";
import type { Note } from "../../types";
import { formatDueDate } from "../../utils/formatTimestamp";
import EmojiStatusPicker from "../dialogs/EmojiStatusPicker";

type NoteTimestampMetaIconsProps = {
  note: Note;
  noteIconColor: string;
  checkboxProgress: { percentage: number } | null;
  bulletCount: number | null;
  shouldShowCompleteIcon: boolean;
  shouldShowDueDateIcon: boolean;
  shouldUsePriorityDueDate: boolean;
  interactionDisabled?: boolean;
  isSpoilerActive?: boolean;
  isSpoilerVisible?: boolean;
  onToggleSpoilerVisibility?: () => void;
  onOpenActionsMenu?: (
    event: ReactMouseEvent<HTMLElement>,
    note: Note,
    openStatusPicker?: boolean,
  ) => void;
  onEmojiChange: (note: Note, emoji: string | null) => void;
  openDueDateDialog: (note: Note) => void;
};

const NoteTimestampMetaIcons = ({
  note,
  noteIconColor,
  checkboxProgress,
  bulletCount,
  shouldShowCompleteIcon,
  shouldShowDueDateIcon,
  shouldUsePriorityDueDate,
  interactionDisabled = false,
  isSpoilerActive = false,
  isSpoilerVisible = false,
  onToggleSpoilerVisibility,
  onEmojiChange,
  openDueDateDialog,
}: NoteTimestampMetaIconsProps) => {
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<HTMLElement | null>(
    null,
  );

  return (
    <>
      {shouldShowDueDateIcon && (
        <Tooltip
          title={shouldUsePriorityDueDate ? "Scheduled" : "Scheduled date"}
          aria-label={undefined}
          arrow
        >
          <Box
            component="span"
            role="img"
            sx={{
              ml: 0.5,
              display: "inline-flex",
              alignItems: "center",
              color: noteIconColor,
              cursor: interactionDisabled ? "not-allowed" : "pointer",
              opacity: interactionDisabled ? 0.6 : 1,
            }}
            onPointerDown={(event) => {
              if (interactionDisabled) {
                event.stopPropagation();
                return;
              }
              event.stopPropagation();
            }}
            onClick={(event) => {
              if (interactionDisabled) {
                event.preventDefault();
                event.stopPropagation();
                return;
              }
              event.stopPropagation();
              openDueDateDialog(note);
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
            <Icon
              path={
                note.due === undefined ? mdiCheckBold : mdiClockCheckOutline
              }
              size={0.5}
            />
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
        <>
          <Tooltip title={"Note emoji"} arrow>
            <Box
              component="span"
              role="img"
              aria-label={"Note emoji"}
              onPointerDown={(event) => {
                if (interactionDisabled) {
                  event.stopPropagation();
                  return;
                }
                event.stopPropagation();
              }}
              onClick={(event: ReactMouseEvent<HTMLElement>) => {
                if (interactionDisabled) {
                  event.preventDefault();
                  event.stopPropagation();
                  return;
                }
                event.stopPropagation();
                setStatusMenuAnchor(event.currentTarget);
              }}
              sx={{
                ml: 0.5,
                display: "inline-flex",
                alignItems: "center",
                fontSize: "0.85rem",
                lineHeight: 1,
                cursor: interactionDisabled ? "not-allowed" : "pointer",
                opacity: interactionDisabled ? 0.6 : 1,
              }}
            >
              {note.emoji}
            </Box>
          </Tooltip>
          <EmojiStatusPicker
            anchorEl={statusMenuAnchor}
            onClose={() => setStatusMenuAnchor(null)}
            note={note}
            onEmojiChange={(note, emoji) => {
              note && onEmojiChange(note, emoji);
            }}
          />
        </>
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
      {bulletCount && (
        <Tooltip
          title={`${bulletCount} bullet${bulletCount === 1 ? "" : "s"}`}
          arrow
        >
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
            <Icon path={mdiFormatListBulleted} size={0.5} />
            <Box component="span">{bulletCount}</Box>
          </Box>
        </Tooltip>
      )}
      {isSpoilerActive && (
        <Tooltip
          title={isSpoilerVisible ? "Hide text" : "Reveal text"}
          aria-label={undefined}
          arrow
        >
          <Box
            component="button"
            type="button"
            onClick={(event: ReactMouseEvent<HTMLElement>) => {
              if (interactionDisabled) {
                event.preventDefault();
                event.stopPropagation();
                return;
              }
              event.stopPropagation();
              onToggleSpoilerVisibility?.();
            }}
            sx={{
              ml: 0.5,
              display: "inline-flex",
              alignItems: "center",
              border: "none",
              background: "transparent",
              padding: 0,
              color: "inherit",
              cursor: interactionDisabled ? "not-allowed" : "pointer",
              opacity: interactionDisabled ? 0.6 : 1,
            }}
          >
            <Icon
              path={isSpoilerVisible ? mdiEyeOutline : mdiEyeOffOutline}
              size={0.5}
            />
          </Box>
        </Tooltip>
      )}
    </>
  );
};

export default NoteTimestampMetaIcons;
