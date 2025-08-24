import { App, MarkdownRenderChild, MarkdownView, Plugin } from 'obsidian';
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
     * 辅助方法，获取app对象
     */
    private getApp(): App {
        return (this.plugin as unknown as Plugin).app;
    }

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
        console.log(`应用行高: ${JSON.stringify(heights)}`);
        
        const rows = this.containerEl.querySelectorAll('tr');
        
        rows.forEach((row, rowIndex) => {
            if (rowIndex < heights.length && heights[rowIndex] && heights[rowIndex] !== 'auto') {
                (row as HTMLElement).style.height = heights[rowIndex];
                console.log(`设置第${rowIndex+1}行高度: ${heights[rowIndex]}`);
            }
        });
    }

    /**
     * 应用列宽
     * @param widths 列宽数据
     */
    applyColumnWidths(widths: string[]) {
        console.log(`应用列宽: ${JSON.stringify(widths)}`);
        
        // 为表格添加colgroup和col元素
        let colgroup = this.containerEl.querySelector('colgroup');
        if (!colgroup) {
            colgroup = document.createElement('colgroup');
            this.containerEl.prepend(colgroup);
        } else {
            colgroup.innerHTML = '';
        }
        
        // 创建col元素并设置宽度
        widths.forEach((width, index) => {
            const col = document.createElement('col');
            if (width && width !== 'auto') {
                col.style.width = width;
                console.log(`设置第${index+1}列宽度: ${width}`);
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

    /**
     * 应用表格样式
     */
    public async applyTableStyles(tableElement: HTMLElement, tableId: string): Promise<void> {
        try {
            // 检查是否已应用样式
            if (tableElement.getAttribute('data-table-styles-applied') === 'true') {
                return;
            }

            // 获取保存的表格样式数据
            const data = await this.plugin.loadData();
            const tableData = data?.tables?.[tableId];
            if (!tableData || !tableData.styling) {
                console.log(`没有找到匹配的表格样式数据：${tableId}`);
                return;
            }

            console.log(`应用表格样式 - ID=${tableId}`, tableData.styling);

            // 应用行高
            if (tableData.styling.rowHeights && tableData.styling.rowHeights.length > 0) {
                const rows = tableElement.querySelectorAll('tr');
                tableData.styling.rowHeights.forEach((height: string, index: number) => {
                    if (index < rows.length && height && height !== 'auto') {
                        (rows[index] as HTMLElement).style.height = height;
                        console.log(`应用行高 - 索引=${index}, 高度=${height}`);
                    }
                });
            }

            // 应用列宽
            if (tableData.styling.colWidths && tableData.styling.colWidths.length > 0) {
                // 创建或获取colgroup元素
                let colgroup = tableElement.querySelector('colgroup');
                if (!colgroup) {
                    colgroup = document.createElement('colgroup');
                    tableElement.insertBefore(colgroup, tableElement.firstChild);
                } else {
                    // 清除现有的col元素
                    colgroup.innerHTML = '';
                }

                // 创建col元素并设置宽度
                tableData.styling.colWidths.forEach((width: string, index: number) => {
                    const col = document.createElement('col');
                    if (width && width !== 'auto') {
                        col.style.width = width;
                        console.log(`应用列宽 - 索引=${index}, 宽度=${width}`);
                    }
                    // 修复: 确保colgroup不为null
                    if (colgroup) {
                        colgroup.appendChild(col);
                    }
                });
            }

            // 应用对齐方式
            if (tableData.styling.alignment && tableData.styling.alignment.length > 0) {
                const rows = tableElement.querySelectorAll('tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('th, td');
                    cells.forEach((cell, cellIndex) => {
                        if (cellIndex < tableData.styling.alignment.length) {
                            const alignment = tableData.styling.alignment[cellIndex];
                            if (alignment) {
                                (cell as HTMLElement).style.textAlign = alignment;
                            }
                        }
                    });
                });
            }

            // 应用单元格样式
            if (tableData.styling.cellStyles && tableData.styling.cellStyles.length > 0) {
                tableData.styling.cellStyles.forEach((cellStyle: any) => {
                    if (cellStyle.row !== undefined && cellStyle.col !== undefined) {
                        const rows = tableElement.querySelectorAll('tr');
                        if (cellStyle.row < rows.length) {
                            const row = rows[cellStyle.row];
                            const cells = row.querySelectorAll('th, td');
                            if (cellStyle.col < cells.length) {
                                const cell = cells[cellStyle.col] as HTMLElement;
                                
                                // 应用背景颜色
                                if (cellStyle.backgroundColor) {
                                    cell.style.backgroundColor = cellStyle.backgroundColor;
                                }
                                
                                // 应用文本颜色
                                if (cellStyle.textColor) {
                                    cell.style.color = cellStyle.textColor;
                                }
                                
                                // 应用字体粗细
                                if (cellStyle.fontWeight) {
                                    cell.style.fontWeight = cellStyle.fontWeight;
                                }
                                
                                // 应用字体样式
                                if (cellStyle.fontStyle) {
                                    cell.style.fontStyle = cellStyle.fontStyle;
                                }
                            }
                        }
                    }
                });
            }

            // 标记表格已应用样式
            tableElement.setAttribute('data-table-styles-applied', 'true');
            
            // 添加表格特定的CSS类
            tableElement.classList.add(`table-${tableId}`);
            
            console.log(`表格样式应用完成 - ID=${tableId}`);
        } catch (error) {
            console.error('应用表格样式时出错:', error);
        }
    }

    /**
     * 应用预览模式下的表格样式
     */
    public async applyPreviewModeStyles(containerEl: HTMLElement): Promise<void> {
        try {
            console.log('预览模式激活，开始应用保存的表格样式');
            
            // 获取所有表格元素
            const tables = containerEl.querySelectorAll('table');
            console.log(`找到 ${tables.length} 个表格需要应用样式`);
            
            if (!tables.length) return;
            
            // 为每个表格应用样式
            for (let index = 0; index < tables.length; index++) {
                const tableElement = tables[index] as HTMLElement;
                
                // 获取表格ID
                let tableId = tableElement.getAttribute('data-table-id');
                
                if (!tableId) {
                    // 如果表格没有ID，尝试从其他方式获取
                    const activeFile = this.getApp().workspace.getActiveFile();
                    if (activeFile) {
                        // 尝试从文件内容和表格索引获取ID
                        tableId = await this.plugin.readTableIdFromMarkdown(tableElement);
                    }
                }
                
                if (tableId) {
                    console.log(`为表格应用样式 - 索引=${index}, ID=${tableId}`);
                    await this.applyTableStyles(tableElement, tableId);
                } else {
                    console.log(`无法为表格应用样式 - 索引=${index}, 未找到ID`);
                }
            }
        } catch (error) {
            console.error('应用预览模式表格样式时出错:', error);
        }
    }
}

/**
 * 渲染所有表格的存储样式
 * @param plugin 插件实例
 */
export async function renderTablesWithStoredStyles(plugin: ObsidianSpreadsheet): Promise<void> {
    // 辅助函数，获取app对象
    function getApp(): App {
        return (plugin as unknown as Plugin).app;
    }
    try {
        console.log('开始渲染表格样式');
        
        // 获取当前活动视图
        const activeView = getApp().workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            console.log('未找到活动视图，无法渲染表格样式');
            return;
        }
        
        // 获取当前文件
        const activeFile = activeView.file;
        if (!activeFile) {
            console.log('未找到活动文件，无法渲染表格样式');
            return;
        }
        
        // 获取当前文件路径
        const filePath = activeFile.path;
        console.log(`当前文件路径: ${filePath}`);
        
        // 首先尝试从Markdown文件中提取表格数据
        let tables: Record<string, any> = {};
        
        // 如果已初始化表格数据提取器，则使用它从文件中提取数据
        if (plugin.tableDataExtractor) {
            tables = await plugin.tableDataExtractor.extractTableDataFromFile(activeFile);
            console.log(`从Markdown文件中提取到 ${Object.keys(tables).length} 个表格数据`);
        }
        
        // 如果从Markdown文件中没有提取到数据，则尝试从data.json中获取
        if (Object.keys(tables).length === 0) {
            console.log('从Markdown文件中未提取到表格数据，尝试从data.json获取');
            const pluginData = await plugin.loadData() || {};
            tables = pluginData.tables || {};
            
            // 检查是否有存储的表格数据
            if (!tables || Object.keys(tables).length === 0) {
                console.log('没有存储的表格数据');
                return;
            }
        }
        
        // 获取当前文件中的所有表格
        const allTables = document.querySelectorAll('table');
        if (!allTables.length) {
            console.log('当前文件中没有表格');
            return;
        }
        
        console.log(`当前文件中有 ${allTables.length} 个表格`);
        
        // 创建渲染队列
        const renderQueue = [];
        
        // 读取文件内容，提取表格特征
        const fileContent = await plugin.app.vault.read(activeFile);
        const tableInfos = plugin.tableIdManager.extractTableIdsFromMarkdown(fileContent);
        console.log(`从文件内容中提取到 ${tableInfos.length} 个表格信息`);
        
        // 处理每个表格
        for (let i = 0; i < allTables.length; i++) {
            const table = allTables[i] as HTMLElement;
            
            // 1. 首先尝试从表格属性中获取ID
            let tableId = table.getAttribute('data-table-id');
            
            // 2. 如果没有ID属性，尝试通过位置匹配
            if (!tableId && i < tableInfos.length) {
                tableId = tableInfos[i].id;
                if (tableId) {
                    console.log(`通过位置匹配找到表格ID: ${tableId}`);
                    // 设置ID属性
                    table.setAttribute('data-table-id', tableId);
                }
            }
            
            // 3. 如果还没有ID，尝试通过特征匹配
            if (!tableId) {
                const tableFeature = plugin.tableIdManager.extractTableFeature(table);
                
                let bestMatchId = '';
                let bestMatchScore = 0;
                
                for (const { id, feature } of tableInfos) {
                    if (!id) continue;
                    
                    const score = plugin.tableIdManager.calculateFeatureSimilarity(tableFeature, feature);
                    
                    if (score > bestMatchScore) {
                        bestMatchScore = score;
                        bestMatchId = id;
                    }
                }
                
                if (bestMatchId && bestMatchScore > 0.7) { // 70%相似度阈值
                    console.log(`通过特征相似度匹配找到表格ID: ${bestMatchId}（相似度: ${bestMatchScore.toFixed(2)}）`);
                    tableId = bestMatchId;
                    // 设置ID属性
                    table.setAttribute('data-table-id', tableId);
                }
            }
            
            // 如果找到了ID，查找对应的样式数据
            if (tableId && tables[tableId]) {
                const tableData = tables[tableId];
                
                // 检查表格是否属于当前文件
                const isInCurrentFile = tableData.locations?.some((loc: {path: string}) => loc.path === filePath);
                
                if (isInCurrentFile) {
                    console.log(`为表格 ${tableId} 添加渲染任务`);
                    renderQueue.push({
                        table,
                        tableId,
                        tableData
                    });
                }
            }
        }
        
        // 处理渲染队列
        if (renderQueue.length > 0) {
            console.log(`开始处理 ${renderQueue.length} 个表格渲染任务`);
            await processRenderQueue(renderQueue, plugin);
        } else {
            console.log('没有需要渲染的表格');
        }
    } catch (error) {
        console.error('渲染表格样式时出错:', error);
    }
}

/**
 * 批量处理渲染队列
 * @param queue 渲染队列
 * @param plugin 插件实例
 */
async function processRenderQueue(queue: any[], plugin: ObsidianSpreadsheet): Promise<void> {
    // 设置批处理大小
    const batchSize = 3; // 减小批处理大小，避免性能问题
    let processedCount = 0;
    let successCount = 0;
    
    console.log(`开始处理渲染队列，共 ${queue.length} 个表格`);
    
    // 创建处理函数
    const processBatch = async () => {
        try {
            // 计算当前批次的结束索引
            const endIndex = Math.min(processedCount + batchSize, queue.length);
            
            // 处理当前批次
            for (let i = processedCount; i < endIndex; i++) {
                const { table, tableId, tableData } = queue[i];
                console.log(`处理队列中的表格 ${i+1}/${queue.length} - ID=${tableId}`);
                
                try {
                    const success = await renderTableWithStyles(table as HTMLElement, tableId, tableData, plugin);
                    if (success) {
                        successCount++;
                    }
                } catch (error) {
                    console.error(`处理表格 ${tableId} 时出错:`, error);
                }
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
        } catch (error) {
            console.error("处理表格批次时出错:", error);
        }
    };
    
    // 开始处理第一批
    await processBatch();
    console.log(`完成了 ${processedCount} 个表格的处理，成功应用样式: ${successCount}`);
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
        console.log(`开始为表格 ${tableId} 应用样式`);
        
        // 检查表格是否已经应用了样式
        if (table.getAttribute('data-table-styles-applied') === 'true') {
            console.log(`表格 ${tableId} 已经应用了样式，跳过`);
            return true;
        }
        
        // 检查样式数据是否有效
        if (!tableData.styling) {
            console.log(`表格 ${tableId} 没有有效的样式数据`);
            return false;
        }
        
        // 创建渲染上下文
        const ctx = getContextForTable(table, plugin);
        
        // 如果找到上下文，使用MarkdownRenderChild
        if (ctx) {
            try {
                ctx.addChild(new TableStyleRenderer(table, tableId, tableData.styling, plugin));
                console.log(`表格 ${tableId} 已使用RenderChild应用样式`);
            } catch (error) {
                console.error(`使用RenderChild应用样式时出错:`, error);
                // 如果RenderChild失败，回退到直接应用
                applyStylesDirectly(table, tableData.styling);
                console.log(`表格 ${tableId} 回退到直接应用样式`);
            }
        } else {
            // 如果没有上下文，直接应用样式
            applyStylesDirectly(table, tableData.styling);
            console.log(`表格 ${tableId} 已直接应用样式`);
        }
        
        // 标记表格已应用样式
        table.setAttribute('data-table-styles-applied', 'true');
        
        // 添加表格特定的CSS类
        if (!table.classList.contains(`table-${tableId}`)) {
            table.classList.add(`table-${tableId}`);
        }
        
        console.log(`表格 ${tableId} 样式应用完成`);
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
    
    // 应用行高
    if (styling.rowHeights && Array.isArray(styling.rowHeights)) {
        const rows = table.querySelectorAll('tr');
        styling.rowHeights.forEach((height: string, index: number) => {
            if (index < rows.length && height && height !== 'auto') {
                (rows[index] as HTMLElement).style.height = height;
                console.log(`直接应用行高 - 索引=${index}, 高度=${height}`);
            }
        });
    }
    
    // 应用列宽
    if (styling.colWidths && Array.isArray(styling.colWidths)) {
        // 创建或获取colgroup元素
        let colgroup = table.querySelector('colgroup');
        if (!colgroup) {
            colgroup = document.createElement('colgroup');
            table.insertBefore(colgroup, table.firstChild);
        } else {
            // 清除现有的col元素
            colgroup.innerHTML = '';
        }
        
        // 创建col元素并设置宽度
        styling.colWidths.forEach((width: string, index: number) => {
            const col = document.createElement('col');
            if (width && width !== 'auto') {
                col.style.width = width;
                console.log(`直接应用列宽 - 索引=${index}, 宽度=${width}`);
            }
            // 修复: 确保colgroup不为null
            if (colgroup) {
                colgroup.appendChild(col);
            }
        });
    }
    
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