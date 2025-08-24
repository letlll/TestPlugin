import { App, Plugin, MarkdownView, TFile, MarkdownPostProcessorContext } from 'obsidian';

interface TableData {
  id: string;
  structure: {
    rowCount: number;
    colCount: number;
    hasHeaders: boolean;
    useTableWrapper?: boolean; // 是否使用表格包裹方式
  };
  styling: {
    rowHeights: string[];
    colWidths: string[];
    alignment: string[];
  };
}

interface PluginSettings {
  preferFileStorage: boolean; // 优先使用文件存储而非 data.json
  autoExportToFile: boolean; // 自动将表格数据导出到文件
}

const DEFAULT_SETTINGS: PluginSettings = {
  preferFileStorage: true,
  autoExportToFile: true
};

export default class TableDataInMarkdownPlugin extends Plugin {
  settings: PluginSettings;
  
  /**
   * 处理表格数据对象，确保结构完整性
   */
  processTableDataObject(tableData: any, result: Record<string, TableData>): void {
    // 确保结构完整性
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
    
    // 插件将负责完善数据结构
    result[tableData.id] = tableData;
  }
  
  /**
   * 解析自定义表格数据格式
   * 格式：tableId|key1:value1|key2:value2,value3
   * 例如：tbl-example-123|wrapper:true|width:100px,50px,50px,70px
   */
  parseCustomTableDataFormat(line: string): TableData | null {
    try {
      const parts = line.split('|');
      if (parts.length < 2) return null;
      
      const tableId = parts[0].trim();
      if (!tableId) return null;
      
      // 创建基本表格数据结构
      const tableData: TableData = {
        id: tableId,
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
      
      // 解析每个属性部分
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i].trim();
        if (!part) continue;
        
        const [key, value] = part.split(':');
        if (!key || !value) continue;
        
        switch (key.trim().toLowerCase()) {
          case 'wrapper':
            tableData.structure.useTableWrapper = value.trim().toLowerCase() === 'true';
            break;
          case 'width':
            tableData.styling.colWidths = value.split(',').map(w => w.trim());
            break;
          case 'align':
            tableData.styling.alignment = value.split(',').map(a => a.trim());
            break;
          case 'height':
            tableData.styling.rowHeights = value.split(',').map(h => h.trim());
            break;
        }
      }
      
      return tableData;
    } catch (error) {
      console.error('解析自定义表格数据格式时出错:', error);
      return null;
    }
  }
  
  async onload() {
    console.log('加载 Table Data In Markdown 插件');
    
    // 加载设置
    await this.loadSettings();
    
    // 注册 Markdown 后处理器，用于处理表格和表格数据代码块
    this.registerMarkdownPostProcessor(this.processMarkdown.bind(this));
    
    // 添加命令：将 data.json 中的表格数据导出到当前文件
    this.addCommand({
      id: 'export-table-data-to-file',
      name: '将表格数据导出到当前文件',
      checkCallback: (checking: boolean) => {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView) {
          if (!checking) {
            this.exportTableDataToFile(activeView.file);
          }
          return true;
        }
        return false;
      }
    });
  }
  
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
  
  /**
   * 处理 Markdown 内容
   */
  async processMarkdown(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
    // 处理表格
    const tables = el.querySelectorAll('table');
    if (tables.length === 0) return;
    
    // 获取文件内容
    const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
    if (!(file instanceof TFile)) return;
    
    // 读取文件内容
    const fileContent = await this.app.vault.read(file);
    
    // 提取文件中的表格数据代码块
    const tableDataMap = this.extractTableDataFromFile(fileContent);
    
    // 处理每个表格
    tables.forEach(async (table) => {
      // 查找表格 ID
      const tableId = this.findTableId(table, fileContent, ctx.getSectionInfo(table)?.lineStart);
      if (!tableId) return;
      
      // 优先从文件中获取表格数据
      let tableData: TableData | null = null;
      
      if (this.settings.preferFileStorage) {
        // 从文件中的代码块获取表格数据
        tableData = tableDataMap[tableId] || null;
        
        // 如果文件中没有找到，则从 data.json 中获取
        if (!tableData) {
          const pluginData = await this.loadData() || {};
          tableData = pluginData.tables?.[tableId] || null;
          
          // 如果设置了自动导出，且从 data.json 中找到了数据，则导出到文件
          if (tableData && this.settings.autoExportToFile) {
            this.addTableDataToFile(file, tableId, tableData);
          }
        }
      } else {
        // 直接从 data.json 中获取
        const pluginData = await this.loadData() || {};
        tableData = pluginData.tables?.[tableId] || null;
      }
      
      // 如果找到表格数据，则应用样式
      if (tableData) {
        this.applyTableStyles(table, tableData);
      }
    });
  }
  
  /**
   * 从文件内容中提取表格 ID
   */
  findTableId(table: HTMLElement, fileContent: string, lineStart?: number): string | null {
    // 检查表格是否在 <table> 标签内
    const isWrappedTable = table.parentElement?.tagName === 'TABLE' || 
                          table.closest('table') !== null;
    
    // 实现从 HTML 注释中提取表格 ID 的逻辑
    const commentRegex = /<!-- table-id: ([\w-]+) -->/g;
    let match;
    let tableContent = '';
    
    // 获取表格内容的字符串表示，用于定位
    if (isWrappedTable) {
      // 如果是包裹的表格，获取包含 <table> 标签的父元素内容
      const wrapperEl = table.parentElement || table.closest('table');
      tableContent = wrapperEl ? wrapperEl.outerHTML : table.outerHTML;
    } else {
      // 普通表格
      tableContent = table.outerHTML;
    }
    
    // 在文件内容中查找表格 ID
    while ((match = commentRegex.exec(fileContent)) !== null) {
      // 检查注释是否在表格附近
      const commentPos = match.index;
      const tableIdStr = match[0];
      const tableId = match[1];
      
      // 检查注释前后是否有 <table> 标签
      const beforeComment = fileContent.substring(Math.max(0, commentPos - 50), commentPos);
      const afterComment = fileContent.substring(commentPos + tableIdStr.length, 
                                               Math.min(fileContent.length, commentPos + tableIdStr.length + 50));
      
      // 如果是包裹的表格，检查是否在 <table> 标签内
      if (isWrappedTable && 
          (beforeComment.includes('<table>') || afterComment.includes('</table>'))) {
        return tableId;
      }
      
      // 普通表格的情况
      if (!isWrappedTable && !beforeComment.includes('<table>') && !afterComment.includes('</table>')) {
        return tableId;
      }
    }
    
    return null;
  }
  
  /**
   * 从文件内容中提取表格数据代码块
   */
  extractTableDataFromFile(fileContent: string): Record<string, TableData> {
    const result: Record<string, TableData> = {};
    
    // 匹配 ```json:table-data 代码块
    const jsonCodeBlockRegex = /```json:table-data\s*\n([\s\S]*?)\n```/g;
    let jsonMatch;
    
    while ((jsonMatch = jsonCodeBlockRegex.exec(fileContent)) !== null) {
      try {
        // 清理 JSON 字符串，移除可能的前导空格
        const jsonStr = jsonMatch[1].trim();
        const jsonData = JSON.parse(jsonStr);
        
        // 处理单个表格数据对象
        if (jsonData && typeof jsonData === 'object' && !Array.isArray(jsonData) && jsonData.id) {
          this.processTableDataObject(jsonData, result);
        }
        // 处理表格数据数组
        else if (Array.isArray(jsonData)) {
          for (const tableData of jsonData) {
            if (tableData && tableData.id) {
              this.processTableDataObject(tableData, result);
            }
          }
        }
      } catch (error) {
        console.error('解析JSON表格数据代码块时出错:', error);
      }
    }
    
    // 匹配 ```csv:table-data 代码块
    const csvCodeBlockRegex = /```csv:table-data\s*\n([\s\S]*?)\n```/g;
    let csvMatch;
    
    while ((csvMatch = csvCodeBlockRegex.exec(fileContent)) !== null) {
      try {
        const csvStr = csvMatch[1].trim();
        const csvLines = csvStr.split('\n');
        
        if (csvLines.length >= 2) {
          const headers = csvLines[0].split(',');
          
          // 处理每一行CSV数据
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
    
    return result;
  }
  
  /**
   * 完善表格数据，根据实际表格内容自动填充缺失的结构信息
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
   * 应用表格样式
   */
  applyTableStyles(table: HTMLElement, tableData: TableData): void {
    // 完善表格数据
    const enhancedData = this.enhanceTableData(table, tableData);
    
    // 检查是否使用表格包裹方式
    const useTableWrapper = enhancedData.structure.useTableWrapper;
    
    // 如果使用表格包裹方式，需要处理外层容器
    if (useTableWrapper) {
      // 检查表格是否已经被包裹
      const isWrapped = table.parentElement?.tagName === 'TABLE' || 
                        table.closest('table') !== null;
      
      // 如果没有被包裹，需要添加包裹
      if (!isWrapped) {
        const wrapper = document.createElement('table');
        table.parentNode?.insertBefore(wrapper, table);
        wrapper.appendChild(table);
        
        // 添加表格 ID 注释
        if (enhancedData.id) {
          const beforeComment = document.createComment(` table-id: ${enhancedData.id} `);
          const afterComment = document.createComment(` table-id: ${enhancedData.id} `);
          wrapper.insertBefore(beforeComment, table);
          wrapper.appendChild(afterComment);
        }
      }
    }
    
    // 应用列宽
    const colWidths = enhancedData.styling.colWidths;
    if (colWidths && colWidths.length > 0) {
      // 创建 colgroup 和 col 元素
      let colgroup = table.querySelector('colgroup');
      if (!colgroup) {
        colgroup = document.createElement('colgroup');
        table.prepend(colgroup);
      } else {
        colgroup.innerHTML = '';
      }
      
      // 为每列创建 col 元素并设置宽度
      for (let i = 0; i < colWidths.length; i++) {
        const col = document.createElement('col');
        if (colWidths[i] && colWidths[i] !== 'auto') {
          col.style.width = colWidths[i];
        }
        colgroup.appendChild(col);
      }
    }
    
    // 应用行高
    const rows = table.querySelectorAll('tr');
    const rowHeights = enhancedData.styling.rowHeights;
    if (rowHeights && rowHeights.length > 0) {
      for (let i = 0; i < Math.min(rows.length, rowHeights.length); i++) {
        if (rowHeights[i] && rowHeights[i] !== 'auto') {
          (rows[i] as HTMLElement).style.height = rowHeights[i];
        }
      }
    }
    
    // 应用对齐方式
    const alignment = enhancedData.styling.alignment;
    if (alignment && alignment.length > 0) {
      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('th, td');
        for (let j = 0; j < Math.min(cells.length, alignment.length); j++) {
          if (alignment[j]) {
            (cells[j] as HTMLElement).style.textAlign = alignment[j];
          }
        }
      }
    }
  }
  
  /**
   * 将 data.json 中的表格数据导出到文件
   */
  async exportTableDataToFile(file: TFile): Promise<void> {
    if (!file) return;
    
    // 读取文件内容
    const fileContent = await this.app.vault.read(file);
    
    // 提取文件中的所有表格 ID
    const tableIds: string[] = [];
    const commentRegex = /<!-- table-id: ([\w-]+) -->/g;
    let match;
    
    while ((match = commentRegex.exec(fileContent)) !== null) {
      tableIds.push(match[1]);
    }
    
    if (tableIds.length === 0) {
      // 没有找到表格 ID
      return;
    }
    
    // 从 data.json 中获取表格数据
    const pluginData = await this.loadData() || {};
    const tables = pluginData.tables || {};
    
    // 为每个表格 ID 添加数据代码块
    let updatedContent = fileContent;
    let dataAdded = false;
    
    for (const tableId of tableIds) {
      const tableData = tables[tableId];
      if (tableData) {
        // 检查文件中是否已有此表格的数据代码块
        const existingDataRegex = new RegExp(`\\`\\`\\`json:table-data\\n[\\s\\S]*?"id":\s*"${tableId}"[\\s\\S]*?\\n\\`\\`\\``, 'g');
        if (existingDataRegex.test(updatedContent)) {
          // 更新现有代码块
          updatedContent = updatedContent.replace(existingDataRegex, `\`\`\`json:table-data\n${JSON.stringify(tableData, null, 2)}\n\`\`\``);
        } else {
          // 在表格 ID 注释后添加新代码块
          const idCommentRegex = new RegExp(`<!-- table-id: ${tableId} -->`, 'g');
          updatedContent = updatedContent.replace(idCommentRegex, `<!-- table-id: ${tableId} -->\n\n\`\`\`json:table-data\n${JSON.stringify(tableData, null, 2)}\n\`\`\``);
        }
        dataAdded = true;
      }
    }
    
    // 如果添加了数据，则更新文件
    if (dataAdded) {
      await this.app.vault.modify(file, updatedContent);
    }
  }
  
  /**
   * 向文件添加表格数据代码块
   */
  async addTableDataToFile(file: TFile, tableId: string, tableData: TableData): Promise<void> {
    if (!file) return;
    
    // 读取文件内容
    const fileContent = await this.app.vault.read(file);
    
    // 检查文件中是否已有此表格的数据代码块
    const existingDataRegex = new RegExp(`\\`\\`\\`json:table-data\\n[\\s\\S]*?"id":\s*"${tableId}"[\\s\\S]*?\\n\\`\\`\\``, 'g');
    if (existingDataRegex.test(fileContent)) {
      // 已存在，不需要添加
      return;
    }
    
    // 查找表格 ID 注释的位置
    const idCommentRegex = new RegExp(`<!-- table-id: ${tableId} -->`, 'g');
    const match = idCommentRegex.exec(fileContent);
    
    if (match) {
      // 创建简化的表格数据对象
      const simplifiedData = {
        id: tableData.id
      };
      
      // 只添加非空的结构信息
      if (tableData.structure) {
        simplifiedData['structure'] = {};
        
        if (tableData.structure.rowCount) {
          simplifiedData['structure']['rowCount'] = tableData.structure.rowCount;
        }
        
        if (tableData.structure.colCount) {
          simplifiedData['structure']['colCount'] = tableData.structure.colCount;
        }
        
        if (tableData.structure.hasHeaders !== undefined) {
          simplifiedData['structure']['hasHeaders'] = tableData.structure.hasHeaders;
        }
        
        if (tableData.structure.useTableWrapper) {
          simplifiedData['structure']['useTableWrapper'] = tableData.structure.useTableWrapper;
        }
      }
      
      // 只添加非空的样式信息
      if (tableData.styling) {
        simplifiedData['styling'] = {};
        
        // 只添加非 auto 的行高
        if (tableData.styling.rowHeights && tableData.styling.rowHeights.some(h => h !== 'auto')) {
          simplifiedData['styling']['rowHeights'] = tableData.styling.rowHeights;
        }
        
        // 只添加非 auto 的列宽
        if (tableData.styling.colWidths && tableData.styling.colWidths.some(w => w !== 'auto')) {
          simplifiedData['styling']['colWidths'] = tableData.styling.colWidths;
        }
        
        // 只添加非默认的对齐方式
        if (tableData.styling.alignment && tableData.styling.alignment.length > 0) {
          // 检查是否有非默认对齐（第一列左对齐，其余右对齐）
          const isDefaultAlignment = tableData.styling.alignment.every((align, index) => 
            (index === 0 && align === 'left') || (index > 0 && align === 'right')
          );
          
          if (!isDefaultAlignment) {
            simplifiedData['styling']['alignment'] = tableData.styling.alignment;
          }
        }
      }
      
      // 在表格 ID 注释后添加代码块
      const updatedContent = fileContent.replace(
        idCommentRegex,
        `<!-- table-id: ${tableId} -->\n\n\`\`\`json:table-data\n${JSON.stringify(simplifiedData, null, 2)}\n\`\`\``
      );
      
      // 更新文件
      await this.app.vault.modify(file, updatedContent);
    }
  }
}