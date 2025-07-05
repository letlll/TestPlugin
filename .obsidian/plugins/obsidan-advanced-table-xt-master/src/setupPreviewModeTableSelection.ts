import { ObsidianSpreadsheet } from './main';
import { Notice } from 'obsidian';

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

/**
 * 查找表格中的合并标记
 * @param table 表格元素
 * @returns 是否找到合并标记
 */
function findMergeMarkers(table: HTMLElement): boolean {
    try {
        // 获取所有单元格
        const cells = table.querySelectorAll('td, th');
        console.log(`检查表格中的合并标记，单元格数量: ${cells.length}`);
        
        // 检查是否有单元格包含合并标记
        for (const cell of Array.from(cells)) {
            const content = cell.textContent?.trim() || '';
            
            // 使用正则表达式检查是否是合并标记（支持多个连续标记）
            if (/^(<+|\^+|\\<|\\^|\s*<+\s*|\s*\^+\s*)$/.test(content)) {
                console.log(`找到合并标记: 内容="${content}"`);
                return true;
            }
        }
        
        console.log(`未找到合并标记`);
        return false;
    } catch (error) {
        console.error('查找合并标记时出错:', error);
        return false;
    }
} 