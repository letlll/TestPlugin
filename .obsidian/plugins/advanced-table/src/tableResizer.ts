import { App, Plugin } from 'obsidian';
import { ObsidianSpreadsheet } from './main';

/**
 * 表格大小调整器类
 * 处理表格行高和列宽的拖拽调整
 */
export class TableResizer {
    private plugin: ObsidianSpreadsheet;
    private activeTable: HTMLElement | null = null;
    private resizeHandles: HTMLElement[] = [];
    private isResizing: boolean = false;
    private currentHandle: HTMLElement | null = null;
    private startX: number = 0;
    private startY: number = 0;
    private startWidth: number = 0;
    private startHeight: number = 0;
    private columnIndex: number = -1;
    private tableWidth: number = 0;
    
    // 辅助方法，获取app对象
    private getApp(): App {
        return (this.plugin as unknown as Plugin).app;
    }
    private targetIndex: number = -1;
    private resizeType: 'column' | 'row' = 'column';
    private resizeGuide: HTMLElement | null = null;

    /**
     * 构造函数
     * @param plugin 插件实例
     */
    constructor(plugin: ObsidianSpreadsheet) {
        this.plugin = plugin;
        console.log('TableResizer: 初始化表格大小调整器');
    }

    /**
     * 为表格添加拖拽调整大小的功能
     * @param table 表格元素
     */
    setupTableResize(table: HTMLElement): void {
        try {
            console.log('TableResizer: 为表格设置大小调整功能');
            
            // 移除旧的拖拽句柄
            this.removeResizeHandles();
            
            // 设置当前活动表格
            this.activeTable = table;
            
            // 为表格添加拖拽句柄
            this.addResizeHandles(table);
            
            console.log('TableResizer: 表格大小调整功能设置完成');
        } catch (error) {
            console.error('TableResizer: 设置表格大小调整功能时出错:', error);
        }
    }

    /**
     * 为表格添加拖拽调整大小的句柄
     * @param table 表格元素
     */
    private addResizeHandles(table: HTMLElement): void {
        console.log('TableResizer: 添加拖拽句柄');
        
        // 确保表格有相对定位，以便正确定位句柄
        table.style.position = 'relative';
        
        // 获取表格的所有行和列
        const rows = table.querySelectorAll('tr');
        if (rows.length === 0) {
            console.warn('TableResizer: 表格没有行');
            return;
        }
        
        const firstRowCells = rows[0].querySelectorAll('th, td');
        if (firstRowCells.length === 0) {
            console.warn('TableResizer: 表格第一行没有单元格');
            return;
        }
        
        console.log(`TableResizer: 表格有 ${rows.length} 行, ${firstRowCells.length} 列`);
        
        // 创建列拖拽句柄
        for (let i = 0; i < firstRowCells.length - 1; i++) {
            const cell = firstRowCells[i] as HTMLElement;
            const nextCell = firstRowCells[i + 1] as HTMLElement;
            const cellRect = cell.getBoundingClientRect();
            const tableRect = table.getBoundingClientRect();
            
            // 计算句柄位置
            const handleLeft = cell.offsetLeft + cell.offsetWidth;
            
            // 创建列拖拽句柄
            const colHandle = document.createElement('div');
            colHandle.className = 'table-resize-handle-col';
            colHandle.style.position = 'absolute';
            colHandle.style.top = '0';
            colHandle.style.left = `${handleLeft}px`;
            colHandle.style.width = '5px';
            colHandle.style.height = '100%';
            colHandle.style.cursor = 'col-resize';
            colHandle.style.zIndex = '100';
            colHandle.dataset.index = i.toString();
            colHandle.dataset.type = 'column';
            
            // 添加调试信息
            console.log(`TableResizer: 添加列拖拽句柄 - 索引=${i}, 位置=${handleLeft}px`);
            
            // 添加事件监听器
            this.addHandleEventListeners(colHandle);
            
            // 添加到表格
            table.appendChild(colHandle);
            this.resizeHandles.push(colHandle);
        }
        
        // 创建行拖拽句柄
        for (let i = 0; i < rows.length - 1; i++) {
            const row = rows[i] as HTMLElement;
            const nextRow = rows[i + 1] as HTMLElement;
            const rowRect = row.getBoundingClientRect();
            const tableRect = table.getBoundingClientRect();
            
            // 计算句柄位置
            const handleTop = row.offsetTop + row.offsetHeight;
            
            // 创建行拖拽句柄
            const rowHandle = document.createElement('div');
            rowHandle.className = 'table-resize-handle-row';
            rowHandle.style.position = 'absolute';
            rowHandle.style.left = '0';
            rowHandle.style.top = `${handleTop}px`;
            rowHandle.style.height = '5px';
            rowHandle.style.width = '100%';
            rowHandle.style.cursor = 'row-resize';
            rowHandle.style.zIndex = '100';
            rowHandle.dataset.index = i.toString();
            rowHandle.dataset.type = 'row';
            
            // 添加调试信息
            console.log(`TableResizer: 添加行拖拽句柄 - 索引=${i}, 位置=${handleTop}px`);
            
            // 添加事件监听器
            this.addHandleEventListeners(rowHandle);
            
            // 添加到表格
            table.appendChild(rowHandle);
            this.resizeHandles.push(rowHandle);
        }
    }

    /**
     * 为拖拽句柄添加事件监听器
     * @param handle 拖拽句柄元素
     */
    private addHandleEventListeners(handle: HTMLElement): void {
        handle.addEventListener('mousedown', this.handleMouseDown.bind(this));
        
        // 添加悬停效果
        handle.addEventListener('mouseenter', () => {
            handle.style.backgroundColor = 'var(--interactive-accent)';
        });
        
        handle.addEventListener('mouseleave', () => {
            if (!this.isResizing || this.currentHandle !== handle) {
                handle.style.backgroundColor = 'transparent';
            }
        });
    }

    /**
     * 处理鼠标按下事件
     * @param event 鼠标事件
     */
    private handleMouseDown(event: MouseEvent): void {
        if (!this.activeTable) return;
        
        // 阻止事件冒泡和默认行为
        event.stopPropagation();
        event.preventDefault();
        
        // 获取当前拖拽句柄
        const handle = event.target as HTMLElement;
        this.currentHandle = handle;
        
        // 获取拖拽类型和目标索引
        this.resizeType = handle.dataset.type as 'column' | 'row';
        this.targetIndex = parseInt(handle.dataset.index || '-1');
        
        console.log(`TableResizer: 开始拖拽 - 类型=${this.resizeType}, 索引=${this.targetIndex}`);
        
        // 记录起始位置和尺寸
        this.startX = event.clientX;
        this.startY = event.clientY;
        
        if (this.resizeType === 'column') {
            const cells = this.activeTable.querySelectorAll(`tr:first-child > *:nth-child(${this.targetIndex + 1})`);
            if (cells.length > 0) {
                const cell = cells[0] as HTMLElement;
                this.startWidth = cell.offsetWidth;
                console.log(`TableResizer: 列初始宽度=${this.startWidth}px`);
            }
        } else {
            const rows = this.activeTable.querySelectorAll(`tr:nth-child(${this.targetIndex + 1})`);
            if (rows.length > 0) {
                const row = rows[0] as HTMLElement;
                this.startHeight = row.offsetHeight;
                console.log(`TableResizer: 行初始高度=${this.startHeight}px`);
            }
        }
        
        // 创建调整大小的辅助线
        this.createResizeGuide();
        
        // 设置调整状态
        this.isResizing = true;
        
        // 添加鼠标移动和松开事件监听器
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }

    /**
     * 创建调整大小的辅助线
     */
    private createResizeGuide(): void {
        if (!this.activeTable || !this.currentHandle) return;
        
        // 创建辅助线元素
        const guide = document.createElement('div');
        guide.className = `table-resize-guide table-resize-guide-${this.resizeType}`;
        guide.style.position = 'absolute';
        guide.style.backgroundColor = 'var(--interactive-accent)';
        guide.style.zIndex = '1000';
        
        if (this.resizeType === 'column') {
            guide.style.width = '2px';
            guide.style.height = '100%';
            guide.style.top = '0';
            guide.style.left = this.currentHandle.style.left;
        } else {
            guide.style.height = '2px';
            guide.style.width = '100%';
            guide.style.left = '0';
            guide.style.top = this.currentHandle.style.top;
        }
        
        // 添加到表格
        this.activeTable.appendChild(guide);
        this.resizeGuide = guide;
        
        console.log('TableResizer: 创建调整大小辅助线');
    }

    /**
     * 处理鼠标移动事件
     * @param event 鼠标事件
     */
    private handleMouseMove(event: MouseEvent): void {
        if (!this.isResizing || !this.activeTable || !this.currentHandle || !this.resizeGuide) return;
        
        // 计算鼠标移动距离
        const deltaX = event.clientX - this.startX;
        const deltaY = event.clientY - this.startY;
        
        // 更新辅助线位置
        if (this.resizeType === 'column') {
            const newLeft = parseInt(this.currentHandle.style.left) + deltaX;
            this.resizeGuide.style.left = `${newLeft}px`;
            console.log(`TableResizer: 调整列辅助线 - 位置=${newLeft}px`);
        } else {
            const newTop = parseInt(this.currentHandle.style.top) + deltaY;
            this.resizeGuide.style.top = `${newTop}px`;
            console.log(`TableResizer: 调整行辅助线 - 位置=${newTop}px`);
        }
    }

    /**
     * 处理鼠标松开事件
     * @param event 鼠标事件
     */
    private handleMouseUp(event: MouseEvent): void {
        if (!this.isResizing || !this.activeTable) return;
        
        console.log('TableResizer: 结束拖拽');
        
        // 计算鼠标移动距离
        const deltaX = event.clientX - this.startX;
        const deltaY = event.clientY - this.startY;
        
        // 应用新的尺寸
        if (this.resizeType === 'column' && this.targetIndex >= 0) {
            const newWidth = Math.max(20, this.startWidth + deltaX); // 最小宽度20px
            this.applyColumnWidth(this.targetIndex, newWidth);
            console.log(`TableResizer: 应用新列宽 - 索引=${this.targetIndex}, 宽度=${newWidth}px`);
        } else if (this.resizeType === 'row' && this.targetIndex >= 0) {
            const newHeight = Math.max(20, this.startHeight + deltaY); // 最小高度20px
            this.applyRowHeight(this.targetIndex, newHeight);
            console.log(`TableResizer: 应用新行高 - 索引=${this.targetIndex}, 高度=${newHeight}px`);
        }
        
        // 保存表格尺寸数据
        this.saveTableSizeData();
        
        // 移除辅助线
        if (this.resizeGuide) {
            this.resizeGuide.remove();
            this.resizeGuide = null;
        }
        
        // 重置状态
        this.isResizing = false;
        this.currentHandle = null;
        
        // 移除事件监听器
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    }

    /**
     * 应用列宽
     * @param colIndex 列索引
     * @param width 宽度
     */
    private applyColumnWidth(colIndex: number, width: number): void {
        if (!this.activeTable) return;
        
        // 获取表格的colgroup
        let colgroup = this.activeTable.querySelector('colgroup');
        if (!colgroup) {
            // 如果没有colgroup，创建一个
            colgroup = document.createElement('colgroup');
            
            // 为每一列创建col元素
            const firstRow = this.activeTable.querySelector('tr');
            if (firstRow) {
                const cellCount = firstRow.querySelectorAll('th, td').length;
                for (let i = 0; i < cellCount; i++) {
                    const col = document.createElement('col');
                    colgroup.appendChild(col);
                }
            }
            
            // 添加到表格
            this.activeTable.prepend(colgroup);
        }
        
        // 获取对应的col元素
        const cols = colgroup.querySelectorAll('col');
        if (colIndex < cols.length) {
            const col = cols[colIndex] as HTMLElement;
            col.style.width = `${width}px`;
        }
    }

    /**
     * 应用行高
     * @param rowIndex 行索引
     * @param height 高度
     */
    private applyRowHeight(rowIndex: number, height: number): void {
        if (!this.activeTable) return;
        
        // 获取对应的行
        const rows = this.activeTable.querySelectorAll('tr');
        if (rowIndex < rows.length) {
            const row = rows[rowIndex] as HTMLElement;
            row.style.height = `${height}px`;
        }
    }

    /**
     * 保存表格尺寸数据
     */
    private async saveTableSizeData(): Promise<void> {
        if (!this.activeTable) return;
        
        try {
            // 获取表格ID
            const tableId = this.activeTable.getAttribute('data-table-id');
            if (!tableId) {
                console.warn('TableResizer: 无法保存表格尺寸数据，表格没有ID');
                return;
            }
            
            console.log(`TableResizer: 保存表格尺寸数据 - 表格ID=${tableId}`);
            
            // 收集列宽数据
            const colWidths: string[] = [];
            const colgroup = this.activeTable.querySelector('colgroup');
            if (colgroup) {
                const cols = colgroup.querySelectorAll('col');
                cols.forEach(col => {
                    const width = (col as HTMLElement).style.width || 'auto';
                    colWidths.push(width);
                });
            }
            
            // 如果没有colgroup或cols，从表格第一行获取列数
            if (colWidths.length === 0) {
                const firstRow = this.activeTable.querySelector('tr');
                if (firstRow) {
                    const cellCount = firstRow.querySelectorAll('th, td').length;
                    for (let i = 0; i < cellCount; i++) {
                        colWidths.push('auto');
                    }
                }
            }
            
            // 收集行高数据
            const rowHeights: string[] = [];
            const rows = this.activeTable.querySelectorAll('tr');
            rows.forEach(row => {
                const height = (row as HTMLElement).style.height || 'auto';
                rowHeights.push(height);
            });
            
            console.log('TableResizer: 收集的尺寸数据', { colWidths, rowHeights });
            
            // 加载现有数据
            let allData = await this.plugin.loadData() || {};
            if (!allData.tables) {
                allData.tables = {};
            }
            
            // 获取当前活动文件
            const activeFile = this.getApp().workspace.getActiveFile();
            if (!activeFile) {
                console.warn('TableResizer: 无法获取当前文件路径');
                return;
            }
            
            // 更新表格数据
            if (!allData.tables[tableId]) {
                // 创建新的表格数据
                allData.tables[tableId] = {
                    id: tableId,
                    locations: [{
                        path: activeFile.path,
                        isActive: true
                    }],
                    structure: {
                        rowCount: rows.length,
                        colCount: colWidths.length,
                        hasHeaders: rows.length > 0 && rows[0].querySelectorAll('th').length > 0
                    },
                    styling: {
                        rowHeights: rowHeights,
                        colWidths: colWidths,
                        alignment: Array(colWidths.length).fill('left'),
                        cellStyles: []
                    }
                };
                
                console.log(`TableResizer: 创建了新的表格数据 - ID=${tableId}`, allData.tables[tableId]);
            } else {
                // 更新现有数据
                if (!allData.tables[tableId].styling) {
                    allData.tables[tableId].styling = {};
                }
                
                // 确保locations包含当前文件
                if (!allData.tables[tableId].locations) {
                    allData.tables[tableId].locations = [{
                        path: activeFile.path,
                        isActive: true
                    }];
                } else {
                    // 检查当前文件是否已在locations中
                    const filePathExists = allData.tables[tableId].locations.some(
                        (loc: {path: string}) => loc.path === activeFile.path
                    );
                    
                    if (!filePathExists) {
                        allData.tables[tableId].locations.push({
                            path: activeFile.path,
                            isActive: true
                        });
                    }
                }
                
                // 更新样式数据
                allData.tables[tableId].styling.rowHeights = rowHeights;
                allData.tables[tableId].styling.colWidths = colWidths;
                
                // 确保其他结构数据正确
                allData.tables[tableId].structure = {
                    rowCount: rows.length,
                    colCount: colWidths.length,
                    hasHeaders: rows.length > 0 && rows[0].querySelectorAll('th').length > 0
                };
                
                console.log(`TableResizer: 更新了现有表格数据 - ID=${tableId}`, allData.tables[tableId]);
            }
            
            // 保存数据
            await this.plugin.saveData(allData);
            
            // 如果优先使用文件存储，则将表格数据导出到Markdown文件
            if (this.plugin.settings.preferFileStorage && activeFile) {
                await this.plugin.tableDataExtractor.exportTableDataToFile(activeFile, tableId, allData.tables[tableId]);
                console.log(`TableResizer: 已将表格大小数据导出到文件 ${activeFile.path}`);
            }
            console.log('TableResizer: 表格尺寸数据保存成功');
            
            // 立即应用样式到表格，确保视觉反馈
            this.applyCurrentSizes();
        } catch (error) {
            console.error('TableResizer: 保存表格尺寸数据时出错:', error);
        }
    }
    
    /**
     * 立即应用当前尺寸到表格
     */
    private applyCurrentSizes(): void {
        if (!this.activeTable) return;
        
        try {
            // 应用列宽
            const colgroup = this.activeTable.querySelector('colgroup');
            if (colgroup) {
                const cols = colgroup.querySelectorAll('col');
                cols.forEach((col, index) => {
                    const width = (col as HTMLElement).style.width;
                    if (width) {
                        console.log(`TableResizer: 立即应用列宽 - 索引=${index}, 宽度=${width}`);
                    }
                });
            }
            
            // 应用行高
            const rows = this.activeTable.querySelectorAll('tr');
            rows.forEach((row, index) => {
                const height = (row as HTMLElement).style.height;
                if (height) {
                    console.log(`TableResizer: 立即应用行高 - 索引=${index}, 高度=${height}`);
                }
            });
        } catch (error) {
            console.error('TableResizer: 应用当前尺寸时出错:', error);
        }
    }

    /**
     * 移除所有拖拽句柄
     */
    removeResizeHandles(): void {
        console.log('TableResizer: 移除拖拽句柄');
        
        // 移除所有句柄
        this.resizeHandles.forEach(handle => {
            handle.remove();
        });
        
        // 清空句柄数组
        this.resizeHandles = [];
        
        // 移除辅助线
        if (this.resizeGuide) {
            this.resizeGuide.remove();
            this.resizeGuide = null;
        }
    }

    /**
     * 清理资源
     */
    cleanup(): void {
        console.log('TableResizer: 清理资源');
        
        // 移除拖拽句柄
        this.removeResizeHandles();
        
        // 重置状态
        this.activeTable = null;
        this.isResizing = false;
        this.currentHandle = null;
    }
}