import { useState, type MouseEvent } from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  MenuItem,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Icon } from "@mdi/react";
import { mdiFilterOutline } from "@mdi/js";
import type { Category, ItemFilters as ItemFiltersValue } from "../types";
import {
  emptyItemFilters,
  NO_CATEGORY_FILTER_VALUE,
} from "../utils/itemFilters";
import { dateRegex } from "../utils/formatTimestamp";

type ItemFiltersProps = {
  categories: Category[];
  filters: ItemFiltersValue;
  onChange: (filters: ItemFiltersValue) => void;
};

const ItemFilters = ({ categories, filters, onChange }: ItemFiltersProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const selectedCategory = categories.find(
    (category) => category.id === filters.categoryId,
  );
  const buttonIconPath = selectedCategory
    ? selectedCategory.icon.path
    : mdiFilterOutline;

  const activeFilterCount = [
    filters.categoryId !== "",
    filters.text !== "",
    filters.date !== "",
    filters.endDate !== "",
    filters.hasUrl,
    filters.hasNumber,
    filters.indexAt !== "",
  ].filter(Boolean).length;

  const handleOpen = (event: MouseEvent<HTMLButtonElement>) =>
    setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const filtersActive = Boolean(anchorEl) || activeFilterCount > 0;

  return (
    <>
      <Tooltip
        title={`Open filters ${activeFilterCount ? ` (${activeFilterCount} active)` : ""}`}
      >
        <IconButton
          aria-label="Filter notes"
          onClick={handleOpen}
          color={filtersActive ? "primary" : "default"}
        >
          {
            <Badge
              badgeContent={
                activeFilterCount &&
                !(activeFilterCount === 1 && filters.categoryId !== "")
                  ? activeFilterCount
                  : null
              }
              color="primary"
            >
              <Icon path={buttonIconPath} size={0.9} />
            </Badge>
          }
        </IconButton>
      </Tooltip>
      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box sx={{ p: 1, width: 200 }}>
          <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
            Filter notes
          </Typography>
          <Stack spacing={2}>
            <TextField
              select
              label="Label"
              size="small"
              value={filters.categoryId}
              onChange={(event) =>
                onChange({ ...filters, categoryId: event.target.value })
              }
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value={NO_CATEGORY_FILTER_VALUE}>No label</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Note contains"
              size="small"
              value={filters.text}
              onChange={(event) =>
                onChange({ ...filters, text: event.target.value })
              }
            />
            <TextField
              label="Note Index"
              size="small"
              type="number"
              value={filters.indexAt}
              onChange={(event) =>
                onChange({ ...filters, indexAt: event.target.value })
              }
            />
            <TextField
              label={
                filters.date && dateRegex.test(filters.date) && filters.endDate
                  ? "Date after"
                  : "Date equals"
              }
              size="small"
              placeholder="YYYY-MM-DD"
              value={filters.date}
              onChange={(event) =>
                onChange({ ...filters, date: event.target.value })
              }
            />
            {filters.date && dateRegex.test(filters.date) && (
              <TextField
                label="Date before"
                size="small"
                placeholder="YYYY-MM-DD"
                value={filters.endDate}
                onChange={(event) =>
                  onChange({ ...filters, endDate: event.target.value })
                }
              />
            )}
            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.hasUrl}
                    onChange={(event) =>
                      onChange({ ...filters, hasUrl: event.target.checked })
                    }
                  />
                }
                label="With URLs"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.hasNumber}
                    onChange={(event) =>
                      onChange({ ...filters, hasNumber: event.target.checked })
                    }
                  />
                }
                label="Only numbers"
              />
            </Stack>
            <Tooltip
              title={
                activeFilterCount === 0
                  ? "No filters to clear"
                  : "Clear filters"
              }
            >
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={activeFilterCount === 0}
                  onClick={() => onChange(emptyItemFilters)}
                >
                  Clear filters
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Box>
      </Popover>
    </>
  );
};

export default ItemFilters;
