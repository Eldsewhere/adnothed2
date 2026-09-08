import { Box, IconButton, Menu, colors } from "@mui/material";
import { mdiClose } from "@mdi/js";
import { Icon } from "@mdi/react";
import Picker, { Theme, type EmojiClickData } from "emoji-picker-react";
import type { ReactNode } from "react";

type EmojiPickerMenuProps = {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  title?: string;
  onEmojiClick: (emojiData: EmojiClickData) => void;
  footer?: ReactNode;
  width?: number;
  height?: number;
};

const EmojiPickerMenu = ({
  anchorEl,
  open,
  onClose,
  title = "Pick Emoji",
  onEmojiClick,
  footer,
  width = 352,
  height = 420,
}: EmojiPickerMenuProps) => (
  <Menu
    anchorEl={anchorEl}
    open={open}
    onClose={onClose}
    slotProps={{
      paper: {
        sx: {
          overflow: "hidden",
          border: "1px solid #455a64",
          backgroundColor: colors.blueGrey[900],
          boxShadow: "0 16px 36px rgba(15, 23, 42, 0.45)",
          padding: 0,
          margin: 0,
        },
      },
    }}
  >
    <Box
      role="group"
      aria-label="Emoji picker"
      sx={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: colors.blueGrey[900],
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 1.5,
          py: 0.75,
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
          {title}
        </Box>

        <IconButton
          size="small"
          onClick={onClose}
          aria-label="Close emoji picker"
          sx={{
            color: "rgba(255,255,255,0.8)",
            backgroundColor: "rgba(255,255,255,0.04)",
          }}
        >
          <Icon path={mdiClose} size={0.7} />
        </IconButton>
      </Box>

      <Box sx={{ backgroundColor: colors.blueGrey[900], lineHeight: 0 }}>
        <Picker
          onEmojiClick={onEmojiClick}
          lazyLoadEmojis
          theme={Theme.DARK}
          width={width}
          height={height}
        />
      </Box>

      {footer ? <Box sx={{ px: 1, pb: 1 }}>{footer}</Box> : null}
    </Box>
  </Menu>
);

export default EmojiPickerMenu;
