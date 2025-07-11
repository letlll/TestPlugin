// @ts-nocheck
// 上面的指令会禁用整个文件的类型检查

import { ObsidianSpreadsheet } from './main';
import { App, TFile, Notice } from 'obsidian';
import * as JSON5 from 'json5';
import { TableFeature } from './types';

/**
 * 表格ID管理器 - 负责表格ID的生成、获取、解析和持久化
 */
export class TableIdManager {
    private plugin: ObsidianSpreadsheet;
    private static isProcessingTableId: boolean = false;
    private static isCreatingTableId: boolean = false;

    constructor(plugin: ObsidianSpreadsheet) {
        this.plugin = plugin;
        console.log('TableIdManager initialized');
    }

    /**
     * 获取表格标识符
     * @param table 表格HTML元素
     * @param useFallback 是否在未找到HTML注释ID时使用其他ID来源
     * @returns 表格ID或null
     */
    getTableIdentifier(table: HTMLElement, useFallback: boolean = false): string | null {
        try {
            if (TableIdManager.isProcessingTableId) return null;
            TableIdManager.isProcessingTableId = true;
            
            console.log('开始获取表格ID');
            
            // 1. 首先从表格DOM属性获取当前ID（仅用于日志和比较）
            const currentDomId = table.getAttribute('data-table-id');
            if (currentDomId) {
                console.log(`表格当前DOM属性ID: ${currentDomId}`);
            }
            
            // 2. 提取表格特征用于验证
            const tableFeature = this.extractTableFeature(table);
            if (tableFeature) {
                console.log(`提取的表格特征:`, tableFeature);
            }
            
            // 3. 从HTML注释中获取ID（最高优先级）
            let commentId = this.getTableIdFromComment(table);
            
            // 4. 比较DOM属性ID和HTML注释ID
            if (commentId) {
                console.log(`从HTML注释获取到表格ID: ${commentId}`);
                
                // 如果DOM属性ID与HTML注释ID不匹配，更新DOM属性
                if (currentDomId && currentDomId !== commentId) {
                    console.log(`警告: DOM中的ID(${currentDomId})与HTML注释中的ID(${commentId})不匹配`);
                    console.log(`正在更新DOM属性，使用HTML注释中的ID: ${commentId}`);
                    table.setAttribute('data-table-id', commentId);
                } else if (!currentDomId) {
                    // 如果DOM没有ID属性，设置它
                    console.log(`设置DOM属性ID: ${commentId}`);
                    table.setAttribute('data-table-id', commentId);
                }
                
                // 设置表格特征属性
                if (tableFeature) {
                    table.setAttribute('data-table-feature', JSON.stringify(tableFeature));
                }
                
                TableIdManager.isProcessingTableId = false;
                return commentId;
            }
            
            // 5. 如果没有找到HTML注释ID，但允许回退，则使用DOM属性ID
            if (useFallback && currentDomId) {
                console.log(`未在HTML注释中找到表格ID，回退使用DOM属性ID: ${currentDomId}`);
                
                // 设置表格特征属性
                if (tableFeature) {
                    table.setAttribute('data-table-feature', JSON.stringify(tableFeature));
                }
                
                TableIdManager.isProcessingTableId = false;
                return currentDomId;
            }
            
            // 6. 如果没有找到HTML注释ID，且不允许回退或DOM中没有ID，则不返回任何ID
            console.log('未在HTML注释中找到表格ID，不使用其他ID来源');
            
            // 7. 如果DOM中有ID但没有找到HTML注释ID且不允许回退，清除DOM中的ID以避免混淆
            if (!useFallback && currentDomId) {
                console.log(`警告: 表格DOM中有ID(${currentDomId})，但未在HTML注释中找到对应ID`);
                console.log('清除DOM中的ID属性，以避免使用过时或不正确的ID');
                table.removeAttribute('data-table-id');
            }
            
            TableIdManager.isProcessingTableId = false;
            return null;
        } catch (error) {
            console.error('获取表格ID时出错:', error);
            TableIdManager.isProcessingTableId = false;
            return null;
        }
    }

    /**
     * 获取或创建表格ID
     * @param table 表格HTML元素
     * @returns 表格ID
     */
    getOrCreateTableId(table: HTMLElement): string {
        try {
            if (TableIdManager.isCreatingTableId) return '';
            TableIdManager.isCreatingTableId = true;

            // 尝试获取HTML注释中的ID，如果没有则回退到DOM属性ID
            let tableId = this.getTableIdentifier(table, true);

            // 如果没有ID，则返回空字符串，但提示用户可以创建ID
            if (!tableId) {
                console.log('未找到表格ID，可以使用confirmAndCreateTableId方法创建新ID');
                new Notice('未找到表格ID，请使用表格工具栏中的"设置表格ID"功能创建新ID');
            }

            TableIdManager.isCreatingTableId = false;
            return tableId || '';
        } catch (error) {
            console.error('获取表格ID时出错:', error);
            TableIdManager.isCreatingTableId = false;
            return '';
        }
    }

    /**
     * 确认并创建表格ID
     * @param table 表格HTML元素
     * @returns 创建的表格ID
     */
    confirmAndCreateTableId(table: HTMLElement): string {
        try {
            // 先检查是否已有ID
            const existingId = this.getTableIdentifier(table, true);
            if (existingId) {
                console.log(`表格已有ID: ${existingId}，不需要创建新ID`);
                new Notice(`表格已有ID: ${existingId}`);
                return existingId;
            }
            
            // 生成新ID
            const newId = this.generateTableId();
            console.log(`为表格生成新ID: ${newId}`);
            
            // 添加ID注释
            this.addTableIdComment(table, newId);
            
            // 返回新ID
            return newId;
        } catch (error) {
            console.error('确认并创建表格ID时出错:', error);
            return '';
        }
    }

    /**
     * 从HTML注释中获取表格ID
     * @param table 表格HTML元素
     * @returns 表格ID或null
     */
    private getTableIdFromComment(table: HTMLElement): string | null {
        try {
            console.log('开始从HTML注释中查找表格ID');
            console.log('表格DOM:', table.outerHTML.substring(0, 100) + '...');
            
            // 尝试从Markdown文件内容中查找表格ID
            // 这是一个更可靠的方法，因为它不依赖于DOM结构
            try {
                // 获取当前活动文件
                const activeFile = this.plugin.app.workspace.getActiveFile();
                if (activeFile) {
                    console.log(`尝试从文件内容中查找表格ID: ${activeFile.path}`);
                    
                    // 获取表格在DOM中的位置信息
                    const tablePosition = this.getTablePositionInDOM(table);
                    if (tablePosition) {
                        console.log(`表格位置: 第${tablePosition.index}个表格`);
                        
                        // 读取文件内容并处理
                        this.plugin.app.vault.read(activeFile).then(content => {
                            // 分析文件内容，查找表格和对应的ID
                            const tableInfos = this.extractTableIdsFromMarkdown(content);
                            console.log(`从Markdown内容中提取的表格ID:`, tableInfos);
                            
                            // 如果找到了对应位置的表格ID，使用它
                            if (tableInfos.length > tablePosition.index) {
                                const { id } = tableInfos[tablePosition.index];
                                if (id) {
                                    console.log(`从Markdown内容中找到表格ID: ${id}`);
                                    // 将ID设置到表格DOM属性中
                                    table.setAttribute('data-table-id', id);
                                    return id;
                                }
                            }
                        }).catch(err => {
                            console.error('读取文件内容时出错:', err);
                        });
                    }
                }
            } catch (error) {
                console.error('从文件内容查找表格ID时出错:', error);
            }
            
            // 检查表格前面的注释节点
            let node = table.previousSibling;
            let nodeCount = 0;
            
            console.log('开始遍历前置节点...');
            
            // 遍历前面的所有节点，直到找到表格ID或达到最大检查数量
            while (node && nodeCount < 30) { // 增加检查节点数量到30个，进一步提高查找范围
                nodeCount++;
                
                // 记录节点类型和内容
                const nodeType = node.nodeType;
                const nodeTypeStr = nodeType === Node.COMMENT_NODE ? 'COMMENT' : 
                                   nodeType === Node.TEXT_NODE ? 'TEXT' : 
                                   nodeType === Node.ELEMENT_NODE ? 'ELEMENT' : 'OTHER';
                
                console.log(`检查节点 #${nodeCount}: 类型=${nodeTypeStr}`);
                
                // 检查注释节点
                if (nodeType === Node.COMMENT_NODE) {
                    const commentText = node.textContent?.trim() || '';
                    console.log(`发现注释节点: "${commentText}"`);
                    
                    // 匹配表格开始注释
                    const beginMatch = commentText.match(/table-begin:\s*([a-zA-Z0-9_\-:.]+)/i);
                    if (beginMatch && beginMatch[1]) {
                        const commentId = beginMatch[1];
                        console.log(`从表格开始注释中识别表格ID: ${commentId}`);
                        return commentId;
                    }
                    
                    // 匹配多种可能的格式，更宽松的正则表达式
                    // 1. <!-- table-id: xxx -->
                    // 2. <!-- table-id:xxx -->
                    // 3. <!--table-id: xxx-->
                    // 4. <!--table-id:xxx-->
                    const idMatch = commentText.match(/table[-_]?id:?\s*([a-zA-Z0-9_\-:.]+)/i);
                    if (idMatch && idMatch[1]) {
                        const commentId = idMatch[1];
                        console.log(`从HTML注释中成功识别表格ID: ${commentId}`);
                        return commentId;
                    }
                    
                    // 尝试其他可能的格式
                    // 5. <!-- id: xxx -->
                    const altIdMatch = commentText.match(/id:?\s*([a-zA-Z0-9_\-:.]+)/i);
                    if (altIdMatch && altIdMatch[1]) {
                        const commentId = altIdMatch[1];
                        console.log(`从替代格式HTML注释中识别表格ID: ${commentId}`);
                        return commentId;
                    }
                    
                    // 6. <!-- tbl: xxx --> 或 <!-- table: xxx -->
                    const tblMatch = commentText.match(/(tbl|table):?\s*([a-zA-Z0-9_\-:.]+)/i);
                    if (tblMatch && tblMatch[2]) {
                        const commentId = tblMatch[2];
                        console.log(`从tbl/table格式HTML注释中识别表格ID: ${commentId}`);
                        return commentId;
                    }
                } else if (nodeType === Node.TEXT_NODE) {
                    // 如果是文本节点，检查是否包含HTML注释
                    const textContent = node.textContent || '';
                    console.log(`文本节点内容: "${textContent.substring(0, 30)}${textContent.length > 30 ? '...' : ''}"`);
                    
                    // 检查文本中是否包含HTML注释格式的ID
                    const htmlCommentMatch = textContent.match(/<!--\s*table[-_]?id:?\s*([a-zA-Z0-9_\-:.]+)\s*-->/i);
                    if (htmlCommentMatch && htmlCommentMatch[1]) {
                        const commentId = htmlCommentMatch[1];
                        console.log(`从文本节点中的HTML注释识别表格ID: ${commentId}`);
                        return commentId;
                    }
                    
                    // 检查替代格式
                    const altHtmlCommentMatch = textContent.match(/<!--\s*id:?\s*([a-zA-Z0-9_\-:.]+)\s*-->/i);
                    if (altHtmlCommentMatch && altHtmlCommentMatch[1]) {
                        const commentId = altHtmlCommentMatch[1];
                        console.log(`从文本节点中的替代HTML注释识别表格ID: ${commentId}`);
                        return commentId;
                    }
                    
                    // 检查tbl/table格式
                    const tblHtmlCommentMatch = textContent.match(/<!--\s*(tbl|table):?\s*([a-zA-Z0-9_\-:.]+)\s*-->/i);
                    if (tblHtmlCommentMatch && tblHtmlCommentMatch[2]) {
                        const commentId = tblHtmlCommentMatch[2];
                        console.log(`从文本节点中的tbl/table HTML注释识别表格ID: ${commentId}`);
                        return commentId;
                    }
                    
                    if (textContent.trim() === '') {
                        // 空白节点，继续检查前一个节点
                        node = node.previousSibling;
                        continue;
                    }
                } else if (nodeType === Node.ELEMENT_NODE) {
                    // 如果是元素节点，记录标签名
                    const tagName = (node as Element).tagName;
                    console.log(`元素节点: <${tagName.toLowerCase()}>`);
                    
                    // 检查元素的data-id属性
                    const elemDataId = (node as Element).getAttribute('data-id') || (node as Element).getAttribute('data-table-id');
                    if (elemDataId) {
                        console.log(`从元素属性中找到ID: ${elemDataId}`);
                        return elemDataId;
                    }
                    
                    // 检查元素内容是否包含HTML注释
                    const elemContent = (node as Element).innerHTML || '';
                    if (elemContent.includes('<!--') && elemContent.includes('-->')) {
                        console.log(`元素内容包含HTML注释: "${elemContent.substring(0, 50)}${elemContent.length > 50 ? '...' : ''}"`);
                        
                        // 检查各种格式的HTML注释
                        const htmlCommentMatch = elemContent.match(/<!--\s*table[-_]?id:?\s*([a-zA-Z0-9_\-:.]+)\s*-->/i);
                        if (htmlCommentMatch && htmlCommentMatch[1]) {
                            const commentId = htmlCommentMatch[1];
                            console.log(`从元素内容中的HTML注释识别表格ID: ${commentId}`);
                            return commentId;
                        }
                    }
                    
                    // 如果是段落、换行或分隔线，继续检查
                    if (['BR', 'HR', 'P', 'DIV', 'SPAN'].includes(tagName)) {
                        node = node.previousSibling;
                        continue;
                    }
                    
                    // 如果遇到其他元素，停止检查
                    console.log(`遇到元素节点 ${tagName}，停止查找`);
                    break;
                }
                
                // 检查前一个兄弟节点
                node = node.previousSibling;
            }
            
            // 如果没有找到，尝试检查父节点的前一个兄弟节点
            // 这对于处理嵌套在div或其他容器中的表格很有用
            if (table.parentElement) {
                console.log('尝试检查父元素及其前置节点...');
                
                // 检查父元素的data-id属性
                const parentDataId = table.parentElement.getAttribute('data-id') || table.parentElement.getAttribute('data-table-id');
                if (parentDataId) {
                    console.log(`从父元素属性中找到ID: ${parentDataId}`);
                    return parentDataId;
                }
                
                // 检查父元素的前一个兄弟节点
                if (table.parentElement.previousSibling) {
                    let parentPrevNode = table.parentElement.previousSibling;
                    if (parentPrevNode) {
                        if (parentPrevNode.nodeType === Node.COMMENT_NODE) {
                            const commentText = parentPrevNode.textContent?.trim() || '';
                            console.log(`发现父元素前的注释节点: "${commentText}"`);
                            
                            const idMatch = commentText.match(/table[-_]?id:?\s*([a-zA-Z0-9_\-:.]+)/i);
                            if (idMatch && idMatch[1]) {
                                const commentId = idMatch[1];
                                console.log(`从父元素前的HTML注释中识别表格ID: ${commentId}`);
                                return commentId;
                            }
                        } else if (parentPrevNode.nodeType === Node.TEXT_NODE) {
                            // 检查文本中是否包含HTML注释
                            const textContent = parentPrevNode.textContent || '';
                            const htmlCommentMatch = textContent.match(/<!--\s*table[-_]?id:?\s*([a-zA-Z0-9_\-:.]+)\s*-->/i);
                            if (htmlCommentMatch && htmlCommentMatch[1]) {
                                const commentId = htmlCommentMatch[1];
                                console.log(`从父元素前的文本节点中识别表格ID: ${commentId}`);
                                return commentId;
                            }
                        }
                    }
                }
                
                // 检查父元素的父元素（向上两级）
                if (table.parentElement.parentElement) {
                    const grandParentDataId = table.parentElement.parentElement.getAttribute('data-id') || 
                                             table.parentElement.parentElement.getAttribute('data-table-id');
                    if (grandParentDataId) {
                        console.log(`从祖父元素属性中找到ID: ${grandParentDataId}`);
                        return grandParentDataId;
                    }
                }
            }
            
            console.log('未在HTML注释中找到表格ID');
            return null;
        } catch (error) {
            console.error('从注释获取表格ID时出错:', error);
            return null;
        }
    }

    /**
     * 为表格添加ID注释
     * @param table 表格HTML元素
     * @param id 表格ID
     */
    private addTableIdComment(table: HTMLElement, id: string): void {
        try {
            // 获取表格特征信息
            const tableFeature = this.extractTableFeature(table);
            const featureJson = JSON.stringify(tableFeature);
            
            // 检查用户是否启用了注释夹模式
            const useWrapperComments = this.plugin.settings.useTableWrapperComments;
            
            // 先移除已有的注释（如果存在）
            const previousNode = table.previousSibling;
            if (previousNode && previousNode.nodeType === Node.COMMENT_NODE) {
                const comment = previousNode.nodeValue || '';
                if (comment.includes('table-id:') || comment.includes('table-begin:')) {
                    previousNode.parentNode?.removeChild(previousNode);
                }
            }
            
            // 检查表格后面是否有结束注释
            const nextNode = table.nextSibling;
            if (nextNode && nextNode.nodeType === Node.COMMENT_NODE) {
                const comment = nextNode.nodeValue || '';
                if (comment.includes('table-end:') || comment.includes('table-id-end:')) {
                    nextNode.parentNode?.removeChild(nextNode);
                }
            }
            
            if (useWrapperComments) {
                // 创建开始注释节点
                const beginCommentContent = `table-begin: ${id} feature: ${featureJson}`;
                const beginComment = document.createComment(` ${beginCommentContent} `);
                
                // 创建结束注释节点
                const endCommentContent = `table-end: ${id}`;
                const endComment = document.createComment(` ${endCommentContent} `);
                
                // 插入开始注释节点
                table.parentNode?.insertBefore(beginComment, table);
                
                // 插入结束注释节点（在表格后面）
                if (table.nextSibling) {
                    table.parentNode?.insertBefore(endComment, table.nextSibling);
                } else {
                    table.parentNode?.appendChild(endComment);
                }
                
                console.log(`已为表格添加注释夹: ${id} 特征:`, tableFeature);
            } else {
                // 使用传统的单一注释
                // 创建新的注释节点 - 包含表格特征
                const commentContent = `table-id: ${id} feature: ${featureJson}`;
                const comment = document.createComment(` ${commentContent} `);
                
                // 插入注释节点
                table.parentNode?.insertBefore(comment, table);
                
                console.log(`已为表格添加ID注释: ${id} 特征:`, tableFeature);
            }
            
            // 设置表格属性
            table.setAttribute('data-table-id', id);
            table.setAttribute('data-table-feature', JSON.stringify(tableFeature));
            
            new Notice(`已为表格添加ID: ${id}`);
        } catch (error) {
            console.error('添加表格ID注释时出错:', error);
        }
    }

    /**
     * 提取表格特征
     * @param table 表格HTML元素或Markdown字符串
     * @returns 表格特征对象
     */
    public extractTableFeature(table: HTMLElement | string): TableFeature {
        try {
            let rows = 0;
            let cols = 0;
            let headers = '';
            let firstRowContent = '';
            let lastRowContent = '';
            let mergePattern = '';
            let position = undefined;
            let fileInfo = undefined;
            
            // 获取当前活动文件信息
            const activeFile = this.plugin.app.workspace.getActiveFile();
            if (activeFile) {
                fileInfo = {
                    path: activeFile.path,
                    name: activeFile.basename
                };
            }

            if (typeof table === 'string') {
                // 从Markdown字符串提取特征
                const lines = table.split('\n');
                const tableLines = lines.filter(line => line.trim().startsWith('|'));
                
                rows = tableLines.length;
                if (rows > 0) {
                    const cells = tableLines[0].split('|').filter(cell => cell.trim() !== '');
                    cols = cells.length;
                    headers = cells.map(c => c.trim()).join('-');
                    firstRowContent = tableLines[0];
                    lastRowContent = tableLines[rows - 1];
                }
                
                mergePattern = this.extractMergePattern(tableLines);
                
                // 尝试找出表格在文档中的位置
                const firstLineIndex = lines.findIndex(line => line === tableLines[0]);
                if (firstLineIndex >= 0) {
                    position = {
                        startLine: firstLineIndex,
                        endLine: firstLineIndex + rows - 1
                    };
                }
            } else {
                // 从DOM元素提取特征
                const tableRows = table.querySelectorAll('tr');
                rows = tableRows.length;
                
                if (rows > 0) {
                    const firstRowCells = tableRows[0].querySelectorAll('th, td');
                    cols = firstRowCells.length;
                    headers = Array.from(firstRowCells).map(cell => cell.textContent?.trim() || '').join('-');
                    firstRowContent = tableRows[0].textContent || '';
                    lastRowContent = tableRows[rows - 1].textContent || '';
                }
                
                mergePattern = this.extractMergePatterFromDOM(table);
                
                // 尝试获取表格位置信息（如果已存储在data属性中）
                const positionData = table.getAttribute('data-table-position');
                if (positionData) {
                    try {
                        position = JSON.parse(positionData);
                    } catch (e) {
                        console.error('解析表格位置数据时出错:', e);
                    }
                }
            }

            return {
                rows,
                cols,
                headers,
                firstRowContent,
                lastRowContent,
                mergePattern,
                position,
                fileInfo
            };
        } catch (error) {
            console.error('提取表格特征时出错:', error);
            return {
                rows: 0,
                cols: 0,
                headers: '',
                firstRowContent: '',
                lastRowContent: '',
                mergePattern: ''
            };
        }
    }

    /**
     * 从Markdown内容中提取合并单元格模式
     */
    private extractMergePattern(lines: string[]): string {
        let pattern = '';
        
        // 记录 ^ 和 < 符号的位置
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const cells = line.split('|').filter(cell => cell.trim() !== '');
            
            for (let j = 0; j < cells.length; j++) {
                const cell = cells[j].trim();
                if (cell === '^') {
                    pattern += `^${i}-${j};`;
                } else if (cell === '<') {
                    pattern += `<${i}-${j};`;
                }
            }
        }
        
        return pattern;
    }

    /**
     * 从DOM中提取合并单元格模式
     */
    private extractMergePatterFromDOM(table: HTMLElement): string {
        let pattern = '';
        const rows = table.querySelectorAll('tr');
        
        for (let i = 0; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('th, td');
            for (let j = 0; j < cells.length; j++) {
                const cell = cells[j];
                const rowspan = cell.getAttribute('rowspan');
                const colspan = cell.getAttribute('colspan');
                
                if (rowspan && parseInt(rowspan) > 1) {
                    pattern += `r${i}-${j}-${rowspan};`;
                }
                if (colspan && parseInt(colspan) > 1) {
                    pattern += `c${i}-${j}-${colspan};`;
                }
            }
        }
        
        return pattern;
    }

    /**
     * 计算两个表格特征的相似度
     * @param feature1 第一个表格特征
     * @param feature2 第二个表格特征
     * @returns 相似度分数（0-1之间）
     */
    public calculateFeatureSimilarity(feature1: TableFeature, feature2: TableFeature): number {
        if (!feature1 || !feature2) return 0;
        
        let score = 0;
        let totalWeight = 0;
        
        // 1. 文件路径匹配 - 最高权重
        const pathWeight = 5;
        if (feature1.fileInfo?.path && feature2.fileInfo?.path && 
            feature1.fileInfo.path === feature2.fileInfo.path) {
            score += pathWeight;
        }
        totalWeight += pathWeight;
        
        // 2. 结构相似度（行列数）- 权重较高
        const rowWeight = 3;
        const colWeight = 3;
        if (feature1.rows === feature2.rows) {
            score += rowWeight;
        } else {
            // 部分匹配，行数相差不超过1也给部分分数
            const rowDiff = Math.abs(feature1.rows - feature2.rows);
            if (rowDiff <= 1) score += rowWeight * (1 - rowDiff / 2);
        }
        totalWeight += rowWeight;
        
        if (feature1.cols === feature2.cols) {
            score += colWeight;
        } else {
            // 部分匹配，列数相差不超过1也给部分分数
            const colDiff = Math.abs(feature1.cols - feature2.cols);
            if (colDiff <= 1) score += colWeight * (1 - colDiff / 2);
        }
        totalWeight += colWeight;
        
        // 3. 表头内容相似度 - 权重高
        const headerWeight = 4;
        if (feature1.headers && feature2.headers) {
            const headerSimilarity = this.calculateTextSimilarity(feature1.headers, feature2.headers);
            score += headerWeight * headerSimilarity;
        }
        totalWeight += headerWeight;
        
        // 4. 位置相似度 - 权重中
        const positionWeight = 2;
        if (feature1.position && feature2.position) {
            // 如果起始行相同或相差不大
            const startLineDiff = Math.abs(feature1.position.startLine - feature2.position.startLine);
            const positionSimilarity = Math.max(0, 1 - startLineDiff / 10); // 最多允许相差10行
            score += positionWeight * positionSimilarity;
        }
        totalWeight += positionWeight;
        
        // 5. 首行内容相似度 - 权重中
        const firstRowWeight = 2;
        if (feature1.firstRowContent && feature2.firstRowContent) {
            const firstRowSimilarity = this.calculateTextSimilarity(
                feature1.firstRowContent,
                feature2.firstRowContent
            );
            score += firstRowWeight * firstRowSimilarity;
        }
        totalWeight += firstRowWeight;
        
        // 6. 末行内容相似度 - 权重中
        const lastRowWeight = 2;
        if (feature1.lastRowContent && feature2.lastRowContent) {
            const lastRowSimilarity = this.calculateTextSimilarity(
                feature1.lastRowContent,
                feature2.lastRowContent
            );
            score += lastRowWeight * lastRowSimilarity;
        }
        totalWeight += lastRowWeight;
        
        // 7. 合并模式相似度 - 权重低
        const mergeWeight = 1;
        if (feature1.mergePattern && feature2.mergePattern) {
            const mergeSimilarity = this.calculateTextSimilarity(
                feature1.mergePattern,
                feature2.mergePattern
            );
            score += mergeWeight * mergeSimilarity;
        }
        totalWeight += mergeWeight;
        
        // 计算最终相似度分数（0-1之间）
        const similarity = totalWeight > 0 ? score / totalWeight : 0;
        
        console.log(`表格特征相似度: ${similarity.toFixed(2)}`);
        return similarity;
    }
    
    /**
     * 计算两个文本的相似度
     * @param str1 第一个文本
     * @param str2 第二个文本
     * @returns 相似度分数（0-1之间）
     */
    private calculateTextSimilarity(str1: string, str2: string): number {
        if (!str1 || !str2) return 0;
        if (str1 === str2) return 1;
        
        // 简单的文本相似度计算（不使用哈希）
        const maxLen = Math.max(str1.length, str2.length);
        if (maxLen === 0) return 1;
        
        let matches = 0;
        const minLen = Math.min(str1.length, str2.length);
        
        // 计算共同前缀长度
        for (let i = 0; i < minLen; i++) {
            if (str1[i] === str2[i]) matches++;
            else break;
        }
        
        // 计算共同后缀长度
        for (let i = 1; i <= minLen - matches; i++) {
            if (str1[str1.length - i] === str2[str2.length - i]) matches++;
            else break;
        }
        
        // 确保不超过minLen
        matches = Math.min(matches, minLen);
        
        return matches / maxLen;
    }

    /**
     * 获取表格在DOM中的位置
     * @param table 表格元素
     * @returns 表格位置信息或null
     */
    private getTablePositionInDOM(table: HTMLElement): { index: number, id?: string } | null {
        try {
            // 获取当前视图中的所有表格
            const allTables = Array.from(document.querySelectorAll('table'));
            
            // 1. 首先尝试通过ID直接匹配
            const tableId = table.getAttribute('data-table-id');
            if (tableId) {
                // 查找具有相同ID的表格
                for (let i = 0; i < allTables.length; i++) {
                    const currentId = allTables[i].getAttribute('data-table-id');
                    if (currentId === tableId) {
                        console.log(`通过ID匹配找到表格位置: 第${i}个表格（ID: ${tableId}）`);
                        return { index: i, id: tableId };
                    }
                }
            }
            
            // 2. 提取当前表格的特征
            const tableFeature = this.extractTableFeature(table);
            
            // 3. 尝试通过特征精确匹配
            if (tableFeature) {
                for (let i = 0; i < allTables.length; i++) {
                    const currentFeature = this.extractTableFeature(allTables[i] as HTMLElement);
                    
                    // 检查特征是否完全匹配
                    if (tableFeature.contentHash === currentFeature.contentHash && 
                        tableFeature.headers === currentFeature.headers &&
                        tableFeature.rows === currentFeature.rows &&
                        tableFeature.cols === currentFeature.cols) {
                        console.log(`通过特征精确匹配找到表格位置: 第${i}个表格`);
                        return { index: i };
                    }
                }
            }
            
            // 4. 尝试通过特征相似度匹配
            let bestMatchIndex = -1;
            let bestMatchScore = 0;
            let bestMatchId = '';
            
            for (let i = 0; i < allTables.length; i++) {
                const currentTable = allTables[i] as HTMLElement;
                const currentFeature = this.extractTableFeature(currentTable);
                const currentId = currentTable.getAttribute('data-table-id');
                
                const similarityScore = this.calculateFeatureSimilarity(tableFeature, currentFeature);
                
                if (similarityScore > bestMatchScore) {
                    bestMatchScore = similarityScore;
                    bestMatchIndex = i;
                    bestMatchId = currentId || '';
                }
            }
            
            if (bestMatchIndex !== -1 && bestMatchScore > 0.7) { // 70%相似度阈值
                console.log(`通过特征相似度匹配找到表格位置: 第${bestMatchIndex}个表格（相似度: ${bestMatchScore.toFixed(2)}）`);
                return { index: bestMatchIndex, id: bestMatchId };
            }
            
            // 5. 最后才回退到简单的索引匹配
            const index = allTables.indexOf(table as HTMLTableElement);
            
            if (index !== -1) {
                console.log(`表格在DOM中的位置: 第${index}个表格（共${allTables.length}个）`);
                return { index };
            }
            
            console.warn('无法确定表格在DOM中的位置');
            return null;
        } catch (error) {
            console.error('获取表格位置时出错:', error);
            return null;
        }
    }

    /**
     * 计算字符串的简单哈希值
     * @param str 输入字符串
     * @returns 哈希值字符串
     */
    simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32bit整数
        }
        return Math.abs(hash).toString(16).substring(0, 8);
    }

    /**
     * 确保表格有ID，如果没有则创建一个
     * @param table 表格元素
     * @param autoCreate 是否自动创建ID（不推荐，应使用confirmAndCreateTableId）
     * @returns 表格ID
     */
    ensureTableHasId(table: HTMLElement, autoCreate: boolean = false): string {
        if (!table) return '';
        
        // 获取ID，允许回退到DOM属性ID
        const tableId = this.getTableIdentifier(table, true);
        
        // 如果有ID，确保表格有数据属性
        if (tableId) {
            if (!table.getAttribute('data-table-id')) {
                table.setAttribute('data-table-id', tableId);
            }
            return tableId;
        }
        
        // 如果没有ID且允许自动创建
        if (autoCreate) {
            console.log('未找到表格ID，自动创建新ID');
            return this.confirmAndCreateTableId(table);
        }
        
        // 如果没有ID且不允许自动创建
        console.log('未找到表格ID，不自动创建ID');
        return '';
    }
    
    /**
     * 生成唯一的表格ID
     * @returns 表格ID字符串
     */
    generateTableId(): string {
        try {
            const prefix = this.plugin.settings.idPrefix || 'tbl';
            
            // 使用日期作为ID的一部分
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            
            // 使用文件信息作为ID的一部分
            const activeFile = this.plugin.app.workspace.getActiveFile();
            let fileCode = 'doc';
            if (activeFile) {
                // 使用文件名的前两个字符（如果可用）
                const fileName = activeFile.basename;
                if (fileName && fileName.length >= 2) {
                    fileCode = fileName.substring(0, 2).toLowerCase();
                }
            }
            
            // 使用随机字符串，但不使用哈希
            const randomChars = 'abcdefghijklmnopqrstuvwxyz';
            let randomStr = '';
            for (let i = 0; i < 6; i++) {
                randomStr += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
            }
            
            // 组合ID: 前缀-日期-文件代码-随机字符串
            const tableId = `${prefix}-${year}${month}${day}-${fileCode}${randomStr}`;
            
            console.log(`生成表格ID: ${tableId}`);
            return tableId;
        } catch (error) {
            console.error('生成表格ID时出错:', error);
            
            // 出错时使用备用ID生成方式
            const timestamp = new Date().getTime();
            const random = Math.floor(Math.random() * 10000);
            return `${this.plugin.settings.idPrefix || 'tbl'}-${timestamp}-${random}`;
        }
    }

    /**
     * 从Markdown内容中提取表格ID和特征
     * @param content Markdown内容
     * @returns 表格ID和特征数组
     */
    public extractTableIdsFromMarkdown(content: string): Array<{id: string, feature: TableFeature}> {
        try {
            const result: Array<{id: string, feature: TableFeature}> = [];
            const lines = content.split('\n');
            
            // 查找表格ID注释和表格内容
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // 检查是否是表格ID注释
                let tableId = '';
                let tableFeature: any = {};
                
                // 检查表格注释夹模式
                const beginMatch = line.match(/<!--\s*table-begin:\s*([a-zA-Z0-9_\-:.]+)\s*(?:feature:\s*(\{.*\}))?\s*-->/);
                if (beginMatch) {
                    tableId = beginMatch[1];
                    
                    // 尝试解析特征JSON
                    if (beginMatch[2]) {
                        try {
                            tableFeature = JSON.parse(beginMatch[2]);
                        } catch (e) {
                            console.error('解析表格特征JSON时出错:', e);
                        }
                    }
                    
                    // 查找表格内容
                    let tableContent = '';
                    let tableStartLine = -1;
                    let tableEndLine = -1;
                    
                    // 查找表格开始
                    for (let j = i + 1; j < lines.length; j++) {
                        if (lines[j].trim().startsWith('|')) {
                            tableStartLine = j;
                            break;
                        }
                    }
                    
                    // 如果找到表格开始，查找表格结束
                    if (tableStartLine >= 0) {
                        for (let j = tableStartLine; j < lines.length; j++) {
                            if (!lines[j].trim().startsWith('|')) {
                                tableEndLine = j - 1;
                                break;
                            }
                            
                            // 如果到达文件末尾
                            if (j === lines.length - 1) {
                                tableEndLine = j;
                            }
                        }
                        
                        // 提取表格内容
                        if (tableEndLine >= tableStartLine) {
                            tableContent = lines.slice(tableStartLine, tableEndLine + 1).join('\n');
                            
                            // 提取表格特征
                            const feature = this.extractTableFeature(tableContent);
                            
                            // 添加位置信息
                            feature.position = {
                                startLine: tableStartLine,
                                endLine: tableEndLine
                            };
                            
                            // 添加文件信息
                            const activeFile = this.plugin.app.workspace.getActiveFile();
                            if (activeFile) {
                                feature.fileInfo = {
                                    path: activeFile.path,
                                    name: activeFile.basename
                                };
                            }
                            
                            // 合并提取的特征与注释中的特征
                            const mergedFeature = { ...feature, ...tableFeature, id: tableId };
                            
                            // 添加到结果
                            result.push({
                                id: tableId,
                                feature: mergedFeature
                            });
                        }
                    }
                    
                    // 继续查找下一个表格
                    continue;
                }
                
                // 检查标准表格ID注释
                const idMatch = line.match(/<!--\s*table-id:\s*([a-zA-Z0-9_\-:.]+)\s*(?:feature:\s*(\{.*\}))?\s*-->/);
                if (idMatch) {
                    tableId = idMatch[1];
                    
                    // 尝试解析特征JSON
                    if (idMatch[2]) {
                        try {
                            tableFeature = JSON.parse(idMatch[2]);
                        } catch (e) {
                            console.error('解析表格特征JSON时出错:', e);
                        }
                    }
                    
                    // 查找表格内容
                    let tableContent = '';
                    let tableStartLine = -1;
                    let tableEndLine = -1;
                    
                    // 查找表格开始
                    for (let j = i + 1; j < lines.length; j++) {
                        if (lines[j].trim().startsWith('|')) {
                            tableStartLine = j;
                            break;
                        }
                    }
                    
                    // 如果找到表格开始，查找表格结束
                    if (tableStartLine >= 0) {
                        for (let j = tableStartLine; j < lines.length; j++) {
                            if (!lines[j].trim().startsWith('|')) {
                                tableEndLine = j - 1;
                                break;
                            }
                            
                            // 如果到达文件末尾
                            if (j === lines.length - 1) {
                                tableEndLine = j;
                            }
                        }
                        
                        // 提取表格内容
                        if (tableEndLine >= tableStartLine) {
                            tableContent = lines.slice(tableStartLine, tableEndLine + 1).join('\n');
                            
                            // 提取表格特征
                            const feature = this.extractTableFeature(tableContent);
                            
                            // 添加位置信息
                            feature.position = {
                                startLine: tableStartLine,
                                endLine: tableEndLine
                            };
                            
                            // 添加文件信息
                            const activeFile = this.plugin.app.workspace.getActiveFile();
                            if (activeFile) {
                                feature.fileInfo = {
                                    path: activeFile.path,
                                    name: activeFile.basename
                                };
                            }
                            
                            // 合并提取的特征与注释中的特征
                            const mergedFeature = { ...feature, ...tableFeature, id: tableId };
                            
                            // 添加到结果
                            result.push({
                                id: tableId,
                                feature: mergedFeature
                            });
                        }
                    }
                }
            }
            
            return result;
        } catch (error) {
            console.error('从Markdown内容提取表格ID时出错:', error);
            return [];
        }
    }
} 