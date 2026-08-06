import { Badge, colors, IconButton, Tooltip } from "@mui/material";
import { Icon } from "@mdi/react";
import { mdiFilter } from "@mdi/js";

type ItemFiltersProps = {
  itemsCount: number;
  selectMode: boolean;
  isTextFilterVisible: boolean;
  isTextFilterActive: boolean;
  onToggleTextFilterInput: () => void;
};

const ItemFilters = ({
  itemsCount,
  selectMode,
  isTextFilterVisible,
  isTextFilterActive,
  onToggleTextFilterInput,
}: ItemFiltersProps) => {
  return (
    <Tooltip title="Filter note text">
      <IconButton
        aria-label="Filter notes"
        onClick={onToggleTextFilterInput}
        color={isTextFilterVisible ? "primary" : "default"}
        disabled={itemsCount === 0 || selectMode}
      >
        <Badge
          variant="dot"
          invisible={!isTextFilterActive}
          sx={{
            "& .MuiBadge-badge": {
              backgroundColor: colors.lightGreen[400],
            },
          }}
        >
          <Icon path={mdiFilter} size={0.9} />
        </Badge>
      </IconButton>
    </Tooltip>
  );
};

export default ItemFilters;
