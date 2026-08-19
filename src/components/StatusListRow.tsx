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
import type { Status } from "../types";
import { getStatusTextStyle } from "../utils/statusStyles";

type StatusListRowProps = {
  status: Status;
  isNewStatus: boolean;
  onOpenMenu: (event: MouseEvent<HTMLElement>, status: Status) => void;
};

const StatusListRow = ({ status, isNewStatus, onOpenMenu }: StatusListRowProps) => {
  const statusTextStyle = getStatusTextStyle(status.format);

  return (
    <TableRow
      key={status.id}
      sx={{
        borderBottom: "3px solid",
        borderColor: colors.grey[900],
        paddingY: 2,
        flexShrink: 0,
        width: 40,
        verticalAlign: "middle",
      }}
    >
      <TableCell sx={{ paddingY: 2, flexShrink: 0, width: 40, verticalAlign: "middle" }}>
        <Tooltip title={`${status.emoji} ${status.name}`}>
          <Typography component="span" sx={{ fontSize: "1.2rem" }}>
            {status.emoji}
          </Typography>
        </Tooltip>
      </TableCell>
      <TableCell sx={{ paddingY: 2, pl: 0, maxWidth: 0, width: "100%" }}>
        <Typography
          noWrap
          sx={{
            ...statusTextStyle,
            ...(isNewStatus
              ? { color: statusTextStyle.color ?? colors.lightGreen[400] }
              : {}),
          }}
        >
          {status.name}
        </Typography>
      </TableCell>
      <TableCell align="right" sx={{ verticalAlign: "middle", paddingY: 2 }}>
        <Tooltip title="Actions">
          <IconButton
            aria-label={`Open actions for ${status.name}`}
            size="small"
            onClick={(event) => onOpenMenu(event, status)}
          >
            <Icon path={mdiDotsVertical} size={0.8} />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

export default StatusListRow;
