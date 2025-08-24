import { ObsidianSpreadsheet } from './main';
import { TableStyling, TableLocation } from './tableStateManager';
import { Notice } from 'obsidian';

/**
 * 表格大小调整处理器
 * 负责处理表格列宽和行高的拖拽调整
 */
export class TableResizeHandler {
    private plugin: ObsidianSpreadsheet;
    private activeTable: HTMLElement | null = null;
    private resizeHandles: HTMLElement[] = [];
    private isDragging: boolean = false;
    private currentResizeTarget: {
        element: HTMLElement,
        type: 'col' | 'row',
        index: number
    } | null = null;
    private startPosition: number = 0;
    private startSize: number = 0;

    constructor(plugin: ObsidianSpreadsheet) {
        this.plugin = plugin;
        console.log('TableResizeHandler initialized');
    }

    /**
     * 设置活动表格
     * @param table 表格元素
     */
    public setActiveTable(table: HTMLElement | null): void {
        // 清除旧的调整手柄
        this.clearResizeHandles();
        
        this.activeTable = table;
        
        if (table) {
            // 创建调整手柄
            this.createResizeHandles();
        }
    }

    /**
     * 清除所有调整手柄
     */
    private clearResizeHandles(): void {
        this.resizeHandles.forEach(handle => {
            handle.remove();
        });
        this.resizeHandles = [];
    }

    /**
     * 创建调整手柄
     */
    private createResizeHandles(): void {
        if (!this.activeTable) return;
        
        // 获取表格ID
        const tableId = this.plugin.tableIdManager.getTableIdentifier(this.activeTable);
        if (!tableId) {
            console.warn('无法获取表格ID，不创建调整手柄');
            return;
        }
        
        // 创建列调整手柄
        this.createColumnResizeHandles();
        
        // 创建行调整手柄
        this.createRowResizeHandles();
    }

    /**
     * 创建列调整手柄
     */
    private createColumnResizeHandles(): void {
        if (!this.activeTable) return;
        
        const headerRow = this.activeTable.querySelector('tr');
        if (!headerRow) return;
        
        const cells = headerRow.querySelectorAll('th, td');
        
        // 确保 activeTable 不为 null（上面已经检查过了）
        const activeTable = this.activeTable;
        const tableRect = activeTable.getBoundingClientRect();
        
        cells.forEach((cell, index) => {
            if (index < cells.length - 1) { // 最后一列不需要调整手柄
                const handle = document.createElement('div');
                handle.className = 'table-column-resize-handle';
                handle.style.position = 'absolute';
                handle.style.top = '0';
                handle.style.width = '5px';
                handle.style.height = `${activeTable.offsetHeight}px`;
                handle.style.cursor = 'col-resize';
                handle.style.zIndex = '100';
                
                // 计算位置
                const cellRect = cell.getBoundingClientRect();
                const right = cellRect.right - tableRect.left;
                
                handle.style.left = `${right - 2}px`;
                
                // 添加事件监听
                this.setupResizeEvents(handle, 'col', index);
                
                // 添加到表格容器
                const parentElement = activeTable.parentElement;
                if (parentElement) {
                    parentElement.appendChild(handle);
                    this.resizeHandles.push(handle);
                }
            }
        });
    }

    /**
     * 创建行调整手柄
     */
    private createRowResizeHandles(): void {
        if (!this.activeTable) return;
        
        const rows = this.activeTable.querySelectorAll('tr');
        
        // 确保 activeTable 不为 null（上面已经检查过了）
        const activeTable = this.activeTable;
        const tableRect = activeTable.getBoundingClientRect();
        
        rows.forEach((row, index) => {
            if (index < rows.length - 1) { // 最后一行不需要调整手柄
                const handle = document.createElement('div');
                handle.className = 'table-row-resize-handle';
                handle.style.position = 'absolute';
                handle.style.left = '0';
                handle.style.height = '5px';
                handle.style.width = `${activeTable.offsetWidth}px`;
                handle.style.cursor = 'row-resize';
                handle.style.zIndex = '100';
                
                // 计算位置
                const rowRect = row.getBoundingClientRect();
                const bottom = rowRect.bottom - tableRect.top;
                
                handle.style.top = `${bottom - 2}px`;
                
                // 添加事件监听
                this.setupResizeEvents(handle, 'row', index);
                
                // 添加到表格容器
                const parentElement = activeTable.parentElement;
                if (parentElement) {
                    parentElement.appendChild(handle);
                    this.resizeHandles.push(handle);
                }
            }
        });
    }

    /**
     * 设置调整事件
     * @param handle 调整手柄元素
     * @param type 调整类型 ('col' | 'row')
     * @param index 索引
     */
    private setupResizeEvents(handle: HTMLElement, type: 'col' | 'row', index: number): void {
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            this.isDragging = true;
            this.currentResizeTarget = { element: handle, type, index };
            
            // 记录起始位置
            this.startPosition = type === 'col' ? e.clientX : e.clientY;
            
            // 获取当前大小
            if (this.activeTable) {
                if (type === 'col') {
                    const cell = this.activeTable.querySelector(`tr:first-child td:nth-child(${index + 1}), tr:first-child th:nth-child(${index + 1})`);
                    this.startSize = cell ? cell.getBoundingClientRect().width : 0;
                } else {
                    const row = this.activeTable.querySelector(`tr:nth-child(${index + 1})`);
                    this.startSize = row ? row.getBoundingClientRect().height : 0;
                }
            }
            
            // 添加全局事件监听
            document.addEventListener('mousemove', this.handleMouseMove);
            document.addEventListener('mouseup', this.handleMouseUp);
            
            // 添加拖拽样式
            handle.classList.add('dragging');
        });
    }

    /**
     * 处理鼠标移动事件
     */
    private handleMouseMove = (e: MouseEvent): void => {
        if (!this.isDragging || !this.currentResizeTarget || !this.activeTable) return;
        
        e.preventDefault();
        
        const { type, index } = this.currentResizeTarget;
        
        // 计算大小变化
        const currentPosition = type === 'col' ? e.clientX : e.clientY;
        const delta = currentPosition - this.startPosition;
        const newSize = Math.max(20, this.startSize + delta); // 最小尺寸为20px
        
        // 应用新尺寸到DOM
        if (type === 'col') {
            const cells = this.activeTable.querySelectorAll(`td:nth-child(${index + 1}), th:nth-child(${index + 1})`);
            cells.forEach(cell => {
                (cell as HTMLElement).style.width = `${newSize}px`;
            });
        } else {
            const row = this.activeTable.querySelector(`tr:nth-child(${index + 1})`);
            if (row) {
                (row as HTMLElement).style.height = `${newSize}px`;
            }
        }
    }

    /**
     * 处理鼠标抬起事件
     */
    private handleMouseUp = async (e: MouseEvent): Promise<void> => {
        if (!this.isDragging || !this.currentResizeTarget || !this.activeTable) return;
        
        e.preventDefault();
        
        const { type, index, element } = this.currentResizeTarget;
        
        // 移除拖拽样式
        element.classList.remove('dragging');
        
        // 保存尺寸数据
        await this.saveSizeData();
        
        // 清理状态
        this.isDragging = false;
        this.currentResizeTarget = null;
        
        // 移除全局事件监听
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
    }

    /**
     * 保存尺寸数据
     */
    private async saveSizeData(): Promise<void> {
        if (!this.activeTable) return;
        
        try {
            // 获取表格ID
            const tableId = this.plugin.tableIdManager.getTableIdentifier(this.activeTable);
            if (!tableId) {
                console.warn('无法获取表格ID，不保存尺寸数据');
                return;
            }
            
            // 获取当前文件
            const activeFile = this.plugin.app.workspace.getActiveFile();
            if (!activeFile) {
                console.warn('无法获取当前文件');
                return;
            }
            
            // 获取表格在文档中的索引
            const allDocTables = document.querySelectorAll('table');
            const tableIndex = Array.from(allDocTables).indexOf(this.activeTable as HTMLTableElement);
            
            if (tableIndex === -1) {
                console.warn('无法确定表格索引');
                return;
            }
            
            // 获取现有样式
            const existingStyle = this.plugin.tableStateManager.getTableStyle(tableId);
            
            // 提取当前尺寸
            const rowHeights: string[] = [];
            const rows = this.activeTable.querySelectorAll('tr');
            rows.forEach(row => {
                rowHeights.push((row as HTMLElement).style.height || 'auto');
            });
            
            const colWidths: string[] = [];
            const firstRow = this.activeTable.querySelector('tr');
            if (firstRow) {
                const cells = firstRow.querySelectorAll('th, td');
                cells.forEach(cell => {
                    colWidths.push((cell as HTMLElement).style.width || 'auto');
                });
            }
            
            // 创建新的样式对象，保留现有的对齐和单元格样式
            const styling: TableStyling = {
                rowHeights,
                colWidths,
                alignment: existingStyle?.alignment || Array(colWidths.length).fill('left'),
                cellStyles: existingStyle?.cellStyles || []
            };
            
            // 查找表格在数据中的现有位置信息
            let existingLocationInfo = null;
            const allData = await this.plugin.loadData();
            if (allData && allData.tables && allData.tables[tableId]) {
                const tableData = allData.tables[tableId];
                if (tableData.locations && tableData.locations.length > 0) {
                    // 查找当前文件的位置信息
                    existingLocationInfo = tableData.locations.find((loc: TableLocation) => loc.path === activeFile.path);
                }
            }
            
            // 保存样式，使用现有位置信息或仅提供基本信息
            await this.plugin.tableStateManager.saveTableStyle(tableId, styling, {
                path: activeFile.path,
                index: tableIndex,
                startLine: existingLocationInfo?.startLine,
                endLine: existingLocationInfo?.endLine
            });
            
            console.log(`表格尺寸数据已保存: ${tableId}`);
        } catch (error) {
            console.error('保存表格尺寸数据时出错:', error);
        }
    }

    /**
     * 应用保存的尺寸数据
     * @param table 表格元素
     */
    public applySavedSizes(table: HTMLElement): void {
        if (!table) return;
        
        try {
            // 获取表格ID
            const tableId = this.plugin.tableIdManager.getTableIdentifier(table);
            if (!tableId) {
                console.warn('无法获取表格ID，不应用尺寸数据');
                return;
            }
            
            // 获取表格样式
            const style = this.plugin.tableStateManager.getTableStyle(tableId);
            if (!style) {
                console.warn(`未找到表格 ${tableId} 的样式数据`);
                return;
            }
            
            // 应用行高
            const rows = table.querySelectorAll('tr');
            rows.forEach((row, index) => {
                if (style.rowHeights && style.rowHeights[index] && style.rowHeights[index] !== 'auto') {
                    (row as HTMLElement).style.height = style.rowHeights[index];
                }
            });
            
            // 应用列宽
            const firstRow = table.querySelector('tr');
            if (firstRow) {
                const cells = firstRow.querySelectorAll('th, td');
                cells.forEach((cell, index) => {
                    if (style.colWidths && style.colWidths[index] && style.colWidths[index] !== 'auto') {
                        // 应用到当前列的所有单元格
                        const colCells = table.querySelectorAll(`td:nth-child(${index + 1}), th:nth-child(${index + 1})`);
                        colCells.forEach(colCell => {
                            (colCell as HTMLElement).style.width = style.colWidths[index];
                        });
                    }
                });
            }
            
            console.log(`已应用表格 ${tableId} 的尺寸数据`);
        } catch (error) {
            console.error('应用表格尺寸数据时出错:', error);
        }
    }
}

/**
 * 添加表格调整大小相关的CSS样式
 */
export function addTableResizeStyles(): void {
    // 检查是否已添加样式
    if (document.getElementById('table-resize-styles')) return;
    
    const styleEl = document.createElement('style');
    styleEl.id = 'table-resize-styles';
    styleEl.textContent = `
        .table-column-resize-handle {
            background-color: var(--interactive-accent);
            opacity: 0;
            transition: opacity 0.2s ease;
        }
        
        .table-row-resize-handle {
            background-color: var(--interactive-accent);
            opacity: 0;
            transition: opacity 0.2s ease;
        }
        
        .table-column-resize-handle:hover,
        .table-row-resize-handle:hover,
        .table-column-resize-handle.dragging,
        .table-row-resize-handle.dragging {
            opacity: 0.6;
        }
    `;
    document.head.appendChild(styleEl);
} 