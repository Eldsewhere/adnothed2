import type { MouseEvent } from "react";
import { Button, Stack, Tooltip } from "@mui/material";
import { Icon } from "@mdi/react";
import {
  mdiCancel,
  mdiFolderMove,
  mdiTrashCanOutline,
} from "@mdi/js";

type SelectModeActionsProps = {
  selectedCount: number;
  onLabelClick: (event: MouseEvent<HTMLElement>) => void;
  onDeleteClick: () => void;
  onCancelClick: () => void;
};

const SelectModeActions = ({
  selectedCount,
  onLabelClick,
  onDeleteClick,
  onCancelClick,
}: SelectModeActionsProps) => (
  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
    <Tooltip
      title={selectedCount > 0 ? "Change label" : "Select notes to enable"}
    >
      <span>
        <Button
          variant="text"
          startIcon={<Icon path={mdiFolderMove} size={0.9} />}
          disabled={selectedCount === 0}
          onClick={onLabelClick}
          sx={{ textTransform: "none" }}
        >
          Label
        </Button>
      </span>
    </Tooltip>
    <Tooltip
      title={selectedCount > 0 ? "Delete selected" : "Select notes to enable"}
    >
      <span>
        <Button
          variant="text"
          startIcon={<Icon path={mdiTrashCanOutline} size={0.9} />}
          disabled={selectedCount === 0}
          onClick={onDeleteClick}
          sx={{ textTransform: "none" }}
        >
          Delete
        </Button>
      </span>
    </Tooltip>
    <Tooltip title="Exit select mode">
      <span>
        <Button
          variant="text"
          startIcon={<Icon path={mdiCancel} size={0.9} />}
          onClick={onCancelClick}
          sx={{ textTransform: "none" }}
        >
          Cancel
        </Button>
      </span>
    </Tooltip>
  </Stack>
);

export default SelectModeActions;
