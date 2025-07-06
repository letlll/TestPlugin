import { ObsidianSpreadsheet } from './main';
import { Notice } from 'obsidian';

/**
 * 查找表格中的合并标记
 * @param table 表格HTML元素
 * @returns 是否找到合并标记
 */
function findMergeMarkers(table: HTMLElement): boolean {
    const cells = table.querySelectorAll('td, th');
    for (const cell of Array.from(cells)) {
        const content = cell.textContent?.trim() || '';
        if (content === '^' || content === '<') {
            return true;
        }
    }
    return false;
}

/**
 * 设置预览模式下的表格选择和单元格合并渲染
 * 这个文件包含了预览模式下表格处理的核心逻辑
 */
export function setupPreviewModeTableSelection(plugin: ObsidianSpreadsheet): void {
    try {
        // 清除当前编辑表格状态
        plugin.currentEditingTable = null;
        
        // 获取所有表格
        const tables = document.querySelectorAll('table');
        if (!tables.length) return;
        
        console.log(`预览模式下找到 ${tables.length} 个表格`);
        
        // 为每个表格添加点击事件和应用合并单元格
        tables.forEach((table: HTMLElement) => {
            // 移除旧的事件监听器（如果有）
            table.removeEventListener('click', plugin.handleTableClick);
            
            // 添加新的事件监听器
            table.addEventListener('click', plugin.handleTableClick);
            
            // 设置表格索引
            plugin.tableDetector.setupTableIndices(table);
            
            // 从Markdown文件中读取表格ID并设置到表格元素上
            plugin.readTableIdFromMarkdown(table).then(tableId => {
                if (tableId) {
                    table.setAttribute('data-table-id', tableId);
                    console.log(`表格ID已设置: ${tableId}`);
                }
            }).catch(error => {
                console.error('读取表格ID时出错:', error);
            });
            
            // 应用合并单元格标记（如果启用了单元格合并功能）
            if (plugin.settings.enableCellMerging !== false) {
                // 检查表格是否已经处理过
                if (table.dataset.tableMergeProcessed !== 'true') {
                    // 查找表格中的合并标记
                    const hasMergeMarkers = findMergeMarkers(table);
                    
                    if (hasMergeMarkers) {
                        console.log(`表格包含合并标记，应用合并单元格渲染`);
                        plugin.tableDetector.applyMergeCellsMarkers(table);
                    }
                }
            }
        });
        
        console.log('预览模式下设置了表格选择');
    } catch (error) {
        console.error('设置预览模式表格选择时出错:', error);
    }
} 