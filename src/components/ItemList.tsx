import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  Box,
  Badge,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  colors,
  Stack,
} from "@mui/material";
import { Icon } from "@mdi/react";
import {
  mdiBellOutline,
  mdiContentCopy,
  mdiDotsVertical,
  mdiNoteText,
  mdiPencilOutline,
  mdiTrashCanOutline,
} from "@mdi/js";
import type { Category, Item, ItemFilters as ItemFiltersValue } from "../types";
import {
  dateRegex,
  formatDate,
  formatTimestamp,
  isToday,
  isYesterday,
} from "../utils/formatTimestamp";
import { NO_CATEGORY_FILTER_VALUE } from "../utils/itemFilters";
import {
  containsUrl,
  isOnlyNumbers,
  splitTextByUrls,
} from "../utils/textPatterns";

type ItemListProps = {
  items: Item[];
  categories: Category[];
  filters: ItemFiltersValue;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onCopy: (item: Item) => void;
  onNotify: (item: Item) => void;
  onCategoryChange: (item: Item, categoryId: string | null) => void;
  selectMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
};

const ROW_HEIGHT = 80;
const OVERSCAN = 6;

const ItemList = ({
  items,
  categories,
  filters,
  onEdit,
  onDelete,
  onCopy,
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
  const [tooltipItemId, setTooltipItemId] = useState<string | null>(null);
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

  const handleTextClick = (event: MouseEvent<HTMLElement>, itemId: string) => {
    const target = event.currentTarget as HTMLElement;
    const isOverflowing =
      target.scrollWidth > target.clientWidth ||
      target.scrollHeight > target.clientHeight;

    if (!isOverflowing) {
      return;
    }

    setTooltipItemId((current) => (current === itemId ? null : itemId));
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
        if (!filters.endDate) {
          if (
            filters.date &&
            dateRegex.test(filters.date) &&
            !formatDate(item.createdAt).startsWith(filters.date.trim())
          ) {
            return false;
          }
        } else {
          if (
            filters.date &&
            dateRegex.test(filters.date) &&
            filters.endDate &&
            dateRegex.test(filters.endDate) &&
            filters.date.length === filters.endDate.length &&
            !(
              formatDate(item.createdAt).substring(0, filters.date.length) >=
                filters.date.trim() &&
              formatDate(item.createdAt).substring(0, filters.endDate.length) <=
                filters.endDate.trim()
            )
          ) {
            return false;
          }
        }
        if (filters.hasUrl && !containsUrl(item.text)) {
          return false;
        }
        if (filters.hasNumber && !isOnlyNumbers(item.text)) {
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
              const today = isToday(item.createdAt);
              const yesterday = isYesterday(item.createdAt);
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
                    bgcolor: today
                      ? colors.blueGrey[800]
                      : yesterday
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
                    <Tooltip
                      title={item.text}
                      open={tooltipItemId === item.id}
                      onClose={() => setTooltipItemId(null)}
                      disableHoverListener
                      disableFocusListener
                      enterDelay={0}
                      leaveDelay={200}
                      arrow
                      slotProps={{
                        tooltip: {
                          sx: {
                            bgcolor: "grey.900",
                            color: "#ffffff",
                            border: "1px solid rgba(255,255,255,0.12)",
                            maxWidth: "calc(100vw - 32px)",
                          },
                        },
                        arrow: {
                          sx: {
                            color: "grey.900",
                          },
                        },
                      }}
                      sx={{ width: "100%" }}
                    >
                      <Typography
                        component="div"
                        onClick={(event) => handleTextClick(event, item.id)}
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
                    </Tooltip>
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
                            display: "block",
                            color: colors.blueGrey[300],
                          }}
                        >
                          {formatTimestamp(item.createdAt)}
                        </Typography>
                        {selectMode && (
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
                      <Tooltip title="Recent" arrow>
                        <Badge
                          variant="dot"
                          color="error"
                          overlap="circular"
                          invisible={!Boolean(item.hasNotification)}
                        />
                      </Tooltip>
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
            <Icon path={mdiBellOutline} size={0.7} />
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
            <Icon path={mdiPencilOutline} size={0.7} />
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
            <Icon path={mdiTrashCanOutline} size={0.7} />
          </Box>
          Delete
        </MenuItem>
      </Menu>
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
