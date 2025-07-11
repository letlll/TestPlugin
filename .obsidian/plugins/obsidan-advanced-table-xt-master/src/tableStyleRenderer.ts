import { MarkdownRenderChild, MarkdownView } from 'obsidian';
import { ObsidianSpreadsheet } from './main';

/**
 * 表格样式渲染器
 * 继承自MarkdownRenderChild以集成到Obsidian渲染系统
 */
export class TableStyleRenderer extends MarkdownRenderChild {
    private tableId: string;
    private styling: any;
    private plugin: ObsidianSpreadsheet;

    /**
     * 构造函数
     * @param el 表格元素
     * @param tableId 表格ID
     * @param styling 样式数据
     * @param plugin 插件实例
     */
    constructor(el: HTMLElement, tableId: string, styling: any, plugin: ObsidianSpreadsheet) {
        super(el);
        this.tableId = tableId;
        this.styling = styling;
        this.plugin = plugin;
    }

    /**
     * 加载时应用样式
     */
    onload() {
        console.log(`表格样式渲染器加载: 表格ID=${this.tableId}`);
        
        // 应用样式
        this.applyStyles();
        
        // 添加自定义类名以便CSS选择器使用
        this.containerEl.classList.add(`table-${this.tableId}`);
        
        // 标记表格已应用样式
        this.containerEl.setAttribute('data-table-styles-applied', 'true');
    }

    /**
     * 应用所有样式
     */
    applyStyles() {
        if (!this.styling) return;
        
        // 应用列对齐样式
        if (this.styling.alignment && Array.isArray(this.styling.alignment)) {
            this.applyColumnAlignment(this.styling.alignment);
        }
        
        // 应用单元格样式
        if (this.styling.cellStyles && Array.isArray(this.styling.cellStyles)) {
            this.applyCellStyles(this.styling.cellStyles);
        }
        
        // 应用行高
        if (this.styling.rowHeights && Array.isArray(this.styling.rowHeights)) {
            this.applyRowHeights(this.styling.rowHeights);
        }
        
        // 应用列宽
        if (this.styling.colWidths && Array.isArray(this.styling.colWidths)) {
            this.applyColumnWidths(this.styling.colWidths);
        }
    }

    /**
     * 应用列对齐样式
     * @param alignments 列对齐数据
     */
    applyColumnAlignment(alignments: string[]) {
        const rows = this.containerEl.querySelectorAll('tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td, th');
            
            cells.forEach((cell, colIndex) => {
                if (alignments[colIndex]) {
                    (cell as HTMLElement).style.textAlign = alignments[colIndex];
                }
            });
        });
    }

    /**
     * 应用单元格样式
     * @param cellStyles 单元格样式数据
     */
    applyCellStyles(cellStyles: any[]) {
        cellStyles.forEach(style => {
            if (typeof style.row !== 'number' || typeof style.col !== 'number') {
                return;
            }
            
            const cell = this.findCell(style.row, style.col);
            if (!cell) return;
            
            // 应用样式属性
            if (style.textAlign) cell.style.textAlign = style.textAlign;
            if (style.verticalAlign) cell.style.verticalAlign = style.verticalAlign;
            if (style.backgroundColor) cell.style.backgroundColor = style.backgroundColor;
            if (style.color) cell.style.color = style.color;
            if (style.fontWeight) cell.style.fontWeight = style.fontWeight;
            if (style.fontStyle) cell.style.fontStyle = style.fontStyle;
        });
    }

    /**
     * 应用行高
     * @param heights 行高数据
     */
    applyRowHeights(heights: string[]) {
        const rows = this.containerEl.querySelectorAll('tr');
        
        rows.forEach((row, rowIndex) => {
            if (heights[rowIndex] && heights[rowIndex] !== 'auto') {
                (row as HTMLElement).style.height = heights[rowIndex];
            }
        });
    }

    /**
     * 应用列宽
     * @param widths 列宽数据
     */
    applyColumnWidths(widths: string[]) {
        // 为表格添加colgroup和col元素
        let colgroup = this.containerEl.querySelector('colgroup');
        if (!colgroup) {
            colgroup = document.createElement('colgroup');
            this.containerEl.prepend(colgroup);
        } else {
            colgroup.innerHTML = '';
        }
        
        // 创建col元素并设置宽度
        widths.forEach(width => {
            const col = document.createElement('col');
            if (width && width !== 'auto') {
                col.style.width = width;
            }
            // 修复: 确保colgroup不为null
            if (colgroup) {
                colgroup.appendChild(col);
            }
        });
    }

    /**
     * 查找特定位置的单元格
     * @param rowIndex 行索引
     * @param colIndex 列索引
     * @returns 单元格元素或null
     */
    findCell(rowIndex: number, colIndex: number): HTMLElement | null {
        const rows = this.containerEl.querySelectorAll('tr');
        if (!rows || rows.length <= rowIndex) return null;
        
        const cells = rows[rowIndex].querySelectorAll('td, th');
        if (!cells || cells.length <= colIndex) return null;
        
        return cells[colIndex] as HTMLElement;
    }

    /**
     * 卸载时的清理工作
     */
    onunload() {
        console.log(`表格 ${this.tableId} 的样式渲染器已卸载`);
    }
}

/**
 * 在预览模式下应用保存的表格样式
 * @param plugin 插件实例
 */
export async function renderTablesWithStoredStyles(plugin: ObsidianSpreadsheet): Promise<void> {
    console.log("预览模式激活，开始应用保存的表格样式");
    
    try {
        // 查找所有表格
        const tables = document.querySelectorAll('table:not([data-table-styles-applied="true"])');
        if (!tables.length) {
            console.log("没有找到需要应用样式的表格");
            return;
        }
        
        console.log(`找到 ${tables.length} 个表格需要应用样式`);
        
        // 加载所有表格数据
        const allData = await plugin.loadData() || {};
        if (!allData || !allData.tables) {
            console.log("没有保存的表格样式数据");
            return;
        }
        
        // 创建渲染队列
        const renderQueue = [];
        
        // 收集需要渲染的表格
        for (const table of Array.from(tables)) {
            // 获取表格ID
            const tableId = (table as HTMLElement).getAttribute('data-table-id');
            if (!tableId) continue;
            
            // 查找对应的样式数据
            const tableData = allData.tables[tableId];
            if (!tableData || !tableData.styling) continue;
            
            // 添加到渲染队列
            renderQueue.push({ table, tableId, tableData });
        }
        
        // 如果队列为空，直接返回
        if (renderQueue.length === 0) {
            console.log("没有找到匹配的表格样式数据");
            return;
        }
        
        // 使用批处理渲染队列中的表格
        await processRenderQueue(renderQueue, plugin);
        
    } catch (error) {
        console.error("渲染表格样式时出错:", error);
    }
}

/**
 * 批量处理渲染队列
 * @param queue 渲染队列
 * @param plugin 插件实例
 */
async function processRenderQueue(queue: any[], plugin: ObsidianSpreadsheet): Promise<void> {
    // 设置批处理大小
    const batchSize = 5;
    let processedCount = 0;
    
    // 创建处理函数
    const processBatch = async () => {
        // 计算当前批次的结束索引
        const endIndex = Math.min(processedCount + batchSize, queue.length);
        
        // 处理当前批次
        for (let i = processedCount; i < endIndex; i++) {
            const { table, tableId, tableData } = queue[i];
            await renderTableWithStyles(table as HTMLElement, tableId, tableData, plugin);
        }
        
        // 更新处理计数
        processedCount = endIndex;
        
        // 如果还有未处理的表格，安排下一批
        if (processedCount < queue.length) {
            // 使用requestAnimationFrame确保UI响应性
            return new Promise<void>(resolve => {
                window.requestAnimationFrame(() => {
                    processBatch().then(resolve);
                });
            });
        }
    };
    
    // 开始处理第一批
    await processBatch();
    console.log(`完成了 ${processedCount} 个表格的样式应用`);
}

/**
 * 为单个表格应用样式
 * @param table 表格元素
 * @param tableId 表格ID
 * @param tableData 表格样式数据
 * @param plugin 插件实例
 */
async function renderTableWithStyles(
    table: HTMLElement, 
    tableId: string, 
    tableData: any, 
    plugin: ObsidianSpreadsheet
): Promise<boolean> {
    try {
        // 创建渲染上下文
        const ctx = getContextForTable(table, plugin);
        
        // 如果找到上下文，使用MarkdownRenderChild
        if (ctx) {
            ctx.addChild(new TableStyleRenderer(table, tableId, tableData.styling, plugin));
            console.log(`表格 ${tableId} 已使用RenderChild应用样式`);
        } else {
            // 如果没有上下文，直接应用样式
            applyStylesDirectly(table, tableData.styling);
            console.log(`表格 ${tableId} 已直接应用样式`);
        }
        
        // 标记表格已应用样式
        table.setAttribute('data-table-styles-applied', 'true');
        
        return true;
    } catch (error) {
        console.error(`为表格 ${tableId} 应用样式时出错:`, error);
        return false;
    }
}

/**
 * 获取表格的渲染上下文
 * @param table 表格元素
 * @param plugin 插件实例
 * @returns 渲染上下文或null
 */
function getContextForTable(table: HTMLElement, plugin: ObsidianSpreadsheet): any {
    // 获取活动视图
    const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView || activeView.getMode() !== 'preview') return null;
    
    // 尝试获取渲染上下文
    try {
        // 方法1: 通过section-id属性
        const sectionEl = table.closest('[data-section-id]');
        if (sectionEl) {
            const sectionId = sectionEl.getAttribute('data-section-id');
            if (sectionId && activeView.previewMode) {
                // @ts-ignore - Obsidian API可能没有完全类型化
                const sections = activeView.previewMode.renderer?.sections;
                if (sections && sections[sectionId]) {
                    return sections[sectionId];
                }
            }
        }
        
        // 方法2: 通过getSectionInfo API
        if (activeView.previewMode) {
            // @ts-ignore - Obsidian API可能没有完全类型化
            const sectionInfo = activeView.previewMode.renderer?.getSectionInfo?.(table);
            if (sectionInfo && sectionInfo.section) {
                return sectionInfo.section;
            }
        }
        
        return null;
    } catch (e) {
        console.warn("获取表格渲染上下文失败:", e);
        return null;
    }
}

/**
 * 直接应用样式（当无法获取渲染上下文时的备用方法）
 * @param table 表格元素
 * @param styling 样式数据
 */
function applyStylesDirectly(table: HTMLElement, styling: any): void {
    if (!styling) return;
    
    // 应用列对齐
    if (styling.alignment && Array.isArray(styling.alignment)) {
        const rows = table.querySelectorAll('tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td, th');
            
            cells.forEach((cell, colIndex) => {
                if (styling.alignment[colIndex]) {
                    (cell as HTMLElement).style.textAlign = styling.alignment[colIndex];
                }
            });
        });
    }
    
    // 应用单元格样式
    if (styling.cellStyles && Array.isArray(styling.cellStyles)) {
        styling.cellStyles.forEach((style: any) => {
            if (typeof style.row !== 'number' || typeof style.col !== 'number') {
                return;
            }
            
            // 查找单元格
            const rows = table.querySelectorAll('tr');
            if (!rows || rows.length <= style.row) return;
            
            const cells = rows[style.row].querySelectorAll('td, th');
            if (!cells || cells.length <= style.col) return;
            
            const cell = cells[style.col] as HTMLElement;
            
            // 应用样式
            if (style.textAlign) cell.style.textAlign = style.textAlign;
            if (style.verticalAlign) cell.style.verticalAlign = style.verticalAlign;
            if (style.backgroundColor) cell.style.backgroundColor = style.backgroundColor;
            if (style.color) cell.style.color = style.color;
            if (style.fontWeight) cell.style.fontWeight = style.fontWeight;
            if (style.fontStyle) cell.style.fontStyle = style.fontStyle;
        });
    }
    
    // 添加自定义类名
    const tableId = table.getAttribute('data-table-id');
    if (tableId) {
        table.classList.add(`table-${tableId}`);
    }
} 