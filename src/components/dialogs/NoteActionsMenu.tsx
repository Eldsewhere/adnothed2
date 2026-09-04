import { useEffect, useState, type MouseEvent } from "react";
import { Box, Divider, Menu, MenuItem } from "@mui/material";
import { Icon } from "@mdi/react";
import {
  mdiArchiveArrowDown,
  mdiArchiveArrowUp,
  mdiBell,
  mdiCalendarClock,
  mdiCheckBold,
  mdiContentCopy,
  mdiEmoticonOutline,
  mdiEyeOffOutline,
  mdiEyeOutline,
  mdiFilter,
  mdiLink,
  mdiMagnify,
  mdiNoteText,
  mdiOpenInNew,
  mdiPencil,
  mdiPin,
  mdiPinOff,
  mdiShareVariant,
  mdiTrashCanOutline,
  mdiUndo,
} from "@mdi/js";
import type { Note } from "../../types";
import EmojiStatusPicker from "./EmojiStatusPicker";

type NoteActionsMenuProps = {
  anchorEl: HTMLElement | null;
  note: Note | null;
  onHashtagPickerOpen?: () => void;
  openStatusPicker?: boolean;
  openQuickActions?: boolean;
  hasUrl: boolean;
  isPinned: boolean;
  onClose: () => void;
  onNotify: (note: Note) => void;
  onPin: (note: Note) => void;
  onArchive: (note: Note) => void;
  onToggleSpoiler: (note: Note) => void;
  onEmojiChange: (note: Note, emoji: string | null) => void;
  onComplete: (note: Note) => void;
  onCopy: (note: Note, selectedText?: string) => void;
  onClone: (note: Note) => void;
  onShareText: (note: Note, selectedText?: string) => void;
  onShareLink: (note: Note) => void;
  onOpen: (note: Note) => void;
  onSearch: (
    note: Note,
    searchUrl: (query: string) => string,
    selectedText?: string,
  ) => void;
  getSelectedText?: (noteId: string) => string | undefined;
  onDate: (note: Note) => void;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  onAppendHashtagToNote?: (note: Note, tag: string) => void;
};

const SEARCH_ICON_FILENAMES: Record<string, string> = {
  "google.com": "google.png",
  "chatgpt.com": "chatgpt.png",
  "reddit.com": "reddit.png",
  "youtube.com": "youtube.png",
  "maps.google.com": "maps.png",
  "instagram.com": "instagram.png",
  "spotify.com": "spotify.png",
  "amazon.es": "amazon-es.png",
};

const SearchSiteIcon = ({
  domain,
  compact = false,
}: {
  domain: string;
  compact?: boolean;
}) => (
  <Box
    component="img"
    src={`${import.meta.env.BASE_URL}search-icons/${SEARCH_ICON_FILENAMES[domain]}`}
    alt=""
    sx={{ width: 16, height: 16, mr: compact ? 0 : 1, flexShrink: 0 }}
  />
);

const ActionIcon = ({ path }: { path: string }) => (
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
    <Icon path={path} size={0.7} />
  </Box>
);

const NoteActionsMenu = ({
  anchorEl,
  note,
  openStatusPicker,
  openQuickActions,
  hasUrl,
  isPinned,
  onClose,
  onNotify,
  onPin,
  onArchive,
  onToggleSpoiler,
  onEmojiChange,
  onComplete,
  onCopy,
  onClone,
  onShareText,
  onShareLink,
  onOpen,
  onSearch,
  getSelectedText,
  onDate,
  onEdit,
  onDelete,
}: NoteActionsMenuProps) => {
  const [shareMenuAnchor, setShareMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [searchMenuAnchor, setSearchMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    if (openStatusPicker && anchorEl && note) {
      setStatusMenuAnchor(anchorEl);
    }
  }, [anchorEl, note, openStatusPicker]);

  const closeSubmenus = () => {
    setShareMenuAnchor(null);
    setSearchMenuAnchor(null);
    setStatusMenuAnchor(null);
  };

  const handleMenuClose = () => {
    closeSubmenus();
    onClose();
  };

  const runSearch = (site: keyof typeof SEARCH_ICON_FILENAMES) => {
    if (!note) return;
    const queryBuilder = (query: string) => {
      const urlMap: Record<string, (query: string) => string> = {
        "google.com": (value) => `https://www.google.com/search?q=${value}`,
        "chatgpt.com": (value) => `https://chatgpt.com/?q=${value}`,
        "reddit.com": (value) => `https://www.reddit.com/search/?q=${value}`,
        "youtube.com": (value) =>
          `https://www.youtube.com/results?search_query=${value}`,
        "maps.google.com": (value) =>
          `https://www.google.com/maps/search/?api=1&query=${value}`,
        "instagram.com": (value) =>
          `https://www.instagram.com/explore/search/keyword/?q=${value}`,
        "spotify.com": (value) => `https://open.spotify.com/search/${value}`,
        "amazon.es": (value) => `https://www.amazon.es/s?k=${value}`,
      };
      return urlMap[site](query);
    };

    onSearch(note, queryBuilder, getSelectedText?.(note.id));
    setSearchMenuAnchor(null);
    onClose();
  };

  const selectedText = note ? getSelectedText?.(note.id) : undefined;
  const hasSelectedText = Boolean(selectedText);

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl && note && openQuickActions)}
        onClose={handleMenuClose}
      >
        {note && (
          <>
            <MenuItem
              selected={Boolean(note.hasNotification)}
              onClick={() => { onNotify(note); handleMenuClose(); }}
            >
              <ActionIcon path={mdiBell} />
              Notify
            </MenuItem>
            <MenuItem
              selected={Boolean(note.pinned)}
              onClick={() => { onPin(note); handleMenuClose(); }}
            >
              <ActionIcon path={isPinned ? mdiPinOff : mdiPin} />
              {isPinned ? "Unpin" : "Pin"}
            </MenuItem>
            <MenuItem
              selected={Boolean(note.completed)}
              onClick={() => { onComplete(note); handleMenuClose(); }}
            >
              <ActionIcon path={note.completed ? mdiUndo : mdiCheckBold} />
              {note.completed ? "Undone" : "Done"}
            </MenuItem>
            <MenuItem
              selected={Boolean(note.archived)}
              onClick={() => { onArchive(note); handleMenuClose(); }}
            >
              <ActionIcon
                path={note.archived ? mdiArchiveArrowUp : mdiArchiveArrowDown}
              />
              {note.archived ? "Unarchive" : "Archive"}
            </MenuItem>
            <MenuItem
              selected={Boolean(note.spoiler)}
              onClick={() => { onToggleSpoiler(note); handleMenuClose(); }}
            >
              <ActionIcon path={note.spoiler ? mdiEyeOutline : mdiEyeOffOutline} />
              {note.spoiler ? "Show" : "Hide"}
            </MenuItem>
            <MenuItem
              selected={Boolean(note.emoji)}
              onClick={(event) => setStatusMenuAnchor(event.currentTarget)}
            >
              <ActionIcon path={mdiEmoticonOutline} />
              Emoji
            </MenuItem>
            <EmojiStatusPicker
              note={note}
              anchorEl={statusMenuAnchor}
              onClose={() => setStatusMenuAnchor(null)}
              onEmojiChange={(changedNote, emoji) => {
                if (changedNote) {
                  onEmojiChange(changedNote, emoji);
                }
                handleMenuClose();
              }}
            />
          </>
        )}
      </Menu>
      <Menu
        anchorEl={anchorEl}
        open={
          Boolean(anchorEl && note && hasSelectedText) &&
          !openStatusPicker &&
          !openQuickActions
        }
        onClose={handleMenuClose}
      >
        {note && selectedText && (
          <>
            <MenuItem
              disabled
              sx={{
                minHeight: 28,
                py: 0.25,
                fontSize: "0.75rem",
                lineHeight: 1.2,
                maxWidth: 280,
                whiteSpace: "normal",
                overflowWrap: "anywhere",
              }}
            >
              {selectedText}
            </MenuItem>
            <Divider sx={{ m: `0 !important` }} />
            <MenuItem
              onClick={() => {
                onCopy(note, selectedText);
                handleMenuClose();
              }}
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
                <Icon path={mdiContentCopy} size={0.8} />
              </Box>
              Copy
            </MenuItem>
            <MenuItem
              onClick={() => {
                onShareText(note, selectedText);
                handleMenuClose();
              }}
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
                <Icon path={mdiShareVariant} size={0.7} />
              </Box>
              Share
            </MenuItem>
            <MenuItem onClick={() => runSearch("google.com")}>
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
                <SearchSiteIcon domain="google.com" compact />
              </Box>
              Search
            </MenuItem>
            <MenuItem
              onClick={() => {
                onClone(note);
                handleMenuClose();
              }}
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
                <Icon path={mdiFilter} size={0.8} />
              </Box>
              Filter
            </MenuItem>
          </>
        )}
      </Menu>
      <Menu
        anchorEl={anchorEl}
        open={
          Boolean(anchorEl && note) &&
          !openStatusPicker &&
          !openQuickActions &&
          !hasSelectedText
        }
        onClose={handleMenuClose}
      >
        {note && (
          <>
            <MenuItem
              onClick={() => {
                onCopy(note, getSelectedText?.(note.id));
                handleMenuClose();
              }}
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
                <Icon path={mdiContentCopy} size={0.8} />
              </Box>
              Copy
            </MenuItem>
            <MenuItem
              onClick={(event: MouseEvent<HTMLElement>) => {
                setShareMenuAnchor(event.currentTarget);
              }}
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
                <Icon path={mdiShareVariant} size={0.7} />
              </Box>
              Share
            </MenuItem>
            {hasUrl && !hasSelectedText ? (
              <MenuItem
                onClick={() => {
                  onOpen(note);
                  handleMenuClose();
                }}
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
                  <Icon path={mdiOpenInNew} size={0.7} />
                </Box>
                Open
              </MenuItem>
            ) : (
              <MenuItem
                onClick={(event: MouseEvent<HTMLElement>) => {
                  setSearchMenuAnchor(event.currentTarget);
                }}
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
                  <Icon path={mdiMagnify} size={0.7} />
                </Box>
                Search
              </MenuItem>
            )}
            <MenuItem
              onClick={() => {
                onClone(note);
                handleMenuClose();
              }}
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
                <Icon path={mdiFilter} size={0.8} />
              </Box>
              Filter
            </MenuItem>
            <Divider sx={{ m: `0 !important` }} />
            <MenuItem
              onClick={() => {
                onEdit(note);
                handleMenuClose();
              }}
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
                <Icon path={mdiPencil} size={0.7} />
              </Box>
              Edit
            </MenuItem>
            <MenuItem
              onClick={() => {
                onDate(note);
                handleMenuClose();
              }}
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
                <Icon path={mdiCalendarClock} size={0.7} />
              </Box>
              Schedule
            </MenuItem>
            <MenuItem
              onClick={() => {
                onDelete(note);
                handleMenuClose();
              }}
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
                <Icon path={mdiTrashCanOutline} size={0.7} />
              </Box>
              Delete
            </MenuItem>
          </>
        )}
      </Menu>
      <Menu
        anchorEl={shareMenuAnchor}
        open={Boolean(shareMenuAnchor)}
        onClose={() => setShareMenuAnchor(null)}
        anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
        transformOrigin={{ horizontal: "right", vertical: "center" }}
      >
        <MenuItem
          onClick={() => {
            if (!note) return;
            onShareText(note, getSelectedText?.(note.id));
            setShareMenuAnchor(null);
            onClose();
          }}
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
            <Icon path={mdiNoteText} size={0.7} />
          </Box>
          Text
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (!note) return;
            onShareLink(note);
            setShareMenuAnchor(null);
            onClose();
          }}
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
            <Icon path={mdiLink} size={0.7} />
          </Box>
          Link
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={searchMenuAnchor}
        open={Boolean(searchMenuAnchor)}
        onClose={() => setSearchMenuAnchor(null)}
        anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
        transformOrigin={{ horizontal: "right", vertical: "center" }}
      >
        {(
          [
            "google.com",
            "chatgpt.com",
            "reddit.com",
            "youtube.com",
            "maps.google.com",
            "instagram.com",
            "spotify.com",
            "amazon.es",
          ] as const
        ).map((site) => (
          <MenuItem key={site} onClick={() => runSearch(site)}>
            <SearchSiteIcon domain={site} />
            {site === "google.com"
              ? "Google"
              : site === "chatgpt.com"
                ? "ChatGPT"
                : site === "reddit.com"
                  ? "Reddit"
                  : site === "youtube.com"
                    ? "YouTube"
                    : site === "maps.google.com"
                      ? "Maps"
                      : site === "instagram.com"
                        ? "Instagram"
                        : site === "spotify.com"
                          ? "Spotify"
                          : "Amazon.es"}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default NoteActionsMenu;
