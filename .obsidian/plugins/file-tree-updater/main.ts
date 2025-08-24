import { App, Plugin, TFile, TFolder, Notice } from 'obsidian';

interface FileTreeData {
  fileTree: {
    [path: string]: {
      children: string[];
      type: 'file' | 'folder';
    };
  };
  pathMap: {
    [oldPath: string]: string;
  };
}

const DEFAULT_DATA: FileTreeData = {
  fileTree: {},
  pathMap: {}
};

export default class FileTreeUpdaterPlugin extends Plugin {
  data: FileTreeData;

  async onload() {
    console.log('加载 FileTreeUpdater 插件');
    
    // 加载数据
    this.data = Object.assign({}, DEFAULT_DATA, await this.loadData());
    
    // 初始化文件树
    await this.initFileTree();
    
    // 注册文件创建事件监听
    this.registerEvent(
      this.app.vault.on('create', (file) => {
        this.handleFileCreated(file);
      })
    );
    
    // 注册文件重命名事件监听
    this.registerEvent(
      this.app.vault.on('rename', (file, oldPath) => {
        this.handleFileRenamed(file, oldPath);
      })
    );
    
    // 注册文件删除事件监听
    this.registerEvent(
      this.app.vault.on('delete', (file) => {
        this.handleFileDeleted(file);
      })
    );
    
    // 添加命令：重建文件树
    this.addCommand({
      id: 'rebuild-file-tree',
      name: '重建文件树',
      callback: async () => {
        await this.initFileTree();
        new Notice('文件树已重建');
      }
    });
    
    // 添加命令：显示文件树数据
    this.addCommand({
      id: 'show-file-tree-data',
      name: '显示文件树数据',
      callback: () => {
        console.log('当前文件树数据:', this.data);
        new Notice('文件树数据已在控制台输出');
      }
    });
  }
  
  onunload() {
    console.log('卸载 FileTreeUpdater 插件');
  }
  
  // 初始化文件树
  async initFileTree() {
    // 重置数据
    this.data = {
      fileTree: {},
      pathMap: {}
    };
    
    // 获取所有文件和文件夹
    const files = this.app.vault.getFiles();
    const folders = this.getAllFolders();
    
    // 处理所有文件夹
    folders.forEach(folder => {
      const path = folder.path;
      this.data.fileTree[path] = {
        children: [],
        type: 'folder'
      };
    });
    
    // 处理所有文件
    files.forEach(file => {
      const path = file.path;
      this.data.fileTree[path] = {
        children: [],
        type: 'file'
      };
      
      // 将文件添加到父文件夹的children中
      const parentPath = this.getParentPath(path);
      if (parentPath && this.data.fileTree[parentPath]) {
        this.data.fileTree[parentPath].children.push(path);
      }
    });
    
    // 保存数据
    await this.saveData(this.data);
    console.log('文件树初始化完成:', this.data);
  }
  
  // 获取所有文件夹
  getAllFolders(): TFolder[] {
    const folders: TFolder[] = [];
    const rootFolder = this.app.vault.getRoot();
    
    // 递归获取所有文件夹
    const processFolder = (folder: TFolder) => {
      folders.push(folder);
      folder.children.forEach(child => {
        if (child instanceof TFolder) {
          processFolder(child);
        }
      });
    };
    
    processFolder(rootFolder);
    return folders;
  }
  
  // 获取父路径
  getParentPath(path: string): string | null {
    const lastSlashIndex = path.lastIndexOf('/');
    if (lastSlashIndex === -1) {
      return ''; // 根目录
    }
    return path.substring(0, lastSlashIndex);
  }
  
  // 处理文件创建事件
  async handleFileCreated(file: TFile | TFolder) {
    console.log('文件创建:', file.path);
    
    // 更新文件树
    this.data.fileTree[file.path] = {
      children: [],
      type: file instanceof TFile ? 'file' : 'folder'
    };
    
    // 更新父文件夹
    const parentPath = this.getParentPath(file.path);
    if (parentPath !== null && this.data.fileTree[parentPath]) {
      this.data.fileTree[parentPath].children.push(file.path);
    }
    
    // 保存数据
    await this.saveData(this.data);
  }
  
  // 处理文件重命名事件
  async handleFileRenamed(file: TFile | TFolder, oldPath: string) {
    console.log('文件重命名:', oldPath, '->', file.path);
    
    // 更新 pathMap
    this.data.pathMap[oldPath] = file.path;
    
    // 从旧父文件夹中移除
    const oldParentPath = this.getParentPath(oldPath);
    if (oldParentPath !== null && this.data.fileTree[oldParentPath]) {
      const children = this.data.fileTree[oldParentPath].children;
      const index = children.indexOf(oldPath);
      if (index !== -1) {
        children.splice(index, 1);
      }
    }
    
    // 添加到新父文件夹
    const newParentPath = this.getParentPath(file.path);
    if (newParentPath !== null && this.data.fileTree[newParentPath]) {
      this.data.fileTree[newParentPath].children.push(file.path);
    }
    
    // 更新文件树
    if (this.data.fileTree[oldPath]) {
      this.data.fileTree[file.path] = this.data.fileTree[oldPath];
      delete this.data.fileTree[oldPath];
    } else {
      this.data.fileTree[file.path] = {
        children: [],
        type: file instanceof TFile ? 'file' : 'folder'
      };
    }
    
    // 如果是文件夹，还需要更新所有子文件和子文件夹的路径
    if (file instanceof TFolder) {
      this.updateChildrenPaths(oldPath, file.path);
    }
    
    // 保存数据
    await this.saveData(this.data);
  }
  
  // 更新子文件和子文件夹的路径
  updateChildrenPaths(oldParentPath: string, newParentPath: string) {
    // 找出所有以 oldParentPath/ 开头的路径
    const oldPrefix = oldParentPath + '/';
    const newPrefix = newParentPath + '/';
    
    Object.keys(this.data.fileTree).forEach(path => {
      if (path.startsWith(oldPrefix)) {
        // 计算新路径
        const newPath = newPrefix + path.substring(oldPrefix.length);
        
        // 更新 pathMap
        this.data.pathMap[path] = newPath;
        
        // 更新文件树
        this.data.fileTree[newPath] = this.data.fileTree[path];
        delete this.data.fileTree[path];
        
        // 更新父文件夹的 children 数组
        Object.values(this.data.fileTree).forEach(item => {
          const index = item.children.indexOf(path);
          if (index !== -1) {
            item.children[index] = newPath;
          }
        });
      }
    });
  }
  
  // 处理文件删除事件
  async handleFileDeleted(file: TFile | TFolder) {
    console.log('文件删除:', file.path);
    
    // 从父文件夹中移除
    const parentPath = this.getParentPath(file.path);
    if (parentPath !== null && this.data.fileTree[parentPath]) {
      const children = this.data.fileTree[parentPath].children;
      const index = children.indexOf(file.path);
      if (index !== -1) {
        children.splice(index, 1);
      }
    }
    
    // 如果是文件夹，还需要删除所有子文件和子文件夹
    if (file instanceof TFolder) {
      this.deleteChildrenPaths(file.path);
    }
    
    // 从文件树中删除
    delete this.data.fileTree[file.path];
    
    // 保存数据
    await this.saveData(this.data);
  }
  
  // 删除子文件和子文件夹的路径
  deleteChildrenPaths(parentPath: string) {
    // 找出所有以 parentPath/ 开头的路径
    const prefix = parentPath + '/';
    
    Object.keys(this.data.fileTree).forEach(path => {
      if (path.startsWith(prefix)) {
        delete this.data.fileTree[path];
      }
    });
  }
  
  // 根据路径获取文件或文件夹
  getFileByPath(path: string): TFile | TFolder | null {
    // 先检查 pathMap 中是否有映射
    if (this.data.pathMap[path]) {
      path = this.data.pathMap[path];
    }
    
    // 尝试获取文件
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile || file instanceof TFolder) {
      return file;
    }
    
    return null;
  }
  
  // 获取文件树数据
  getFileTreeData(): FileTreeData {
    return this.data;
  }
}