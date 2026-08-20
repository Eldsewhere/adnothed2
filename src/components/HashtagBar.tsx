import { Box, colors } from "@mui/material";
import HashtagChip from "./HashtagChip";

type HashtagBarProps = {
  hashtags: string[];
  hashtagCounts?: Record<string, number>;
  activeFilterText: string;
  onToggleHashtagInDraft: (tag: string) => void;
};

const HashtagBar = ({
  hashtags,
  hashtagCounts = {},
  activeFilterText,
  onToggleHashtagInDraft,
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
          No hashtags
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
            const count = hashtagCounts[normalizedTag] ?? 0;

            return (
              <HashtagChip
                key={normalizedTag}
                tag={normalizedTag}
                selected={isActive}
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
};

export default HashtagBar;
