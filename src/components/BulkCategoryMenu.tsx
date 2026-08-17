import { Box, Menu, MenuItem } from "@mui/material";
import LabelIcon from "./LabelIcon";
import type { Category } from "../types";

type BulkCategoryMenuProps = {
  anchorEl: HTMLElement | null;
  categories: Category[];
  onClose: () => void;
  onSelect: (categoryId: string | null) => void;
};

const BulkCategoryMenu = ({
  anchorEl,
  categories,
  onClose,
  onSelect,
}: BulkCategoryMenuProps) => (
  <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={onClose}>
    <MenuItem onClick={() => onSelect(null)}>no label</MenuItem>
    {categories.map((category) => (
      <MenuItem key={category.id} onClick={() => onSelect(category.id)}>
        <Box
          component="span"
          sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}
        >
          <LabelIcon icon={category.icon} color={category.color} size={0.8} />
        </Box>
        {category.name}
      </MenuItem>
    ))}
  </Menu>
);

export default BulkCategoryMenu;
