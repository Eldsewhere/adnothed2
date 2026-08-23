import type { MouseEvent } from "react";
import {
  Box,
  IconButton,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
  colors,
} from "@mui/material";
import { Icon } from "@mdi/react";
import { mdiDotsVertical, mdiPencil } from "@mdi/js";
import type { Status } from "../types";
import { getStatusTextStyle } from "../utils/statusStyles";

type StatusListRowProps = {
  status: Status;
  count: number;
  isNewStatus: boolean;
  isEditing?: boolean;
  isMenuOpen?: boolean;
  onOpenMenu: (event: MouseEvent<HTMLElement>, status: Status) => void;
  onSelect?: (status: Status) => void;
};

const StatusListRow = ({
  status,
  count,
  isNewStatus,
  isEditing = false,
  isMenuOpen = false,
  onOpenMenu,
  onSelect,
}: StatusListRowProps) => {
  const statusTextStyle =
    status.format === "spoiler" ? {} : getStatusTextStyle(status.format);

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
        opacity: isMenuOpen ? 0.5 : 1,
        bgcolor: isEditing ? "rgba(255, 152, 0, 0.18)" : undefined,
      }}
      hover={Boolean(onSelect)}
      onClick={() => onSelect?.(status)}
    >
      <TableCell
        sx={{ paddingY: 2, flexShrink: 0, width: 40, verticalAlign: "middle" }}
      >
        <Tooltip title={`${status.emoji} ${status.name}`}>
          <Typography component="span" sx={{ fontSize: "1.2rem" }}>
            {status.emoji}
          </Typography>
        </Tooltip>
      </TableCell>
      <TableCell sx={{ paddingY: 2, pl: 0, maxWidth: 0, width: "100%" }}>
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}
        >
          {isEditing && (
            <Tooltip title="Editing status" aria-label={undefined} arrow>
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  color: colors.orange[300],
                  flexShrink: 0,
                }}
              >
                <Icon path={mdiPencil} size={0.7} />
              </Box>
            </Tooltip>
          )}
          <Typography
            noWrap
            sx={{
              ...statusTextStyle,
              ...(isNewStatus
                ? { color: statusTextStyle.color ?? colors.lightGreen[400] }
                : {}),
              flex: 1,
              minWidth: 0,
            }}
          >
            {status.format === "spoiler"
              ? [...status.name]
                  .map((char, index) => `${index === 0 ? "" : "•"}${char}`)
                  .join("")
              : status.name}
          </Typography>
        </Box>
      </TableCell>
      <TableCell
        align="right"
        sx={{
          verticalAlign: "middle",
          paddingY: 2,
          color: colors.blueGrey[300],
          width: 60,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          {count}
        </Typography>
      </TableCell>
      <TableCell align="right" sx={{ verticalAlign: "middle", paddingY: 2 }}>
        <Tooltip title="Actions">
          <IconButton
            aria-label={`Open actions for ${status.name}`}
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              onOpenMenu(event, status);
            }}
          >
            <Icon path={mdiDotsVertical} size={0.8} />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

export default StatusListRow;
