import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  Box,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  colors,
  Stack,
  DialogActions,
  Button,
} from "@mui/material";
import { Icon } from "@mdi/react";
import {
  mdiBell,
  mdiClose,
  mdiContentCopy,
  mdiDotsVertical,
  mdiFormatListBulleted,
  mdiNoteText,
  mdiPencil,
  mdiTrashCan,
} from "@mdi/js";
import type { Category, Item, ItemFilters as ItemFiltersValue } from "../types";
import {
  dateRegex,
  formatDate,
  formatTimestamp,
  isToday,
} from "../utils/formatTimestamp";
import { NO_CATEGORY_FILTER_VALUE } from "../utils/itemFilters";
import {
  containsNumbers,
  containsUrl,
  splitTextByUrls,
} from "../utils/textPatterns";

type ItemListProps = {
  items: Item[];
  categories: Category[];
  filters: ItemFiltersValue;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onCopy: (item: Item) => void;
  onToggleBullet: (item: Item) => void;
  onNotify: (item: Item) => void;
  onCategoryChange: (item: Item, categoryId: string | null) => void;
  selectMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
};

const ROW_HEIGHT = 80;
const OVERSCAN = 6;
const BULLET_PREFIX = "• ";

const allNonEmptyRowsBulleted = (text: string): boolean => {
  const rows = text.split("\n").filter((row) => row.trim().length > 0);
  return (
    rows.length > 0 &&
    rows.every((row) => row.trimStart().startsWith(BULLET_PREFIX))
  );
};

const ItemList = ({
  items,
  categories,
  filters,
  onEdit,
  onDelete,
  onCopy,
  onToggleBullet,
  onNotify,
  onCategoryChange,
  selectMode,
  selectedIds,
  onToggleSelect,
}: ItemListProps) => {
  const [menuAnchor, setMenuAnchor] = useState<{
    el: HTMLElement;
    item: Item;
  } | null>(null);
  const [overflowModalItemId, setOverflowModalItemId] = useState<string | null>(
    null,
  );
  const [hoveredOverflowItemId, setHoveredOverflowItemId] = useState<
    string | null
  >(null);
  const [categoryMenuAnchor, setCategoryMenuAnchor] = useState<{
    el: HTMLElement;
    item: Item;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(400);

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => b.createdAt - a.createdAt),
    [items],
  );
  const overflowModalItem = useMemo(
    () => items.find((item) => item.id === overflowModalItemId) ?? null,
    [items, overflowModalItemId],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setViewportHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const closeMenu = () => setMenuAnchor(null);

  const handleEdit = (item: Item) => {
    onEdit(item);
    closeMenu();
  };

  const handleDelete = (item: Item) => {
    onDelete(item);
    closeMenu();
  };

  const handleCopy = (item: Item) => {
    onCopy(item);
    closeMenu();
  };

  const handleNotify = (item: Item) => {
    onNotify(item);
    closeMenu();
  };

  const handleToggleBullet = (item: Item) => {
    onToggleBullet(item);
    closeMenu();
  };

  const handleTextClick = (event: MouseEvent<HTMLElement>, item: Item) => {
    const target = event.currentTarget as HTMLElement;
    const isOverflowing =
      target.scrollWidth > target.clientWidth ||
      target.scrollHeight > target.clientHeight;

    if (!isOverflowing) {
      return;
    }

    setOverflowModalItemId(item.id);
  };

  const openCategoryMenu = (event: MouseEvent<HTMLElement>, item: Item) => {
    setCategoryMenuAnchor({ el: event.currentTarget, item });
  };

  const closeCategoryMenu = () => setCategoryMenuAnchor(null);

  const handleCategorySelect = (categoryId: string | null) => {
    if (!categoryMenuAnchor) {
      return;
    }
    onCategoryChange(categoryMenuAnchor.item, categoryId);
    closeCategoryMenu();
  };

  const activeFilterCount = [
    filters.categoryId !== "",
    filters.text !== "",
    filters.date !== "",
    filters.endDate !== "",
    filters.hasUrl,
    filters.hasNumber,
    filters.indexAt !== "",
  ].filter(Boolean).length;

  const filteredItems = useMemo(
    () =>
      sortedItems.filter((item, index) => {
        if (filters.categoryId === NO_CATEGORY_FILTER_VALUE) {
          if (item.categoryId !== null) {
            return false;
          }
        } else if (
          filters.categoryId &&
          item.categoryId !== filters.categoryId
        ) {
          return false;
        }
        if (
          filters.text &&
          !item.text.toLowerCase().includes(filters.text.toLowerCase())
        ) {
          return false;
        }
        const itemDate = formatDate(item.createdAt);
        const hasStartDate =
          filters.date.length === 10 && dateRegex.test(filters.date);
        const hasEndDate =
          filters.endDate.length === 10 && dateRegex.test(filters.endDate);

        if (hasStartDate && itemDate < filters.date.trim()) {
          return false;
        }
        if (hasEndDate && itemDate > filters.endDate.trim()) {
          return false;
        }
        if (filters.hasUrl && !containsUrl(item.text)) {
          return false;
        }
        if (filters.hasNumber && !containsNumbers(item.text)) {
          return false;
        }
        if (filters.indexAt) {
          {
            return index === sortedItems.length - Number(filters.indexAt);
          }
        }
        return true;
      }),
    [sortedItems, filters],
  );

  const dayIndexByDate = useMemo(() => {
    const map = new Map<string, number>();
    let index = 0;
    for (const item of filteredItems) {
      const date = formatDate(item.createdAt);
      if (!map.has(date)) {
        map.set(date, index++);
      }
    }
    return map;
  }, [filteredItems]);

  const totalHeight = filteredItems.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    filteredItems.length,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN,
  );
  const visibleItems = filteredItems.slice(startIndex, endIndex);

  return (
    <Box>
      {filteredItems.length === 0 ? (
        <Typography color="text.secondary">
          {sortedItems.length === 0
            ? "No notes added yet"
            : "No notes match the current filters"}
        </Typography>
      ) : (
        <Box
          ref={containerRef}
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
          sx={{
            height: "calc(100vh - 180px)",
            minHeight: 200,
            overflowY: "auto",
            position: "relative",
          }}
        >
          <Box sx={{ height: totalHeight, position: "relative" }}>
            {visibleItems.map((item, i) => {
              const index = startIndex + i;
              const category = item.categoryId
                ? categoriesById.get(item.categoryId)
                : undefined;
              const dayIndex =
                dayIndexByDate.get(formatDate(item.createdAt)) ?? 0;
              return (
                <Box
                  key={item.id}
                  sx={{
                    position: "absolute",
                    top: index * ROW_HEIGHT,
                    left: 0,
                    right: 0,
                    height: ROW_HEIGHT,
                    display: "flex",
                    alignItems: "center",
                    borderBottom: "1px solid",
                    paddingX: 1,
                    borderColor: colors.blueGrey[700],
                    overflow: "hidden",
                    bgcolor:
                      dayIndex % 2 === 0
                        ? colors.blueGrey[800]
                        : colors.blueGrey[900],
                  }}
                >
                  {selectMode && (
                    <Checkbox
                      size="small"
                      checked={selectedIds.has(item.id)}
                      onChange={() => onToggleSelect(item.id)}
                      sx={{ p: 0.5, mr: 0.5 }}
                    />
                  )}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0,
                      pr: 1,
                    }}
                  >
                    <Tooltip
                      title={category ? category.name : "Assign a label"}
                      arrow
                    >
                      <IconButton
                        aria-label={`Change label for ${item.text}`}
                        size="small"
                        onClick={(event: MouseEvent<HTMLElement>) =>
                          openCategoryMenu(event, item)
                        }
                        sx={{
                          p: 0.5,
                          color: category ? "inherit" : colors.blueGrey[500],
                        }}
                      >
                        {category ? (
                          <Icon path={category.icon.path} size={0.8} />
                        ) : (
                          <Icon path={mdiNoteText} size={0.8} />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0, px: 1, textAlign: "left" }}>
                    <Typography
                      component="div"
                      onClick={(event) => handleTextClick(event, item)}
                      onMouseEnter={(event) => {
                        const target = event.currentTarget as HTMLElement;
                        const isOverflowing =
                          target.scrollWidth > target.clientWidth ||
                          target.scrollHeight > target.clientHeight;
                        setHoveredOverflowItemId(
                          isOverflowing ? item.id : null,
                        );
                      }}
                      onMouseLeave={() => setHoveredOverflowItemId(null)}
                      sx={{
                        textAlign: "left",
                        whiteSpace: "pre-wrap",
                        overflow: "hidden",
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        cursor:
                          hoveredOverflowItemId === item.id
                            ? "pointer"
                            : "default",
                      }}
                    >
                      {splitTextByUrls(item.text).map((part, partIndex) =>
                        part.isUrl ? (
                          <Box
                            key={partIndex}
                            component="a"
                            href={part.value}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              color: "info.main",
                              textDecoration: "underline",
                              wordBreak: "break-word",
                            }}
                          >
                            {part.value}
                          </Box>
                        ) : (
                          <span key={partIndex}>{part.value}</span>
                        ),
                      )}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Stack
                        sx={{
                          justifyContent: "space-between",
                          flexDirection: "row",
                          width: "100%",
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            textAlign: "left",
                            display: "flex",
                            alignItems: "center",
                            color: isToday(item.createdAt)
                              ? colors.lightGreen[400]
                              : colors.blueGrey[300],
                          }}
                        >
                          {formatTimestamp(item.createdAt)}
                          <Tooltip title="Notified" arrow>
                            <Box
                              component="span"
                              sx={{
                                ml: 0.5,
                                display: "inline-flex",
                                visibility: item.hasNotification
                                  ? "visible"
                                  : "hidden",
                                color: colors.lightGreen[400],
                              }}
                            >
                              <Icon path={mdiBell} size={0.5} />
                            </Box>
                          </Tooltip>
                        </Typography>
                        {(selectMode || activeFilterCount > 0) && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              textAlign: "left",
                              display: "block",
                              color: colors.blueGrey[400],
                            }}
                          >
                            #
                            {sortedItems.length -
                              sortedItems.findIndex(
                                (currenItem) => currenItem.id === item.id,
                              )}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Tooltip title="Actions">
                      <IconButton
                        aria-label={`Actions for ${item.text}`}
                        size="small"
                        onClick={(event: MouseEvent<HTMLElement>) =>
                          setMenuAnchor({ el: event.currentTarget, item })
                        }
                        disabled={selectMode}
                      >
                        <Icon path={mdiDotsVertical} size={0.8} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
      <Menu anchorEl={menuAnchor?.el} open={!!menuAnchor} onClose={closeMenu}>
        <MenuItem onClick={() => menuAnchor && handleCopy(menuAnchor.item)}>
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
        <MenuItem onClick={() => menuAnchor && handleNotify(menuAnchor.item)}>
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
        <MenuItem onClick={() => menuAnchor && handleEdit(menuAnchor.item)}>
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
        <MenuItem onClick={() => menuAnchor && handleDelete(menuAnchor.item)}>
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
            <Icon path={mdiTrashCan} size={0.7} />
          </Box>
          Delete
        </MenuItem>
      </Menu>
      {overflowModalItem && (
        <Dialog
          open
          onClose={() => setOverflowModalItemId(null)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle sx={{ bgcolor: colors.blueGrey[900], p: 1 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Typography variant="body2">
                {(() => {
                  const category = categories.find(
                    (category) => category.id === overflowModalItem?.categoryId,
                  );

                  return (
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      {category ? (
                        <Icon path={category.icon.path} size={0.8} />
                      ) : (
                        <Icon path={mdiNoteText} size={0.8} />
                      )}
                      {category ? category.name : "No label"}
                    </Box>
                  );
                })()}
              </Typography>
              <IconButton
                aria-label="Close note dialog"
                size="small"
                onClick={() => setOverflowModalItemId(null)}
                sx={{ color: colors.blueGrey[100] }}
              >
                <Icon path={mdiClose} size={0.8} />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ bgcolor: colors.blueGrey[800], p: 2 }}>
            <Typography
              variant="body1"
              sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", mt: 2 }}
            >
              {overflowModalItem?.text}
            </Typography>
          </DialogContent>
          <DialogActions
            sx={{
              bgcolor: colors.blueGrey[900],
              p: 1,
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Button
              variant="contained"
              startIcon={<Icon path={mdiFormatListBulleted} size={0.7} />}
              onClick={() => handleToggleBullet(overflowModalItem)}
            >
              {allNonEmptyRowsBulleted(overflowModalItem.text)
                ? "Del bullets"
                : "Add bullets"}
            </Button>
            <Button
              variant="contained"
              startIcon={<Icon path={mdiContentCopy} size={0.7} />}
              onClick={() => onCopy(overflowModalItem)}
            >
              Copy
            </Button>
          </DialogActions>
        </Dialog>
      )}
      <Menu
        anchorEl={categoryMenuAnchor?.el}
        open={!!categoryMenuAnchor}
        onClose={closeCategoryMenu}
      >
        <MenuItem
          autoFocus={categoryMenuAnchor?.item.categoryId === null}
          selected={categoryMenuAnchor?.item.categoryId === null}
          onClick={() => handleCategorySelect(null)}
          sx={{ color: colors.blueGrey[300] }}
        >
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
              color: colors.blueGrey[300],
            }}
          >
            <Icon path={mdiNoteText} size={0.7} />
          </Box>
          {categories.length == 0 ? "No labels available" : "No label"}
        </MenuItem>
        {categories.map((category) => (
          <MenuItem
            key={category.id}
            autoFocus={categoryMenuAnchor?.item.categoryId === category.id}
            selected={categoryMenuAnchor?.item.categoryId === category.id}
            onClick={() => handleCategorySelect(category.id)}
          >
            <Box
              component="span"
              sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}
            >
              <Icon path={category.icon.path} size={0.7} />
            </Box>
            {category.name}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default ItemList;
