// @ts-nocheck
// 上面的指令会禁用整个文件的类型检查

import { ObsidianSpreadsheet } from './main';
import { App, TFile, Notice } from 'obsidian';
import * as JSON5 from 'json5';

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
     * @returns 表格ID或null
     */
    getTableIdentifier(table: HTMLElement): string | null {
        try {
            if (TableIdManager.isProcessingTableId) return null;
            TableIdManager.isProcessingTableId = true;
            
            console.log('开始获取表格ID');
            
            // 策略1: 首先检查HTML注释中的ID（最高优先级）
            let tableId = this.getTableIdFromComment(table);
            if (tableId) {
                console.log(`从HTML注释获取到表格ID: ${tableId}`);
                
                // 强制将HTML注释中的ID绑定到DOM元素上
                const currentDomId = table.getAttribute('data-table-id');
                if (currentDomId !== tableId) {
                    console.log(`DOM中的ID(${currentDomId})与HTML注释中的ID(${tableId})不匹配，正在更新DOM属性`);
                    table.setAttribute('data-table-id', tableId);
                }
                
                TableIdManager.isProcessingTableId = false;
                return tableId;
            }
            
            // 如果没有找到HTML注释ID，则不返回任何ID
            console.log('未在HTML注释中找到表格ID，不使用其他ID来源');
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

            // 只尝试获取HTML注释中的ID，不创建新ID
            let tableId = this.getTableIdentifier(table);

            // 如果没有ID，则返回空字符串
            if (!tableId) {
                console.log('未找到HTML注释中的表格ID，不自动生成新ID');
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
     * 从HTML注释中获取表格ID
     * @param table 表格HTML元素
     * @returns 表格ID或null
     */
    private getTableIdFromComment(table: HTMLElement): string | null {
        try {
            console.log('开始从HTML注释中查找表格ID');
            console.log('表格DOM:', table.outerHTML.substring(0, 100) + '...');
            
            // 直接检查表格自身的data-id属性（可能由Obsidian渲染时添加）
            const dataId = table.getAttribute('data-id') || table.getAttribute('data-table-id');
            if (dataId) {
                console.log(`从表格属性中找到ID: ${dataId}`);
                return dataId;
            }
            
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
                            const tableIds = this.extractTableIdsFromMarkdown(content);
                            console.log(`从Markdown内容中提取的表格ID:`, tableIds);
                            
                            // 如果找到了对应位置的表格ID，使用它
                            if (tableIds.length > tablePosition.index) {
                                const id = tableIds[tablePosition.index];
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
            // 先移除已有的注释（如果存在）
            const previousNode = table.previousSibling;
            if (previousNode && previousNode.nodeType === Node.COMMENT_NODE) {
                const comment = previousNode.nodeValue || '';
                if (comment.includes('table-id:')) {
                    previousNode.parentNode?.removeChild(previousNode);
                }
            }
            
            // 创建新的注释节点 - 使用简化格式
            const commentContent = `table-id: ${id}`;
            const comment = document.createComment(` ${commentContent} `);
            
            // 插入注释节点
            table.parentNode?.insertBefore(comment, table);
            
            // 设置表格属性
            table.setAttribute('data-table-id', id);
            
            console.log(`已为表格添加ID注释: ${id}`);
            new Notice(`已为表格添加ID: ${id}`);
        } catch (error) {
            console.error('添加表格ID注释时出错:', error);
        }
    }

    /**
     * 生成新的表格ID
     * @returns 生成的表格ID
     */
    generateTableId(): string {
        try {
            const prefix = this.plugin.settings.idPrefix || 'tbl';
            const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const randomId = Math.random().toString(36).substring(2, 8);
            return `${prefix}-${timestamp}-${randomId}`;
        } catch (error) {
            console.error('生成表格ID时出错:', error);
            return `tbl-${Date.now()}`;
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
     * @returns 表格ID
     */
    ensureTableHasId(table: HTMLElement): string {
        if (!table) return '';
        
        // 只获取HTML注释中的ID，不创建新ID
        const tableId = this.getTableIdentifier(table);
        
        // 如果没有ID，则返回空字符串
        if (!tableId) {
            console.log('未找到HTML注释中的表格ID，不自动创建ID');
            return '';
        }
        
        // 确保表格有数据属性
        if (!table.getAttribute('data-table-id')) {
            table.setAttribute('data-table-id', tableId);
        }
        
        return tableId;
    }
    
    /**
     * 获取表格在DOM中的位置信息
     * @param table 表格元素
     * @returns 位置信息或null
     */
    private getTablePositionInDOM(table: HTMLElement): { index: number } | null {
        try {
            // 获取页面中所有表格
            const allTables = Array.from(document.querySelectorAll('table'));
            
            // 找到当前表格的索引
            const index = allTables.indexOf(table as HTMLTableElement);
            
            if (index !== -1) {
                return { index };
            }
            
            return null;
        } catch (error) {
            console.error('获取表格位置信息时出错:', error);
            return null;
        }
    }

    /**
     * 从Markdown内容中提取表格ID
     * @param content Markdown内容
     * @returns 表格ID数组
     */
    private extractTableIdsFromMarkdown(content: string): string[] {
        try {
            const tableIds: string[] = [];
            const lines = content.split('\n');
            
            // 查找所有表格和对应的ID
            for (let i = 0; i < lines.length; i++) {
                // 检查是否是表格开始行
                if (lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
                    // 检查是否是表格的第一行（有分隔行）
                    if (i + 1 < lines.length && lines[i + 1].trim().match(/^\|[-:\s|]*\|$/)) {
                        // 向上查找ID注释
                        let idFound = false;
                        for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
                            const line = lines[j].trim();
                            
                            // 检查各种ID格式
                            const idMatch = line.match(/<!--\s*table[-_]?id:?\s*([a-zA-Z0-9_\-:.]+)\s*-->/i) || 
                                        line.match(/<!--\s*id:?\s*([a-zA-Z0-9_\-:.]+)\s*-->/i) ||
                                        line.match(/<!--\s*(tbl|table):?\s*([a-zA-Z0-9_\-:.]+)\s*-->/i);
                            
                            if (idMatch) {
                                // 提取ID
                                const id = idMatch[1] || idMatch[2];
                                tableIds.push(id);
                                idFound = true;
                                break;
                            }
                            
                            // 如果遇到非空行且不是注释行，则停止搜索
                            if (line !== '' && !line.startsWith('<!--') && !line.startsWith('//')) {
                                break;
                            }
                        }
                        
                        // 如果没有找到ID，添加null作为占位符
                        if (!idFound) {
                            tableIds.push(null);
                        }
                    }
                }
            }
            
            return tableIds;
        } catch (error) {
            console.error('从Markdown内容提取表格ID时出错:', error);
            return [];
        }
    }
} 