import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Tooltip,
} from "@mui/material";
import { Icon } from "@mdi/react";
import {
  mdiCancel,
  mdiCheckboxMultipleMarkedOutline,
  mdiFolderMoveOutline,
  mdiTrashCanOutline,
  mdiUpload,
  mdiDownload,
} from "@mdi/js";
import CategoryForm from "./components/CategoryForm";
import CategoryList from "./components/CategoryList";
import ItemForm from "./components/ItemForm";
import ItemFilters from "./components/ItemFilters";
import ItemList from "./components/ItemList";
import TabPanel from "./components/TabPanel";
import type { Category, Item, ItemFilters as ItemFiltersValue } from "./types";
import {
  DEFAULT_FILE_NAME,
  getPersistedFileName,
  loadPersistedState,
  openPersistedStateFile,
  savePersistedState,
  serializeState,
} from "./utils/storage";
import {
  requestNotificationPermission,
  showAppNotification,
} from "./utils/notifications";
import { emptyItemFilters } from "./utils/itemFilters";

type TabValue = "items" | "categories";

function App() {
  const [activeTab, setActiveTab] = useState<TabValue>("items");
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [notificationSeverity, setNotificationSeverity] = useState<
    "success" | "error" | "info" | "warning"
  >("success");
  const [itemFilters, setItemFilters] = useState(emptyItemFilters);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    new Set(),
  );
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [bulkCategoryAnchor, setBulkCategoryAnchor] =
    useState<HTMLElement | null>(null);
  const [confirmDeleteCategory, setConfirmDeleteCategory] =
    useState<Category | null>(null);
  const [latestCategoryId, setLatestCategoryId] = useState<string | null>(null);
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    categories: Category[];
    items: Item[];
    fileName: string;
    parseError: string | null;
  } | null>(null);
  const [storageFileName, setStorageFileName] =
    useState<string>(DEFAULT_FILE_NAME);
  const [storageReady, setStorageReady] = useState(true);
  const isInitializingRef = useRef(true);

  useEffect(() => {
    let mounted = true;

    async function loadState() {
      const persistedFileName = await getPersistedFileName();
      if (!mounted) {
        return;
      }

      setStorageFileName(persistedFileName);
      const persistedState = await loadPersistedState();
      if (!mounted) {
        return;
      }

      setCategories(persistedState.categories);
      setItems(persistedState.items);
      setStorageFileName(persistedState.fileName);
      if (persistedState.parseError) {
        setNotificationSeverity("error");
        setNotification(persistedState.parseError);
      }
      setStorageReady(true);
      setActiveTab("items");
      isInitializingRef.current = false;
    }

    loadState();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!storageReady || isInitializingRef.current) {
      return;
    }

    savePersistedState({ categories, items }, storageFileName);
  }, [categories, items, storageReady, storageFileName]);

  useEffect(() => {
    if (!storageReady) {
      setActiveTab("categories");
    }
  }, [storageReady]);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const selectImportFile = async () => {
    const result = await openPersistedStateFile(storageFileName);
    if (!result) return;
    if (result.parseError) {
      setNotificationSeverity("error");
      setNotification(result.parseError);
      return;
    }
    setPendingImport(result);
    setConfirmImportOpen(true);
  };

  const confirmImport = () => {
    if (!pendingImport) {
      setConfirmImportOpen(false);
      return;
    }
    setCategories(pendingImport.categories);
    setItems(pendingImport.items);
    setStorageFileName(pendingImport.fileName);
    setStorageReady(true);
    setNotificationSeverity("success");
    setNotification(`Imported ${pendingImport.fileName}`);
    setPendingImport(null);
    setConfirmImportOpen(false);
  };

  const handleExportJson = () => {
    const payload = serializeState({ categories, items });
    // filename format: adnothed-state_YYYY-MM-DD_HH-MM.json
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate(),
    )}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
    const baseName = "adnothed-state";
    const downloadName = `${baseName}_${ts}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadName;
    link.click();
    setNotificationSeverity("success");
    setNotification(`Exported ${downloadName}`);
    URL.revokeObjectURL(url);
  };

  const handleSubmit: React.ComponentProps<typeof CategoryForm>["onSubmit"] = (
    values,
  ) => {
    const iconName = values.icon.name;

    // ensure the icon is unique across categories
    const conflict = categories.some(
      (c) => c.id === iconName && c.id !== editingCategory?.id,
    );
    if (conflict) {
      setNotificationSeverity("error");
      setNotification("A label with that icon already exists.");
      return false;
    }

    if (editingCategory) {
      setCategories((prev) =>
        prev.map((prevCategory) => {
          if (prevCategory.id === editingCategory.id) {
            setItems((prev) =>
              prev.map((item) =>
                item.categoryId === prevCategory.id
                  ? { ...item, categoryId: iconName }
                  : item,
              ),
            );

            return {
              ...prevCategory,
              name: values.name,
              icon: values.icon,
              id: iconName,
            };
          }

          return prevCategory;
        }),
      );
      setNotificationSeverity("success");
      setNotification(`Updated label "${values.name}"`);
      setEditingCategory(null);
      return;
    }

    setCategories((prev) => [
      ...prev,
      { id: iconName, name: values.name, icon: values.icon },
    ]);
    setLatestCategoryId(iconName);
    setNotificationSeverity("success");
    setNotification(`Added label "${values.name}"`);
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

  const requestDeleteCategory = (category: Category) => {
    setConfirmDeleteCategory(category);
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
        createdAt: Math.floor(Date.now() / 1000),
        hasNotification: true,
      },
    ]);
    setNotification(`${categoryName}: ${values.text}`);
    showAppNotification(categoryName, values.text);
  };

  const handleItemCopy = (item: Item) => {
    navigator.clipboard.writeText(item.text);
    setNotificationSeverity("success");
    setNotification("Note Copied");
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

  // if there are no notes, ensure select mode is disabled
  useEffect(() => {
    if (items.length === 0 && selectMode) {
      setSelectMode(false);
      setSelectedItemIds(new Set());
    }
  }, [items.length, selectMode]);

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
    <Box>
      <Paper sx={{ p: 1 }}>
        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Tabs
            value={activeTab}
            onChange={(_event, newValue) => {
              const normalized =
                newValue === "items" || newValue === "categories"
                  ? newValue
                  : (String(newValue) as TabValue);
              setActiveTab(normalized);
            }}
          >
            <Tab
              value="items"
              label="Notes"
              id="tab-items"
              aria-controls="tabpanel-items"
            />
            <Tab
              value="categories"
              label="Labels"
              id="tab-categories"
              aria-controls="tabpanel-categories"
            />
          </Tabs>
          {activeTab === "items" && (
            <Stack direction="row" sx={{ alignItems: "center" }}>
              <Tooltip
                title={
                  selectMode ? "Cancel select mode" : "Select multiple notes"
                }
              >
                <IconButton
                  aria-label="Toggle select mode"
                  color={selectMode ? "primary" : "default"}
                  onClick={toggleSelectMode}
                  disabled={items.length === 0}
                >
                  <Badge badgeContent={selectedItemIds.size} color="primary">
                    <Icon path={mdiCheckboxMultipleMarkedOutline} size={0.9} />
                  </Badge>
                </IconButton>
              </Tooltip>
              <ItemFilters
                categories={categories}
                items={items}
                filters={itemFilters}
                onChange={(f: ItemFiltersValue) => {
                  setItemFilters(f);
                  setSelectMode(false);
                  setSelectedItemIds(new Set());
                }}
              />
            </Stack>
          )}
        </Stack>
        <Box sx={{ pt: 2 }}>
          <TabPanel value={activeTab} index="items">
            <Stack spacing={1}>
              <ItemForm
                editingItem={editingItem}
                categories={categories}
                onSubmit={handleItemSubmit}
                onCancelEdit={() => setEditingItem(null)}
              />
              {selectMode && (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  <Tooltip
                    title={
                      selectedItemIds.size > 0
                        ? "Change label"
                        : "Select notes to enable"
                    }
                  >
                    <span>
                      <Button
                        variant="text"
                        startIcon={
                          <Icon path={mdiFolderMoveOutline} size={0.9} />
                        }
                        disabled={selectedItemIds.size === 0}
                        onClick={(event) =>
                          setBulkCategoryAnchor(event.currentTarget)
                        }
                        sx={{ textTransform: "none" }}
                      >
                        Label
                      </Button>
                    </span>
                  </Tooltip>
                  <Tooltip
                    title={
                      selectedItemIds.size > 0
                        ? "Delete selected"
                        : "Select notes to enable"
                    }
                  >
                    <span>
                      <Button
                        variant="text"
                        startIcon={
                          <Icon path={mdiTrashCanOutline} size={0.9} />
                        }
                        disabled={selectedItemIds.size === 0}
                        onClick={() => setConfirmBulkDeleteOpen(true)}
                        sx={{ textTransform: "none" }}
                      >
                        Delete
                      </Button>
                    </span>
                  </Tooltip>
                  <Tooltip title="Exit select mode">
                    <span>
                      <Button
                        variant="text"
                        startIcon={<Icon path={mdiCancel} size={0.9} />}
                        onClick={() => {
                          setSelectedItemIds(new Set());
                          setSelectMode(false);
                        }}
                        sx={{ textTransform: "none" }}
                      >
                        Cancel
                      </Button>
                    </span>
                  </Tooltip>
                </Stack>
              )}
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
                  // mark item as having an active notification
                  setItems((prev) =>
                    prev.map((existingItem) =>
                      existingItem.id === item.id
                        ? { ...existingItem, hasNotification: true }
                        : existingItem,
                    ),
                  );
                  setNotification(`${categoryName}: ${item.text}`);
                  showAppNotification(categoryName, item.text);
                }}
                onCategoryChange={(item, categoryId) => {
                  setItems((prev) =>
                    prev.map((existingItem) =>
                      existingItem.id === item.id
                        ? { ...existingItem, categoryId }
                        : existingItem,
                    ),
                  );
                  if (editingItem?.id === item.id) {
                    setEditingItem({ ...editingItem, categoryId });
                  }
                }}
                selectMode={selectMode}
                selectedIds={selectedItemIds}
                onToggleSelect={toggleItemSelected}
              />
            </Stack>
          </TabPanel>
          <TabPanel value={activeTab} index="categories">
            <Stack spacing={2}>
              <CategoryForm
                editingCategory={editingCategory}
                onSubmit={handleSubmit}
                onCancelEdit={() => setEditingCategory(null)}
              />
              <CategoryList
                categories={categories}
                onEdit={setEditingCategory}
                onDelete={requestDeleteCategory}
                newCategoryId={latestCategoryId}
              />
              <Divider sx={{ pt: 1 }} />
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  width: "100%",
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                  rowGap: 1,
                }}
              >
                <Tooltip title="Import data from JSON file">
                  <span>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={selectImportFile}
                      startIcon={<Icon path={mdiUpload} size={0.9} />}
                    >
                      Import JSON
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title="Save current data to JSON file">
                  <span>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleExportJson}
                      startIcon={<Icon path={mdiDownload} size={0.9} />}
                    >
                      Save as JSON
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>
          </TabPanel>
        </Box>
      </Paper>
      <Snackbar
        open={!!notification}
        autoHideDuration={3000}
        onClose={() => setNotification(null)}
      >
        <Alert
          onClose={() => setNotification(null)}
          severity={notificationSeverity}
          sx={{ width: "100%" }}
        >
          {notification}
        </Alert>
      </Snackbar>
      <Dialog
        open={confirmBulkDeleteOpen}
        onClose={() => setConfirmBulkDeleteOpen(false)}
      >
        <DialogTitle>Delete {selectedItemIds.size} Note(s)?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete the selected notes
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => setConfirmBulkDeleteOpen(false)}
          >
            Cancel
          </Button>
          <Button variant="outlined" color="error" onClick={handleBulkDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={!!confirmDeleteCategory}
        onClose={() => setConfirmDeleteCategory(null)}
      >
        <DialogTitle>
          {`Delete label "${confirmDeleteCategory?.name ?? ""}"?`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Deleting this label will remove it and set any notes in this label
            to have no label
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => setConfirmDeleteCategory(null)}
          >
            Cancel
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              if (confirmDeleteCategory) {
                handleDelete(confirmDeleteCategory);
                setNotificationSeverity("success");
                setNotification(
                  `Deleted label "${confirmDeleteCategory.name}"`,
                );
              }
              setConfirmDeleteCategory(null);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={confirmImportOpen}
        onClose={() => {
          setConfirmImportOpen(false);
          setPendingImport(null);
        }}
      >
        <DialogTitle>Import JSON file</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pendingImport?.fileName
              ? `Importing "${pendingImport.fileName}" will replace all current labels and notes in the app`
              : "Importing a JSON file will replace all current labels and notes in the app"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setConfirmImportOpen(false);
              setPendingImport(null);
            }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button color="error" variant="outlined" onClick={confirmImport}>
            Import
          </Button>
        </DialogActions>
      </Dialog>
      <Menu
        anchorEl={bulkCategoryAnchor}
        open={!!bulkCategoryAnchor}
        onClose={() => setBulkCategoryAnchor(null)}
      >
        <MenuItem onClick={() => handleBulkCategoryChange(null)}>
          No label
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
