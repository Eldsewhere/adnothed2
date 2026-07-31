import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  Box,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
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
import { formatDate, formatTimestamp } from "../utils/formatTimestamp";
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
  selectMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
};

const ROW_HEIGHT = 80;
const OVERSCAN = 6;
const dateRegex = /^\d{4}(?:-(0[1-9]|1[0-2])(?:-(0[1-9]|\d|3))?)?$/;

const ItemList = ({
  items,
  categories,
  filters,
  onEdit,
  onDelete,
  onCopy,
  onNotify,
  selectMode,
  selectedIds,
  onToggleSelect,
}: ItemListProps) => {
  const [menuAnchor, setMenuAnchor] = useState<{
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

  const filteredItems = useMemo(
    () =>
      sortedItems.filter((item) => {
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
            ? "No items added yet."
            : "No items match the current filters."}
        </Typography>
      ) : (
        <Box
          ref={containerRef}
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
          sx={{
            height: "calc(100vh - 320px)",
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
                    borderColor: "divider",
                    px: 1,
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
                    {category ? (
                      <Tooltip title={category.name}>
                        <Box
                          sx={{ display: "inline-flex", alignItems: "center" }}
                        >
                          <Icon path={category.icon.path} size={0.8} />
                        </Box>
                      </Tooltip>
                    ) : (
                      <Icon path={mdiNoteText} size={0.8} />
                    )}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0, px: 1, textAlign: "left" }}>
                    <Typography
                      component="div"
                      sx={{
                        textAlign: "left",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
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
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ textAlign: "left", display: "block" }}
                    >
                      {formatTimestamp(item.createdAt * 1000)}
                    </Typography>
                  </Box>
                  <Box sx={{ flexShrink: 0 }}>
                    <IconButton
                      aria-label={`Copy ${item.text}`}
                      size="small"
                      onClick={() => handleCopy(item)}
                    >
                      <Icon path={mdiContentCopy} size={0.8} />
                    </IconButton>
                    <IconButton
                      aria-label={`Actions for ${item.text}`}
                      size="small"
                      onClick={(event: MouseEvent<HTMLElement>) =>
                        setMenuAnchor({ el: event.currentTarget, item })
                      }
                    >
                      <Icon path={mdiDotsVertical} size={0.8} />
                    </IconButton>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
      <Menu anchorEl={menuAnchor?.el} open={!!menuAnchor} onClose={closeMenu}>
        <MenuItem onClick={() => menuAnchor && handleNotify(menuAnchor.item)}>
          <Box
            component="span"
            sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}
          >
            <Icon path={mdiBellOutline} size={0.7} />
          </Box>
          Notify
        </MenuItem>
        <MenuItem onClick={() => menuAnchor && handleEdit(menuAnchor.item)}>
          <Box
            component="span"
            sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}
          >
            <Icon path={mdiPencilOutline} size={0.7} />
          </Box>
          Edit
        </MenuItem>
        <MenuItem onClick={() => menuAnchor && handleDelete(menuAnchor.item)}>
          <Box
            component="span"
            sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}
          >
            <Icon path={mdiTrashCanOutline} size={0.7} />
          </Box>
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ItemList;
