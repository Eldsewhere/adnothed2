import { mdiDelete } from "@mdi/js";
import { Icon } from "@mdi/react";
import { Box, Button, colors, Menu } from "@mui/material";
import Picker, { Theme } from "emoji-picker-react";
import type { Note } from "../../types";

type EmojiStatusPickerProps = {
  note: Note | null;
  onEmojiChange: (note: Note | null, emoji: string | null) => void;
  anchorEl: HTMLElement | null;
  onClose: () => void;
};

const EmojiStatusPicker = ({
  note,
  onEmojiChange,
  anchorEl,
  onClose,
}: EmojiStatusPickerProps) => (
  <Menu
    anchorEl={anchorEl}
    open={Boolean(anchorEl)}
    onClose={onClose}
    slotProps={{
      paper: {
        sx: {
          overflow: "hidden",
          backgroundColor: colors.blueGrey[900],
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
        gap: 1,
        padding: 1,
        margin: 0,
      }}
    >
      <Picker
        onEmojiClick={(emojiData) => {
          onEmojiChange(note, emojiData.emoji);
          onClose();
        }}
        lazyLoadEmojis
        theme={Theme.DARK}
        width={352}
        height={420}
      />
      <Button
        variant="contained"
        color="error"
        startIcon={<Icon path={mdiDelete} size={0.7} />}
        onClick={() => {
          onEmojiChange(note, null);
          onClose();
        }}
      >
        Delete
      </Button>
    </Box>
  </Menu>
);

export default EmojiStatusPicker;
