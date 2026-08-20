import { Chip, Tooltip, colors } from "@mui/material";
import { Icon } from "@mdi/react";
import { mdiClose } from "@mdi/js";

type HashtagChipProps = {
  tag: string;
  selected: boolean;
  count?: number;
  onClick: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
};

const HashtagChip = ({
  tag,
  selected,
  count,
  onClick,
  onDelete,
  showDelete = false,
}: HashtagChipProps) => (
  <Chip
    label={`${tag} ${count !== undefined && count > 1 ? `(${count})` : ""}`}
    size="small"
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    onDelete={
      showDelete && onDelete
        ? (event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }
        : undefined
    }
    onPointerDown={
      showDelete
        ? (event) => {
            event.stopPropagation();
          }
        : undefined
    }
    onMouseDown={
      showDelete
        ? (event) => {
            event.preventDefault();
            event.stopPropagation();
          }
        : undefined
    }
    deleteIcon={
      showDelete ? (
        <Tooltip title="Remove hashtag" aria-label={undefined}>
          <Icon path={mdiClose} size={0.5} />
        </Tooltip>
      ) : undefined
    }
    sx={{
      height: 20,
      ml: 0.25,
      mr: 0.25,
      p: 0.5,
      borderRadius: 999,
      bgcolor: selected ? colors.lightGreen[400] : colors.blueGrey[700],
      color: selected ? colors.grey[900] : colors.grey[100],
      ".MuiChip-label": {
        px: 0.75,
        fontSize: "0.7rem",
      },
      ".MuiChip-deleteIcon": {
        color: selected ? colors.grey[900] : colors.grey[100],
        fontSize: "0.7rem",
        margin: 0,
      },
    }}
  />
);

export default HashtagChip;
