var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ManualSortingPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");
var import_monkey_around = require("monkey-around");
var import_sortablejs = __toESM(require("sortablejs"), 1);

// src/ResetOrderConfirmationModal.ts
var import_obsidian = require("obsidian");
var ResetOrderConfirmationModal = class extends import_obsidian.Modal {
  constructor(app, prevSelectedSortOrder, onSubmit) {
    super(app);
    this.setTitle("Manual sorting");
    this.modalEl.addClass("manual-sorting-modal");
    const modalContent = this.contentEl.createEl("div");
    modalContent.createEl("p", { text: `Reset custom order to match previously selected one (${prevSelectedSortOrder})?` });
    const modalButtons = modalContent.createEl("div", { cls: "modal-buttons" });
    new import_obsidian.ButtonComponent(modalButtons).setButtonText("Yep").setCta().onClick(() => {
      this.close();
      onSubmit();
    });
    new import_obsidian.ButtonComponent(modalButtons).setButtonText("Cancel").onClick(() => this.close());
  }
};

// src/FileOrderManager.ts
var import_obsidian2 = require("obsidian");
var FileOrderManager = class {
  constructor(_plugin) {
    this._plugin = _plugin;
  }
  resetOrder() {
    this._plugin.settings.customFileOrder = { "/": [] };
    this._plugin.saveSettings();
  }
  async updateOrder() {
    console.log("Updating order...");
    const currentOrder = await this._getCurrentOrder();
    const savedOrder = this._plugin.settings.customFileOrder;
    const newOrder = await this._matchSavedOrder(currentOrder, savedOrder);
    this._plugin.settings.customFileOrder = newOrder;
    this._plugin.saveSettings();
    console.log("Order updated:", this._plugin.settings.customFileOrder);
  }
  async _getCurrentOrder() {
    const currentData = {};
    const explorerView = this._plugin.getFileExplorerView();
    const indexFolder = (folder) => {
      const sortedItems = explorerView.getSortedFolderItems(folder);
      const sortedItemPaths = sortedItems.map((item) => item.file.path);
      currentData[folder.path] = sortedItemPaths;
      for (const item of sortedItems) {
        const itemObject = item.file;
        if (itemObject instanceof import_obsidian2.TFolder) {
          indexFolder(itemObject);
        }
      }
    };
    indexFolder(this._plugin.app.vault.root);
    return currentData;
  }
  async _matchSavedOrder(currentOrder, savedOrder) {
    let result = {};
    for (let folder in currentOrder) {
      if (savedOrder[folder]) {
        let prevOrder = savedOrder[folder];
        let currentFiles = currentOrder[folder];
        let existingFiles = prevOrder.filter((file) => currentFiles.includes(file));
        let newFiles = currentFiles.filter((file) => !prevOrder.includes(file));
        result[folder] = Array.from(/* @__PURE__ */ new Set([...newFiles, ...existingFiles]));
      } else {
        result[folder] = Array.from(new Set(currentOrder[folder]));
      }
    }
    return result;
  }
  async moveFile(oldPath, newPath, newDraggbleIndex) {
    console.log(`Moving from "${oldPath}" to "${newPath}" at index ${newDraggbleIndex}`);
    const data = this._plugin.settings.customFileOrder;
    const oldDir = oldPath.substring(0, oldPath.lastIndexOf("/")) || "/";
    const newDir = newPath.substring(0, newPath.lastIndexOf("/")) || "/";
    if (data[oldDir]) {
      data[oldDir] = data[oldDir].filter((path) => path !== oldPath);
    } else {
      console.warn(`[moveFile] folder "${oldDir}" not found in data.`);
    }
    if (data[newDir].includes(newPath)) {
      console.warn(`[moveFile] "${newPath}" already exists in "${newDir}". Removing it from "${oldDir}" and returning.`);
      return;
    }
    data[newDir].splice(newDraggbleIndex, 0, newPath);
    this._plugin.saveSettings();
  }
  async renameItem(oldPath, newPath) {
    if (oldPath === newPath) return;
    console.log(`Renaming "${oldPath}" to "${newPath}"`);
    const data = this._plugin.settings.customFileOrder;
    const oldDir = oldPath.substring(0, oldPath.lastIndexOf("/")) || "/";
    if (data[oldDir]) {
      data[oldDir] = data[oldDir].map((path) => path === oldPath ? newPath : path);
    } else {
      console.warn(`[renameItem] folder "${oldDir}" not found in data.`);
    }
    const itemIsFolder = !!data[oldPath];
    if (itemIsFolder) {
      console.log(`[renameItem] "${oldPath}" is a folder. Renaming its children as well.`);
      data[newPath] = data[oldPath];
      delete data[oldPath];
      data[newPath] = data[newPath].map((path) => path.replace(oldPath, newPath));
    }
    this._plugin.saveSettings();
  }
  async restoreOrder(container, folderPath) {
    const savedData = this._plugin.settings.customFileOrder;
    console.log(`Restoring order for "${folderPath}"`);
    const savedOrder = savedData?.[folderPath];
    if (!savedOrder) return;
    const explorer = await this._plugin.waitForExplorer();
    const scrollTop = explorer.scrollTop;
    const itemsByPath = /* @__PURE__ */ new Map();
    Array.from(container.children).forEach((child) => {
      const path = child.firstElementChild?.getAttribute("data-path");
      if (path) {
        itemsByPath.set(path, child);
      }
    });
    const fragment = document.createDocumentFragment();
    savedOrder.forEach((path) => {
      const element = itemsByPath.get(path);
      if (element) {
        fragment.appendChild(element);
      }
    });
    container.appendChild(fragment);
    explorer.scrollTop = scrollTop;
    console.log(`Order restored for "${folderPath}"`);
  }
  getFlattenPaths() {
    function flattenPaths(obj, path = "/") {
      let result = [];
      if (obj[path]) {
        for (const item of obj[path]) {
          result.push(item);
          if (obj[item]) {
            result.push(...flattenPaths(obj, item));
          }
        }
      }
      return result;
    }
    return flattenPaths(this._plugin.settings.customFileOrder);
  }
};

// src/constants.ts
var MANUAL_SORTING_MODE_ID = "manual-sorting";
var DEFAULT_SETTINGS = {
  customFileOrder: { "/": [] },
  draggingEnabled: true,
  selectedSortOrder: "manual-sorting"
};

// src/main.ts
var import_obsidian4 = require("obsidian");
var ManualSortingPlugin = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    this._explorerUnpatchFunctions = [];
    this._unpatchMenu = null;
    this._itemBeingCreatedManually = false;
    this._recentExplorerAction = "";
    this._sortableInstances = [];
    this.isDevMode = () => {
      return true;
    };
    this.getFileExplorerView = () => {
      return this.app.workspace.getLeavesOfType("file-explorer")[0].view;
    };
    this.isManualSortingEnabled = () => {
      return this.settings.selectedSortOrder === MANUAL_SORTING_MODE_ID;
    };
  }
  async onload() {
    this.isDevMode() && console.log("Loading Manual Sorting in dev mode");
    await this.loadSettings();
    this.app.workspace.onLayoutReady(() => {
      this.initialize();
    });
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    console.log("Settings loaded:", this.settings, "Custom file order:", this.settings.customFileOrder);
  }
  async saveSettings() {
    await this.saveData(this.settings);
    console.log("Settings saved:", this.settings, "Custom file order:", this.settings.customFileOrder);
  }
  async onunload() {
    this._explorerUnpatchFunctions.forEach((unpatch) => unpatch());
    this._explorerUnpatchFunctions = [];
    this.isManualSortingEnabled() && this.reloadExplorerPlugin();
    this._unpatchMenu && this._unpatchMenu() && (this._unpatchMenu = null);
  }
  async initialize() {
    const prevManualSortingEnabledStatus = this.isManualSortingEnabled();
    this.patchSortable();
    this.patchSortOrderMenu();
    await this.waitForExplorer();
    const fileExplorerView = this.getFileExplorerView();
    if (!prevManualSortingEnabledStatus) {
      fileExplorerView.setSortOrder(this.settings.selectedSortOrder);
    }
    await this.patchFileExplorer(fileExplorerView);
    this._fileOrderManager = new FileOrderManager(this);
    await this._fileOrderManager.updateOrder();
    this.isManualSortingEnabled() && this.reloadExplorerPlugin();
    this.registerEvent(this.app.vault.on("create", (treeItem) => {
      if (this.isManualSortingEnabled()) {
        console.log("Manually created item:", treeItem);
        this._itemBeingCreatedManually = true;
      }
    }));
  }
  async toogleDragging() {
    this._sortableInstances.forEach((sortableInstance) => {
      sortableInstance.option("disabled", !this.settings.draggingEnabled);
    });
  }
  async patchSortable() {
    (0, import_monkey_around.around)(import_sortablejs.default.prototype, {
      _onDragOver: (original) => function(evt) {
        if (!this.el.children.length) {
          console.warn("Container is empty, skipping onDragOver()");
          return;
        }
        return original.call(this, evt);
      }
    });
  }
  async waitForExplorer() {
    return new Promise((resolve) => {
      const getExplorer = () => document.querySelector('[data-type="file-explorer"] .nav-files-container');
      const explorer = getExplorer();
      if (explorer) return resolve(explorer);
      const observer = new MutationObserver((_, obs) => {
        const explorer2 = getExplorer();
        if (explorer2) {
          obs.disconnect();
          resolve(explorer2);
        }
      });
      const workspace = document.querySelector(".workspace");
      workspace && observer.observe(workspace, { childList: true, subtree: true });
    });
  }
  async patchFileExplorer(fileExplorerView) {
    const thisPlugin = this;
    this._explorerUnpatchFunctions.push(
      (0, import_monkey_around.around)(Object.getPrototypeOf((fileExplorerView.tree?.infinityScroll.rootEl).childrenEl), {
        setChildrenInPlace: (original) => function(newChildren) {
          const isInExplorer = !!this.closest('[data-type="file-explorer"]');
          const isFileTreeItem = this.classList.value.includes("tree-item") && this.classList.value.includes("nav-");
          if (!thisPlugin.isManualSortingEnabled() || !isFileTreeItem && !isInExplorer) {
            return original.apply(this, [newChildren]);
          }
          const currentChildren = Array.from(this.children);
          const newChildrenSet = new Set(newChildren);
          for (const child of currentChildren) {
            const childElement = child;
            if (!newChildrenSet.has(childElement)) {
              const childPath = childElement.firstElementChild?.getAttribute("data-path");
              if (childPath && childElement.classList.contains("tree-item")) {
                const itemObject = thisPlugin.app.vault.getAbstractFileByPath(childPath);
                if (!itemObject) {
                  console.warn("Item not exists in vault, removing its DOM element:", childPath);
                  childPath && thisPlugin._fileOrderManager.updateOrder();
                  this.removeChild(child);
                } else {
                  const actualParentPath = childElement.parentElement?.previousElementSibling?.getAttribute("data-path") || "/";
                  const itemObjectParentPath = itemObject.parent?.path;
                  if (itemObjectParentPath !== actualParentPath && !thisPlugin.settings.draggingEnabled) {
                    console.warn("Item not in the right place, removing its DOM element:", childPath);
                    this.removeChild(childElement);
                    const fileExplorerView2 = thisPlugin.getFileExplorerView();
                    fileExplorerView2.updateShowUnsupportedFiles();
                  }
                }
              }
            }
          }
          const processNewItem = (addedItem) => {
            const path = addedItem.firstChild?.getAttribute("data-path");
            console.log(`Adding`, addedItem, path);
            const itemContainer = this;
            const elementFolderPath = path?.substring(0, path.lastIndexOf("/")) || "/";
            console.log(`Item container:`, itemContainer, elementFolderPath);
            if (thisPlugin._itemBeingCreatedManually) {
              console.log("Item is being created manually");
              thisPlugin._itemBeingCreatedManually = false;
              thisPlugin._fileOrderManager.updateOrder();
            }
            if (itemContainer.classList.contains("all-children-loaded")) {
              console.warn(`All children already loaded for ${elementFolderPath}. Skipping...`);
              return;
            }
            const dataPathValues = Array.from(itemContainer.children).filter((item) => item.firstElementChild?.hasAttribute("data-path")).map((item) => item.firstElementChild?.getAttribute("data-path"));
            const childrenCount = dataPathValues.length;
            const expectedChildrenCount = thisPlugin.app.vault.getFolderByPath(elementFolderPath)?.children.length;
            console.log(`Children count: ${childrenCount}, Expected children count: ${expectedChildrenCount}`);
            if (childrenCount === expectedChildrenCount) {
              itemContainer.classList.add("all-children-loaded");
              console.warn(`All children loaded for ${elementFolderPath}`);
              thisPlugin._fileOrderManager.restoreOrder(itemContainer, elementFolderPath);
            }
            const makeSortable = (container) => {
              if (import_sortablejs.default.get(container)) return;
              console.log(`Initiating Sortable on`, container);
              const minSwapThreshold = 0.3;
              const maxSwapThreshold = 2;
              let origSetCollapsed;
              function adjustSwapThreshold(item) {
                const previousItem = item.previousElementSibling;
                const nextItem = item.nextElementSibling;
                let adjacentNavFolders = [];
                if (previousItem?.classList.contains("nav-folder")) {
                  adjacentNavFolders.push(previousItem);
                }
                if (nextItem?.classList.contains("nav-folder")) {
                  adjacentNavFolders.push(nextItem);
                }
                if (adjacentNavFolders.length > 0) {
                  sortableInstance.options.swapThreshold = minSwapThreshold;
                  adjacentNavFolders.forEach((navFolder) => {
                    let childrenContainer = navFolder.querySelector(".tree-item-children");
                    if (childrenContainer) {
                      makeSortable(childrenContainer);
                    }
                  });
                } else {
                  sortableInstance.options.swapThreshold = maxSwapThreshold;
                }
              }
              const sortableInstance = new import_sortablejs.default(container, {
                group: "nested",
                draggable: ".tree-item",
                chosenClass: "manual-sorting-chosen",
                ghostClass: "manual-sorting-ghost",
                animation: 100,
                swapThreshold: maxSwapThreshold,
                fallbackOnBody: true,
                disabled: !thisPlugin.settings.draggingEnabled,
                delay: 100,
                delayOnTouchOnly: true,
                setData: function(dataTransfer, dragEl) {
                  dataTransfer.setData("string", "text/plain");
                  dataTransfer.setData("string", "text/uri-list");
                  dataTransfer.effectAllowed = "all";
                },
                onChoose: (evt) => {
                  console.log("Sortable: onChoose");
                  const dragged = evt.item;
                  adjustSwapThreshold(dragged);
                },
                onStart: (evt) => {
                  console.log("Sortable: onStart");
                  const itemPath = evt.item.firstChild?.getAttribute("data-path") || "";
                  const itemObject = thisPlugin.app.vault.getAbstractFileByPath(itemPath);
                  if (itemObject instanceof import_obsidian3.TFolder) {
                    const fileTreeItem = thisPlugin.getFileExplorerView().fileItems[itemPath];
                    fileTreeItem.setCollapsed(true, true);
                    origSetCollapsed || (origSetCollapsed = fileTreeItem.setCollapsed);
                    fileTreeItem.setCollapsed = async () => void 0;
                  }
                },
                onChange: (evt) => {
                  console.log("Sortable: onChange");
                  const dragged = evt.item;
                  adjustSwapThreshold(dragged);
                },
                onEnd: (evt) => {
                  console.log("Sortable: onEnd");
                  const draggedOverElement = document.querySelector(".is-being-dragged-over");
                  const draggedItemPath = evt.item.firstChild?.getAttribute("data-path") || "";
                  const draggedOverElementPath = draggedOverElement?.firstChild?.getAttribute("data-path");
                  const destinationPath = draggedOverElementPath || evt.to?.previousElementSibling?.getAttribute("data-path") || "/";
                  const movedItem = thisPlugin.app.vault.getAbstractFileByPath(draggedItemPath);
                  const targetFolder = thisPlugin.app.vault.getFolderByPath(destinationPath);
                  const folderPathInItemNewPath = `${targetFolder?.isRoot() ? "" : destinationPath + "/"}`;
                  let itemNewPath = folderPathInItemNewPath + movedItem.name;
                  if (draggedItemPath !== itemNewPath && thisPlugin.app.vault.getAbstractFileByPath(itemNewPath)) {
                    console.warn(`Name conflict detected. Path: ${itemNewPath} already exists. Resolving...`);
                    const generateUniqueFilePath = (path2) => {
                      const fullName = movedItem.name;
                      const lastDotIndex = fullName.lastIndexOf(".");
                      const name = lastDotIndex === -1 ? fullName : fullName.slice(0, lastDotIndex);
                      const extension = lastDotIndex === -1 ? "" : fullName.slice(lastDotIndex + 1);
                      let revisedPath = path2;
                      let counter = 1;
                      while (thisPlugin.app.vault.getAbstractFileByPath(revisedPath)) {
                        const newName = `${name} ${counter}${extension ? "." + extension : ""}`;
                        revisedPath = folderPathInItemNewPath + newName;
                        counter++;
                      }
                      return revisedPath;
                    };
                    itemNewPath = generateUniqueFilePath(itemNewPath);
                    console.log("New item path:", itemNewPath);
                  }
                  const newDraggbleIndex = draggedOverElementPath ? 0 : evt.newDraggableIndex;
                  thisPlugin._fileOrderManager.moveFile(draggedItemPath, itemNewPath, newDraggbleIndex);
                  thisPlugin.app.fileManager.renameFile(movedItem, itemNewPath);
                  const fileExplorerView2 = thisPlugin.getFileExplorerView();
                  if (movedItem?.path === itemNewPath) {
                    console.warn("Calling onRename manually for", movedItem, itemNewPath);
                    fileExplorerView2.onRename(movedItem, draggedItemPath);
                  }
                  if (movedItem instanceof import_obsidian3.TFolder) {
                    const fileTreeItem = fileExplorerView2.fileItems[draggedItemPath];
                    fileTreeItem.setCollapsed = origSetCollapsed;
                  }
                  if (!import_obsidian3.Platform.isMobile) {
                    const draggedItemSelf = evt.item.querySelector(".tree-item-self");
                    const hoverEvent = new MouseEvent("mouseover", { bubbles: true, cancelable: true });
                    draggedItemSelf.dispatchEvent(hoverEvent);
                    document.querySelector(".tree-item-self.hovered")?.classList.remove("hovered");
                    draggedItemSelf.classList.add("hovered");
                    draggedItemSelf.addEventListener("mouseleave", () => {
                      draggedItemSelf.classList.remove("hovered");
                    }, { once: true });
                  }
                },
                onUnchoose: () => {
                  console.log("Sortable: onUnchoose");
                  if (thisPlugin.settings.draggingEnabled) {
                    try {
                      const dropEvent = new DragEvent("drop", {
                        bubbles: true,
                        cancelable: true,
                        dataTransfer: new DataTransfer()
                      });
                      document.dispatchEvent(dropEvent);
                    } catch {
                    }
                  }
                }
              });
              thisPlugin._sortableInstances.push(sortableInstance);
            };
            makeSortable(itemContainer);
          };
          for (const child of newChildren) {
            if (!this.contains(child)) {
              if (child.classList.contains("tree-item")) {
                const topmostTreeItem = this.querySelector(".tree-item");
                this.insertBefore(child, topmostTreeItem);
                if (!child.firstChild?.hasAttribute("data-path")) {
                  new MutationObserver((mutations, obs) => {
                    for (const mutation of mutations) {
                      if (mutation.attributeName === "data-path") {
                        processNewItem(child);
                        obs.disconnect();
                        return;
                      }
                    }
                  }).observe(child.firstChild, { attributes: true, attributeFilter: ["data-path"] });
                } else {
                  processNewItem(child);
                }
              } else {
                this.prepend(child);
              }
            }
          }
        },
        detach: (original) => function(...args) {
          if (!thisPlugin.isManualSortingEnabled()) {
            return original.apply(this, args);
          }
          const itemNode = this;
          const itemPath = itemNode?.firstChild?.getAttribute?.("data-path");
          const itemObject = thisPlugin.app.vault.getAbstractFileByPath(itemPath);
          if (!itemObject) {
            return original.apply(this, args);
          }
        }
      })
    );
    this._explorerUnpatchFunctions.push(
      (0, import_monkey_around.around)(Object.getPrototypeOf(fileExplorerView), {
        onRename: (original) => function(file, oldPath) {
          original.apply(this, [file, oldPath]);
          if (thisPlugin.isManualSortingEnabled()) {
            const oldDirPath = oldPath.substring(0, oldPath.lastIndexOf("/")) || "/";
            if (!thisPlugin.settings.draggingEnabled && oldDirPath !== file.parent?.path) {
              thisPlugin._fileOrderManager.moveFile(oldPath, file.path, 0);
            }
            thisPlugin._fileOrderManager.renameItem(oldPath, file.path);
          }
        },
        setSortOrder: (original) => function(sortOrder) {
          original.call(this, sortOrder);
          const prevManualSortingEnabledStatus = thisPlugin.isManualSortingEnabled();
          thisPlugin.settings.selectedSortOrder = sortOrder;
          console.log("Sort order changed to:", sortOrder);
          if (prevManualSortingEnabledStatus) {
            thisPlugin.reloadExplorerPlugin();
          }
          thisPlugin.saveSettings();
        },
        sort: (original) => function(...args) {
          if (thisPlugin.isManualSortingEnabled()) {
            thisPlugin._recentExplorerAction = "sort";
          }
          original.apply(this, args);
        },
        onFileMouseover: (original) => function(event, targetEl) {
          if (thisPlugin.isManualSortingEnabled()) {
            const draggingElement = document.querySelector(".manual-sorting-chosen");
            if (draggingElement) {
              targetEl = draggingElement;
            }
          }
          original.apply(this, [event, targetEl]);
        }
      })
    );
    this._explorerUnpatchFunctions.push(
      (0, import_monkey_around.around)(Object.getPrototypeOf(fileExplorerView.tree), {
        setFocusedItem: (original) => function(...args) {
          if (thisPlugin.isManualSortingEnabled()) {
            thisPlugin._recentExplorerAction = "setFocusedItem";
          }
          original.apply(this, args);
        },
        handleItemSelection: (original) => function(e, t) {
          if (!thisPlugin.isManualSortingEnabled()) {
            return original.apply(this, [e, t]);
          }
          function getItemsBetween(allPaths, path1, path2) {
            const index1 = allPaths.indexOf(path1);
            const index2 = allPaths.indexOf(path2);
            if (index1 === -1 || index2 === -1) {
              return [];
            }
            const startIndex = Math.min(index1, index2);
            const endIndex = Math.max(index1, index2);
            return allPaths.slice(startIndex, endIndex + 1).map(
              (path) => thisPlugin.getFileExplorerView().fileItems[path]
            );
          }
          var n = this, i = n.selectedDoms, r = n.activeDom, o = n.view;
          if (!import_obsidian3.Keymap.isModEvent(e)) {
            if (e.altKey && !e.shiftKey)
              return this.app.workspace.setActiveLeaf(o.leaf, {
                focus: true
              }), i.has(t) ? this.deselectItem(t) : (this.selectItem(t), this.setFocusedItem(t, false), this.activeDom = t), true;
            if (e.shiftKey) {
              this.app.workspace.setActiveLeaf(o.leaf, {
                focus: true
              });
              const flattenPaths = thisPlugin._fileOrderManager.getFlattenPaths();
              const itemsBetween = getItemsBetween(flattenPaths, r.file.path, t.file.path);
              for (var a = 0, s = r ? itemsBetween : [t]; a < s.length; a++) {
                var l = s[a];
                this.selectItem(l);
              }
              return true;
            }
            if (t.selfEl.hasClass("is-being-renamed"))
              return true;
            if (t.selfEl.hasClass("is-active"))
              return this.app.workspace.setActiveLeaf(o.leaf, {
                focus: true
              }), this.setFocusedItem(t, false), true;
          }
          return this.clearSelectedDoms(), this.setFocusedItem(null), this.activeDom = t, false;
        }
      })
    );
    this._explorerUnpatchFunctions.push(
      (0, import_monkey_around.around)(Object.getPrototypeOf(fileExplorerView.tree?.infinityScroll), {
        scrollIntoView: (original) => function(...args) {
          const targetElement = args[0].el;
          const isInExplorer = !!targetElement.closest('[data-type="file-explorer"]');
          if (!thisPlugin.isManualSortingEnabled() || !isInExplorer) {
            return original.apply(this, args);
          }
          if (thisPlugin._recentExplorerAction) {
            thisPlugin._recentExplorerAction = "";
            return;
          }
          const container = this.scrollEl;
          const offsetTop = targetElement.offsetTop - container.offsetTop;
          const middleAlign = offsetTop - container.clientHeight * 0.3 + targetElement.clientHeight / 2;
          container.scrollTo({ top: middleAlign, behavior: "smooth" });
        }
      })
    );
  }
  async reloadExplorerPlugin() {
    const fileExplorerPlugin = this.app.internalPlugins.plugins["file-explorer"];
    fileExplorerPlugin.disable();
    await fileExplorerPlugin.enable();
    console.log("File Explorer plugin reloaded");
    const toggleSortingClass = async () => {
      const explorerEl = await this.waitForExplorer();
      explorerEl.toggleClass("manual-sorting-enabled", this.isManualSortingEnabled());
    };
    this.isManualSortingEnabled() && toggleSortingClass();
    const configureAutoScrolling = async () => {
      let scrollInterval = null;
      const explorer = await this.waitForExplorer();
      if (!explorer) return;
      explorer.removeEventListener("dragover", handleDragOver);
      if (!this.isManualSortingEnabled()) return;
      explorer.addEventListener("dragover", handleDragOver);
      function handleDragOver(event) {
        event.preventDefault();
        const rect = explorer.getBoundingClientRect();
        const scrollZone = 50;
        const scrollSpeed = 5;
        if (event.clientY < rect.top + scrollZone) {
          startScrolling(-scrollSpeed);
        } else if (event.clientY > rect.bottom - scrollZone) {
          startScrolling(scrollSpeed);
        } else {
          stopScrolling();
        }
      }
      document.addEventListener("dragend", stopScrolling);
      document.addEventListener("drop", stopScrolling);
      document.addEventListener("mouseleave", stopScrolling);
      function startScrolling(speed) {
        if (scrollInterval) return;
        function scrollStep() {
          explorer.scrollTop += speed;
          scrollInterval = requestAnimationFrame(scrollStep);
        }
        scrollInterval = requestAnimationFrame(scrollStep);
      }
      function stopScrolling() {
        if (scrollInterval) {
          cancelAnimationFrame(scrollInterval);
          scrollInterval = null;
        }
      }
    };
    this.isManualSortingEnabled() && configureAutoScrolling();
    const addReloadNavButton = async () => {
      await this.waitForExplorer();
      const fileExplorerView = this.getFileExplorerView();
      fileExplorerView.autoRevealButtonEl.style.display = "none";
      fileExplorerView.headerDom.addNavButton("rotate-ccw", "Reload app", () => {
        this.app.commands.executeCommandById("app:reload");
      });
    };
    this.isDevMode() && addReloadNavButton();
    if (this.app.plugins.getPlugin("folder-notes")) {
      console.log("Reloading Folder Notes plugin");
      await this.app.plugins.disablePlugin("folder-notes");
      this.app.plugins.enablePlugin("folder-notes");
    }
  }
  async patchSortOrderMenu() {
    const thisPlugin = this;
    this._unpatchMenu = (0, import_monkey_around.around)(import_obsidian3.Menu.prototype, {
      showAtMouseEvent: (original) => function(...args) {
        const openMenuButton = args[0].target;
        if (openMenuButton.getAttribute("aria-label") === i18next.t("plugins.file-explorer.action-change-sort") && openMenuButton.classList.contains("nav-action-button")) {
          const menu = this;
          if (thisPlugin.isManualSortingEnabled()) {
            menu.items.find((item) => item.checked === true).setChecked(false);
          }
          const sortingMenuSection = MANUAL_SORTING_MODE_ID;
          menu.addItem((item) => {
            item.setTitle("Manual sorting").setIcon("pin").setChecked(thisPlugin.isManualSortingEnabled()).setSection(sortingMenuSection).onClick(async () => {
              if (!thisPlugin.isManualSortingEnabled()) {
                thisPlugin.settings.selectedSortOrder = MANUAL_SORTING_MODE_ID;
                thisPlugin.saveSettings();
                await thisPlugin._fileOrderManager.updateOrder();
                thisPlugin.reloadExplorerPlugin();
              }
            });
          });
          if (thisPlugin.isManualSortingEnabled()) {
            menu.addItem((item) => {
              item.setTitle("Dragging").setIcon("move").setSection(sortingMenuSection).onClick(() => {
                thisPlugin.settings.draggingEnabled = !thisPlugin.settings.draggingEnabled;
                thisPlugin.saveSettings();
                thisPlugin.toogleDragging();
              });
              const checkboxContainerEl = item.dom.createEl("div", { cls: "menu-item-icon dragging-enabled-checkbox" });
              const checkboxEl = checkboxContainerEl.createEl("input", { type: "checkbox" });
              checkboxEl.checked = thisPlugin.settings.draggingEnabled;
            });
            menu.addItem((item) => {
              item.setTitle("\u5BFC\u51FA\u6587\u4EF6\u6811").setIcon("download").setSection(sortingMenuSection).onClick(async () => {
                await thisPlugin.exportFileTree();
              });
            });
          }
          menu.addItem((item) => {
            item.setTitle("Reset order").setIcon("trash-2").setSection(sortingMenuSection).onClick(async () => {
              const fileExplorerView = thisPlugin.getFileExplorerView();
              const prevSelectedSortOrder = fileExplorerView.sortOrder;
              new ResetOrderConfirmationModal(thisPlugin.app, prevSelectedSortOrder, async () => {
                thisPlugin._fileOrderManager.resetOrder();
                await thisPlugin._fileOrderManager.updateOrder();
                if (thisPlugin.isManualSortingEnabled()) {
                  thisPlugin.reloadExplorerPlugin();
                }
              }).open();
            });
          });
          let menuItems = menu.items;
          let menuSeparator = menuItems.splice(8, 1)[0];
          menuItems.splice(0, 0, menuSeparator);
        }
        return original.apply(this, args);
      }
    });
  }
  async exportFileTree() {
    if (!this.isManualSortingEnabled()) {
      new import_obsidian4.Notice("\u8BF7\u5148\u542F\u7528\u624B\u52A8\u6392\u5E8F\u6A21\u5F0F");
      return;
    }
    const sortedPaths = this._fileOrderManager.getFlattenPaths();
    const fileTree = this.buildFileTree(sortedPaths);
    const htmlContent = this.generateFileTreeHtml(fileTree);
    try {
      await this.app.vault.adapter.write("file-tree.html", htmlContent);
      new import_obsidian4.Notice(`\u6587\u4EF6\u6811\u5DF2\u5BFC\u51FA\u81F3 file-tree.html`);
    } catch (error) {
      console.error("\u5BFC\u51FA\u6587\u4EF6\u6811\u5931\u8D25:", error);
      new import_obsidian4.Notice("\u5BFC\u51FA\u6587\u4EF6\u6811\u5931\u8D25\uFF0C\u8BF7\u67E5\u770B\u63A7\u5236\u53F0\u65E5\u5FD7");
    }
  }
  buildFileTree(paths) {
    const tree = { name: "root", path: "/", type: "folder", children: [] };
    const nodeMap = /* @__PURE__ */ new Map();
    nodeMap.set("/", tree);
    const sortedPaths = [...paths].sort();
    for (const path of sortedPaths) {
      if (path === "/") continue;
      const fileObj = this.app.vault.getAbstractFileByPath(path);
      if (!fileObj) continue;
      const isFolder = fileObj instanceof import_obsidian3.TFolder;
      const name = fileObj.name;
      const parentPath = isFolder ? path.substring(0, path.lastIndexOf("/")) || "/" : path.substring(0, path.lastIndexOf("/")) || "/";
      const node = {
        name,
        path,
        type: isFolder ? "folder" : "file",
        children: isFolder ? [] : void 0
      };
      const parentNode = nodeMap.get(parentPath);
      if (parentNode) {
        parentNode.children.push(node);
        if (isFolder) {
          nodeMap.set(path, node);
        }
      } else {
        console.warn(`\u7236\u6587\u4EF6\u5939\u672A\u627E\u5230: ${parentPath}\uFF0C\u6587\u4EF6: ${path}`);
        this.createParentFolders(nodeMap, parentPath, tree);
        const newParentNode = nodeMap.get(parentPath);
        if (newParentNode) {
          newParentNode.children.push(node);
          if (isFolder) {
            nodeMap.set(path, node);
          }
        }
      }
    }
    return tree;
  }
  createParentFolders(nodeMap, path, rootNode) {
    if (path === "/" || nodeMap.has(path)) return;
    const parts = path.split("/").filter((p) => p.length > 0);
    let currentPath = "";
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`;
      if (!nodeMap.has(currentPath)) {
        const newNode = {
          name: part,
          path: currentPath,
          type: "folder",
          children: []
        };
        const parentPath = i === 0 ? "/" : parts.slice(0, i).join("/");
        const parentNode = nodeMap.get(parentPath);
        if (parentNode) {
          parentNode.children.push(newNode);
          nodeMap.set(currentPath, newNode);
        } else {
          this.createParentFolders(nodeMap, parentPath, rootNode);
          const newParentNode = nodeMap.get(parentPath);
          if (newParentNode) {
            newParentNode.children.push(newNode);
            nodeMap.set(currentPath, newNode);
          }
        }
      }
    }
  }
  generateFileTreeHtml(tree) {
    const now = /* @__PURE__ */ new Date();
    const dateTimeStr = now.toLocaleString();
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Obsidian \u6587\u4EF6\u6811</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 20px;
      background-color: #f5f6f8;
    }
    .file-tree {
      margin-left: 20px;
    }
    .folder {
      color: #5a67d8;
      cursor: pointer;
      font-weight: 500;
    }
    .file {
      color: #2d3748;
    }
    .item {
      margin: 5px 0;
      display: flex;
      align-items: center;
    }
    .icon {
      margin-right: 5px;
    }
    .collapse-icon {
      display: inline-block;
      width: 12px;
      text-align: center;
      margin-right: 5px;
      cursor: pointer;
    }
    .header {
      background-color: #4a5568;
      color: white;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Obsidian \u6587\u4EF6\u6811</h1>
    <p>\u5BFC\u51FA\u65F6\u95F4: ${dateTimeStr}</p>
  </div>
  
  <div class="file-tree">
`;
    const generateTreeHtml = (node, level = 0) => {
      if (!node) return "";
      let nodeHtml = "";
      if (node.path !== "/") {
        nodeHtml += `<div class="item">`;
        if (node.type === "folder") {
          nodeHtml += `<span class="collapse-icon">\u25BC</span>`;
          nodeHtml += `<span class="folder"><span class="icon">\u{1F4C1}</span> ${node.name}</span>`;
        } else {
          nodeHtml += `<span style="width: 12px; margin-right: 5px;"></span>`;
          nodeHtml += `<span class="file"><span class="icon">\u{1F4C4}</span> ${node.name}</span>`;
        }
        nodeHtml += `</div>
`;
      }
      if (node.children && node.children.length > 0) {
        nodeHtml += `<div class="file-tree">
`;
        for (const child of node.children) {
          nodeHtml += generateTreeHtml(child, level + 1);
        }
        nodeHtml += `</div>
`;
      }
      return nodeHtml;
    };
    html += generateTreeHtml(tree);
    html += `  </div>

  <script>
    // \u4E3A\u6298\u53E0\u56FE\u6807\u6DFB\u52A0\u70B9\u51FB\u4E8B\u4EF6
    document.querySelectorAll('.collapse-icon').forEach(icon => {
      icon.addEventListener('click', () => {
        const fileTree = icon.parentElement.nextElementSibling;
        if (fileTree && fileTree.classList.contains('file-tree')) {
          const isVisible = fileTree.style.display !== 'none';
          fileTree.style.display = isVisible ? 'none' : 'block';
          icon.textContent = isVisible ? '\u25B6' : '\u25BC';
        }
      });
    });
    
    // \u4E3A\u6587\u4EF6\u5939\u540D\u79F0\u6DFB\u52A0\u70B9\u51FB\u4E8B\u4EF6
    document.querySelectorAll('.folder').forEach(folder => {
      folder.addEventListener('click', () => {
        const item = folder.closest('.item');
        const fileTree = item.nextElementSibling;
        if (fileTree && fileTree.classList.contains('file-tree')) {
          const isVisible = fileTree.style.display !== 'none';
          fileTree.style.display = isVisible ? 'none' : 'block';
          const icon = item.querySelector('.collapse-icon');
          if (icon) {
            icon.textContent = isVisible ? '\u25B6' : '\u25BC';
          }
        }
      });
    });
  <\/script>
</body>
</html>`;
    return html;
  }
};
