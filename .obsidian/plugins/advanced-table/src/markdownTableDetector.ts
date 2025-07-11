// @ts-nocheck
// 上面的指令会禁用整个文件的类型检查

import { ObsidianSpreadsheet } from './main';
import { App, Notice, Modal, Setting } from 'obsidian';

/**
 * 确认对话框类 - 用于显示确认消息
 */
class ConfirmModal extends Modal {
    private result: boolean = false;
    private onClose: (result: boolean) => void;
    private message: string;

    constructor(app: App, message: string, onClose: (result: boolean) => void) {
        super(app);
        this.message = message;
        this.onClose = onClose;
    }

    onOpen() {
        const { contentEl } = this;
        
        contentEl.createEl('h2', { text: '确认操作' });
        contentEl.createEl('p', { text: this.message });
        
        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
        
        buttonContainer.createEl('button', { text: '取消' })
            .addEventListener('click', () => {
                this.result = false;
                this.close();
            });
            
        buttonContainer.createEl('button', { text: '确认', cls: 'mod-cta' })
            .addEventListener('click', () => {
                this.result = true;
                this.close();
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        this.onClose(this.result);
    }
}

/**
 * Markdown表格检测器 - 负责检测、分析和处理Markdown表格
 */
export class MarkdownTableDetector {
    private plugin: ObsidianSpreadsheet;

    constructor(plugin: ObsidianSpreadsheet) {
        this.plugin = plugin;
        console.log('MarkdownTableDetector initialized');
    }
    
    /**
     * 显示确认对话框
     * @param message 确认消息
     * @returns 用户是否确认
     */
    async showConfirmDialog(message: string): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = new ConfirmModal(this.plugin.app, message, (result) => {
                resolve(result);
            });
            modal.open();
        });
    }

    /**
     * 检查是否为HTML格式的表格（而非Markdown生成的表格）
     * @param table 表格HTML元素
     * @returns 是否为HTML格式的表格
     */
    isHtmlFormattedTable(table: HTMLElement): boolean {
        try {
            // 策略1: 检查是否有特定HTML表格属性
            if (table.hasAttribute('border') || 
                table.hasAttribute('cellpadding') || 
                table.hasAttribute('cellspacing') ||
                table.hasAttribute('width') ||
                table.hasAttribute('height') ||
                table.hasAttribute('bgcolor')) {
                return true;
            }
            
            // 策略2: 检查表格样式是否包含HTML特定样式
            const style = table.getAttribute('style');
            if (style && (
                style.includes('border-collapse') ||
                style.includes('text-align') ||
                style.includes('font-family') ||
                style.includes('background-color')
            )) {
                return true;
            }
            
            // 策略3: 检查表格单元格是否包含复杂HTML内容
            const cells = table.querySelectorAll('td, th');
            for (const cell of Array.from(cells).slice(0, 10)) { // 只检查前10个单元格
                const html = (cell as HTMLElement).innerHTML || '';
                // 如果单元格包含HTML标签（但排除Obsidian插入的简单格式标签）
                if (html.includes('<') && html.includes('>') && 
                    !html.match(/^<(em|strong|s|code|a|span)[^>]*>.*<\/(em|strong|s|code|a|span)>$/)) {
                    return true;
                }
            }
            
            // 策略4: 检查表格结构是否符合Markdown表格生成规则
            const rows = table.querySelectorAll('tr');
            if (rows.length > 1) {
                // Markdown表格的第二行通常是分隔行
                const secondRow = rows[1];
                const separatorCells = secondRow.querySelectorAll('td, th');
                
                // 分隔行的所有单元格内容通常只包含 ---- 或 :----: 等形式
                let isSeparatorRow = true;
                for (const cell of Array.from(separatorCells)) {
                    const text = cell.textContent || '';
                    // 如果不是分隔符格式，可能不是Markdown表格
                    if (!text.match(/^:?-+:?$/)) {
                        isSeparatorRow = false;
                        break;
                    }
                }
                
                // 如果不符合Markdown表格特征，可能是HTML表格
                if (!isSeparatorRow) {
                    return true;
                }
            }
            
            // 默认不是HTML格式的表格
            return false;
        } catch (error) {
            console.error('检测HTML表格时出错:', error);
            return false; // 错误时默认为否
        }
    }

    /**
     * 设置表格行列索引
     * @param table 表格HTML元素
     */
    setupTableIndices(table: HTMLElement): void {
        try {
            const rows = table.querySelectorAll('tr');
            
            for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                const row = rows[rowIndex];
                const cells = row.querySelectorAll('td, th');
                
                for (let colIndex = 0; colIndex < cells.length; colIndex++) {
                    const cell = cells[colIndex] as HTMLElement;
                    
                    // 设置数据属性存储行列索引
                    cell.dataset.rowIndex = rowIndex.toString();
                    cell.dataset.colIndex = colIndex.toString();
                    
                    // 设置row-index和col-index属性，确保与main.ts中使用的属性一致
                    cell.setAttribute('row-index', rowIndex.toString());
                    cell.setAttribute('col-index', colIndex.toString());
                    
                    // 为单元格添加类以便样式调整
                    cell.classList.add('advanced-table-cell');
                    
                    // 如果是表头单元格，添加特殊类
                    if (cell.tagName.toLowerCase() === 'th') {
                        cell.classList.add('advanced-table-header');
                    }
                    
                    // 为空单元格添加占位符
                    if (!cell.innerHTML.trim()) {
                        cell.innerHTML = '&nbsp;';
                    }
                }
            }
        } catch (error) {
            console.error('设置表格索引时出错:', error);
        }
    }

    /**
     * 检查单元格内容是否为合并标记
     * @param cell 单元格元素
     * @param marker 标记符号类型 ('^' 或 '<')
     * @returns 是否为指定类型的合并标记
     */
    isMergeMarker(cell: HTMLElement, marker: string): boolean {
        const content = cell.textContent?.trim() || '';
        // 使用正则表达式检查是否是指定类型的合并标记（支持多个连续标记）
        if (marker === '^') {
            return /^(\^+|\\\^|\s*\^+\s*)$/.test(content);
        } else if (marker === '<') {
            return /^(<+|\\<|\s*<+\s*)$/.test(content);
        }
        return false;
    }

    /**
     * 检查单元格是否非空且有有效内容
     * @param cell 单元格元素
     * @returns 是否有有效内容
     */
    hasMeaningfulContent(cell: HTMLElement): boolean {
        const content = cell.textContent?.trim() || '';
        // 检查是否为空或只有空格、合并标记
        return content !== '' && 
               content !== '&nbsp;' && 
               !/^(\^+|\\\^|\s*\^+\s*)$/.test(content) && 
               !/^(<+|\\<|\s*<+\s*)$/.test(content);
    }

    /**
     * 解析表格的合并标记
     * @param table 表格HTML元素
     */
    async parseMergeCellMarkers(table: HTMLElement): Promise<void> {
        if (!this.plugin.settings.enableCellMerging) return;
        
        try {
            const rows = table.querySelectorAll('tr');
            
            // 首先查找所有的合并标记
            const mergeUp: {cell: HTMLElement, count: number}[] = [];
            const mergeLeft: {cell: HTMLElement, count: number}[] = [];
            
            for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                const row = rows[rowIndex];
                const cells = row.querySelectorAll('td, th');
                
                for (let colIndex = 0; colIndex < cells.length; colIndex++) {
                    const cell = cells[colIndex] as HTMLElement;
                    const content = cell.textContent?.trim() || '';
                    
                    // 检查向上合并标记
                    const upMatch = content.match(/^(\^+)$/);
                    if (upMatch) {
                        // 获取^的数量，表示合并的行数
                        const count = upMatch[1].length;
                        console.log(`发现向上合并标记: 行=${rowIndex}, 列=${colIndex}, 标记数量=${count}, 内容="${content}"`);
                        mergeUp.push({cell, count});
                        continue;
                    }
                    
                    // 检查向左合并标记
                    const leftMatch = content.match(/^(<+)$/);
                    if (leftMatch) {
                        // 获取<的数量，表示合并的列数
                        const count = leftMatch[1].length;
                        console.log(`发现向左合并标记: 行=${rowIndex}, 列=${colIndex}, 标记数量=${count}, 内容="${content}"`);
                        mergeLeft.push({cell, count});
                        continue;
                    }
                    
                    // 检查转义的合并标记
                    if (content === '\\^' || content === ' ^ ' || content === ' \\^ ') {
                        console.log(`发现转义向上合并标记: 行=${rowIndex}, 列=${colIndex}, 内容="${content}"`);
                        mergeUp.push({cell, count: 1});
                    } else if (content === '\\<' || content === ' < ' || content === ' \\< ') {
                        console.log(`发现转义向左合并标记: 行=${rowIndex}, 列=${colIndex}, 内容="${content}"`);
                        mergeLeft.push({cell, count: 1});
                    }
                }
            }
            
            // 处理向上合并标记
            for (const {cell, count} of mergeUp) {
                const rowIndex = parseInt(cell.getAttribute('row-index') || cell.dataset.rowIndex || '0');
                const colIndex = parseInt(cell.getAttribute('col-index') || cell.dataset.colIndex || '0');
                
                console.log(`处理向上合并: 行=${rowIndex}, 列=${colIndex}, 合并数量=${count}`);
                
                // 向上合并需要找到目标单元格
                if (rowIndex >= count) {
                    const targetRowIndex = rowIndex - count;
                    const targetRow = rows[targetRowIndex];
                    if (targetRow) {
                        const targetCells = targetRow.querySelectorAll('td, th');
                        if (colIndex < targetCells.length) {
                            const targetCell = targetCells[colIndex] as HTMLElement;
                            
                            // 检查目标单元格是否有实际内容
                            if (this.hasMeaningfulContent(targetCell)) {
                                // 收集所有需要合并的单元格内容
                                const cellsToMerge = [];
                                
                                // 检查当前单元格是否有内容
                                if (this.hasMeaningfulContent(cell)) {
                                    cellsToMerge.push({
                                        rowIndex: rowIndex,
                                        colIndex: colIndex,
                                        content: cell.textContent?.trim() || ''
                                    });
                                }
                                
                                // 检查中间的单元格是否有内容
                                for (let i = 1; i < count; i++) {
                                    const midRowIndex = rowIndex - i;
                                    if (midRowIndex > targetRowIndex) {
                                        const midRow = rows[midRowIndex];
                                        const midCells = midRow.querySelectorAll('td, th');
                                        if (colIndex < midCells.length) {
                                            const midCell = midCells[colIndex] as HTMLElement;
                                            if (this.hasMeaningfulContent(midCell)) {
                                                cellsToMerge.push({
                                                    rowIndex: midRowIndex,
                                                    colIndex: colIndex,
                                                    content: midCell.textContent?.trim() || ''
                                                });
                                            }
                                        }
                                    }
                                }
                                
                                // 确认是否覆盖非空单元格
                                if (this.plugin.settings.confirmMergeNonEmpty && cellsToMerge.length > 0) {
                                    // 创建确认消息，包含所有需要覆盖的单元格内容
                                    const cellContents = cellsToMerge.map(c => 
                                        `[${c.rowIndex+1},${c.colIndex+1}]: "${c.content}"`
                                    ).join('\n');
                                    
                                    const confirmMerge = await this.showConfirmDialog(
                                        `以下单元格包含内容将被覆盖:\n${cellContents}\n\n确定要合并这些单元格吗？`
                                    );
                                    
                                    if (!confirmMerge) {
                                        console.log('用户取消了单元格合并');
                                        continue;
                                    }
                                }
                                
                                // 获取目标单元格当前的rowspan
                                let rowSpan = parseInt(targetCell.getAttribute('rowspan') || '1');
                                
                                // 计算新的rowspan：当前rowspan + count（合并的行数）
                                rowSpan = rowSpan + count;
                                console.log(`设置rowspan: 目标单元格(${targetRowIndex},${colIndex}), rowspan=${rowSpan}`);
                                
                                // 设置新的rowspan
                                targetCell.setAttribute('rowspan', rowSpan.toString());
                                targetCell.rowSpan = rowSpan;
                                
                                // 添加合并样式类
                                targetCell.classList.add('obs-merged-cell');
                                
                                // 隐藏当前单元格
                                cell.style.display = 'none';
                            } else {
                                console.warn('向上合并失败: 目标单元格没有有效内容', targetCell);
                            }
                        }
                    }
                }
            }
            
            // 处理向左合并标记
            for (const {cell, count} of mergeLeft) {
                const rowIndex = parseInt(cell.getAttribute('row-index') || cell.dataset.rowIndex || '0');
                const colIndex = parseInt(cell.getAttribute('col-index') || cell.dataset.colIndex || '0');
                
                console.log(`处理向左合并: 行=${rowIndex}, 列=${colIndex}, 合并数量=${count}`);
                
                // 向左合并需要找到目标单元格
                if (colIndex >= count) {
                    const targetColIndex = colIndex - count;
                    const targetCell = rows[rowIndex]?.querySelectorAll('td, th')[targetColIndex] as HTMLElement;
                    if (targetCell) {
                        // 检查目标单元格是否有实际内容
                        if (this.hasMeaningfulContent(targetCell)) {
                            // 收集所有需要合并的单元格内容
                            const cellsToMerge = [];
                            
                            // 检查当前单元格是否有内容
                            if (this.hasMeaningfulContent(cell)) {
                                cellsToMerge.push({
                                    rowIndex: rowIndex,
                                    colIndex: colIndex,
                                    content: cell.textContent?.trim() || ''
                                });
                            }
                            
                            // 检查中间的单元格是否有内容
                            for (let i = 1; i < count; i++) {
                                const midColIndex = colIndex - i;
                                if (midColIndex > targetColIndex) {
                                    const midCell = rows[rowIndex]?.querySelectorAll('td, th')[midColIndex] as HTMLElement;
                                    if (midCell && this.hasMeaningfulContent(midCell)) {
                                        cellsToMerge.push({
                                            rowIndex: rowIndex,
                                            colIndex: midColIndex,
                                            content: midCell.textContent?.trim() || ''
                                        });
                                    }
                                }
                            }
                            
                            // 确认是否覆盖非空单元格
                            if (this.plugin.settings.confirmMergeNonEmpty && cellsToMerge.length > 0) {
                                // 创建确认消息，包含所有需要覆盖的单元格内容
                                const cellContents = cellsToMerge.map(c => 
                                    `[${c.rowIndex+1},${c.colIndex+1}]: "${c.content}"`
                                ).join('\n');
                                
                                const confirmMerge = await this.showConfirmDialog(
                                    `以下单元格包含内容将被覆盖:\n${cellContents}\n\n确定要合并这些单元格吗？`
                                );
                                
                                if (!confirmMerge) {
                                    console.log('用户取消了单元格合并');
                                    continue;
                                }
                            }
                            
                            // 获取目标单元格当前的colspan
                            let colSpan = parseInt(targetCell.getAttribute('colspan') || '1');
                            
                            // 计算新的colspan：当前colspan + count（合并的列数）
                            colSpan = colSpan + count;
                            console.log(`设置colspan: 目标单元格(${rowIndex},${targetColIndex}), colspan=${colSpan}`);
                            
                            // 设置新的colspan
                            targetCell.setAttribute('colspan', colSpan.toString());
                            targetCell.colSpan = colSpan;
                            
                            // 添加合并样式类
                            targetCell.classList.add('obs-merged-cell');
                            
                            // 隐藏当前单元格
                            cell.style.display = 'none';
                        } else {
                            console.warn('向左合并失败: 目标单元格没有有效内容', targetCell);
                        }
                    }
                }
            }
            
            // 如果启用了自动居中，对合并的单元格应用居中样式
            if (this.plugin.settings.autoCenterMergedCells) {
                const mergedCells = table.querySelectorAll('[rowspan], [colspan]');
                mergedCells.forEach(cell => {
                    const htmlCell = cell as HTMLElement;
                    if (parseInt(htmlCell.getAttribute('rowspan') || '1') > 1 || 
                        parseInt(htmlCell.getAttribute('colspan') || '1') > 1) {
                        htmlCell.style.textAlign = 'center';
                        htmlCell.style.verticalAlign = 'middle';
                        htmlCell.classList.add('obs-merged-cell');
                    }
                });
            }
        } catch (error) {
            console.error('解析单元格合并标记时出错:', error);
        }
    }

    /**
     * 应用表格合并标记到Markdown
     * @param table 表格HTML元素
     */
    applyMergeCellsMarkers(table: HTMLElement): void {
        try {
            // 检查表格是否已经处理过
            if (table.dataset.tableMergeProcessed === 'true') {
                return;
            }
            
            const rows = table.querySelectorAll('tr');
            
            // 检查每个合并的单元格
            for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                const row = rows[rowIndex];
                const cells = row.querySelectorAll('td, th');
                
                for (let colIndex = 0; colIndex < cells.length; colIndex++) {
                    const cell = cells[colIndex] as HTMLElement;
                    const cellContent = cell.textContent?.trim() || '';
                    
                    // 检查是否是向左合并标记
                    const leftMatch = cellContent.match(/^(<+|\\<|\s*<+\s*)$/);
                    if (leftMatch && colIndex > 0) {
                        // 确定合并的列数
                        let mergeCount = 1;
                        if (cellContent.match(/^<+$/)) {
                            mergeCount = cellContent.length;
                        }
                        console.log(`应用向左合并标记: 行=${rowIndex}, 列=${colIndex}, 标记数量=${mergeCount}, 内容="${cellContent}"`);
                        
                        // 计算目标单元格的索引
                        const targetColIndex = colIndex - mergeCount;
                        if (targetColIndex >= 0) {
                            const leftCell = cells[targetColIndex] as HTMLTableCellElement;
                            
                            // 设置colspan：合并的列数 + 1（目标单元格本身）
                            const colSpan = mergeCount + 1;
                            console.log(`设置colspan: 目标单元格(${rowIndex},${targetColIndex}), colspan=${colSpan}`);
                            leftCell.colSpan = colSpan;
                            leftCell.setAttribute('colspan', colSpan.toString());
                            
                            // 隐藏当前单元格
                        cell.style.display = 'none';
                        
                        // 如果启用了自动居中
                        if (this.plugin.settings.autoCenterMergedCells) {
                            leftCell.style.textAlign = 'center';
                            leftCell.style.verticalAlign = 'middle';
                        }
                        
                        // 添加合并样式类
                        leftCell.classList.add('obs-merged-cell');
                    }
                        continue;
                    }
                    
                    // 检查是否是向上合并标记
                    const upMatch = cellContent.match(/^(\^+|\\\^|\s*\^+\s*)$/);
                    if (upMatch && rowIndex > 0) {
                        // 确定合并的行数
                        let mergeCount = 1;
                        if (cellContent.match(/^\^+$/)) {
                            mergeCount = cellContent.length;
                        }
                        console.log(`应用向上合并标记: 行=${rowIndex}, 列=${colIndex}, 标记数量=${mergeCount}, 内容="${cellContent}"`);
                        
                        // 计算目标单元格的索引
                        const targetRowIndex = rowIndex - mergeCount;
                        if (targetRowIndex >= 0) {
                            const aboveRow = rows[targetRowIndex];
                        const aboveCells = aboveRow.querySelectorAll('td, th');
                        
                        if (colIndex < aboveCells.length) {
                            const aboveCell = aboveCells[colIndex] as HTMLTableCellElement;
                                
                                // 设置rowspan：合并的行数 + 1（目标单元格本身）
                                const rowSpan = mergeCount + 1;
                                console.log(`设置rowspan: 目标单元格(${targetRowIndex},${colIndex}), rowspan=${rowSpan}`);
                                aboveCell.rowSpan = rowSpan;
                                aboveCell.setAttribute('rowspan', rowSpan.toString());
                                
                                // 隐藏当前单元格
                            cell.style.display = 'none';
                            
                            // 如果启用了自动居中
                            if (this.plugin.settings.autoCenterMergedCells) {
                                aboveCell.style.textAlign = 'center';
                                aboveCell.style.verticalAlign = 'middle';
                            }
                            
                            // 添加合并样式类
                            aboveCell.classList.add('obs-merged-cell');
                        }
                        }
                        continue;
                    }
                    
                    // 获取rowspan和colspan
                    const rowSpan = parseInt(cell.getAttribute('rowspan') || '1');
                    const colSpan = parseInt(cell.getAttribute('colspan') || '1');
                    
                    // 如果有合并，为下方的单元格添加向上合并标记(^)
                    if (rowSpan > 1) {
                        for (let i = 1; i < rowSpan; i++) {
                            if (rowIndex + i < rows.length) {
                                const targetRow = rows[rowIndex + i];
                                const targetCells = targetRow.querySelectorAll('td, th');
                                if (colIndex < targetCells.length) {
                                    const targetCell = targetCells[colIndex] as HTMLElement;
                                    // 使用重复的^表示合并的行数
                                    const markerText = '^'.repeat(i);
                                    console.log(`添加向上合并标记: 位置(${rowIndex+i},${colIndex}), 标记="${markerText}"`);
                                    targetCell.textContent = markerText;
                                    targetCell.classList.add('merge-marker');
                                }
                            }
                        }
                    }
                    
                    // 如果有合并，为右侧的单元格添加向左合并标记(<)
                    if (colSpan > 1) {
                        for (let i = 1; i < colSpan; i++) {
                            if (colIndex + i < cells.length) {
                                const targetCell = cells[colIndex + i] as HTMLElement;
                                // 使用重复的<表示合并的列数
                                const markerText = '<'.repeat(i);
                                console.log(`添加向左合并标记: 位置(${rowIndex},${colIndex+i}), 标记="${markerText}"`);
                                targetCell.textContent = markerText;
                                targetCell.classList.add('merge-marker');
                            }
                        }
                    }
                }
            }
            
            // 标记表格为已处理
            table.dataset.tableMergeProcessed = 'true';
            console.log(`表格处理完成，已添加合并标记`);
            
        } catch (error) {
            console.error('应用合并单元格标记时出错:', error);
        }
    }

    /**
     * 处理多选单元格合并
     * @param table 表格元素
     * @param selectedCells 选中的单元格数组
     * @returns 是否成功合并
     */
    async mergeSelectedCells(table: HTMLElement, selectedCells: HTMLElement[]): Promise<boolean> {
        if (!selectedCells || selectedCells.length < 2) {
            new Notice('请选择至少2个单元格进行合并');
            return false;
        }

        try {
            // 确定选中区域的边界
            let minRow = Number.MAX_SAFE_INTEGER;
            let maxRow = 0;
            let minCol = Number.MAX_SAFE_INTEGER;
            let maxCol = 0;

            // 检查所有选中单元格并记录边界
            for (const cell of selectedCells) {
                const rowIndex = parseInt(cell.getAttribute('row-index') || cell.dataset.rowIndex || '0');
                const colIndex = parseInt(cell.getAttribute('col-index') || cell.dataset.colIndex || '0');
                
                minRow = Math.min(minRow, rowIndex);
                maxRow = Math.max(maxRow, rowIndex);
                minCol = Math.min(minCol, colIndex);
                maxCol = Math.max(maxCol, colIndex);
            }

            // 验证是否形成完整矩形
            const expectedCellCount = (maxRow - minRow + 1) * (maxCol - minCol + 1);
            if (expectedCellCount !== selectedCells.length) {
                new Notice('只能合并形成完整矩形的单元格');
                return false;
            }

            // 确定左上角单元格作为主单元格
            const mainCell = table.querySelector(`[row-index="${minRow}"][col-index="${minCol}"]`) as HTMLElement;
            if (!mainCell) {
                new Notice('无法找到主单元格');
                return false;
            }
            
            // 检查是否有非空单元格需要确认
            if (this.plugin.settings.confirmMergeNonEmpty) {
                // 收集所有需要合并的非空单元格（除了主单元格）
                const nonEmptyCells = [];
                
                for (const cell of selectedCells) {
                    if (cell === mainCell) continue; // 忽略主单元格
                    
                    if (this.hasMeaningfulContent(cell)) {
                        const rowIndex = parseInt(cell.getAttribute('row-index') || cell.dataset.rowIndex || '0');
                        const colIndex = parseInt(cell.getAttribute('col-index') || cell.dataset.colIndex || '0');
                        
                        nonEmptyCells.push({
                            rowIndex: rowIndex,
                            colIndex: colIndex,
                            content: cell.textContent?.trim() || ''
                        });
                    }
                }
                
                if (nonEmptyCells.length > 0) {
                    // 创建确认消息，包含所有需要覆盖的单元格内容
                    const cellContents = nonEmptyCells.map(c => 
                        `[${c.rowIndex+1},${c.colIndex+1}]: "${c.content}"`
                    ).join('\n');
                    
                    // 创建并显示确认对话框
                    const confirmMerge = await this.showConfirmDialog(
                        `以下单元格包含内容将被覆盖:\n${cellContents}\n\n确定要合并这些单元格吗？`
                    );
                    
                    if (!confirmMerge) {
                        new Notice('已取消合并操作');
                        return false;
                    }
                }
            }

            // 设置合并属性
            const rowSpanValue = maxRow - minRow + 1;
            const colSpanValue = maxCol - minCol + 1;
            
            // 应用rowspan和colspan到主单元格
            mainCell.setAttribute('rowspan', rowSpanValue.toString());
            mainCell.setAttribute('colspan', colSpanValue.toString());
            mainCell.rowSpan = rowSpanValue;
            mainCell.colSpan = colSpanValue;
            
            // 添加合并样式类
            mainCell.classList.add('obs-merged-cell');
            
            // 如果启用了自动居中
            if (this.plugin.settings.autoCenterMergedCells) {
                mainCell.style.textAlign = 'center';
                mainCell.style.verticalAlign = 'middle';
            }

            // 隐藏其他单元格
            for (const cell of selectedCells) {
                if (cell !== mainCell) {
                    cell.style.display = 'none';
                }
            }

            // 应用合并单元格标记到区域
            this.applyMergeCellsMarkersForArea(table, minRow, minCol, maxRow, maxCol);

            return true;
        } catch (error) {
            console.error('合并选中单元格时出错:', error);
            return false;
        }
    }

    /**
     * 为特定区域应用合并标记
     * @param table 表格元素
     * @param startRow 起始行
     * @param startCol 起始列
     * @param endRow 结束行
     * @param endCol 结束列
     */
    private applyMergeCellsMarkersForArea(table: HTMLElement, startRow: number, startCol: number, endRow: number, endCol: number): void {
        try {
            const rows = table.querySelectorAll('tr');
            
            // 对区域内除了左上角单元格外的所有单元格应用合并标记
            for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
                if (rowIndex < rows.length) {
                    const row = rows[rowIndex];
                    const cells = row.querySelectorAll('td, th');
                    
                    for (let colIndex = startCol; colIndex <= endCol; colIndex++) {
                        if (colIndex < cells.length && !(rowIndex === startRow && colIndex === startCol)) {
                            const cell = cells[colIndex] as HTMLElement;
                            
                            // 第一列的单元格使用向上合并标记(^)
                            if (colIndex === startCol) {
                                cell.textContent = '^';
                                cell.classList.add('merge-marker');
                            } 
                            // 第一行的单元格使用向左合并标记(<)
                            else if (rowIndex === startRow) {
                                cell.textContent = '<';
                                cell.classList.add('merge-marker');
                            }
                            // 其他单元格随机使用一种标记，保证不会看到
                            else {
                                cell.textContent = (Math.random() > 0.5) ? '^' : '<';
                                cell.classList.add('merge-marker', 'hidden-marker');
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('应用区域合并标记时出错:', error);
        }
    }
} 