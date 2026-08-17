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
import type { Category } from "../types";
import LabelIcon from "./ui/LabelIcon";

type LabelListRowProps = {
  category: Category;
  isNewCategory: boolean;
  onOpenMenu: (event: MouseEvent<HTMLElement>, category: Category) => void;
};

const LabelListRow = ({
  category,
  isNewCategory,
  onOpenMenu,
}: LabelListRowProps) => (
  <TableRow
    key={category.id}
    sx={{
      borderBottom: "3px solid",
      borderColor: colors.grey[900],
      paddingY: 2,
      flexShrink: 0,
      width: 40,
      verticalAlign: "middle",
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
      <Tooltip title={category.icon.label} aria-label={`Icon for ${category.name}`}>
        <LabelIcon icon={category.icon} color={category.color} size={1} />
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
          color: isNewCategory ? colors.lightGreen[400] : "inherit",
        }}
      >
        {category.name}
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
          aria-label={`Open actions for ${category.name}`}
          size="small"
          onClick={(event) => onOpenMenu(event, category)}
        >
          <Icon path={mdiDotsVertical} size={0.8} />
        </IconButton>
      </Tooltip>
    </TableCell>
  </TableRow>
);

export default LabelListRow;
