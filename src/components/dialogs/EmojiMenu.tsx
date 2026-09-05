import { useState, type MouseEvent } from "react";
import { Box, IconButton, Menu, MenuItem, Tooltip } from "@mui/material";
import { Icon } from "@mdi/react";
import { mdiEmoticonOutline } from "@mdi/js";
import Picker, { Theme, type EmojiClickData } from "emoji-picker-react";

type EmojiMenuProps = {
  value: string;
  onTextChange: (value: string) => void;
  textAreaRef: React.RefObject<HTMLTextAreaElement | null>;
  mode?: "icon" | "menu";
};

const EmojiMenu = ({
  value,
  onTextChange,
  textAreaRef,
  mode = "icon",
}: EmojiMenuProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const insertEmoji = (emojiData: EmojiClickData) => {
    const emoji = emojiData.emoji;
    const textArea = textAreaRef.current;
    const start = textArea?.selectionStart ?? value.length;
    const end = textArea?.selectionEnd ?? value.length;
    const nextValue = value.slice(0, start) + emoji + value.slice(end);

    onTextChange(nextValue);
    setAnchorEl(null);

    requestAnimationFrame(() => {
      textArea?.focus();
      const cursor = start + emoji.length;
      textArea?.setSelectionRange(cursor, cursor);
    });
  };

  if (mode === "menu") {
    return (
      <>
        <MenuItem
          onClick={(event: MouseEvent<HTMLElement>) =>
            setAnchorEl(event.currentTarget)
          }
        >
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
              py: 1,
              px: 0.5,
            }}
          >
            <Icon path={mdiEmoticonOutline} size={0.75} />
          </Box>
          Emoji
        </MenuItem>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          slotProps={{
            paper: {
              sx: {
                overflow: "hidden",
                bgcolor: "#263238",
                border: "1px solid #455a64",
                boxShadow: "0 16px 36px rgba(15, 23, 42, 0.45)",
              },
            },
          }}
        >
          <Box role="group" aria-label="Emoji picker">
            <Picker
              onEmojiClick={insertEmoji}
              lazyLoadEmojis
              theme={Theme.DARK}
              width={352}
              height={420}
            />
          </Box>
        </Menu>
      </>
    );
  }

  return (
    <>
      <Tooltip title="Insert emoji" arrow>
        <IconButton
          aria-label="Insert emoji"
          size="small"
          onClick={(event: MouseEvent<HTMLElement>) =>
            setAnchorEl(event.currentTarget)
          }
          sx={{
            color: "#cbd5e1",
            borderRadius: 1,
            minWidth: 32,
            width: 32,
            height: 32,
            p: 0,
            "&:hover": { backgroundColor: "rgba(148, 163, 184, 0.12)" },
          }}
        >
          <Icon path={mdiEmoticonOutline} size={0.8} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              overflow: "hidden",
              bgcolor: "#263238",
              border: "1px solid #455a64",
              boxShadow: "0 16px 36px rgba(15, 23, 42, 0.45)",
            },
          },
        }}
      >
        <Box role="group" aria-label="Emoji picker">
          <Picker
            onEmojiClick={insertEmoji}
            lazyLoadEmojis
            theme={Theme.DARK}
            width={352}
            height={420}
          />
        </Box>
      </Menu>
    </>
  );
};

export default EmojiMenu;
