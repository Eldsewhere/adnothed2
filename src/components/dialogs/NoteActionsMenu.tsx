import { useEffect, useState, type MouseEvent } from "react";
import {
  Box,
  Button,
  ButtonBase,
  Divider,
  Menu,
  MenuItem,
  Popover,
  colors,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Icon } from "@mdi/react";
import {
  mdiArchiveArrowDown,
  mdiArchiveArrowUp,
  mdiBell,
  mdiCalendarClock,
  mdiClockOutline,
  mdiContentCopy,
  mdiEyeOffOutline,
  mdiEyeOutline,
  mdiFilter,
  mdiLink,
  mdiMagnify,
  mdiMinusCircle,
  mdiNoteText,
  mdiOpenInNew,
  mdiPencil,
  mdiPin,
  mdiPinOff,
  mdiShareVariant,
  mdiTrashCanOutline,
} from "@mdi/js";
import type { Note, Status, StatusFormValues } from "../../types";
import StatusForm from "../StatusForm";
import StatusList from "../StatusList";
import SelectionPopover from "./SelectionPopover";

type NoteActionsMenuProps = {
  anchorEl: HTMLElement | null;
  note: Note | null;
  statuses: Status[];
  onHashtagPickerOpen?: () => void;
  openStatusPicker?: boolean;
  hasUrl: boolean;
  isPinned: boolean;
  onClose: () => void;
  onNotify: (note: Note) => void;
  onPin: (note: Note) => void;
  onArchive: (note: Note) => void;
  onToggleSpoiler: (note: Note) => void;
  onEmojiChange: (note: Note, emoji: string | null) => void;
  statusManagement: {
    notes: Note[];
    editingStatus: Status | null;
    onSubmit: (values: StatusFormValues) => boolean | void;
    onCancelEdit: () => void;
    onEdit: (status: Status) => void;
    onDelete: (status: Status) => void;
    newStatusId?: string | null;
  };
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
  statuses,
  openStatusPicker,
  hasUrl,
  isPinned,
  onClose,
  onNotify,
  onPin,
  onArchive,
  onToggleSpoiler,
  onEmojiChange,
  statusManagement,
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
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [shareMenuAnchor, setShareMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [searchMenuAnchor, setSearchMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [isStatusFormOpen, setIsStatusFormOpen] = useState(false);

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

  const selectStatus = (status: Status | null) => {
    if (!note) return;
    onEmojiChange(note, status ? status.emoji : null);
    handleMenuClose();
  };

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl && note) && !openStatusPicker}
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
            <MenuItem
              onClick={() => {
                onArchive(note);
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
                <Icon
                  path={note.archived ? mdiArchiveArrowUp : mdiArchiveArrowDown}
                  size={0.7}
                />
              </Box>
              {note.archived ? "Unarchive" : "Archive"}
            </MenuItem>
            <MenuItem
              onClick={() => {
                onToggleSpoiler(note);
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
                <Icon path={note.spoiler ? mdiEyeOutline : mdiEyeOffOutline} size={0.7} />
              </Box>
              {note.spoiler ? "Hide spoiler" : "Spoiler"}
            </MenuItem>
            <MenuItem
              onClick={(event: MouseEvent<HTMLElement>) =>
                setStatusMenuAnchor(event.currentTarget)
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
                <Icon path={mdiMinusCircle} size={0.7} />
              </Box>
              Status
            </MenuItem>
            {note.due !== undefined &&
              !note.completed &&
              isDueTodayOrLater(note.due) && (
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
      <Popover
        anchorEl={statusMenuAnchor}
        open={Boolean(statusMenuAnchor)}
        onClose={() => {
          setStatusMenuAnchor(null);
          setIsStatusFormOpen(false);
          if (openStatusPicker) {
            onClose();
          }
        }}
        marginThreshold={0}
        anchorOrigin={
          isSmallScreen
            ? { vertical: "top", horizontal: "left" }
            : { vertical: "bottom", horizontal: "left" }
        }
        transformOrigin={
          isSmallScreen
            ? { vertical: "top", horizontal: "left" }
            : { vertical: "top", horizontal: "left" }
        }
        slotProps={{
          paper: {
            sx: {
              width: isSmallScreen ? "100vw" : 360,
              maxWidth: isSmallScreen ? "100vw" : "calc(100vw - 32px)",
              height: isSmallScreen ? "100vh" : "auto",
              maxHeight: isSmallScreen ? "100vh" : undefined,
              borderRadius: isSmallScreen ? 0 : 1,
              border: "none",
              boxShadow: "none",
              overflow: isSmallScreen ? "auto" : "hidden",
              m: isSmallScreen ? 0 : undefined,
              outline: "none",
            },
          },
        }}
      >
        <SelectionPopover
          title="Status"
          count={statuses.length}
          onClose={() => {
            setStatusMenuAnchor(null);
            setIsStatusFormOpen(false);
            if (openStatusPicker) {
              onClose();
            }
          }}
        >
          {!isStatusFormOpen && !statusManagement.editingStatus && (
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setIsStatusFormOpen(true)}
              sx={{
                justifyContent: "center",
                mb: 1,
              }}
            >
              Create status
            </Button>
          )}
          {isStatusFormOpen || statusManagement.editingStatus ? (
            <StatusForm
              editingStatus={statusManagement.editingStatus}
              onSubmit={(values) => {
                const result = statusManagement.onSubmit(values);
                if (result !== false) setIsStatusFormOpen(false);
                return result;
              }}
              onCancelEdit={() => {
                statusManagement.onCancelEdit();
                setIsStatusFormOpen(false);
              }}
            />
          ) : null}
          <ButtonBase
            onClick={() => selectStatus(null)}
            sx={{
              alignItems: "center",
              bgcolor: colors.blueGrey[900],
              borderBottom: "3px solid",
              borderColor: colors.grey[900],
              borderRadius: 1,
              color: colors.blueGrey[300],
              display: "flex",
              justifyContent: "flex-start",
              minHeight: 40,
              p: 2,
              my: 0.5,
              textAlign: "left",
              width: "100%",
              ...(!note?.emoji && { bgcolor: "action.selected" }),
            }}
          >
            <Box
              component="span"
              sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}
            >
              <Icon path={mdiMinusCircle} size={0.7} />
            </Box>
            No status
          </ButtonBase>
          <StatusList
            statuses={statuses}
            notes={statusManagement.notes}
            editingStatusId={statusManagement.editingStatus?.id ?? null}
            selectedStatusEmoji={note?.emoji ?? null}
            onEdit={(status) => {
              statusManagement.onEdit(status);
              setIsStatusFormOpen(true);
            }}
            onDelete={statusManagement.onDelete}
            newStatusId={statusManagement.newStatusId}
            onSelect={selectStatus}
          />
        </SelectionPopover>
      </Popover>

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
