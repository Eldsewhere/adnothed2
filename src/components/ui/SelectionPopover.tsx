import { Box, IconButton, Stack, colors } from "@mui/material";
import { mdiClose } from "@mdi/js";
import { Icon } from "@mdi/react";
import type { ReactNode } from "react";

type SelectionPopoverProps = {
  title: string;
  count: number;
  onClose: () => void;
  children: ReactNode;
};

const SelectionPopover = ({
  title,
  count,
  onClose,
  children,
}: SelectionPopoverProps) => (
  <Stack
    sx={{
      width: "100%",
      height: "100%",
      minHeight: 0,
      boxSizing: "border-box",
      backgroundColor: colors.grey[900],
      display: "flex",
      flexDirection: "column",
    }}
  >
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 1.5,
        py: 1,
        backgroundColor: colors.blueGrey[800],
      }}
    >
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
          fontSize: "0.82rem",
          fontWeight: 700,
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {title}{` `}({count})
      </Box>

      <IconButton
        size="small"
        onClick={onClose}
        aria-label={`Close ${title.toLowerCase()}`}
        sx={{
          color: "rgba(255,255,255,0.8)",
          backgroundColor: "rgba(255,255,255,0.04)",
        }}
      >
        <Icon path={mdiClose} size={0.7} />
      </IconButton>
    </Box>

    <Box
      sx={{
        px: 1.5,
        pb: 1.5,
        pt: 1.5,
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
      }}
    >
      {children}
    </Box>
  </Stack>
);

export default SelectionPopover;
