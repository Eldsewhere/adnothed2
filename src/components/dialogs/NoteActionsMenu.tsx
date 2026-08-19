import { useState, type MouseEvent } from "react";
import { Box, Divider, Menu, MenuItem } from "@mui/material";
import { Icon } from "@mdi/react";
import {
  mdiBell,
  mdiCalendarClock,
  mdiClockOutline,
  mdiContentCopy,
  mdiContentDuplicate,
  mdiLink,
  mdiMagnify,
  mdiNoteText,
  mdiOpenInNew,
  mdiPencil,
  mdiPin,
  mdiPinOff,
  mdiShareVariant,
  mdiTrashCanOutline,
} from "@mdi/js";
import type { Note } from "../../types";

type NoteActionsMenuProps = {
  anchorEl: HTMLElement | null;
  note: Note | null;
  hasUrl: boolean;
  isPinned: boolean;
  onClose: () => void;
  onNotify: (note: Note) => void;
  onPin: (note: Note) => void;
  onComplete: (note: Note) => void;
  onCopy: (note: Note) => void;
  onClone: (note: Note) => void;
  onShareText: (note: Note) => void;
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

const SearchSiteIcon = ({ domain }: { domain: string }) => (
  <Box
    component="img"
    src={`${import.meta.env.BASE_URL}search-icons/${SEARCH_ICON_FILENAMES[domain]}`}
    alt=""
    sx={{ width: 16, height: 16, mr: 1, flexShrink: 0 }}
  />
);

const isDueTodayOrLater = (due: number): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due >= today.getTime() / 1000;
};

const NoteActionsMenu = ({
  anchorEl,
  note,
  hasUrl,
  isPinned,
  onClose,
  onNotify,
  onPin,
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

  const closeSubmenus = () => {
    setShareMenuAnchor(null);
    setSearchMenuAnchor(null);
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

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl && note)}
        onClose={handleMenuClose}
      >
        {note && (
          <>
            <MenuItem
              onClick={() => {
                onNotify(note);
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
                <Icon path={mdiBell} size={0.7} />
              </Box>
              Notify
            </MenuItem>
            <MenuItem
              onClick={() => {
                onPin(note);
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
                <Icon path={isPinned ? mdiPinOff : mdiPin} size={0.7} />
              </Box>
              {isPinned ? "Unpin" : "Pin"}
            </MenuItem>
            {note.due !== undefined && isDueTodayOrLater(note.due) && (
              <MenuItem
                onClick={() => {
                  onComplete(note);
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
                  <Icon path={mdiClockOutline} size={0.7} />
                </Box>
                Complete
              </MenuItem>
            )}
            <Divider sx={{ m: `0 !important` }} />
            <MenuItem
              onClick={() => {
                onCopy(note);
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
            {hasUrl ? (
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
            <Divider sx={{ m: `0 !important` }} />
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
                <Icon path={mdiContentDuplicate} size={0.8} />
              </Box>
              Clone
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
            onShareText(note);
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
