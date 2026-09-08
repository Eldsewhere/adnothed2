import { mdiDelete } from "@mdi/js";
import { Icon } from "@mdi/react";
import { Button } from "@mui/material";
import type { Note } from "../../types";
import EmojiPickerMenu from "./EmojiPickerMenu";

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
  <EmojiPickerMenu
    anchorEl={anchorEl}
    open={Boolean(anchorEl)}
    onClose={onClose}
    title="Emoji"
    onEmojiClick={(emojiData) => {
      onEmojiChange(note, emojiData.emoji);
      onClose();
    }}
    footer={
      <Button
        fullWidth
        variant="contained"
        color="error"
        startIcon={<Icon path={mdiDelete} size={0.7} />}
        onClick={() => {
          onEmojiChange(note, null);
          onClose();
        }}
        sx={{
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        Delete
      </Button>
    }
  />
);

export default EmojiStatusPicker;
