import { Box, Menu, MenuItem } from "@mui/material";
import LabelIcon from "../ui/LabelIcon";
import type { Label } from "../../types";

type BulkLabelMenuProps = {
  anchorEl: HTMLElement | null;
  labels: Label[];
  onClose: () => void;
  onSelect: (labelId: string | null) => void;
};

const BulkLabelMenu = ({
  anchorEl,
  labels,
  onClose,
  onSelect,
}: BulkLabelMenuProps) => (
  <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={onClose}>
    <MenuItem onClick={() => onSelect(null)}>no label</MenuItem>
    {labels.map((label) => (
      <MenuItem key={label.id} onClick={() => onSelect(label.id)}>
        <Box
          component="span"
          sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}
        >
          <LabelIcon icon={label.icon} color={label.color} size={0.8} />
        </Box>
        {label.name}
      </MenuItem>
    ))}
  </Menu>
);

export default BulkLabelMenu;
