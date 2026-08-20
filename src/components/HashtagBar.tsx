import { Box, Button, colors } from "@mui/material";

type HashtagBarProps = {
  hashtags: string[];
  activeFilterText: string;
  onToggleHashtagFilter: (tag: string) => void;
  onAppendHashtagToDraft: (tag: string) => void;
};

const HashtagBar = ({
  hashtags,
  activeFilterText,
  onToggleHashtagFilter,
  onAppendHashtagToDraft,
}: HashtagBarProps) => {
  const activeTagSet = new Set(
    activeFilterText
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)),
  );

  return (
    <Box
      sx={{
        borderRadius: 2,
        backgroundColor: colors.blueGrey[900],
        p: 1,
      }}
    >
      {hashtags.length === 0 ? (
        <Box sx={{ color: colors.blueGrey[300], fontSize: "0.85rem" }}>
          No hashtags yet
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 0.75,
            maxHeight: 132,
            overflowY: "auto",
            pr: 0.5,
            pb: 0.25,
          }}
        >
          {hashtags.map((tag) => {
            const normalizedTag = tag.startsWith("#") ? tag : `#${tag}`;
            const isActive = activeTagSet.has(normalizedTag);

            return (
              <Button
                key={normalizedTag}
                size="small"
                variant={isActive ? "contained" : "outlined"}
                onClick={() => {
                  onToggleHashtagFilter(tag);
                  onAppendHashtagToDraft(tag);
                }}
                sx={{
                  minWidth: 0,
                  borderRadius: 999,
                  textTransform: "none",
                  fontWeight: 600,
                  lineHeight: 1.2,
                  px: 1.2,
                  py: 0.5,
                  backgroundColor: isActive
                    ? colors.lightGreen[400]
                    : "rgba(148, 163, 184, 0.08)",
                  color: isActive ? colors.grey[900] : colors.grey[100],
                  borderColor: "rgba(148, 163, 184, 0.45)",
                  "&:hover": {
                    backgroundColor: isActive
                      ? colors.lightGreen[300]
                      : "rgba(96, 165, 250, 0.12)",
                    borderColor: "rgba(147, 197, 253, 0.7)",
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
  );
};

export default HashtagBar;
