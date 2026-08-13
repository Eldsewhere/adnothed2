import { Avatar, colors } from "@mui/material";
import { Icon } from "@mdi/react";
import type { IconOption } from "../types";
import { getLetterAvatarText } from "../utils/letterIconOptions";

type LabelIconProps = {
  icon: IconOption;
  size?: number;
};

const LabelIcon = ({ icon, size = 0.8 }: LabelIconProps) => {
  const letters = getLetterAvatarText(icon.name);

  if (letters) {
    const avatarSize = Math.max(16, Math.round(size * 24));
    return (
      <Avatar
        sx={{
          width: avatarSize,
          height: avatarSize,
          bgcolor: colors.blueGrey[700],
          color: colors.blueGrey[50],
          fontWeight: 700,
          fontSize: `${Math.max(9, Math.round(avatarSize * 0.52))}px`,
          letterSpacing: "0.02em",
        }}
      >
        {letters}
      </Avatar>
    );
  }

  return <Icon path={icon.path} size={size} />;
};

export default LabelIcon;