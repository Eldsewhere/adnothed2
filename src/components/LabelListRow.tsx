import type { MouseEvent } from "react";
import {
  IconButton,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
  colors,
} from "@mui/material";
import { Icon } from "@mdi/react";
import { mdiDotsVertical } from "@mdi/js";
import type { Label } from "../types";
import LabelIcon from "./ui/LabelIcon";

type LabelListRowProps = {
  label: Label;
  isNewLabel: boolean;
  isMenuOpen?: boolean;
  onOpenMenu: (event: MouseEvent<HTMLElement>, label: Label) => void;
};

const LabelListRow = ({
  label,
  isNewLabel,
  isMenuOpen = false,
  onOpenMenu,
}: LabelListRowProps) => (
  <TableRow
    key={label.id}
    sx={{
      borderBottom: "3px solid",
      borderColor: colors.grey[900],
      paddingY: 2,
      flexShrink: 0,
      width: 40,
      verticalAlign: "middle",
      opacity: isMenuOpen ? 0.5 : 1,
    }}
  >
    <TableCell
      sx={{
        paddingY: 2,
        flexShrink: 0,
        width: 40,
        verticalAlign: "middle",
      }}
    >
      <Tooltip title={label.icon.label} aria-label={`Icon for ${label.name}`}>
        <LabelIcon icon={label.icon} color={label.color} size={1} />
      </Tooltip>
    </TableCell>
    <TableCell
      sx={{
        paddingY: 2,
        pl: 0,
        maxWidth: 0,
        width: "100%",
      }}
    >
      <Typography
        noWrap
        sx={{
          color: isNewLabel ? colors.lightGreen[400] : "inherit",
        }}
      >
        {label.name}
      </Typography>
    </TableCell>
    <TableCell
      align="right"
      sx={{
        verticalAlign: "middle",
        paddingY: 2,
      }}
    >
      <Tooltip title="Actions">
        <IconButton
          aria-label={`Open actions for ${label.name}`}
          size="small"
          onClick={(event) => onOpenMenu(event, label)}
        >
          <Icon path={mdiDotsVertical} size={0.8} />
        </IconButton>
      </Tooltip>
    </TableCell>
  </TableRow>
);

export default LabelListRow;
