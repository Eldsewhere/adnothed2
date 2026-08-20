import { Box, Button, Popover, Typography } from "@mui/material";

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
  const normalizedExcludedTags = new Set(
    (excludeTags ?? []).map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)),
  );
  const filteredOptions = options.filter(
    (tag) => !normalizedExcludedTags.has(tag.startsWith("#") ? tag : `#${tag}`),
  );

  const handleSelect = (tag: string) => {
    const normalizedTag = tag.startsWith("#") ? tag : `#${tag}`;
    onSelect(normalizedTag);
    onClose();
  };

  return (
    <Popover
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      slotProps={{
        paper: {
          sx: {
            width: 260,
            p: 1.5,
            bgcolor: "#263238",
            border: "1px solid #455a64",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.35)",
          },
        },
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        <Typography variant="caption" sx={{ color: "#cbd5e1", fontWeight: 600 }}>
          Choose hashtag
        </Typography>
        {filteredOptions.length === 0 ? (
          <Typography variant="body2" sx={{ color: "#94a3b8" }}>
            No hashtags available
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {filteredOptions.map((tag) => {
              const normalizedTag = tag.startsWith("#") ? tag : `#${tag}`;

              return (
                <Button
                  key={normalizedTag}
                  variant="outlined"
                  size="small"
                  onClick={() => handleSelect(normalizedTag)}
                  sx={{
                    minWidth: 0,
                    borderRadius: 999,
                    borderColor: "#64748b",
                    color: "#e2e8f0",
                    backgroundColor: "rgba(148, 163, 184, 0.08)",
                    px: 1.25,
                    py: 0.5,
                    textTransform: "none",
                    fontWeight: 600,
                    lineHeight: 1.2,
                    "&:hover": {
                      backgroundColor: "rgba(96, 165, 250, 0.12)",
                      borderColor: "#93c5fd",
                    },
                  }}
                >
                  {normalizedTag}
                </Button>
              );
            })}
          </Box>
        )}
      </Box>
    </Popover>
  );
};

export default HashtagAutocompletePopover;
