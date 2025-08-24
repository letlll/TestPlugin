/**
 * 表格特征接口 - 用于存储表格的多维度特征信息
 */
export interface TableFeature {
    headers: string;       // 表头内容，用-分隔
    rows: number;          // 表格行数
    cols: number;          // 表格列数
    firstRowContent: string; // 第一行内容
    lastRowContent: string;  // 最后一行内容
    mergePattern: string;  // 合并单元格模式
    position?: {           // 表格在文档中的位置
        startLine: number,
        endLine: number
    };
    fileInfo?: {           // 文件相关信息
        path: string,
        name: string
    };
    id?: string;           // 表格ID
}

/**
 * 表格位置接口 - 用于存储表格在文件中的位置信息
 */
export interface TableLocation {
    path: string;         // 文件路径
    isActive: boolean;    // 是否为活动表格
}

/**
 * 表格结构接口 - 用于存储表格的结构信息
 */
export interface TableStructure {
    rowCount: number;     // 行数
    colCount: number;     // 列数
    hasHeaders: boolean;  // 是否有表头
    useTableWrapper?: boolean; // 是否使用表格包装器
}

/**
 * 表格样式接口 - 用于存储表格的样式信息
 */
export interface TableStyling {
    rowHeights: string[];  // 行高
    colWidths: string[];   // 列宽
    alignment: string[];   // 对齐方式
}

/**
 * 表格数据接口 - 用于存储表格的完整信息
 */
export interface TableData {
    id: string;                   // 表格ID
    locations: TableLocation[];   // 表格位置
    structure: TableStructure;    // 表格结构
    styling: TableStyling;        // 表格样式
    feature?: TableFeature;       // 表格特征
}