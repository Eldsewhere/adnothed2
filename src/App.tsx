import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
} from "@mui/material";
import { Icon } from "@mdi/react";
import {
  mdiCheckboxMultipleMarkedOutline,
  mdiFolderMoveOutline,
  mdiTrashCanOutline,
} from "@mdi/js";
import CategoryForm from "./components/CategoryForm";
import CategoryList from "./components/CategoryList";
import ItemForm from "./components/ItemForm";
import ItemFilters from "./components/ItemFilters";
import ItemList from "./components/ItemList";
import TabPanel from "./components/TabPanel";
import type { Category, Item } from "./types";
import {
  clearPersistedState,
  DEFAULT_FILE_NAME,
  getPersistedFileName,
  loadPersistedState,
  savePersistedState,
} from "./utils/storage";
import {
  requestNotificationPermission,
  showAppNotification,
} from "./utils/notifications";
import { emptyItemFilters } from "./utils/itemFilters";

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [itemFilters, setItemFilters] = useState(emptyItemFilters);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    new Set(),
  );
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [bulkCategoryAnchor, setBulkCategoryAnchor] =
    useState<HTMLElement | null>(null);
  const [storageFileName, setStorageFileName] =
    useState<string>(DEFAULT_FILE_NAME);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadState() {
      const persistedFileName = await getPersistedFileName();
      if (!mounted) {
        return;
      }

      setStorageFileName(persistedFileName);
      const persistedState = await loadPersistedState(persistedFileName);
      if (!mounted) {
        return;
      }

      setCategories(persistedState.categories);
      setItems(persistedState.items);
      setStorageReady(true);
    }

    loadState();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    savePersistedState({ categories, items }, storageFileName);
  }, [categories, items, storageReady, storageFileName]);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const handleClearStorage = async () => {
    await clearPersistedState();
    setCategories([]);
    setItems([]);
    setEditingCategory(null);
    setEditingItem(null);
    setStorageFileName(DEFAULT_FILE_NAME);
    setConfirmClearOpen(false);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify({ categories, items }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "adnothed-export.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit: React.ComponentProps<typeof CategoryForm>["onSubmit"] = (
    values,
  ) => {
    if (editingCategory) {
      setCategories((prev) =>
        prev.map((category) =>
          category.id === editingCategory.id
            ? { ...category, name: values.name, icon: values.icon }
            : category,
        ),
      );
      setEditingCategory(null);
      return;
    }

    setCategories((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: values.name, icon: values.icon },
    ]);
  };

  const handleDelete = (category: Category) => {
    setCategories((prev) => prev.filter((c) => c.id !== category.id));
    setItems((prev) =>
      prev.map((item) =>
        item.categoryId === category.id ? { ...item, categoryId: null } : item,
      ),
    );
    if (editingCategory?.id === category.id) {
      setEditingCategory(null);
    }
    if (editingItem?.categoryId === category.id) {
      setEditingItem(null);
    }
  };

  const handleItemSubmit: React.ComponentProps<typeof ItemForm>["onSubmit"] = (
    values,
  ) => {
    const categoryId = values.categoryId === "" ? null : values.categoryId;
    const categoryName =
      categories.find((c) => c.id === categoryId)?.name ?? "Reminder";

    if (editingItem) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? { ...item, categoryId, text: values.text }
            : item,
        ),
      );
      setEditingItem(null);
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        categoryId,
        text: values.text,
        createdAt: Date.now(),
      },
    ]);
    setNotification(`${categoryName}: ${values.text}`);
    showAppNotification(categoryName, values.text);
  };

  const handleItemCopy = (item: Item) => {
    navigator.clipboard.writeText(item.text);
    setNotification(`Item Copied`);
  };

  const handleItemDelete = (item: Item) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    if (editingItem?.id === item.id) {
      setEditingItem(null);
    }
  };

  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    setSelectedItemIds(new Set());
  };

  const toggleItemSelected = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = () => {
    setItems((prev) => prev.filter((item) => !selectedItemIds.has(item.id)));
    setSelectedItemIds(new Set());
    setConfirmBulkDeleteOpen(false);
  };

  const handleBulkCategoryChange = (categoryId: string | null) => {
    setItems((prev) =>
      prev.map((item) =>
        selectedItemIds.has(item.id) ? { ...item, categoryId } : item,
      ),
    );
    setSelectedItemIds(new Set());
    setBulkCategoryAnchor(null);
  };

  return (
    <Box sx={{ margin: 1 }}>
      <Paper sx={{ p: 2 }}>
        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Tabs
            value={activeTab}
            onChange={(_event, newValue) => setActiveTab(newValue)}
          >
            <Tab label="Items" id="tab-0" aria-controls="tabpanel-0" />
            <Tab label="Categories" id="tab-1" aria-controls="tabpanel-1" />
            <Tab label="Utils" id="tab-2" aria-controls="tabpanel-2" />
          </Tabs>
          {activeTab === 0 && (
            <Stack direction="row" sx={{ alignItems: "center" }}>
              {selectMode && selectedItemIds.size > 0 && (
                <>
                  <Tooltip title="Change category">
                    <IconButton
                      aria-label="Change category for selected items"
                      onClick={(event) =>
                        setBulkCategoryAnchor(event.currentTarget)
                      }
                    >
                      <Icon path={mdiFolderMoveOutline} size={0.9} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete selected">
                    <IconButton
                      aria-label="Delete selected items"
                      onClick={() => setConfirmBulkDeleteOpen(true)}
                    >
                      <Icon path={mdiTrashCanOutline} size={0.9} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              <Tooltip
                title={
                  selectMode ? "Exit select mode" : "Select multiple items"
                }
              >
                <IconButton
                  aria-label="Toggle select mode"
                  color={selectMode ? "primary" : "default"}
                  onClick={toggleSelectMode}
                >
                  <Icon path={mdiCheckboxMultipleMarkedOutline} size={0.9} />
                </IconButton>
              </Tooltip>
              <ItemFilters
                categories={categories}
                filters={itemFilters}
                onChange={setItemFilters}
              />
            </Stack>
          )}
        </Stack>
        <Box sx={{ pt: 3 }}>
          <TabPanel value={activeTab} index={0}>
            <Stack spacing={3}>
              <ItemForm
                categories={categories}
                editingItem={editingItem}
                onSubmit={handleItemSubmit}
                onCancelEdit={() => setEditingItem(null)}
              />
              <ItemList
                items={items}
                categories={categories}
                filters={itemFilters}
                onEdit={setEditingItem}
                onDelete={handleItemDelete}
                onCopy={handleItemCopy}
                onNotify={(item) => {
                  const categoryName =
                    categories.find((c) => c.id === item.categoryId)?.name ??
                    "Reminder";
                  setNotification(`${categoryName}: ${item.text}`);
                  showAppNotification(categoryName, item.text);
                }}
                selectMode={selectMode}
                selectedIds={selectedItemIds}
                onToggleSelect={toggleItemSelected}
              />
            </Stack>
          </TabPanel>
          <TabPanel value={activeTab} index={1}>
            <Stack spacing={3}>
              <CategoryForm
                editingCategory={editingCategory}
                onSubmit={handleSubmit}
                onCancelEdit={() => setEditingCategory(null)}
              />
              <CategoryList
                categories={categories}
                onEdit={setEditingCategory}
                onDelete={handleDelete}
              />
            </Stack>
          </TabPanel>
          <TabPanel value={activeTab} index={2}>
            <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
              <TextField
                label="Storage file name"
                value={storageFileName}
                onChange={(event) => setStorageFileName(event.target.value)}
                size="small"
                helperText="Editable file name used when choosing the storage file"
              />
              <Button
                color="error"
                variant="outlined"
                size="small"
                onClick={() => setConfirmClearOpen(true)}
              >
                Clear local storage
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleExportJson}
              >
                Export JSON
              </Button>
            </Stack>
          </TabPanel>
        </Box>
      </Paper>
      <Snackbar
        open={!!notification}
        autoHideDuration={3000}
        onClose={() => setNotification(null)}
        message={notification}
      />
      <Dialog
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
      >
        <DialogTitle>Clear local storage?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete all categories and items. This action
            cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClearOpen(false)}>Cancel</Button>
          <Button color="error" onClick={handleClearStorage}>
            Clear
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={confirmBulkDeleteOpen}
        onClose={() => setConfirmBulkDeleteOpen(false)}
      >
        <DialogTitle>Delete {selectedItemIds.size} item(s)?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete the selected items. This action cannot
            be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmBulkDeleteOpen(false)}>
            Cancel
          </Button>
          <Button color="error" onClick={handleBulkDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <Menu
        anchorEl={bulkCategoryAnchor}
        open={!!bulkCategoryAnchor}
        onClose={() => setBulkCategoryAnchor(null)}
      >
        <MenuItem onClick={() => handleBulkCategoryChange(null)}>
          No category
        </MenuItem>
        {categories.map((category) => (
          <MenuItem
            key={category.id}
            onClick={() => handleBulkCategoryChange(category.id)}
          >
            <Box
              component="span"
              sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}
            >
              <Icon path={category.icon.path} size={0.8} />
            </Box>
            {category.name}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}

export default App;
