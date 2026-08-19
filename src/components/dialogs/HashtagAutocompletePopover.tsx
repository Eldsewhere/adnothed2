import { useState } from "react";
import {
  Autocomplete,
  Box,
  IconButton,
  InputAdornment,
  Popover,
  TextField,
  Tooltip,
  colors,
} from "@mui/material";
import { Icon } from "@mdi/react";
import { mdiCheckCircle, mdiPound } from "@mdi/js";

type HashtagAutocompletePopoverProps = {
  anchorEl: HTMLElement | null;
  open: boolean;
  options: string[];
  excludeTags?: string[];
  onClose: () => void;
  onSelect: (tag: string) => void;
};

const HashtagAutocompletePopover = ({
  anchorEl,
  open,
  options,
  excludeTags = [],
  onClose,
  onSelect,
}: HashtagAutocompletePopoverProps) => {
  const [hashtagInputValue, setHashtagInputValue] = useState("");
  const normalizedExcludedTags = new Set(
    (excludeTags ?? []).map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)),
  );
  const filteredOptions = options.filter(
    (tag) => !normalizedExcludedTags.has(tag.startsWith("#") ? tag : `#${tag}`),
  );

  const submitTag = () => {
    const tag = hashtagInputValue.trim();
    if (!tag) {
      return;
    }

    onSelect(tag);
    setHashtagInputValue("");
    onClose();
  };

  const handleAutocompleteSelect = (_event: unknown, value: string | null) => {
    if (!value) {
      return;
    }

    onSelect(value);
    setHashtagInputValue("");
    onClose();
  };

  return (
    <Popover
      anchorEl={anchorEl}
      open={open}
      onClose={() => {
        setHashtagInputValue("");
        onClose();
      }}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      slotProps={{
        paper: {
          sx: {
            minWidth: 240,
            bgcolor: "#263238",
            border: "1px solid #455a64",
            overflow: "visible",
          },
        },
      }}
    >
      <Box sx={{ p: 1, display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Autocomplete
            options={filteredOptions}
            autoHighlight
            openOnFocus
            freeSolo
            disablePortal
            filterOptions={(filteredOptions) => filteredOptions}
            inputValue={hashtagInputValue}
            slotProps={{
              listbox: {
                sx: {
                  minHeight: 96,
                  maxHeight: 220,
                  overflowY: "auto",
                  scrollbarWidth: "none",
                  "&::-webkit-scrollbar": {
                    display: "none",
                  },
                },
              },
              popper: {
                placement: "bottom-start",
                modifiers: [
                  {
                    name: "offset",
                    options: { offset: [0, 2] },
                  },
                ],
              },
            }}
            onInputChange={(_event, newValue) => setHashtagInputValue(newValue)}
            onChange={handleAutocompleteSelect}
            renderInput={(params) => {
              const inputProps = (params as any).InputProps ?? {};

              return (
                <TextField
                  {...(params as any)}
                  label="Hashtags"
                  size="small"
                  autoFocus
                  InputProps={{
                    ...inputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <Box sx={{ display: "flex" }}>
                          <Icon path={mdiPound} size={0.7} />
                        </Box>
                      </InputAdornment>
                    ),
                  }}
                />
              );
            }}
          />
        </Box>
        <Tooltip title="Submit hashtag">
          <IconButton
            type="button"
            size="small"
            aria-label="Submit hashtag"
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={submitTag}
            sx={{
              color: colors.lightGreen[400],
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon path={mdiCheckCircle} size={0.7} />
          </IconButton>
        </Tooltip>
      </Box>
    </Popover>
  );
};

export default HashtagAutocompletePopover;
