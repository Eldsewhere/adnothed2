import { Box, colors } from "@mui/material";
import HashtagChip from "./HashtagChip";

type HashtagBarProps = {
  hashtags: string[];
  hashtagCounts?: Record<string, number>;
  selectedHashtags?: Set<string>;
  onToggleHashtagInDraft: (tag: string) => void;
};

const HashtagBar = ({
  hashtags,
  hashtagCounts = {},
  selectedHashtags = new Set(),
  onToggleHashtagInDraft,
}: HashtagBarProps) => (
  <Box
    sx={{
      borderRadius: 2,
      backgroundColor: colors.blueGrey[900],
      p: 1,
    }}
  >
    {hashtags.length === 0 ? (
      <Box sx={{ color: colors.blueGrey[300], fontSize: "0.85rem" }}>
        No hashtags
      </Box>
    ) : (
      <Box
        sx={{
          display: "flex",
          flexWrap: "nowrap",
          gap: 0.75,
          overflowX: "auto",
          overflowY: "hidden",
          whiteSpace: "nowrap",
          pb: 0.25,
          pr: 0.5,
          "@media (max-width: 600px)": {
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": {
              display: "none",
            },
            "&::-webkit-scrollbar-thumb": {
              display: "none",
            },
            "-ms-overflow-style": "none",
          },
        }}
      >
        {hashtags.map((tag) => {
          const normalizedTag = tag.startsWith("#") ? tag : `#${tag}`;
          const count = hashtagCounts[normalizedTag] ?? 0;
          const isSelected = selectedHashtags.has(normalizedTag);

          return (
            <HashtagChip
              key={normalizedTag}
              tag={normalizedTag}
              selected={isSelected}
              count={count}
              onClick={() => {
                onToggleHashtagInDraft(tag);
              }}
            />
          );
        })}
      </Box>
    )}
  </Box>
);

export default HashtagBar;
