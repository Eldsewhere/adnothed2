import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import type { Label, Note } from "../../types";

type ConfirmImportDialogProps = {
  open: boolean;
  pendingImport: {
    labels: Label[];
    notes: Note[];
    fileName: string;
    parseError: string | null;
  } | null;
  source?: "json" | "google-drive";
  onClose: () => void;
  onConfirm: () => void;
};

const ConfirmImportDialog = ({
  open,
  pendingImport,
  source = "json",
  onClose,
  onConfirm,
}: ConfirmImportDialogProps) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>
      {source === "google-drive"
        ? "Import from Google Drive"
        : "Import JSON file"}
    </DialogTitle>
    <DialogContent>
      <DialogContentText>
        {source === "google-drive"
          ? "Importing from Google Drive will replace all current labels and notes in the app"
          : pendingImport?.fileName
            ? `Importing "${pendingImport.fileName}" will replace all current labels and notes in the app`
            : "Importing a JSON file will replace all current labels and notes in the app"}
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} variant="outlined">
        Cancel
      </Button>
      <Button variant="contained" onClick={onConfirm}>
        {source === "google-drive" ? "Continue" : "Import"}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmImportDialog;
