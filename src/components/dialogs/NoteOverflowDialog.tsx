import type { MouseEvent } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
  colors,
} from "@mui/material";
import { Icon } from "@mdi/react";
import { mdiClose, mdiDotsVertical, mdiLabelOff } from "@mdi/js";
import type { Label, Note } from "../../types";
import LabelIcon from "../ui/LabelIcon";
import HashtagChip from "../HashtagChip";

const CHECKBOX_ROW_PATTERN = /^(\[ ?([xX])? ?\])\s?(.*)$/;

type NoteOverflowDialogProps = {
  open: boolean;
  note: Note | null;
  labels: Label[];
  onClose: () => void;
  onToggleCheckbox: (note: Note, rowIndex: number) => void;
  onOpenActionsMenu: (event: MouseEvent<HTMLElement>, note: Note) => void;
  onRemoveHashtagFromNote?: (note: Note, tag: string) => void;
};

const NoteOverflowDialog = ({
  open,
  note,
  labels,
  onClose,
  onToggleCheckbox,
  onOpenActionsMenu,
  onRemoveHashtagFromNote,
}: NoteOverflowDialogProps) => {
  if (!note) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{ position: "relative", bgcolor: colors.blueGrey[900], p: 1.5 }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography variant="body2">
            {(() => {
              const label = labels.find((label) => label.id === note.labelId);

              return (
                <Box
                  component="span"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  {label ? (
                    <LabelIcon
                      icon={label.icon}
                      color={label.color}
                      size={0.8}
                    />
                  ) : (
                    <Icon path={mdiLabelOff} size={0.8} />
                  )}
                  {label ? label.name : "no label"}
                </Box>
              );
            })()}
          </Typography>
        </Box>
        <Tooltip title="Close">
          <IconButton
            aria-label="Close"
            size="small"
            onClick={onClose}
            sx={{
              position: "absolute",
              top: 4,
              right: 4,
              color: colors.blueGrey[100],
            }}
          >
            <Icon path={mdiClose} size={0.8} />
          </IconButton>
        </Tooltip>
      </DialogTitle>
      <DialogContent sx={{ bgcolor: colors.blueGrey[800], p: 2 }}>
        <Box
          sx={{
            overflowWrap: "anywhere",
            mt: 2,
            maxHeight: "calc(10 * 1.5em)",
            overflowY: "auto",
          }}
        >
          {note.text.split("\n").map((row, rowIndex) => {
            const checkboxMatch = row.match(CHECKBOX_ROW_PATTERN);
            const isChecked = checkboxMatch?.[2]?.toLowerCase() === "x";
            const rowText = checkboxMatch?.[3] ?? row;
            return (
              <Box
                key={`${rowIndex}-${row}`}
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  minHeight: "1.5em",
                  whiteSpace: "pre-wrap",
                }}
              >
                {checkboxMatch && (
                  <Checkbox
                    slotProps={{
                      input: {
                        "aria-labelledby": `note-text-${note.id}-row-${rowIndex}`,
                      },
                    }}
                    checked={isChecked}
                    onChange={() => onToggleCheckbox(note, rowIndex)}
                    size="small"
                    sx={{ p: 0.25, mr: 0.5, mt: 0.1 }}
                  />
                )}
                <Typography
                  id={
                    checkboxMatch
                      ? `note-text-${note.id}-row-${rowIndex}`
                      : undefined
                  }
                  component="span"
                  variant="body1"
                  sx={{
                    textDecoration: isChecked ? "line-through" : "none",
                  }}
                >
                  {rowText.split(/(#\w[\w-]*\b)/g).map((part, partIndex) => {
                    if (!/^#\w[\w-]*$/.test(part)) {
                      return <span key={`${part}-${partIndex}`}>{part}</span>;
                    }

                    return (
                      <HashtagChip
                        key={`${part}-${partIndex}`}
                        tag={part}
                        selected={false}
                        onClick={() => undefined}
                        showDelete={Boolean(onRemoveHashtagFromNote)}
                        onDelete={() => onRemoveHashtagFromNote?.(note, part)}
                      />
                    );
                  })}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          bgcolor: colors.blueGrey[900],
          p: 1,
          gap: 1,
        }}
      >
        <Tooltip title="Actions">
          <Button
            color="primary"
            variant="outlined"
            startIcon={<Icon path={mdiDotsVertical} size={0.8} />}
            onClick={(event: MouseEvent<HTMLElement>) =>
              onOpenActionsMenu(event, note)
            }
          >
            Actions
          </Button>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
};

export default NoteOverflowDialog;
