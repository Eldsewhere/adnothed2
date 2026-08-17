import { Box, colors, Menu, MenuItem } from "@mui/material";
import LabelIcon from "../ui/LabelIcon";
import type { Label } from "../../types";
import { mdiLabelOff } from "@mdi/js";
import { Icon } from "@mdi/react";

type LabelMenuProps = {
  anchorEl: HTMLElement | null;
  labels: Label[];
  onClose: () => void;
  onSelect: (labelId: string | null) => void;
  selected?: string | null;
};

const LabelMenu = ({
  anchorEl,
  labels,
  onClose,
  onSelect,
  selected,
}: LabelMenuProps) => (
  <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={onClose}>
    <MenuItem
      sx={{ color: colors.blueGrey[300] }}
      onClick={() => onSelect(null)}
      autoFocus={selected === null}
      selected={selected === null}
    >
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          mr: 1,
          color: colors.blueGrey[300],
        }}
      >
        <Icon path={mdiLabelOff} size={0.7} />
      </Box>
      {labels.length == 0 ? "no labels available" : "no label"}
    </MenuItem>
    {labels.map((label) => (
      <MenuItem
        key={label.id}
        onClick={() => onSelect(label.id)}
        autoFocus={selected === label.id}
        selected={selected === label.id}
      >
        <Box
          component="span"
          sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}
        >
          <LabelIcon icon={label.icon} color={label.color} size={0.7} />
        </Box>
        {label.name}
      </MenuItem>
    ))}
  </Menu>
);

export default LabelMenu;
