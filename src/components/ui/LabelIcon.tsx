import { Avatar, colors } from "@mui/material";
import { Icon } from "@mdi/react";
import type { IconOption } from "../../types";
import { getEmojiIcon } from "../../utils/emojiIconOptions";
import { getLetterAvatarText } from "../../utils/letterIconOptions";
import { getLabelColorSwatch } from "../../utils/labelColors";

type LabelIconProps = {
  icon: IconOption;
  size?: number;
  color?: string;
};

const LabelIcon = ({ icon, size = 0.8, color }: LabelIconProps) => {
  const letters = getLetterAvatarText(icon.name);
  const emoji = getEmojiIcon(icon.name);
  const swatch = color ? getLabelColorSwatch(color) : null;

  if (emoji) {
    return (
      <span
        aria-label={icon.label}
        role="img"
        style={{
          display: "inline-flex",
          fontSize: `${Math.max(16, Math.round(size * 24))}px`,
          lineHeight: 1,
        }}
      >
        {emoji}
      </span>
    );
  }

  if (letters) {
    const avatarSize = Math.max(16, Math.round(size * 24));
    return (
      <Avatar
        sx={{
          width: avatarSize,
          height: avatarSize,
          bgcolor: swatch ? swatch.background : colors.blueGrey[700],
          color: swatch ? swatch.text : colors.blueGrey[50],
          fontWeight: 700,
          fontSize: `${Math.max(9, Math.round(avatarSize * 0.52))}px`,
          letterSpacing: "0.02em",
        }}
      >
        {letters}
      </Avatar>
    );
  }

  return <Icon path={icon.path} size={size} color={swatch?.background} />;
};

export default LabelIcon;