import { App, Plugin, TFile, MarkdownView } from 'obsidian';
import { TableData, TableLocation, TableStructure, TableStyling, TableFeature } from './types';
import { ObsidianSpreadsheet } from './main';

/**
 * 表格数据提取器
 * 用于从Markdown文件中提取表格数据
 */
export class TableDataExtractor {
    private plugin: ObsidianSpreadsheet;

    constructor(plugin: ObsidianSpreadsheet) {
        this.plugin = plugin;
    }
    
    // 辅助方法，获取app对象
    private getApp(): App {
        return (this.plugin as unknown as Plugin).app;
    }

    /**
     * 从文件中提取表格数据
     * @param file 文件对象
     * @returns 表格数据对象，键为表格ID
     */
    async extractTableDataFromFile(file: TFile): Promise<Record<string, TableData>> {
        try {
            // 读取文件内容
            const fileContent = await this.getApp().vault.read(file);
            
            // 存储提取的表格数据
            const result: Record<string, TableData> = {};
            
            // 匹配JSON格式的表格数据代码块
            const jsonCodeBlockRegex = /```json:table-data\s*\n([\s\S]*?)\n```/g;
            let jsonMatch;
            
            while ((jsonMatch = jsonCodeBlockRegex.exec(fileContent)) !== null) {
                try {
                    const jsonStr = jsonMatch[1].trim();
                    const jsonData = JSON.parse(jsonStr);
                    
                    // 处理数组或单个对象
                    if (Array.isArray(jsonData)) {
                        // 处理数组形式的表格数据
                        for (const tableData of jsonData) {
                            if (tableData.id) {
                                this.processTableDataObject(tableData, result);
                            }
                        }
                    } else if (jsonData.id) {
                        // 处理单个表格数据对象
                        this.processTableDataObject(jsonData, result);
                    }
                } catch (error) {
                    console.error('解析JSON表格数据代码块时出错:', error);
                }
            }
            
            // 匹配CSV格式的表格数据代码块
            const csvCodeBlockRegex = /```csv:table-data\s*\n([\s\S]*?)\n```/g;
            let csvMatch;
            
            while ((csvMatch = csvCodeBlockRegex.exec(fileContent)) !== null) {
                try {
                    const csvStr = csvMatch[1].trim();
                    const csvLines = csvStr.split('\n');
                    
                    if (csvLines.length > 1) {
                        // 第一行作为表头
                        const headers = csvLines[0].split(',');
                        
                        // 处理每一行数据
                        for (let i = 1; i < csvLines.length; i++) {
                            const values = csvLines[i].split(',');
                            const tableData: any = {};
                            
                            // 将CSV行转换为对象
                            for (let j = 0; j < headers.length && j < values.length; j++) {
                                if (values[j]) {
                                    try {
                                        // 尝试解析JSON字段
                                        tableData[headers[j]] = JSON.parse(values[j]);
                                    } catch {
                                        // 如果不是JSON，则作为字符串处理
                                        tableData[headers[j]] = values[j];
                                    }
                                }
                            }
                            
                            if (tableData.id) {
                                this.processTableDataObject(tableData, result);
                            }
                        }
                    }
                } catch (error) {
                    console.error('解析CSV表格数据代码块时出错:', error);
                }
            }
            
            // 匹配自定义格式 ```table-data 代码块
            const customCodeBlockRegex = /```table-data\s*\n([\s\S]*?)\n```/g;
            let customMatch;
            
            while ((customMatch = customCodeBlockRegex.exec(fileContent)) !== null) {
                try {
                    const customStr = customMatch[1].trim();
                    const customLines = customStr.split('\n');
                    
                    // 处理每一行自定义格式数据
                    for (const line of customLines) {
                        const tableData = this.parseCustomTableDataFormat(line);
                        if (tableData && tableData.id) {
                            result[tableData.id] = tableData;
                        }
                    }
                } catch (error) {
                    console.error('解析自定义表格数据代码块时出错:', error);
                }
            }
            
            // 从HTML注释中提取表格ID和数据
            this.extractTableDataFromComments(fileContent, result);
            
            return result;
        } catch (error) {
            console.error('从文件提取表格数据时出错:', error);
            return {};
        }
    }
    
    /**
     * 从HTML注释中提取表格ID和数据
     * @param fileContent 文件内容
     * @param result 结果对象
     */
    private extractTableDataFromComments(fileContent: string, result: Record<string, TableData>): void {
        try {
            // 匹配HTML注释中的表格ID和数据
            // 格式: <!-- table-id: ID | key1: value1 | key2: value2 -->
            const commentRegex = /<!--\s*table-id:\s*([\w-]+)(?:\s*\|\s*([^>]*))?\s*-->/g;
            let match;
            
            while ((match = commentRegex.exec(fileContent)) !== null) {
                const tableId = match[1].trim();
                const dataString = match[2] ? match[2].trim() : null;
                
                if (tableId && dataString) {
                    // 解析注释中的数据
                    const tableData = this.parseCustomTableDataFormat(`${tableId}|${dataString}`);
                    if (tableData && tableData.id) {
                        result[tableData.id] = tableData;
                    }
                } else if (tableId && !result[tableId]) {
                    // 如果只有ID没有数据，且结果中还没有这个ID的数据，创建一个空的表格数据结构
                    result[tableId] = this.createEmptyTableData(tableId);
                }
            }
        } catch (error) {
            console.error('从HTML注释提取表格数据时出错:', error);
        }
    }
    
    /**
     * 创建空的表格数据结构
     * @param tableId 表格ID
     * @returns 表格数据对象
     */
    private createEmptyTableData(tableId: string): TableData {
        return {
            id: tableId,
            locations: [],
            structure: {
                rowCount: 0,
                colCount: 0,
                hasHeaders: false
            },
            styling: {
                rowHeights: [],
                colWidths: [],
                alignment: []
            }
        };
    }
    
    /**
     * 处理表格数据对象
     * @param tableData 表格数据对象
     * @param result 结果对象
     */
    private processTableDataObject(tableData: any, result: Record<string, TableData>): void {
        try {
            // 确保数据结构完整
            if (!tableData.structure) {
                tableData.structure = {
                    rowCount: 0,
                    colCount: 0,
                    hasHeaders: false
                };
            }
            
            if (!tableData.styling) {
                tableData.styling = {
                    rowHeights: [],
                    colWidths: [],
                    alignment: []
                };
            }
            
            if (!tableData.locations) {
                tableData.locations = [];
            }
            
            // 添加到结果对象
            result[tableData.id] = tableData;
        } catch (error) {
            console.error('处理表格数据对象时出错:', error);
        }
    }
    
    /**
     * 解析自定义表格数据格式
     * 格式: tableId|key1:value1|key2:value2,...
     * @param line 自定义格式数据行
     * @returns 表格数据对象
     */
    parseCustomTableDataFormat(line: string): TableData | null {
        try {
            const parts = line.split('|');
            if (parts.length < 1) return null;
            
            // 第一部分是表格ID
            const tableId = parts[0].trim();
            if (!tableId) return null;
            
            // 创建表格数据对象
            const tableData: TableData = this.createEmptyTableData(tableId);
            
            console.log(`解析自定义表格数据格式: ${line} 表格ID: ${tableId}`);
            
            // 解析其余部分作为键值对
            for (let i = 1; i < parts.length; i++) {
                const keyValue = parts[i].split(':');
                if (keyValue.length !== 2) continue;
                
                const key = keyValue[0].trim();
                const value = keyValue[1].trim();
                
                console.log(`处理键值对: ${key}:${value}`);
                
                // 根据键名处理不同类型的值
                switch (key) {
                    case 'wrapper':
                        // 表格包装器设置
                        tableData.structure.useTableWrapper = value === 'true';
                        console.log(`设置表格 ${tableId} 包装器: ${value}`);
                        break;
                    
                    case 'width':
                        // 列宽设置，格式: width:col1,col2,col3,...
                        tableData.styling.colWidths = value.split(',').map(w => w.trim());
                        console.log(`设置表格 ${tableId} 列宽: ${tableData.styling.colWidths.join(', ')}`);
                        break;
                    
                    case 'align':
                        // 对齐方式设置，格式: align:left,center,right,...
                        tableData.styling.alignment = value.split(',').map(a => a.trim());
                        console.log(`设置表格 ${tableId} 对齐方式: ${tableData.styling.alignment.join(', ')}`);
                        break;
                    
                    case 'height':
                        // 行高设置，格式: height:row1,row2,row3,...
                        tableData.styling.rowHeights = value.split(',').map(h => h.trim());
                        console.log(`设置表格 ${tableId} 行高: ${tableData.styling.rowHeights.join(', ')}`);
                        break;
                    
                    // 可以添加更多自定义属性的处理
                }
            }
            
            console.log(`解析完成的表格数据 ${tableId}:`, tableData);
            return tableData;
        } catch (error) {
            console.error('解析自定义表格数据格式时出错:', error);
            return null;
        }
    }
    
    /**
     * 完善表格数据，根据实际表格内容自动填充缺失的结构信息
     * @param table 表格元素
     * @param tableData 表格数据
     * @returns 完善后的表格数据
     */
    enhanceTableData(table: HTMLElement, tableData: TableData): TableData {
        // 创建一个新的表格数据对象，避免修改原始对象
        const enhancedData: TableData = JSON.parse(JSON.stringify(tableData));
        
        // 获取表格的行和列数
        const rows = table.querySelectorAll('tr');
        const rowCount = rows.length;
        let colCount = 0;
        
        // 检查是否有表头
        const hasHeaderRow = table.querySelector('thead') !== null;
        
        // 计算最大列数
        rows.forEach(row => {
            const cellCount = row.querySelectorAll('td, th').length;
            colCount = Math.max(colCount, cellCount);
        });
        
        // 更新结构信息
        if (!enhancedData.structure.rowCount || enhancedData.structure.rowCount === 0) {
            enhancedData.structure.rowCount = rowCount;
        }
        
        if (!enhancedData.structure.colCount || enhancedData.structure.colCount === 0) {
            enhancedData.structure.colCount = colCount;
        }
        
        if (enhancedData.structure.hasHeaders === undefined) {
            enhancedData.structure.hasHeaders = hasHeaderRow;
        }
        
        // 确保样式数组长度匹配
        if (!enhancedData.styling.rowHeights || enhancedData.styling.rowHeights.length === 0) {
            enhancedData.styling.rowHeights = Array(rowCount).fill('auto');
        }
        
        if (!enhancedData.styling.colWidths || enhancedData.styling.colWidths.length === 0) {
            enhancedData.styling.colWidths = Array(colCount).fill('auto');
        }
        
        if (!enhancedData.styling.alignment || enhancedData.styling.alignment.length === 0) {
            // 默认第一列左对齐，其余右对齐
            enhancedData.styling.alignment = Array(colCount).fill('right');
            if (colCount > 0) enhancedData.styling.alignment[0] = 'left';
        }
        
        return enhancedData;
    }
    
    /**
     * 将表格数据导出到Markdown文件
     * @param file 文件对象
     * @param tableId 表格ID
     * @param tableData 表格数据
     */
    async exportTableDataToFile(file: TFile, tableId: string, tableData: TableData): Promise<void> {
        try {
            if (!file || !tableId || !tableData) return;
            
            // 读取文件内容
            let fileContent = await this.getApp().vault.read(file);
            
            // 提取文件中所有表格ID
            const tableIds = new Set<string>();
            const commentRegex = /<!-- table-id: ([\w-]+) -->/g;
            let match;
            
            while ((match = commentRegex.exec(fileContent)) !== null) {
                tableIds.add(match[1]);
            }
            
            // 确保当前表格ID也包含在内
            tableIds.add(tableId);
            
            // 从文件中提取现有的表格数据
            const existingTableData = await this.extractTableDataFromFile(file);
            
            // 更新或添加当前表格数据
            existingTableData[tableId] = tableData;
            
            // 创建表格数据数组
            const tableDataArray = Array.from(tableIds)
                .filter(id => existingTableData[id]) // 只包含有数据的表格
                .map(id => existingTableData[id]);
            
            // 准备要导出的数据
            const dataToExport = JSON.stringify(tableDataArray, null, 2);
            
            // 查找文件中所有的表格数据代码块
            const jsonBlockRegex = /```json:table-data\s*\n([\s\S]*?)\n```/g;
            const codeBlocks: {start: number, end: number}[] = [];
            
            while ((match = jsonBlockRegex.exec(fileContent)) !== null) {
                codeBlocks.push({
                    start: match.index,
                    end: match.index + match[0].length
                });
            }
            
            // 如果找到了代码块，删除所有现有的表格数据代码块
            if (codeBlocks.length > 0) {
                // 从后向前删除，避免位置变化
                for (let i = codeBlocks.length - 1; i >= 0; i--) {
                    const block = codeBlocks[i];
                    fileContent = fileContent.substring(0, block.start) + fileContent.substring(block.end);
                }
            }
            
            // 在文件末尾添加新的数据代码块
            // 确保文件末尾有足够的空行
            if (!fileContent.endsWith('\n\n')) {
                if (fileContent.endsWith('\n')) {
                    fileContent += '\n';
                } else {
                    fileContent += '\n\n';
                }
            }
            
            // 添加表格数据代码块
            fileContent += '```json:table-data\n' + dataToExport + '\n```';
            
            // 保存修改后的文件内容
            await this.getApp().vault.modify(file, fileContent);
            
            console.log(`已将所有表格数据导出到文件末尾: ${file.path}, 表格数量: ${tableDataArray.length}`);
        } catch (error) {
            console.error('导出表格数据到文件时出错:', error);
        }
    }
}