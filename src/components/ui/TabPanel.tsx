import type { ReactNode } from "react";
import { Box } from "@mui/material";

type TabPanelProps = {
  children: ReactNode;
  value: "items" | "labels" | "utils";
  index: "items" | "labels" | "utils";
};

const TabPanel = ({ children, value, index }: TabPanelProps) => {
  if (value !== index) {
    return null;
  }
  return (
    <Box
      role="tabpanel"
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
    >
      {children}
    </Box>
  );
};

export default TabPanel;
