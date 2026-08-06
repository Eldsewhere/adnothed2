import { IconButton, Tooltip } from "@mui/material";
import { Icon } from "@mdi/react";
import { mdiFilter } from "@mdi/js";

type ItemFiltersProps = {
  itemsCount: number;
  selectMode: boolean;
  isTextFilterVisible: boolean;
  onToggleTextFilterInput: () => void;
};

const ItemFilters = ({
  itemsCount,
  selectMode,
  isTextFilterVisible,
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
        <Icon path={mdiFilter} size={0.9} />
      </IconButton>
    </Tooltip>
  );
};

export default ItemFilters;
