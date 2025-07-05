import { ObsidianSpreadsheet } from './main';
import { App, Editor, MarkdownView, Notice } from 'obsidian';

/**
 * Markdown源码编辑器 - 负责在编辑模式下直接修改Markdown源码
 */
export class MarkdownSourceEditor {
    private plugin: ObsidianSpreadsheet;

    constructor(plugin: ObsidianSpreadsheet) {
        this.plugin = plugin;
        console.log('MarkdownSourceEditor initialized');
    }

    /**
     * 获取当前活动的编辑器
     * @returns 编辑器实例或null
     */
    getActiveEditor(): Editor | null {
        const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.editor) {
            return activeView.editor;
        }
        return null;
    }

    /**
     * 在Markdown源码中定位表格
     * @param editor 编辑器实例
     * @returns 表格信息或null
     */
    locateTableInMarkdown(editor: Editor): { startLine: number, endLine: number, content: string, tableId?: string } | null {
        try {
            const content = editor.getValue();
            const cursor = editor.getCursor();
            const lines = content.split('\n');
            
            // 检查光标是否在表格内
            const cursorLine = lines[cursor.line];
            const isInTableRow = cursorLine && cursorLine.trim().startsWith('|') && cursorLine.trim().endsWith('|');
            
            // 如果光标不在表格行内，返回null
            if (!isInTableRow) return null;
            
            // 向上搜索表格开始
            let startLine = cursor.line;
            while (startLine > 0 && lines[startLine - 1].trim().startsWith('|')) {
                startLine--;
            }
            
            // 向下搜索表格结束
            let endLine = cursor.line;
            while (endLine < lines.length - 1 && lines[endLine + 1].trim().startsWith('|')) {
                endLine++;
            }
            
            // 验证是否找到有效表格
            if (!this.isValidTable(lines.slice(startLine, endLine + 1))) {
                return null;
            }
            
            // 检查表格ID
            const tableId = this.findTableIdAbove(editor, startLine);
            
            return {
                startLine,
                endLine,
                content: lines.slice(startLine, endLine + 1).join('\n'),
                tableId
            };
        } catch (error) {
            console.error('定位Markdown表格时出错:', error);
            return null;
        }
    }
    
    /**
     * 在表格上方查找表格ID
     * @param editor 编辑器实例
     * @param tableLine 表格起始行
     * @returns 表格ID或undefined
     */
    private findTableIdAbove(editor: Editor, tableLine: number): string | undefined {
        console.log(`查找表格ID: 表格起始行=${tableLine}`);
        
        // 向上最多查找10行
        const maxLinesToCheck = 10;
        let currentLine = tableLine - 1;
        const minLine = Math.max(0, tableLine - maxLinesToCheck);
        
        while (currentLine >= minLine) {
            const line = editor.getLine(currentLine);
            if (!line) break;
            
            console.log(`检查行 ${currentLine}: "${line}"`);
            
            // 检查多种可能的ID注释格式
            
            // 1. <!-- table-id: xxx -->
            const standardIdMatch = line.match(/<!--\s*table-id:\s*([a-zA-Z0-9_\-:.]+)\s*-->/i);
            if (standardIdMatch && standardIdMatch[1]) {
                const id = standardIdMatch[1];
                console.log(`在行 ${currentLine} 找到标准格式表格ID: ${id}`);
                return id;
            }
            
            // 2. <!-- tableid: xxx -->
            const noHyphenIdMatch = line.match(/<!--\s*tableid:\s*([a-zA-Z0-9_\-:.]+)\s*-->/i);
            if (noHyphenIdMatch && noHyphenIdMatch[1]) {
                const id = noHyphenIdMatch[1];
                console.log(`在行 ${currentLine} 找到无连字符格式表格ID: ${id}`);
                return id;
            }
            
            // 3. <!-- id: xxx -->
            const simpleIdMatch = line.match(/<!--\s*id:\s*([a-zA-Z0-9_\-:.]+)\s*-->/i);
            if (simpleIdMatch && simpleIdMatch[1]) {
                const id = simpleIdMatch[1];
                console.log(`在行 ${currentLine} 找到简化格式表格ID: ${id}`);
                return id;
            }
            
            // 4. <!-- table: xxx --> 或 <!-- tbl: xxx -->
            const tableNameIdMatch = line.match(/<!--\s*(table|tbl):\s*([a-zA-Z0-9_\-:.]+)\s*-->/i);
            if (tableNameIdMatch && tableNameIdMatch[2]) {
                const id = tableNameIdMatch[2];
                console.log(`在行 ${currentLine} 找到表格名称格式ID: ${id}`);
                return id;
            }
            
            // 5. 检查不带空格的格式 <!--table-id:xxx-->
            const noSpaceIdMatch = line.match(/<!--table-id:([a-zA-Z0-9_\-:.]+)-->/i);
            if (noSpaceIdMatch && noSpaceIdMatch[1]) {
                const id = noSpaceIdMatch[1];
                console.log(`在行 ${currentLine} 找到无空格格式表格ID: ${id}`);
                return id;
            }
            
            // 如果遇到非空行且不是注释行，则停止搜索
            // 但允许空行和其他注释行
            if (line.trim() !== '' && !line.trim().startsWith('<!--') && !line.trim().startsWith('//')) {
                console.log(`在行 ${currentLine} 遇到非空非注释行，停止搜索`);
                break;
            }
            
            currentLine--;
        }
        
        console.log('未找到表格ID');
        return undefined;
    }

    /**
     * 验证Markdown表格结构是否有效
     * @param lines 表格行数组
     * @returns 是否为有效表格
     */
    private isValidTable(lines: string[]): boolean {
        if (lines.length < 2) return false;
        
        // 检查第一行是否是表头
        const firstLine = lines[0].trim();
        if (!firstLine.startsWith('|') || !firstLine.endsWith('|')) return false;
        
        // 检查第二行是否是分隔行
        const secondLine = lines[1].trim();
        if (!secondLine.startsWith('|') || !secondLine.endsWith('|')) return false;
        
        // 分隔行必须包含 - 字符
        const separatorCells = secondLine.split('|').slice(1, -1);
        for (const cell of separatorCells) {
            const trimmedCell = cell.trim();
            if (!trimmedCell.match(/^:?-+:?$/)) {
                return false;
            }
        }
        
        // 检查所有行的格式是否一致（都以 | 开头和结尾）
        for (let i = 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line.startsWith('|') || !line.endsWith('|')) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * 为Markdown表格添加ID
     * @returns 添加的表格ID或null
     */
    async addTableIdToMarkdown(): Promise<string | null> {
        try {
            const editor = this.getActiveEditor();
            if (!editor) {
                new Notice('未找到活动编辑器');
                return null;
            }

            // 定位表格
            const tableInfo = this.locateTableInMarkdown(editor);
            if (!tableInfo) {
                new Notice('未找到表格，请将光标放在表格内');
                return null;
            }

            // 检查表格前是否已有ID
            const tableId = this.checkExistingTableId(editor, tableInfo.startLine);
            if (tableId) {
                new Notice(`表格已有ID: ${tableId}`);
                return tableId;
            }

            // 生成新的表格ID
            const newTableId = this.generateUniqueTableId();
            
            console.log(`为表格添加新ID: ${newTableId}, 表格起始行: ${tableInfo.startLine}`);
            
            // 检查表格前是否有空行
            let insertPosition = { line: tableInfo.startLine, ch: 0 };
            let insertContent = `<!-- table-id: ${newTableId} -->\n`;
            
            // 如果表格前没有空行，添加一个空行
            if (tableInfo.startLine > 0) {
                const prevLine = editor.getLine(tableInfo.startLine - 1);
                if (prevLine && prevLine.trim() !== '') {
                    insertContent = `\n<!-- table-id: ${newTableId} -->\n`;
                }
            }
            
            // 在表格前插入ID注释
            editor.replaceRange(insertContent, insertPosition);
            
            // 保存表格信息到插件数据
            this.saveTableInfo(newTableId, tableInfo);
            
            console.log(`已为表格添加ID: ${newTableId}`);
            new Notice(`已为表格添加ID: ${newTableId}`);
            return newTableId;
        } catch (error) {
            console.error('添加表格ID时出错:', error);
            return null;
        }
    }
    
    /**
     * 保存表格信息到插件数据
     * @param tableId 表格ID
     * @param tableInfo 表格信息
     */
    private saveTableInfo(tableId: string, tableInfo: { startLine: number, endLine: number, content: string }): void {
        try {
            // 获取当前文件路径
            const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
            if (!activeView || !activeView.file) return;
            
            const filePath = activeView.file.path;
            
            // 解析表格结构
            const { rows, hasHeader } = this.parseTableStructure(tableInfo.content);
            
            // 创建表格数据
            const tableData = {
                id: tableId,
                locations: [
                    {
                        path: filePath,
                        isActive: true
                    }
                ],
                structure: {
                    rowCount: rows.length,
                    colCount: rows.length > 0 ? rows[0].length : 0,
                    hasHeaders: hasHeader
                },
                styling: {
                    rowHeights: Array(rows.length).fill('auto'),
                    colWidths: rows.length > 0 ? Array(rows[0].length).fill('auto') : [],
                    alignment: rows.length > 0 ? Array(rows[0].length).fill('left') : []
                }
            };
            
            // 保存表格数据
            this.plugin.saveTableData(tableData);
        } catch (error) {
            console.error('保存表格信息时出错:', error);
        }
    }

    /**
     * 检查表格是否已有ID
     * @param editor 编辑器实例
     * @param tableLine 表格起始行
     * @returns 表格ID或null
     */
    private checkExistingTableId(editor: Editor, tableLine: number): string | null {
        if (tableLine <= 0) return null;
        
        console.log(`检查表格是否已有ID: 表格起始行=${tableLine}`);
        
        // 向上查找最多10行，检查是否有ID注释
        const maxLinesToCheck = 10;
        let currentLine = tableLine - 1;
        const minLine = Math.max(0, tableLine - maxLinesToCheck);
        
        while (currentLine >= minLine) {
            const line = editor.getLine(currentLine);
            if (!line) break;
            
            console.log(`检查行 ${currentLine}: "${line}"`);
            
            // 检查多种可能的ID注释格式
            
            // 1. <!-- table-id: xxx -->
            const standardIdMatch = line.match(/<!--\s*table-id:\s*([a-zA-Z0-9_\-:.]+)\s*-->/i);
            if (standardIdMatch && standardIdMatch[1]) {
                const id = standardIdMatch[1];
                console.log(`在行 ${currentLine} 找到标准格式表格ID: ${id}`);
                return id;
            }
            
            // 2. <!-- tableid: xxx -->
            const noHyphenIdMatch = line.match(/<!--\s*tableid:\s*([a-zA-Z0-9_\-:.]+)\s*-->/i);
            if (noHyphenIdMatch && noHyphenIdMatch[1]) {
                const id = noHyphenIdMatch[1];
                console.log(`在行 ${currentLine} 找到无连字符格式表格ID: ${id}`);
                return id;
            }
            
            // 3. <!-- id: xxx -->
            const simpleIdMatch = line.match(/<!--\s*id:\s*([a-zA-Z0-9_\-:.]+)\s*-->/i);
            if (simpleIdMatch && simpleIdMatch[1]) {
                const id = simpleIdMatch[1];
                console.log(`在行 ${currentLine} 找到简化格式表格ID: ${id}`);
                return id;
            }
            
            // 4. <!-- table: xxx --> 或 <!-- tbl: xxx -->
            const tableNameIdMatch = line.match(/<!--\s*(table|tbl):\s*([a-zA-Z0-9_\-:.]+)\s*-->/i);
            if (tableNameIdMatch && tableNameIdMatch[2]) {
                const id = tableNameIdMatch[2];
                console.log(`在行 ${currentLine} 找到表格名称格式ID: ${id}`);
                return id;
            }
            
            // 5. 检查不带空格的格式 <!--table-id:xxx-->
            const noSpaceIdMatch = line.match(/<!--table-id:([a-zA-Z0-9_\-:.]+)-->/i);
            if (noSpaceIdMatch && noSpaceIdMatch[1]) {
                const id = noSpaceIdMatch[1];
                console.log(`在行 ${currentLine} 找到无空格格式表格ID: ${id}`);
                return id;
            }
            
            // 如果遇到非空行且不是注释行，则停止搜索
            // 但允许空行和其他注释行
            if (line.trim() !== '' && !line.trim().startsWith('<!--') && !line.trim().startsWith('//')) {
                console.log(`在行 ${currentLine} 遇到非空非注释行，停止搜索`);
                break;
            }
            
            currentLine--;
        }
        
        console.log('未找到表格ID');
        return null;
    }

    /**
     * 生成唯一的表格ID
     * @returns 表格ID字符串
     */
    private generateUniqueTableId(): string {
        const prefix = this.plugin.settings.idPrefix || 'tbl';
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomId = Math.random().toString(36).substring(2, 8);
        return `${prefix}-${timestamp}-${randomId}`;
    }

    /**
     * 解析表格结构
     * @param tableContent 表格内容字符串
     * @returns 解析后的表格数据
     */
    parseTableStructure(tableContent: string): { rows: string[][], hasHeader: boolean } {
        const lines = tableContent.split('\n');
        const rows: string[][] = [];
        let hasHeader = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line.startsWith('|')) continue;
            
            // 分隔行处理
            if (line.includes('-') && i === 1) {
                hasHeader = true;
                continue;
            }
            
            // 解析行单元格
            const cells = line.split('|')
                .filter((cell, index, array) => index > 0 && index < array.length - 1)
                .map(cell => cell.trim());
            
            rows.push(cells);
        }
        
        return { rows, hasHeader };
    }

    /**
     * 获取单元格内容
     * @param tableRows 表格行数组
     * @param rowIndex 行索引
     * @param colIndex 列索引
     * @returns 单元格内容
     */
    getCellContent(tableRows: string[][], rowIndex: number, colIndex: number): string {
        if (rowIndex >= 0 && rowIndex < tableRows.length && 
            colIndex >= 0 && colIndex < tableRows[rowIndex].length) {
            return tableRows[rowIndex][colIndex];
        }
        return '';
    }

    /**
     * 设置单元格内容
     * @param editor 编辑器实例
     * @param tableInfo 表格信息
     * @param rowIndex 行索引
     * @param colIndex 列索引
     * @param content 新内容
     */
    setCellContent(editor: Editor, tableInfo: { startLine: number, endLine: number }, 
                  rowIndex: number, colIndex: number, content: string): void {
        try {
            // 获取表格行
            const lineIndex = tableInfo.startLine + rowIndex;
            if (lineIndex > tableInfo.endLine) return;
            
            const line = editor.getLine(lineIndex);
            if (!line) return;
            
            // 分割行
            const cells = line.split('|');
            if (colIndex + 1 >= cells.length - 1) return;
            
            // 更新单元格内容
            cells[colIndex + 1] = ` ${content} `;
            
            // 更新整行
            editor.replaceRange(
                cells.join('|'),
                { line: lineIndex, ch: 0 },
                { line: lineIndex, ch: line.length }
            );
        } catch (error) {
            console.error('设置单元格内容时出错:', error);
        }
    }

    /**
     * 合并单元格
     * @param direction 合并方向 ('right' 或 'down')
     */
    async mergeCells(direction: 'right' | 'down'): Promise<boolean> {
        try {
            console.log(`尝试${direction === 'right' ? '向右' : '向下'}合并单元格`);
            
            const editor = this.getActiveEditor();
            if (!editor) {
                console.log('未找到活动编辑器');
                new Notice('未找到活动编辑器');
                return false;
            }

            // 获取单元格位置信息
            const cellPosition = this.getCellPosition(editor);
            if (!cellPosition) {
                console.log('未找到表格或无法确定单元格位置');
                new Notice('未找到表格或无法确定单元格位置，请将光标放在表格内');
                return false;
            }

            const { tableInfo, rowIndex, colIndex } = cellPosition;
            console.log(`准备${direction === 'right' ? '向右' : '向下'}合并单元格: 行=${rowIndex}, 列=${colIndex}`);
            
            // 根据方向合并单元格
            let result = false;
            if (direction === 'right') {
                result = await this.mergeCellsRight(editor, tableInfo, rowIndex, colIndex);
            } else if (direction === 'down') {
                result = await this.mergeCellsDown(editor, tableInfo, rowIndex, colIndex);
            }
            
            if (result) {
                console.log(`${direction === 'right' ? '向右' : '向下'}合并单元格成功`);
            } else {
                console.log(`${direction === 'right' ? '向右' : '向下'}合并单元格失败`);
            }
            
            return result;
        } catch (error) {
            console.error(`合并单元格时出错(${direction}):`, error);
            new Notice(`合并单元格失败: ${error.message || '未知错误'}`);
            return false;
        }
    }

    /**
     * 获取光标所在的列索引
     * @param line 行文本
     * @param cursorCh 光标字符位置
     * @returns 列索引或-1
     */
    private getCursorColumnIndex(line: string, cursorCh: number): number {
        try {
            // 确保行是表格行
            if (!line.trim().startsWith('|') || !line.trim().endsWith('|')) {
                console.log('行不是有效的表格行:', line);
                return -1;
            }
            
            // 分割行为单元格
            const cells = line.split('|');
            
            // 移除首尾空元素（如果有）
            if (cells[0].trim() === '') cells.shift();
            if (cells[cells.length - 1].trim() === '') cells.pop();
            
            // 计算每个单元格的起始位置
            let currentPos = line.indexOf('|'); // 第一个分隔符位置
            
            // 遍历每个单元格，找到光标所在的单元格
            for (let i = 0; i < cells.length; i++) {
                const cellWidth = cells[i].length + 1; // +1 for the '|' character
                const nextPos = currentPos + cellWidth;
                
                console.log(`检查单元格 ${i}: 范围=${currentPos}-${nextPos}, 内容="${cells[i]}"`);
                
                if (cursorCh > currentPos && cursorCh <= nextPos) {
                    console.log(`光标在单元格 ${i} 内: 位置=${cursorCh}`);
                    return i;
                }
                
                currentPos = nextPos;
            }
            
            console.log(`未找到光标所在单元格: cursorCh=${cursorCh}, line="${line}"`);
            return -1;
        } catch (error) {
            console.error('获取光标所在列索引时出错:', error);
            return -1;
        }
    }
    
    /**
     * 获取单元格位置信息
     * @param editor 编辑器实例
     * @returns 单元格位置信息或null
     */
    getCellPosition(editor: Editor): { tableInfo: { startLine: number, endLine: number, content: string, tableId?: string }, rowIndex: number, colIndex: number } | null {
        try {
            // 定位表格
            const tableInfo = this.locateTableInMarkdown(editor);
            if (!tableInfo) {
                console.log('未找到表格');
                return null;
            }
            
            // 获取光标位置
            const cursor = editor.getCursor();
            const rowIndex = cursor.line - tableInfo.startLine;
            
            // 检查行索引是否有效
            if (rowIndex < 0 || rowIndex > tableInfo.endLine - tableInfo.startLine) {
                console.log(`行索引超出范围: rowIndex=${rowIndex}, tableRange=${tableInfo.startLine}-${tableInfo.endLine}`);
                return null;
            }
            
            // 获取当前行
            const line = editor.getLine(cursor.line);
            if (!line) {
                console.log('无法获取行内容');
                return null;
            }
            
            // 检查行是否是有效的表格行
            if (!line.trim().startsWith('|') || !line.trim().endsWith('|')) {
                console.log('当前行不是有效的表格行');
                return null;
            }
            
            // 确定光标所在的列
            const colIndex = this.getCursorColumnIndex(line, cursor.ch);
            if (colIndex === -1) {
                console.log('无法确定光标所在列');
                return null;
            }
            
            console.log(`成功获取单元格位置: 行=${rowIndex}, 列=${colIndex}, 表格范围=${tableInfo.startLine}-${tableInfo.endLine}`);
            
            return {
                tableInfo,
                rowIndex,
                colIndex
            };
        } catch (error) {
            console.error('获取单元格位置信息时出错:', error);
            return null;
        }
    }

    /**
     * 向右合并单元格
     * @param editor 编辑器实例
     * @param tableInfo 表格信息
     * @param rowIndex 行索引
     * @param colIndex 列索引
     * @param mergeCount 已合并的单元格数量，默认为0
     * @returns 是否成功
     */
    private async mergeCellsRight(editor: Editor, tableInfo: { startLine: number, endLine: number, content: string, tableId?: string }, 
                                 rowIndex: number, colIndex: number, mergeCount: number = 0): Promise<boolean> {
        try {
            const lineIndex = tableInfo.startLine + rowIndex;
            const line = editor.getLine(lineIndex);
            if (!line) {
                console.log(`无法获取行内容: lineIndex=${lineIndex}`);
                return false;
            }
            
            console.log(`尝试向右合并单元格: 行=${lineIndex}, 列=${colIndex}, 已合并=${mergeCount}, 行内容="${line}"`);
            
            // 分割行
            const cells = line.split('|');
            if (colIndex + 2 >= cells.length) {
                console.log(`列索引超出范围: colIndex=${colIndex}, cells.length=${cells.length}`);
                new Notice('右侧没有单元格可合并');
                return false;
            }
            
            // 获取要合并的单元格内容
            const mainContent = cells[colIndex + 1].trim();
            const targetContent = cells[colIndex + 2].trim();
            
            console.log(`主单元格内容="${mainContent}", 目标单元格内容="${targetContent}"`);
            
            // 检查目标单元格是否已经是合并标记
            const isMergeMarker = /^(<+|\^+|\\<|\\^|\s*<+\s*|\s*\^+\s*)$/.test(targetContent);
            console.log(`目标单元格是否为合并标记: ${isMergeMarker}`);
            
            let mergeAction = 'replace';
            
            // 确认合并非空且非合并标记的单元格
            if (targetContent && !isMergeMarker) {
                if (this.plugin.settings.confirmMergeNonEmpty) {
                    // 使用选项对话框
                    mergeAction = await this.showMergeCellOptionsDialog(mainContent, targetContent);
                    console.log(`用户选择的合并操作: ${mergeAction}`);
                    
                    if (mergeAction === 'cancel') {
                        console.log('用户取消了合并操作');
                        return false;
                    }
                }
            }
            
            // 根据选择的操作处理单元格内容
            if (mergeAction === 'merge' && mainContent && targetContent && !isMergeMarker) {
                // 合并两个单元格的内容到主单元格
                cells[colIndex + 1] = ` ${mainContent} ${targetContent} `;
                console.log(`合并内容: 新主单元格内容="${cells[colIndex + 1]}"`);
            }
            
            // 计算合并标记数量 - 从主单元格到当前列的距离
            // 对于直接相邻的单元格，使用单个 <
            // 对于第三个单元格，使用 <<
            // 对于第四个单元格，使用 <<< 以此类推
            const mergeDistance = mergeCount + 1; // 当前合并的单元格距离
            const mergeMarker = '<'.repeat(mergeDistance);
            console.log(`生成合并标记: 距离=${mergeDistance}, 标记="${mergeMarker}"`);
            
            // 更新目标单元格内容 - 使用标准化的合并标记
            cells[colIndex + 2] = ` ${mergeMarker} `;
            
            // 构建新行
            const newLine = cells.join('|');
            console.log(`新行内容="${newLine}"`);
            
            // 更新整行
            editor.replaceRange(
                newLine,
                { line: lineIndex, ch: 0 },
                { line: lineIndex, ch: line.length }
            );
            
            // 检查是否需要继续向右合并（处理多列合并的情况）
            if (colIndex + 3 < cells.length) {
                const nextCellContent = cells[colIndex + 3].trim();
                console.log(`检查下一个单元格是否为合并标记: 内容="${nextCellContent}"`);
                // 使用正则表达式检查是否为合并标记
                if (/^(<+|\^+|\\<|\\^|\s*<+\s*|\s*\^+\s*)$/.test(nextCellContent)) {
                    console.log('检测到右侧有连续合并单元格，继续合并');
                    await this.mergeCellsRight(editor, tableInfo, rowIndex, colIndex + 1, mergeDistance);
                }
            }
            
            new Notice('已向右合并单元格');
            return true;
        } catch (error) {
            console.error('向右合并单元格时出错:', error);
            new Notice(`向右合并单元格失败: ${error.message || '未知错误'}`);
            return false;
        }
    }

    /**
     * 向下合并单元格
     * @param editor 编辑器实例
     * @param tableInfo 表格信息
     * @param rowIndex 行索引
     * @param colIndex 列索引
     * @param mergeCount 已合并的单元格数量，默认为0
     * @returns 是否成功
     */
    private async mergeCellsDown(editor: Editor, tableInfo: { startLine: number, endLine: number, content: string, tableId?: string }, 
                               rowIndex: number, colIndex: number, mergeCount: number = 0): Promise<boolean> {
        try {
            const currentLineIndex = tableInfo.startLine + rowIndex;
            const nextLineIndex = currentLineIndex + 1;
            
            if (nextLineIndex > tableInfo.endLine) {
                console.log(`下一行超出表格范围: nextLineIndex=${nextLineIndex}, tableEndLine=${tableInfo.endLine}`);
                new Notice('下方没有单元格可合并');
                return false;
            }
            
            const currentLine = editor.getLine(currentLineIndex);
            const nextLine = editor.getLine(nextLineIndex);
            
            if (!currentLine || !nextLine) {
                console.log(`无法获取行内容: currentLine=${!!currentLine}, nextLine=${!!nextLine}`);
                return false;
            }
            
            console.log(`尝试向下合并单元格: 当前行=${currentLineIndex}, 下一行=${nextLineIndex}, 列=${colIndex}, 已合并=${mergeCount}`);
            console.log(`当前行内容="${currentLine}"`);
            console.log(`下一行内容="${nextLine}"`);
            
            // 分割行
            const currentCells = currentLine.split('|');
            const nextCells = nextLine.split('|');
            
            if (colIndex + 1 >= currentCells.length || colIndex + 1 >= nextCells.length) {
                console.log(`列索引超出范围: colIndex=${colIndex}, currentCells.length=${currentCells.length}, nextCells.length=${nextCells.length}`);
                new Notice('无法合并单元格，列索引超出范围');
                return false;
            }
            
            // 获取要合并的单元格内容
            const mainContent = currentCells[colIndex + 1].trim();
            const targetContent = nextCells[colIndex + 1].trim();
            
            console.log(`主单元格内容="${mainContent}", 目标单元格内容="${targetContent}"`);
            
            // 检查目标单元格是否已经是合并标记
            const isMergeMarker = /^(<+|\^+|\\<|\\^|\s*<+\s*|\s*\^+\s*)$/.test(targetContent);
            console.log(`目标单元格是否为合并标记: ${isMergeMarker}`);
            
            let mergeAction = 'replace';
            
            // 确认合并非空且非合并标记的单元格
            if (targetContent && !isMergeMarker) {
                if (this.plugin.settings.confirmMergeNonEmpty) {
                    // 使用选项对话框
                    mergeAction = await this.showMergeCellOptionsDialog(mainContent, targetContent);
                    console.log(`用户选择的合并操作: ${mergeAction}`);
                    
                    if (mergeAction === 'cancel') {
                        console.log('用户取消了合并操作');
                        return false;
                    }
                }
            }
            
            // 根据选择的操作处理单元格内容
            if (mergeAction === 'merge' && mainContent && targetContent && !isMergeMarker) {
                // 合并两个单元格的内容到主单元格
                currentCells[colIndex + 1] = ` ${mainContent} ${targetContent} `;
                console.log(`合并内容: 新主单元格内容="${currentCells[colIndex + 1]}"`);
                
                // 更新主单元格所在行
                editor.replaceRange(
                    currentCells.join('|'),
                    { line: currentLineIndex, ch: 0 },
                    { line: currentLineIndex, ch: currentLine.length }
                );
            }
            
            // 计算合并标记数量 - 从主单元格到当前行的距离
            // 对于直接相邻的单元格，使用单个 ^
            // 对于第三个单元格，使用 ^^
            // 对于第四个单元格，使用 ^^^ 以此类推
            const mergeDistance = mergeCount + 1; // 当前合并的单元格距离
            const mergeMarker = '^'.repeat(mergeDistance);
            console.log(`生成合并标记: 距离=${mergeDistance}, 标记="${mergeMarker}"`);
            
            // 更新目标单元格内容 - 使用标准化的合并标记
            nextCells[colIndex + 1] = ` ${mergeMarker} `;
            
            // 构建新行
            const newNextLine = nextCells.join('|');
            console.log(`新下一行内容="${newNextLine}"`);
            
            // 更新目标行
            editor.replaceRange(
                newNextLine,
                { line: nextLineIndex, ch: 0 },
                { line: nextLineIndex, ch: nextLine.length }
            );
            
            // 检查是否需要继续向下合并（处理多行合并的情况）
            if (nextLineIndex + 1 <= tableInfo.endLine) {
                const nextNextLine = editor.getLine(nextLineIndex + 1);
                if (nextNextLine) {
                    const nextNextCells = nextNextLine.split('|');
                    if (colIndex + 1 < nextNextCells.length) {
                        const nextNextCellContent = nextNextCells[colIndex + 1].trim();
                        console.log(`检查下一行单元格是否为合并标记: 内容="${nextNextCellContent}"`);
                        // 使用正则表达式检查是否为合并标记
                        if (/^(<+|\^+|\\<|\\^|\s*<+\s*|\s*\^+\s*)$/.test(nextNextCellContent)) {
                            console.log('检测到下方有连续合并单元格，继续合并');
                            await this.mergeCellsDown(editor, tableInfo, rowIndex + 1, colIndex, mergeDistance);
                        }
                    }
                }
            }
            
            new Notice('已向下合并单元格');
            return true;
        } catch (error) {
            console.error('向下合并单元格时出错:', error);
            new Notice(`向下合并单元格失败: ${error.message || '未知错误'}`);
            return false;
        }
    }

    /**
     * 显示确认对话框
     * @param message 确认消息
     * @returns 用户是否确认
     */
    private async showConfirmDialog(message: string): Promise<boolean> {
        return new Promise((resolve) => {
            // 创建一个不会自动消失的通知
            const notice = new Notice(message, 0);
            
            // 添加按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.justifyContent = 'space-between';
            buttonContainer.style.marginTop = '10px';
            
            // 添加取消按钮
            const cancelButton = document.createElement('button');
            cancelButton.textContent = '取消';
            cancelButton.onclick = () => {
                notice.hide();
                resolve(false);
            };
            
            // 添加确认按钮
            const confirmButton = document.createElement('button');
            confirmButton.textContent = '确定';
            confirmButton.style.marginLeft = '10px';
            confirmButton.onclick = () => {
                notice.hide();
                resolve(true);
            };
            
            // 添加按钮到容器
            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(confirmButton);
            
            // 添加按钮容器到通知
            notice.noticeEl.appendChild(buttonContainer);
        });
    }

    /**
     * 显示合并单元格选项对话框
     * @param mainContent 主单元格内容
     * @param targetContent 目标单元格内容
     * @returns 选择的操作：'merge'=合并并保留两个内容, 'replace'=仅使用合并标记, 'cancel'=取消操作
     */
    private async showMergeCellOptionsDialog(mainContent: string, targetContent: string): Promise<'merge'|'replace'|'cancel'> {
        return new Promise((resolve) => {
            // 创建一个不会自动消失的通知
            const notice = new Notice('合并单元格选项', 0);
            
            // 添加内容容器
            const contentContainer = document.createElement('div');
            contentContainer.style.marginBottom = '10px';
            contentContainer.innerHTML = `
                <p>目标单元格包含内容："${targetContent}"</p>
                <p>请选择合并方式：</p>
            `;
            
            // 添加按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.flexDirection = 'column';
            buttonContainer.style.gap = '5px';
            
            // 添加合并并保留内容按钮
            const mergeButton = document.createElement('button');
            mergeButton.textContent = '合并并保留内容';
            mergeButton.onclick = () => {
                notice.hide();
                resolve('merge');
            };
            
            // 添加仅使用合并标记按钮
            const replaceButton = document.createElement('button');
            replaceButton.textContent = '仅使用合并标记';
            replaceButton.onclick = () => {
                notice.hide();
                resolve('replace');
            };
            
            // 添加取消按钮
            const cancelButton = document.createElement('button');
            cancelButton.textContent = '取消';
            cancelButton.onclick = () => {
                notice.hide();
                resolve('cancel');
            };
            
            // 添加按钮到容器
            buttonContainer.appendChild(mergeButton);
            buttonContainer.appendChild(replaceButton);
            buttonContainer.appendChild(cancelButton);
            
            // 添加容器到通知
            notice.noticeEl.appendChild(contentContainer);
            notice.noticeEl.appendChild(buttonContainer);
        });
    }

    /**
     * 检测并修复表格合并标记
     * @returns 是否进行了修复
     */
    async detectAndFixMergeMarkers(): Promise<boolean> {
        try {
            const editor = this.getActiveEditor();
            if (!editor) {
                new Notice('未找到活动编辑器');
                return false;
            }
            
            // 定位表格
            const tableInfo = this.locateTableInMarkdown(editor);
            if (!tableInfo) {
                new Notice('未找到表格，请将光标放在表格内');
                return false;
            }
            
            let hasFixedMarkers = false;
            
            // 遍历表格的每一行
            for (let i = tableInfo.startLine; i <= tableInfo.endLine; i++) {
                const line = editor.getLine(i);
                if (!line) continue;
                
                // 分割行
                const cells = line.split('|');
                let hasChanges = false;
                
                // 检查每个单元格
                for (let j = 1; j < cells.length - 1; j++) {
                    const cell = cells[j];
                    const trimmedCell = cell.trim();
                    
                    // 检查并统一合并标记格式
                    if (trimmedCell === '\\<' || trimmedCell === '<') {
                        // 统一使用不带转义的标记
                        cells[j] = ' < ';
                        hasChanges = true;
                    } else if (trimmedCell === '\\^' || trimmedCell === '^') {
                        // 统一使用不带转义的标记
                        cells[j] = ' ^ ';
                        hasChanges = true;
                    }
                }
                
                // 如果有修改，更新行
                if (hasChanges) {
                    const updatedLine = cells.join('|');
                    editor.replaceRange(
                        updatedLine,
                        { line: i, ch: 0 },
                        { line: i, ch: line.length }
                    );
                    hasFixedMarkers = true;
                }
            }
            
            if (hasFixedMarkers) {
                new Notice('已统一表格合并标记格式');
            } else {
                new Notice('未发现需要修复的合并标记');
            }
            
            return hasFixedMarkers;
        } catch (error) {
            console.error('检测和修复表格合并标记时出错:', error);
            return false;
        }
    }

    /**
     * 拆分合并的单元格
     * @returns 是否成功
     */
    async splitMergedCells(): Promise<boolean> {
        try {
            const editor = this.getActiveEditor();
            if (!editor) {
                new Notice('未找到活动编辑器');
                return false;
            }
            
            // 获取单元格位置信息
            const cellPosition = this.getCellPosition(editor);
            if (!cellPosition) {
                new Notice('未找到表格或无法确定单元格位置，请将光标放在表格内');
                return false;
            }
            
            const { tableInfo, rowIndex, colIndex } = cellPosition;
            const lineIndex = tableInfo.startLine + rowIndex;
            
            console.log(`尝试拆分单元格: 行=${rowIndex}, 列=${colIndex}, 表格范围=${tableInfo.startLine}-${tableInfo.endLine}`);
            
            // 获取当前行
            const line = editor.getLine(lineIndex);
            if (!line) return false;
            
            let hasSplitCells = false;
            
            // 检查右侧单元格是否有合并标记
            if (colIndex + 1 < line.split('|').length - 1) {
                const cells = line.split('|');
                const rightCell = cells[colIndex + 2];
                const rightCellTrimmed = rightCell.trim();
                
                console.log(`右侧单元格内容: "${rightCellTrimmed}"`);
                
                // 检查各种可能的合并标记格式
                if (/^(<+|\^+|\\<|\\^|\s*<+\s*|\s*\^+\s*)$/.test(rightCellTrimmed)) {
                    // 拆分右侧合并单元格
                    cells[colIndex + 2] = '  '; // 替换为空白
                    
                    // 更新行
                    editor.replaceRange(
                        cells.join('|'),
                        { line: lineIndex, ch: 0 },
                        { line: lineIndex, ch: line.length }
                    );
                    
                    console.log('已拆分右侧合并单元格');
                    hasSplitCells = true;
                }
            }
            
            // 检查下方单元格是否有合并标记
            if (lineIndex < tableInfo.endLine) {
                const belowLine = editor.getLine(lineIndex + 1);
                if (belowLine) {
                    const belowCells = belowLine.split('|');
                    if (colIndex + 1 < belowCells.length) {
                        const belowCell = belowCells[colIndex + 1];
                        const belowCellTrimmed = belowCell.trim();
                        
                        console.log(`下方单元格内容: "${belowCellTrimmed}"`);
                        
                        // 检查各种可能的合并标记格式
                        if (/^(<+|\^+|\\<|\\^|\s*<+\s*|\s*\^+\s*)$/.test(belowCellTrimmed)) {
                            // 拆分下方合并单元格
                            belowCells[colIndex + 1] = '  '; // 替换为空白
                            
                            // 更新行
                            editor.replaceRange(
                                belowCells.join('|'),
                                { line: lineIndex + 1, ch: 0 },
                                { line: lineIndex + 1, ch: belowLine.length }
                            );
                            
                            console.log('已拆分下方合并单元格');
                            hasSplitCells = true;
                        }
                    }
                }
            }
            
            // 检查当前单元格是否是合并主单元格（即右侧或下方有合并标记）
            // 这种情况下我们需要递归查找所有关联的合并单元格
            const recursiveSplit = await this.recursiveSplitMergedCells(editor, tableInfo, rowIndex, colIndex);
            if (recursiveSplit) {
                hasSplitCells = true;
            }
            
            if (hasSplitCells) {
                new Notice('已成功拆分合并单元格');
                return true;
            } else {
                new Notice('未找到可拆分的合并单元格，请确保光标位于合并单元格内');
                return false;
            }
        } catch (error) {
            console.error('拆分合并单元格时出错:', error);
            new Notice(`拆分合并单元格失败: ${error.message || '未知错误'}`);
            return false;
        }
    }

    /**
     * 递归拆分合并单元格
     * 查找与当前单元格相关的所有合并单元格并拆分它们
     * @param editor 编辑器实例
     * @param tableInfo 表格信息
     * @param rowIndex 行索引
     * @param colIndex 列索引
     * @returns 是否进行了拆分
     */
    private async recursiveSplitMergedCells(
        editor: Editor, 
        tableInfo: { startLine: number, endLine: number, content: string, tableId?: string },
        rowIndex: number, 
        colIndex: number
    ): Promise<boolean> {
        let hasSplitCells = false;
        const maxSearchDepth = 10; // 防止无限递归
        
        // 向右搜索合并标记
        for (let col = colIndex + 1; col < colIndex + maxSearchDepth; col++) {
            const lineIndex = tableInfo.startLine + rowIndex;
            const line = editor.getLine(lineIndex);
            if (!line) break;
            
            const cells = line.split('|');
            if (col + 1 >= cells.length) break;
            
            const cellContent = cells[col + 1].trim();
            // 使用正则表达式检查是否为合并标记（支持多个连续的<标记）
            if (/^(<+|\^+|\\<|\\^|\s*<+\s*|\s*\^+\s*)$/.test(cellContent)) {
                // 拆分该单元格
                cells[col + 1] = '  ';
                editor.replaceRange(
                    cells.join('|'),
                    { line: lineIndex, ch: 0 },
                    { line: lineIndex, ch: line.length }
                );
                hasSplitCells = true;
                console.log(`已拆分位于 (${rowIndex}, ${col}) 的水平合并单元格`);
            } else {
                // 如果遇到非合并标记，停止搜索
                break;
            }
        }
        
        // 向下搜索合并标记
        for (let row = rowIndex + 1; row < rowIndex + maxSearchDepth && row + tableInfo.startLine <= tableInfo.endLine; row++) {
            const lineIndex = tableInfo.startLine + row;
            const line = editor.getLine(lineIndex);
            if (!line) break;
            
            const cells = line.split('|');
            if (colIndex + 1 >= cells.length) break;
            
            const cellContent = cells[colIndex + 1].trim();
            // 使用正则表达式检查是否为合并标记（支持多个连续的^标记）
            if (/^(<+|\^+|\\<|\\^|\s*<+\s*|\s*\^+\s*)$/.test(cellContent)) {
                // 拆分该单元格
                cells[colIndex + 1] = '  ';
                editor.replaceRange(
                    cells.join('|'),
                    { line: lineIndex, ch: 0 },
                    { line: lineIndex, ch: line.length }
                );
                hasSplitCells = true;
                console.log(`已拆分位于 (${row}, ${colIndex}) 的垂直合并单元格`);
            } else {
                // 如果遇到非合并标记，停止搜索
                break;
            }
        }
        
        return hasSplitCells;
    }

    /**
     * 获取当前光标所在表格的ID
     * @returns 表格ID或null
     */
    async getCurrentTableId(): Promise<string | null> {
        try {
            const editor = this.getActiveEditor();
            if (!editor) {
                console.warn('未找到活动编辑器');
                return null;
            }

            // 定位表格
            const tableInfo = this.locateTableInMarkdown(editor);
            if (!tableInfo) {
                console.warn('未找到表格，请将光标放在表格内');
                return null;
            }

            // 查找表格ID
            let tableId = tableInfo.tableId;
            
            // 如果tableInfo中没有ID，尝试使用checkExistingTableId查找
            if (!tableId) {
                console.log('在tableInfo中未找到ID，尝试使用checkExistingTableId查找');
                tableId = this.checkExistingTableId(editor, tableInfo.startLine) || undefined;
            }
            
            if (tableId) {
                console.log(`找到表格ID: ${tableId}`);
                return tableId;
            }

            console.warn('未找到表格ID');
            return null;
        } catch (error) {
            console.error('获取当前表格ID时出错:', error);
            return null;
        }
    }
} 