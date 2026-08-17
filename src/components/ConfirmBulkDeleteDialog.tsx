import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

type ConfirmBulkDeleteDialogProps = {
  open: boolean;
  selectedCount: number;
  onClose: () => void;
  onConfirm: () => void;
};

const ConfirmBulkDeleteDialog = ({
  open,
  selectedCount,
  onClose,
  onConfirm,
}: ConfirmBulkDeleteDialogProps) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Delete {selectedCount} Note(s)?</DialogTitle>
    <DialogContent>
      <DialogContentText>
        This will permanently delete the selected notes
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button variant="outlined" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="contained" onClick={onConfirm}>
        Delete
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmBulkDeleteDialog;
