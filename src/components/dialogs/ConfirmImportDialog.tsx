import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import type { Category, Item } from "../../types";

type ConfirmImportDialogProps = {
  open: boolean;
  pendingImport: {
    categories: Category[];
    items: Item[];
    fileName: string;
    parseError: string | null;
  } | null;
  onClose: () => void;
  onConfirm: () => void;
};

const ConfirmImportDialog = ({
  open,
  pendingImport,
  onClose,
  onConfirm,
}: ConfirmImportDialogProps) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Import JSON file</DialogTitle>
    <DialogContent>
      <DialogContentText>
        {pendingImport?.fileName
          ? `Importing "${pendingImport.fileName}" will replace all current labels and notes in the app`
          : "Importing a JSON file will replace all current labels and notes in the app"}
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} variant="outlined">
        Cancel
      </Button>
      <Button variant="contained" onClick={onConfirm}>
        Import
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmImportDialog;
