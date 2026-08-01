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

  const activeFilterCount = [
    filters.categoryId !== "",
    filters.text !== "",
    filters.date !== "",
    filters.endDate !== "",
    filters.hasUrl,
    filters.hasNumber,
  ].filter(Boolean).length;

  const handleOpen = (event: MouseEvent<HTMLButtonElement>) =>
    setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <Tooltip title="Open filters">
        <IconButton aria-label="Filter items" onClick={handleOpen}>
          <Badge badgeContent={activeFilterCount} color="primary">
            <Icon path={mdiFilterOutline} size={0.9} />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box sx={{ p: 2, width: 260 }}>
          <Typography variant="subtitle2" gutterBottom>
            Filter items
          </Typography>
          <Stack spacing={2}>
            <TextField
              select
              label="Category"
              size="small"
              value={filters.categoryId}
              onChange={(event) =>
                onChange({ ...filters, categoryId: event.target.value })
              }
            >
              <MenuItem value="">All categories</MenuItem>
              <MenuItem value={NO_CATEGORY_FILTER_VALUE}>No group</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Text contains"
              size="small"
              value={filters.text}
              onChange={(event) =>
                onChange({ ...filters, text: event.target.value })
              }
            />
            <TextField
              label="Date"
              size="small"
              placeholder="YYYY-MM-DD"
              value={filters.date}
              onChange={(event) =>
                onChange({ ...filters, date: event.target.value })
              }
            />
            {filters.date && dateRegex.test(filters.date) && (
              <TextField
                label="End Date"
                size="small"
                placeholder="YYYY-MM-DD"
                value={filters.endDate}
                onChange={(event) =>
                  onChange({ ...filters, endDate: event.target.value })
                }
              />
            )}
            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.hasUrl}
                  onChange={(event) =>
                    onChange({ ...filters, hasUrl: event.target.checked })
                  }
                />
              }
              label="Only messages with URLs"
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
              label="Only messages with numbers"
            />
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
