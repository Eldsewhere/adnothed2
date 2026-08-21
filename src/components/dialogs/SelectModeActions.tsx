import type { MouseEvent } from "react";
import { Button, IconButton, Stack, Tooltip } from "@mui/material";
import { Icon } from "@mdi/react";
import {
  mdiArchiveArrowDown,
  mdiArchiveArrowUp,
  mdiCancel,
  mdiEmoticonOutline,
  mdiFolderMove,
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
  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
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
        <Icon path={allSelectedArchived ? mdiArchiveArrowUp : mdiArchiveArrowDown} size={0.9} />
      </IconButton>
    </Tooltip>
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
        <Icon path={mdiEmoticonOutline} size={0.9} />
      </IconButton>
    </Tooltip>
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
);

export default SelectModeActions;
