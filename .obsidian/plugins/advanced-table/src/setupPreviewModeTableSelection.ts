import { ObsidianSpreadsheet } from './main';
import { Notice } from 'obsidian';
import { renderTablesWithStoredStyles } from './tableStyleRenderer';

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
        
        // 获取所有表格，排除代码块中的表格
        const tables = Array.from(document.querySelectorAll('table')).filter(table => {
            // 检查表格是否在代码块内
            const isInCodeBlock = table.closest('pre') !== null || table.closest('code') !== null;
            return !isInCodeBlock;
        });
        
        if (!tables.length) return;
        
        console.log(`预览模式下找到 ${tables.length} 个表格`);
        
        // 为每个表格添加点击事件和应用合并单元格
        tables.forEach((table: HTMLElement, index: number) => {
            // 移除旧的事件监听器（如果有）
            table.removeEventListener('click', plugin.handleTableClick);
            
            // 添加新的事件监听器
            table.addEventListener('click', plugin.handleTableClick);
            
            // 设置表格索引
            plugin.tableDetector.setupTableIndices(table);
            
            // 保存表格在DOM中的位置信息
            table.setAttribute('data-table-index', index.toString());
            
            // 提取表格特征并存储在表格元素上
            const tableFeature = plugin.tableIdManager.extractTableFeature(table);
            if (tableFeature) {
                // 将特征信息存储为JSON字符串
                table.setAttribute('data-table-feature', JSON.stringify(tableFeature));
                
                // 存储行列数作为单独的属性，便于快速访问
                table.setAttribute('data-rows', tableFeature.rows.toString());
                table.setAttribute('data-cols', tableFeature.cols.toString());
                
                // 存储表格位置信息
                if (tableFeature.position) {
                    table.setAttribute('data-table-position', JSON.stringify(tableFeature.position));
                }
            }
            
            // 从Markdown文件中读取表格ID并设置到表格元素上
            plugin.readTableIdFromMarkdown(table).then(tableId => {
                if (tableId) {
                    table.setAttribute('data-table-id', tableId);
                    console.log(`表格ID已设置: ${tableId}`);
                    
                    // 将ID和特征信息关联起来
                    if (tableFeature) {
                        // 更新表格特征，添加ID信息
                        tableFeature.id = tableId;
                        table.setAttribute('data-table-feature', JSON.stringify(tableFeature));
                    }
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
        
        // 应用存储的表格样式
        renderTablesWithStoredStyles(plugin);
        
        console.log('预览模式下设置了表格选择');
    } catch (error) {
        console.error('设置预览模式表格选择时出错:', error);
    }
}