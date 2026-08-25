import type { MouseEvent } from "react";
import { Box, Button, IconButton, Stack, Tooltip } from "@mui/material";
import { Icon } from "@mdi/react";
import {
  mdiArchiveArrowDown,
  mdiArchiveArrowUp,
  mdiCancel,
  mdiFolderMove,
  mdiMinusCircle,
  mdiPin,
  mdiPinOff,
  mdiShareVariant,
  mdiTrashCanOutline,
} from "@mdi/js";

type SelectModeActionsProps = {
  selectedCount: number;
  allSelectedPinned: boolean;
  allSelectedArchived: boolean;
  onLabelClick: (event: MouseEvent<HTMLElement>) => void;
  onPinToggleClick: () => void;
  onArchiveToggleClick: () => void;
  onStatusClick: (event: MouseEvent<HTMLElement>) => void;
  onShareTextClick: () => void;
  onDeleteClick: () => void;
  onCancelClick: () => void;
};

const SelectModeActions = ({
  selectedCount,
  allSelectedPinned,
  allSelectedArchived,
  onLabelClick,
  onPinToggleClick,
  onArchiveToggleClick,
  onStatusClick,
  onShareTextClick,
  onDeleteClick,
  onCancelClick,
}: SelectModeActionsProps) => (
  <Box
    sx={{
      width: "100%",
      overflowX: "auto",
      overflowY: "hidden",
      "@media (max-width: 600px)": {
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": {
          display: "none",
        },
        "&::-webkit-scrollbar-thumb": {
          display: "none",
        },
        "-ms-overflow-style": "none",
      },
      "@media (min-width: 601px)": {
        scrollbarWidth: "thin",
        "&::-webkit-scrollbar": {
          height: 6,
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: "rgba(255,255,255,0.2)",
          borderRadius: 999,
        },
      },
    }}
  >
    <Stack
      direction="row"
      spacing={0.5}
      sx={{
        alignItems: "center",
        minWidth: "max-content",
        width: "fit-content",
        flexWrap: "nowrap",
      }}
    >
      <Tooltip
        title={
          selectedCount > 0 ? "Change selected label" : "Select notes to enable"
        }
      >
        <IconButton
          color="inherit"
          disabled={selectedCount === 0}
          onClick={onLabelClick}
        >
          <Icon path={mdiFolderMove} size={0.9} />
        </IconButton>
      </Tooltip>
      <Tooltip
        title={
          selectedCount > 0
            ? allSelectedPinned
              ? "Unpin selected"
              : "Pin selected"
            : "Select notes to enable"
        }
      >
        <IconButton
          color="inherit"
          disabled={selectedCount === 0}
          onClick={onPinToggleClick}
        >
          <Icon path={allSelectedPinned ? mdiPinOff : mdiPin} size={0.9} />
        </IconButton>
      </Tooltip>
      <Tooltip
        title={
          selectedCount > 0
            ? allSelectedArchived
              ? "Unarchive selected"
              : "Archive selected"
            : "Select notes to enable"
        }
      >
        <IconButton
          color="inherit"
          disabled={selectedCount === 0}
          onClick={onArchiveToggleClick}
        >
          <Icon
            path={allSelectedArchived ? mdiArchiveArrowUp : mdiArchiveArrowDown}
            size={0.9}
          />
        </IconButton>
      </Tooltip>
      {false && (
        <Tooltip
          title={
            selectedCount > 0 ? "Set selected status" : "Select notes to enable"
          }
        >
          <IconButton
            color="inherit"
            disabled={selectedCount === 0}
            onClick={onStatusClick}
          >
            <Icon path={mdiMinusCircle} size={0.9} />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip
        title={
          selectedCount > 0 ? "Share selected text" : "Select notes to enable"
        }
      >
        <IconButton
          color="inherit"
          disabled={selectedCount === 0}
          onClick={onShareTextClick}
        >
          <Icon path={mdiShareVariant} size={0.9} />
        </IconButton>
      </Tooltip>
      <Tooltip
        title={selectedCount > 0 ? "Delete selected" : "Select notes to enable"}
      >
        <IconButton
          color="inherit"
          disabled={selectedCount === 0}
          onClick={onDeleteClick}
        >
          <Icon path={mdiTrashCanOutline} size={0.9} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Exit select mode">
        <Button
          variant="text"
          startIcon={<Icon path={mdiCancel} size={0.9} />}
          onClick={onCancelClick}
          sx={{ textTransform: "none" }}
        >
          Cancel
        </Button>
      </Tooltip>
    </Stack>
  </Box>
);

export default SelectModeActions;
