import { ObsidianSpreadsheet } from './main';
import { setIcon, Menu, Notice } from 'obsidian';
import { MarkdownView } from 'obsidian';
import { Editor } from 'obsidian';

export class TableToolbar {
    private containerEl: HTMLElement;
    private plugin: ObsidianSpreadsheet;
    private toolbar: HTMLElement;
    public activeTable: HTMLElement | null = null;
    private selectedCells: HTMLElement[] = [];
    private isDragging: boolean = false;
    private dragStartX: number = 0;
    private dragStartY: number = 0;
    private isCollapsed: boolean = false;
    private collapseButton: HTMLElement;
    private toolbarContent: HTMLElement;
    private dragHandle: HTMLElement;
    private initialPosition: { left: string, top: string } = { left: '50%', top: '10px' };
    private editModeTableInfo: { startLine: number, endLine: number, content: string } | null = null;

    private applyToEntireTable: boolean = false;

    constructor(plugin: ObsidianSpreadsheet) {
        this.plugin = plugin;
        console.log('TableToolbar initialized');
    }

    /**
     * 创建表格工具栏
     * @param containerEl 容器元素
     */
    createToolbar(containerEl: HTMLElement): void {
        this.containerEl = containerEl;
        
        // 设置容器样式
        containerEl.style.position = 'fixed';
        containerEl.style.zIndex = '1000';
        containerEl.style.left = '50%';
        containerEl.style.top = '10px';
        containerEl.style.transform = 'translateX(-50%)';
        containerEl.style.display = 'block'; // 确保工具栏默认显示
        
        // 创建工具栏容器
        this.toolbar = containerEl.createEl('div', {
            cls: 'advanced-table-toolbar'
        });
        
        // 添加样式
        this.toolbar.style.display = 'flex';
        this.toolbar.style.flexDirection = 'row';
        this.toolbar.style.gap = '5px';
        this.toolbar.style.padding = '5px';
        this.toolbar.style.margin = '5px 0';
        this.toolbar.style.borderRadius = '5px';
        this.toolbar.style.backgroundColor = 'var(--background-secondary)';
        this.toolbar.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
        this.toolbar.style.userSelect = 'none';
        this.toolbar.style.position = 'relative';
        
        // 添加拖拽手柄 - 确保其在最前面
        this.dragHandle = this.toolbar.createEl('div', {
            cls: 'advanced-table-toolbar-drag-handle'
        });
        
        // 设置拖拽手柄样式
        this.dragHandle.style.cursor = 'grab';
        this.dragHandle.style.padding = '0 5px';
        this.dragHandle.style.display = 'flex';
        this.dragHandle.style.alignItems = 'center';
        this.dragHandle.style.marginRight = '5px';
        this.dragHandle.style.height = '28px';
        this.dragHandle.style.borderRadius = '3px';
        
        // 添加拖拽手柄的悬停效果
        this.dragHandle.addEventListener('mouseover', () => {
            this.dragHandle.style.backgroundColor = 'var(--background-modifier-hover)';
        });
        this.dragHandle.addEventListener('mouseout', () => {
            this.dragHandle.style.backgroundColor = 'transparent';
        });
        
        // 设置拖拽图标
        setIcon(this.dragHandle, 'grip-vertical');
        
        // 添加工具栏内容容器
        this.toolbarContent = this.toolbar.createEl('div', {
            cls: 'advanced-table-toolbar-content'
        });
        this.toolbarContent.style.display = 'flex';
        this.toolbarContent.style.flexDirection = 'row';
        this.toolbarContent.style.gap = '5px';
        this.toolbarContent.style.flexGrow = '1';
        
        // 添加按钮分组
        this.createButtonGroup('对齐', [
            { id: 'align-left', tooltip: '左对齐', icon: 'align-left' },
            { id: 'align-center', tooltip: '居中对齐', icon: 'align-center' },
            { id: 'align-right', tooltip: '右对齐', icon: 'align-right' },
            { id: 'align-top', tooltip: '顶部对齐', icon: 'align-top' },
            { id: 'align-middle', tooltip: '垂直居中', icon: 'align-middle' },
            { id: 'align-bottom', tooltip: '底部对齐', icon: 'align-bottom' },
            { id: 'align-all', tooltip: '全部居中', icon: 'align-all' }
        ]);
        
        this.createSeparator();
        
        this.createButtonGroup('合并', [
            { id: 'merge-cells', tooltip: '合并选中单元格', icon: 'merge-cells' },
            { id: 'merge-right', tooltip: '向右合并', icon: 'merge-right' },
            { id: 'merge-down', tooltip: '向下合并', icon: 'merge-down' },
            { id: 'split', tooltip: '拆分单元格', icon: 'split' }
        ]);
        
        this.createSeparator();
        
        this.createButtonGroup('表格', [
            { id: 'table-id', tooltip: '生成表格ID', icon: 'table-id' },
            { id: 'table-row-add', tooltip: '添加行', icon: 'table-row-add' },
            { id: 'table-style', tooltip: '表格样式', icon: 'table-style' }
        ]);
        
        // 添加收起按钮
        this.collapseButton = this.toolbar.createEl('button', {
            cls: 'advanced-table-toolbar-collapse-button',
            attr: { 'aria-label': '收起/展开工具栏', 'title': '收起工具栏' }
        });
        this.collapseButton.style.display = 'flex';
        this.collapseButton.style.justifyContent = 'center';
        this.collapseButton.style.alignItems = 'center';
        this.collapseButton.style.width = '28px';
        this.collapseButton.style.height = '28px';
        this.collapseButton.style.padding = '3px';
        this.collapseButton.style.border = 'none';
        this.collapseButton.style.borderRadius = '3px';
        this.collapseButton.style.backgroundColor = 'transparent';
        this.collapseButton.style.cursor = 'pointer';
        this.collapseButton.style.marginLeft = '5px';
        
        setIcon(this.collapseButton, 'chevron-left');
        
        this.collapseButton.addEventListener('mouseover', () => {
            this.collapseButton.style.backgroundColor = 'var(--background-modifier-hover)';
        });
        this.collapseButton.addEventListener('mouseout', () => {
            this.collapseButton.style.backgroundColor = 'transparent';
        });
        
        this.collapseButton.addEventListener('click', () => {
            this.toggleCollapse();
        });
        
        // 设置拖拽事件
        this.setupDraggable();
        
        // 添加调试信息
        console.log('工具栏已创建，拖拽手柄状态:', {
            dragHandleExists: !!this.dragHandle,
            dragHandleParent: this.dragHandle?.parentElement,
            dragHandleDisplay: this.dragHandle?.style.display,
            dragHandleIcon: this.dragHandle?.innerHTML,
            toolbarChildren: Array.from(this.toolbar.children).map(child => child.className)
        });
    }
    
    /**
     * 设置工具栏可拖拽
     */
    private setupDraggable(): void {
        const container = this.containerEl;
        
        // 鼠标按下事件
        this.dragHandle.addEventListener('mousedown', (e: MouseEvent) => {
            // 只响应左键
            if (e.button !== 0) return;
            
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            
            // 记录初始位置
            const rect = container.getBoundingClientRect();
            this.initialPosition = {
                left: container.style.left || '50%',
                top: container.style.top || '10px'
            };
            
            // 改变光标样式
            this.dragHandle.style.cursor = 'grabbing';
            document.body.style.cursor = 'grabbing';
            
            // 阻止事件冒泡和默认行为
            e.preventDefault();
            e.stopPropagation();
        });
        
        // 鼠标移动事件 (绑定到document以捕获所有移动)
        const mouseMoveHandler = (e: MouseEvent) => {
            if (!this.isDragging) return;
            
            // 计算位移
            const deltaX = e.clientX - this.dragStartX;
            const deltaY = e.clientY - this.dragStartY;
            
            // 获取当前位置
            const rect = container.getBoundingClientRect();
            
            // 计算新位置 (相对于视口)
            let newLeft: string;
            if (this.initialPosition.left.endsWith('%')) {
                // 如果初始位置是百分比，转换为像素
                const viewportWidth = document.documentElement.clientWidth;
                const initialLeftPx = (parseFloat(this.initialPosition.left) / 100) * viewportWidth;
                newLeft = `${initialLeftPx + deltaX}px`;
            } else {
                // 如果初始位置是像素
                const initialLeftPx = parseFloat(this.initialPosition.left);
                newLeft = `${initialLeftPx + deltaX}px`;
            }
            
            const newTop = `${parseFloat(this.initialPosition.top) + deltaY}px`;
            
            // 应用新位置
            container.style.left = newLeft;
            container.style.top = newTop;
            
            // 移动时取消transform居中
            container.style.transform = 'none';
            
            // 阻止事件冒泡和默认行为
            e.preventDefault();
            e.stopPropagation();
        };
        
        // 鼠标释放事件
        const mouseUpHandler = (e: MouseEvent) => {
            if (!this.isDragging) return;
            
            this.isDragging = false;
            
            // 恢复光标样式
            this.dragHandle.style.cursor = 'grab';
            document.body.style.cursor = '';
            
            // 阻止事件冒泡
            e.stopPropagation();
        };
        
        // 绑定全局事件
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
        
        // 确保在插件卸载时清理事件监听器
        this.plugin.registerDomEvent(document, 'mousemove', mouseMoveHandler);
        this.plugin.registerDomEvent(document, 'mouseup', mouseUpHandler);
    }
    
    /**
     * 切换工具栏的收起/展开状态
     */
    private toggleCollapse(): void {
        this.isCollapsed = !this.isCollapsed;
        
        if (this.isCollapsed) {
            // 收起工具栏
            this.toolbarContent.style.display = 'none';
            setIcon(this.collapseButton, 'chevron-right');
            this.toolbar.style.width = 'auto';
            this.toolbar.classList.add('collapsed');
            
            // 调整容器样式
            this.containerEl.style.width = 'auto';
            this.containerEl.style.height = 'auto';
            
            // 添加提示
            this.collapseButton.setAttribute('title', '展开工具栏');
        } else {
            // 展开工具栏
            this.toolbarContent.style.display = 'flex';
            setIcon(this.collapseButton, 'chevron-left');
            this.toolbar.style.width = '';
            this.toolbar.classList.remove('collapsed');
            
            // 恢复容器样式
            this.containerEl.style.width = '';
            this.containerEl.style.height = '';
            
            // 更新提示
            this.collapseButton.setAttribute('title', '收起工具栏');
        }
    }
    
    /**
     * 创建按钮组
     * @param groupName 组名
     * @param buttons 按钮配置
     */
    private createButtonGroup(groupName: string, buttons: {id: string, tooltip: string, icon: string}[]): void {
        const group = this.toolbarContent.createEl('div', {
            cls: 'advanced-table-toolbar-group'
        });
        
        group.style.display = 'flex';
        group.style.flexDirection = 'row';
        group.style.alignItems = 'center';
        
        // 添加组标签
        const label = group.createEl('span', {
            text: groupName,
            cls: 'advanced-table-toolbar-group-label'
        });
        label.style.fontSize = '12px';
        label.style.marginRight = '5px';
        label.style.opacity = '0.7';
        
        // 添加按钮
        buttons.forEach(btn => {
            const button = group.createEl('button', {
                cls: `advanced-table-toolbar-button ${btn.id}`,
                attr: { 'aria-label': btn.tooltip }
            });
            button.style.display = 'flex';
            button.style.justifyContent = 'center';
            button.style.alignItems = 'center';
            button.style.width = '28px';
            button.style.height = '28px';
            button.style.padding = '3px';
            button.style.border = 'none';
            button.style.borderRadius = '3px';
            button.style.backgroundColor = 'transparent';
            button.style.cursor = 'pointer';
            
            // 设置图标
            setIcon(button, btn.icon);
            
            // 添加悬停样式
            button.addEventListener('mouseover', () => {
                button.style.backgroundColor = 'var(--background-modifier-hover)';
            });
            button.addEventListener('mouseout', () => {
                button.style.backgroundColor = 'transparent';
            });
            
            // 添加点击事件
            button.addEventListener('click', () => {
                this.handleButtonClick(btn.id);
            });
            
            // 添加悬停提示
            button.setAttribute('title', btn.tooltip);
        });
    }
    
    /**
     * 创建分隔线
     */
    private createSeparator(): void {
        const separator = this.toolbarContent.createEl('div', {
            cls: 'advanced-table-toolbar-separator'
        });
        
        separator.style.width = '1px';
        separator.style.height = '24px';
        separator.style.margin = '0 5px';
        separator.style.backgroundColor = 'var(--background-modifier-border)';
    }
    
    /**
     * 处理按钮点击事件
     * @param buttonId 按钮ID
     */
    private handleButtonClick(buttonId: string): void {
        try {
            // 记录调试信息
            console.log(`点击了按钮: ${buttonId}`);
            
            // 检查是否在编辑模式下
            const isEditMode = this.isInEditMode();
            
            switch (buttonId) {
                case 'align-left':
                    this.applyAlignmentToSelectedCells('left');
                    break;
                case 'align-center':
                    this.applyAlignmentToSelectedCells('center');
                    break;
                case 'align-right':
                    this.applyAlignmentToSelectedCells('right');
                    break;
                case 'align-top':
                    this.applyAlignmentToSelectedCells(undefined, 'top');
                    break;
                case 'align-middle':
                    this.applyAlignmentToSelectedCells(undefined, 'middle');
                    break;
                case 'align-bottom':
                    this.applyAlignmentToSelectedCells(undefined, 'bottom');
                    break;
                case 'align-all':
                    this.applyAlignmentToSelectedCells('center', 'middle');
                    break;
                case 'merge-cells':
                    if (isEditMode && this.plugin.settings.enableEditModeOperations) {
                        // 编辑模式下暂不支持多选合并
                        new Notice('编辑模式下暂不支持多选合并，请使用向右或向下合并');
                    } else {
                        this.mergeCells();
                    }
                    break;
                case 'merge-right':
                    this.mergeRight();
                    break;
                case 'merge-down':
                    this.mergeDown();
                    break;
                case 'split':
                    if (isEditMode && this.plugin.settings.enableEditModeOperations) {
                        // 编辑模式下使用 MarkdownSourceEditor 进行拆分
                        this.plugin.markdownSourceEditor.splitMergedCells()
                            .then(success => {
                                if (success) {
                                    // 清除选择，因为源码已经修改
                                    this.clearCellSelection();
                                }
                            })
                            .catch(error => {
                                console.error('拆分单元格时出错:', error);
                                new Notice(`拆分单元格时出错: ${error.message || '未知错误'}`);
                            });
                    } else {
                        this.splitCell();
                    }
                    break;
                case 'table-id':
                    this.generateTableId();
                    break;
                case 'table-row-add':
                    if (isEditMode && this.plugin.settings.enableEditModeOperations) {
                        // 编辑模式下暂不支持添加行
                        new Notice('编辑模式下暂不支持通过工具栏添加行，请直接编辑Markdown源码');
                    } else {
                        this.showRowAddMenu();
                    }
                    break;
                case 'table-style':
                    if (isEditMode && this.plugin.settings.enableEditModeOperations) {
                        // 编辑模式下暂不支持样式设置
                        new Notice('编辑模式下暂不支持样式设置');
                    } else {
                        this.showStyleMenu();
                    }
                    break;
                default:
                    console.log(`未处理的按钮ID: ${buttonId}`);
            }
        } catch (error) {
            console.error(`处理按钮点击时出错: ${buttonId}`, error);
        }
    }
    
    /**
     * 记录调试信息
     */
    private logDebugInfo(): void {
        // 获取文档中所有表格
        const allTables = document.querySelectorAll('table').length;
        
        // 获取所有已选择的表格元素
        const selectedTableElements = document.querySelectorAll('table[data-table-selected="true"]').length;
        
        console.log('当前状态:', {
            activeTable: this.activeTable,
            allTables: allTables,
            selectedCells: this.selectedCells,
            selectedTableElements: selectedTableElements,
            toolbarContainer: this.containerEl
        });
    }
    
    /**
     * 应用对齐样式到选中的单元格
     * @param horizontalAlign 水平对齐方式
     * @param verticalAlign 垂直对齐方式
     */
    private applyAlignmentToSelectedCells(horizontalAlign?: string, verticalAlign?: string): void {
        try {
            console.log('应用对齐:', {horizontalAlign, verticalAlign});
            
            // 首先应用样式到DOM元素，确保用户立即看到效果
            this.applyAlignmentStylesOnly(horizontalAlign, verticalAlign);
            
            // 如果没有选中单元格或没有活动表格，则直接返回
            if (!this.activeTable || (this.selectedCells.length === 0 && !this.applyToEntireTable)) {
                console.warn('没有选中单元格或活动表格');
                return;
            }
            
            // 使用新方法从Markdown文件中读取表格ID
            this.plugin.readTableIdFromMarkdown(this.activeTable).then(tableId => {
                console.log(`从Markdown文件中获取表格ID: ${tableId}`);
                
                // 如果没有从Markdown文件中获取到有效的表格ID，则只应用样式但不保存数据
                if (!tableId) {
                    console.warn('未找到HTML注释中定义的表格ID，将只应用样式但不保存数据');
                    new Notice('未找到表格ID，样式已应用但未保存到数据文件');
                    return;
                }
                
                // 保存表格样式到数据文件
                if (this.activeTable) { // 确保activeTable仍然存在
                    const activeTable = this.activeTable; // 创建一个引用，确保在异步操作中不会为null
                    const activeFile = this.plugin.app.workspace.getActiveFile();
                    
                    if (!activeFile) {
                        console.warn('无法获取当前文件路径');
                        return;
                    }
                    
                    // 获取选中单元格的位置信息
                    const selectedCellPositions = this.getSelectedCellPositions();
                    console.log('选中单元格位置:', selectedCellPositions);
                    
                    // 加载现有数据
                    this.plugin.loadData().then(existingData => {
                        // 确保存在表格数据对象
                        if (!existingData.tables) {
                            existingData.tables = {};
                        }
                        
                        let tableData = existingData.tables[tableId];
                        
                        // 如果表格数据不存在，创建一个新的
                        if (!tableData) {
                            console.log(`创建新的表格数据: ${tableId}`);
                            
                            // 获取表格的行数和列数
                            const rows = activeTable.querySelectorAll('tr');
                            const rowCount = rows.length;
                            let colCount = 0;
                            if (rowCount > 0) {
                                const firstRow = rows[0];
                                colCount = firstRow.querySelectorAll('td, th').length;
                            }
                            
                            // 创建新的表格数据
                            tableData = {
                                id: tableId,
                                locations: [
                                    {
                                        path: activeFile.path,
                                        isActive: true
                                    }
                                ],
                                structure: {
                                    rowCount: rowCount,
                                    colCount: colCount,
                                    hasHeaders: rows.length > 0 && rows[0].querySelectorAll('th').length > 0
                                },
                                styling: {
                                    rowHeights: Array(rowCount).fill('auto'),
                                    colWidths: Array(colCount).fill('auto'),
                                    alignment: Array(colCount).fill('left'),
                                    cellStyles: [] // 新增：用于存储单元格样式
                                }
                            };
                            
                            // 将新创建的表格数据添加到existingData
                            existingData.tables[tableId] = tableData;
                            console.log(`已创建新的表格数据记录: ${tableId}`, tableData);
                        } else {
                            console.log(`找到现有表格数据: ${tableId}`, tableData);
                            
                            // 确保结构数据存在
                            if (!tableData.structure) {
                                const rows = activeTable.querySelectorAll('tr');
                                const rowCount = rows.length;
                                let colCount = 0;
                                if (rowCount > 0) {
                                    const firstRow = rows[0];
                                    colCount = firstRow.querySelectorAll('td, th').length;
                                }
                                
                                tableData.structure = {
                                    rowCount: rowCount,
                                    colCount: colCount,
                                    hasHeaders: rows.length > 0 && rows[0].querySelectorAll('th').length > 0
                                };
                            }
                            
                            // 确保styling数据存在
                            if (!tableData.styling) {
                                tableData.styling = {
                                    rowHeights: Array(tableData.structure.rowCount).fill('auto'),
                                    colWidths: Array(tableData.structure.colCount).fill('auto'),
                                    alignment: Array(tableData.structure.colCount).fill('left'),
                                    cellStyles: [] // 新增：用于存储单元格样式
                                };
                            }
                            
                            // 确保cellStyles数组存在
                            if (!tableData.styling.cellStyles) {
                                tableData.styling.cellStyles = [];
                            }
                            
                            // 确保locations数据包含当前文件
                            if (!tableData.locations) {
                                tableData.locations = [{
                                    path: activeFile.path,
                                    isActive: true
                                }];
                            } else {
                                // 检查当前文件是否已在locations中
                                const filePathExists = tableData.locations.some((loc: {path: string}) => loc.path === activeFile.path);
                                if (!filePathExists) {
                                    tableData.locations.push({
                                        path: activeFile.path,
                                        isActive: true
                                    });
                                }
                            }
                        }
                        
                        // 如果选择了应用到整个表格，则更新列对齐方式
                        if (this.selectedCells.length === 0 || this.applyToEntireTable) {
                            if (horizontalAlign) {
                                // 确保styling和alignment存在
                                tableData.styling = tableData.styling || {};
                                tableData.styling.alignment = tableData.styling.alignment || [];
                                
                                // 更新所有列的对齐方式
                                const colCount = tableData.structure?.colCount || 0;
                                for (let i = 0; i < colCount; i++) {
                                    tableData.styling.alignment[i] = horizontalAlign;
                                }
                                
                                console.log(`更新表格对齐数据: ${tableId}`, tableData.styling.alignment);
                            }
                        } 
                        // 否则，只更新选中单元格的样式
                        else {
                            // 更新选中单元格的样式
                            selectedCellPositions.forEach(pos => {
                                // 查找是否已有此单元格的样式
                                const existingStyleIndex = tableData.styling.cellStyles.findIndex(
                                    (style: any) => style.row === pos.row && style.col === pos.col
                                );
                                
                                // 如果已有样式，更新它
                                if (existingStyleIndex !== -1) {
                                    if (horizontalAlign) {
                                        tableData.styling.cellStyles[existingStyleIndex].textAlign = horizontalAlign;
                                    }
                                    if (verticalAlign) {
                                        tableData.styling.cellStyles[existingStyleIndex].verticalAlign = verticalAlign;
                                    }
                                } 
                                // 否则，添加新样式
                                else {
                                    const newStyle: any = { row: pos.row, col: pos.col };
                                    if (horizontalAlign) {
                                        newStyle.textAlign = horizontalAlign;
                                    }
                                    if (verticalAlign) {
                                        newStyle.verticalAlign = verticalAlign;
                                    }
                                    tableData.styling.cellStyles.push(newStyle);
                                }
                            });
                            
                            console.log(`更新单元格样式数据: ${tableId}`, tableData.styling.cellStyles);
                        }
                        
                        // 保存更新后的表格数据
                        this.plugin.saveData(existingData);
                        console.log(`已保存表格数据: ${tableId}`);
                        
                        // 显示成功通知
                        new Notice(`已将${horizontalAlign || ''}${horizontalAlign && verticalAlign ? '和' : ''}${verticalAlign || ''}对齐应用到${this.selectedCells.length > 0 ? '选中单元格' : '整个表格'}并保存到数据文件`);
                    }).catch(err => {
                        console.error('保存表格数据时出错:', err);
                        new Notice(`保存表格数据失败: ${err.message || '未知错误'}`);
                    });
                } else {
                    console.warn('保存数据时表格不再存在');
                }
            }).catch(error => {
                console.error('获取表格ID时出错:', error);
                new Notice(`获取表格ID失败: ${error.message || '未知错误'}`);
            });
            
            console.log('对齐应用完成');
        } catch (error) {
            console.error('应用对齐失败:', error);
            new Notice(`应用对齐失败: ${error.message || '未知错误'}`);
        }
    }
    
    /**
     * 获取选中单元格的位置信息（行列索引）
     * @returns 选中单元格的位置数组
     */
    private getSelectedCellPositions(): Array<{row: number, col: number}> {
        const positions: Array<{row: number, col: number}> = [];
        
        if (!this.activeTable || this.selectedCells.length === 0) {
            return positions;
        }
        
        // 遍历选中的单元格
        this.selectedCells.forEach(cell => {
            // 获取单元格所在的行
            const row = cell.closest('tr');
            if (!row) return;
            
            // 获取行索引
            const rowIndex = Array.from(this.activeTable!.querySelectorAll('tr')).indexOf(row);
            if (rowIndex === -1) return;
            
            // 获取单元格在行中的索引
            const colIndex = Array.from(row.querySelectorAll('td, th')).indexOf(cell);
            if (colIndex === -1) return;
            
            // 添加到位置数组
            positions.push({ row: rowIndex, col: colIndex });
        });
        
        return positions;
    }
    
    /**
     * 仅应用对齐样式，不保存数据
     * @param horizontalAlign 水平对齐方式
     * @param verticalAlign 垂直对齐方式
     */
    private applyAlignmentStylesOnly(horizontalAlign?: string, verticalAlign?: string): void {
        // 如果没有选中单元格，则应用到整个表格
        if (this.selectedCells.length === 0 && this.activeTable) {
            const cells = this.activeTable.querySelectorAll('td, th');
            cells.forEach(cell => {
                const cellEl = cell as HTMLElement;
                if (horizontalAlign) {
                    cellEl.style.textAlign = horizontalAlign;
                }
                if (verticalAlign) {
                    cellEl.style.verticalAlign = verticalAlign;
                }
            });
            new Notice(`已将${horizontalAlign || ''}${horizontalAlign && verticalAlign ? '和' : ''}${verticalAlign || ''}对齐应用到整个表格`);
        } else {
            // 应用到选中的单元格
            this.selectedCells.forEach(cell => {
                if (horizontalAlign) {
                    cell.style.textAlign = horizontalAlign;
                }
                if (verticalAlign) {
                    cell.style.verticalAlign = verticalAlign;
                }
            });
            new Notice(`已将${horizontalAlign || ''}${horizontalAlign && verticalAlign ? '和' : ''}${verticalAlign || ''}对齐应用到选中单元格`);
        }
    }
    
    /**
     * 合并选中的单元格
     */
    private async mergeCells(): Promise<void> {
        try {
            console.log('尝试合并选中的单元格');
            
            // 获取当前视图
            const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
            if (!activeView) {
                new Notice('无法获取当前视图');
                return;
            }
            
            // 检查当前模式
            const isEditMode = activeView.getMode() === 'source';
            console.log(`当前模式: ${isEditMode ? '编辑模式' : '预览模式'}`);
            
            if (isEditMode && this.plugin.settings.enableEditModeOperations) {
                console.log('在编辑模式下使用 MarkdownSourceEditor 合并单元格');
                
                // 在编辑模式下使用 MarkdownSourceEditor
                const success = await this.plugin.markdownSourceEditor.mergeCells('right');
                if (success) {
                    // 清除当前选择，因为源码已经修改
                    this.clearCellSelection();
                    console.log('合并单元格成功');
                } else {
                    console.log('合并单元格失败');
                }
            } else {
                // 在预览模式下，检查是否有选中的单元格
                if (this.selectedCells.length < 2) {
                    new Notice('请选择至少2个单元格进行合并');
                    return;
                }
                
                // 获取选中单元格的边界
                const boundary = this.getSelectedCellsBoundary();
                if (!boundary) {
                    new Notice('无法确定选中单元格的边界');
                    return;
                }
                
                const { minRow, maxRow, minCol, maxCol } = boundary;
                
                // 检查是否形成完整的矩形
                const expectedCellCount = (maxRow - minRow + 1) * (maxCol - minCol + 1);
                if (expectedCellCount !== this.selectedCells.length) {
                    new Notice('只能合并形成完整矩形的单元格');
                    return;
                }
                
                // 获取主单元格（左上角的单元格）
                const mainCell = this.activeTable?.querySelector(`[row-index="${minRow}"][col-index="${minCol}"]`) as HTMLElement;
                if (!mainCell) {
                    new Notice('无法找到主单元格');
                    return;
                }
                
                // 检查是否有非空内容需要确认
                if (this.plugin.settings.confirmMergeNonEmpty) {
                    const nonEmptyCells = this.selectedCells.filter(cell => {
                        if (cell === mainCell) return false;
                        const content = cell.textContent?.trim() || '';
                        return content !== '' && content !== '<' && content !== '^';
                    });
                    
                    if (nonEmptyCells.length > 0) {
                        const cellContents = nonEmptyCells.map(cell => {
                            return `"${cell.textContent?.trim() || '(空)'}"`;
                        }).join(', ');
                        
                        const confirmMerge = await this.showConfirmDialog(
                            `要合并的单元格包含内容${cellContents}，确定要合并吗？`
                        );
                        if (!confirmMerge) return;
                    }
                }
                
                // 计算需要合并的行数和列数
                const rowSpanValue = maxRow - minRow + 1;
                const colSpanValue = maxCol - minCol + 1;
                
                // 设置主单元格的合并属性
                if (rowSpanValue > 1) {
                    mainCell.setAttribute('rowspan', rowSpanValue.toString());
                }
                
                if (colSpanValue > 1) {
                    mainCell.setAttribute('colspan', colSpanValue.toString());
                }
                
                // 为其他单元格添加合并标记
                for (const cell of this.selectedCells) {
                    if (cell === mainCell) continue;
                    
                    const rowIndex = parseInt(cell.getAttribute('row-index') || '0');
                    const colIndex = parseInt(cell.getAttribute('col-index') || '0');
                    
                    // 根据位置设置合并标记
                    if (rowIndex === minRow) {
                        // 同一行，设置水平合并标记
                        const markerCount = colIndex - minCol;
                        cell.textContent = '<'.repeat(markerCount);
                        cell.setAttribute('data-merged', 'true');
                        cell.setAttribute('data-merge-direction', 'left');
                        cell.setAttribute('data-merge-count', markerCount.toString());
                    } else if (colIndex === minCol) {
                        // 同一列，设置垂直合并标记
                        const markerCount = rowIndex - minRow;
                        cell.textContent = '^'.repeat(markerCount);
                        cell.setAttribute('data-merged', 'true');
                        cell.setAttribute('data-merge-direction', 'up');
                        cell.setAttribute('data-merge-count', markerCount.toString());
                    } else {
                        // 其他单元格，根据情况设置合并标记
                        if (rowIndex > minRow && colIndex > minCol) {
                            // 可以选择向上或向左合并，这里选择向左合并
                            const markerCount = colIndex - minCol;
                            cell.textContent = '<'.repeat(markerCount);
                            cell.setAttribute('data-merged', 'true');
                            cell.setAttribute('data-merge-direction', 'left');
                            cell.setAttribute('data-merge-count', markerCount.toString());
                        }
                    }
                    
                    // 隐藏被合并的单元格
                    cell.style.display = 'none';
                }
                
                // 应用合并样式
                this.applyMergedCellStyles(mainCell, this.selectedCells.filter(cell => cell !== mainCell));
                
                new Notice(`已成功合并${this.selectedCells.length}个单元格`);
                console.log('预览模式下合并单元格成功');
                
                // 清除单元格选择
                this.clearCellSelection();
            }
        } catch (error) {
            console.error('合并单元格时出错:', error);
            new Notice(`合并单元格失败: ${error.message || '未知错误'}`);
        }
    }
    
    /**
     * 向右合并单元格
     */
    private async mergeRight(): Promise<void> {
        try {
            console.log('尝试向右合并单元格');
            
            // 获取当前视图
            const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
            if (!activeView) {
                new Notice('无法获取当前视图');
                return;
            }
            
            // 检查当前模式
            const isEditMode = activeView.getMode() === 'source';
            console.log(`当前模式: ${isEditMode ? '编辑模式' : '预览模式'}`);
            
            if (isEditMode && this.plugin.settings.enableEditModeOperations) {
                console.log('在编辑模式下使用 MarkdownSourceEditor 合并单元格');
                
                // 在编辑模式下使用 MarkdownSourceEditor
                const success = await this.plugin.markdownSourceEditor.mergeCells('right');
                if (success) {
                    // 清除当前选择，因为源码已经修改
                    this.clearCellSelection();
                    console.log('合并单元格成功');
                } else {
                    console.log('合并单元格失败');
                }
            } else {
                // 在预览模式下，检查是否有选中的单元格
                if (this.selectedCells.length === 0) {
                    new Notice('请先选择要合并的单元格');
                    return;
                }
                
                // 处理多个选中单元格的情况
                if (this.selectedCells.length > 1) {
                    // 检查选中的单元格是否在同一行
                    const rowIndices = new Set();
                    for (const cell of this.selectedCells) {
                        const rowIndex = parseInt(cell.getAttribute('row-index') || '0');
                        rowIndices.add(rowIndex);
                    }
                    
                    if (rowIndices.size !== 1) {
                        new Notice('向右合并需要选择同一行的单元格');
                        return;
                    }
                    
                    // 获取列索引并排序
                    const cellsWithIndices = this.selectedCells.map(cell => {
                        return {
                            cell,
                            colIndex: parseInt(cell.getAttribute('col-index') || '0')
                        };
                    }).sort((a, b) => a.colIndex - b.colIndex);
                    
                    // 检查是否连续
                    for (let i = 1; i < cellsWithIndices.length; i++) {
                        if (cellsWithIndices[i].colIndex !== cellsWithIndices[i-1].colIndex + 1) {
                            new Notice('需要选择连续的单元格进行合并');
                            return;
                        }
                    }
                    
                    // 获取主单元格（最左侧的单元格）和合并数量
                    const mainCell = cellsWithIndices[0].cell;
                    const mergeCount = cellsWithIndices.length - 1;
                    
                    // 检查是否有非空内容需要确认
                    if (this.plugin.settings.confirmMergeNonEmpty) {
                        const nonEmptyCells = cellsWithIndices.slice(1).filter(item => {
                            const content = item.cell.textContent?.trim() || '';
                            return content !== '' && content !== '<' && content !== '^';
                        });
                        
                        if (nonEmptyCells.length > 0) {
                            const cellContents = nonEmptyCells.map(item => {
                                return `"${item.cell.textContent?.trim() || '(空)'}"`;
                            }).join(', ');
                            
                            const confirmMerge = await this.showConfirmDialog(
                                `要合并的单元格包含内容${cellContents}，确定要合并吗？`
                            );
                            if (!confirmMerge) return;
                        }
                    }
                    
                    // 为所有需要合并的单元格设置合并标记
                    for (let i = 1; i < cellsWithIndices.length; i++) {
                        const cell = cellsWithIndices[i].cell;
                        // 设置合并标记，使用连续的 < 符号表示合并多个单元格
                        cell.textContent = '<'.repeat(i);
                        cell.setAttribute('data-merged', 'true');
                        cell.setAttribute('data-merge-direction', 'left');
                        cell.setAttribute('data-merge-count', i.toString());
                    }
                    
                    // 应用合并样式
                    this.applyMergedCellStyles(mainCell, cellsWithIndices.slice(1).map(item => item.cell));
                    new Notice(`已向右合并${mergeCount}个单元格`);
                    console.log(`预览模式下向右合并${mergeCount}个单元格成功`);
                    this.clearCellSelection();
                    return;
                }
                
                // 处理单个选中单元格的情况（原有逻辑）
                const cell = this.selectedCells[0];
                if (!cell) {
                    console.log('未找到选中的单元格');
                    return;
                }
                
                // 获取行列索引
                const rowIndex = parseInt(cell.getAttribute('row-index') || '0');
                const colIndex = parseInt(cell.getAttribute('col-index') || '0');
                
                console.log(`选中单元格位置: 行=${rowIndex}, 列=${colIndex}`);
                
                // 获取右侧单元格
                const rightCell = this.activeTable?.querySelector(`[row-index="${rowIndex}"][col-index="${colIndex + 1}"]`) as HTMLElement;
                if (!rightCell) {
                    new Notice('右侧没有单元格可合并');
                    return;
                }
                
                // 检查右侧单元格是否有内容
                const rightContent = rightCell.textContent?.trim();
                if (this.plugin.settings.confirmMergeNonEmpty && 
                    rightContent && rightContent !== '<' && rightContent !== '^') {
                    const confirmed = await this.showConfirmDialog(
                        `要合并的单元格包含内容"${rightContent}"，确定要合并吗？`
                    );
                    if (!confirmed) return;
                }
                
                // 设置右侧单元格为水平合并标记
                rightCell.textContent = '<';
                rightCell.setAttribute('data-merged', 'true');
                rightCell.setAttribute('data-merge-direction', 'left');
                
                // 应用样式
                this.applyMergedCellStyles(cell, [rightCell]);
                
                new Notice('已向右合并单元格');
                console.log('预览模式下向右合并单元格成功');
            }
        } catch (error) {
            console.error('向右合并单元格时出错:', error);
            new Notice(`向右合并单元格失败: ${error.message || '未知错误'}`);
        }
    }
    
    /**
     * 向下合并单元格
     */
    private async mergeDown(): Promise<void> {
        try {
            console.log('尝试向下合并单元格');
            
            // 获取当前视图
            const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
            if (!activeView) {
                new Notice('无法获取当前视图');
                return;
            }
            
            // 检查当前模式
            const isEditMode = activeView.getMode() === 'source';
            console.log(`当前模式: ${isEditMode ? '编辑模式' : '预览模式'}`);
            
            if (isEditMode && this.plugin.settings.enableEditModeOperations) {
                console.log('在编辑模式下使用 MarkdownSourceEditor 合并单元格');
                
                // 在编辑模式下使用 MarkdownSourceEditor
                const success = await this.plugin.markdownSourceEditor.mergeCells('down');
                if (success) {
                    // 清除当前选择，因为源码已经修改
                    this.clearCellSelection();
                    console.log('向下合并单元格成功');
                } else {
                    console.log('向下合并单元格失败');
                }
            } else {
                // 在预览模式下，检查是否有选中的单元格
                if (this.selectedCells.length === 0) {
                    new Notice('请先选择要合并的单元格');
                    return;
                }
                
                // 处理多个选中单元格的情况
                if (this.selectedCells.length > 1) {
                    // 检查选中的单元格是否在同一列
                    const colIndices = new Set();
                    for (const cell of this.selectedCells) {
                        const colIndex = parseInt(cell.getAttribute('col-index') || '0');
                        colIndices.add(colIndex);
                    }
                    
                    if (colIndices.size !== 1) {
                        new Notice('向下合并需要选择同一列的单元格');
                        return;
                    }
                    
                    // 获取行索引并排序
                    const cellsWithIndices = this.selectedCells.map(cell => {
                        return {
                            cell,
                            rowIndex: parseInt(cell.getAttribute('row-index') || '0')
                        };
                    }).sort((a, b) => a.rowIndex - b.rowIndex);
                    
                    // 检查是否连续
                    for (let i = 1; i < cellsWithIndices.length; i++) {
                        if (cellsWithIndices[i].rowIndex !== cellsWithIndices[i-1].rowIndex + 1) {
                            new Notice('需要选择连续的单元格进行合并');
                            return;
                        }
                    }
                    
                    // 获取主单元格（最上方的单元格）和合并数量
                    const mainCell = cellsWithIndices[0].cell;
                    const mergeCount = cellsWithIndices.length - 1;
                    
                    // 检查是否有非空内容需要确认
                    if (this.plugin.settings.confirmMergeNonEmpty) {
                        const nonEmptyCells = cellsWithIndices.slice(1).filter(item => {
                            const content = item.cell.textContent?.trim() || '';
                            return content !== '' && content !== '<' && content !== '^';
                        });
                        
                        if (nonEmptyCells.length > 0) {
                            const cellContents = nonEmptyCells.map(item => {
                                return `"${item.cell.textContent?.trim() || '(空)'}"`;
                            }).join(', ');
                            
                            const confirmMerge = await this.showConfirmDialog(
                                `要合并的单元格包含内容${cellContents}，确定要合并吗？`
                            );
                            if (!confirmMerge) return;
                        }
                    }
                    
                    // 为所有需要合并的单元格设置合并标记
                    for (let i = 1; i < cellsWithIndices.length; i++) {
                        const cell = cellsWithIndices[i].cell;
                        // 设置合并标记，使用连续的 ^ 符号表示合并多个单元格
                        cell.textContent = '^'.repeat(i);
                        cell.setAttribute('data-merged', 'true');
                        cell.setAttribute('data-merge-direction', 'up');
                        cell.setAttribute('data-merge-count', i.toString());
                    }
                    
                    // 应用合并样式
                    this.applyMergedCellStyles(mainCell, cellsWithIndices.slice(1).map(item => item.cell));
                    new Notice(`已向下合并${mergeCount}个单元格`);
                    console.log(`预览模式下向下合并${mergeCount}个单元格成功`);
                    this.clearCellSelection();
                    return;
                }
                
                // 处理单个选中单元格的情况（原有逻辑）
                const cell = this.selectedCells[0];
                if (!cell) {
                    console.log('未找到选中的单元格');
                    return;
                }
                
                // 获取行列索引
                const rowIndex = parseInt(cell.getAttribute('row-index') || '0');
                const colIndex = parseInt(cell.getAttribute('col-index') || '0');
                
                console.log(`选中单元格位置: 行=${rowIndex}, 列=${colIndex}`);
                
                // 获取下方单元格
                const belowCell = this.activeTable?.querySelector(`[row-index="${rowIndex + 1}"][col-index="${colIndex}"]`) as HTMLElement;
                if (!belowCell) {
                    new Notice('下方没有单元格可合并');
                    return;
                }
                
                // 检查下方单元格是否有内容
                const belowContent = belowCell.textContent?.trim();
                if (this.plugin.settings.confirmMergeNonEmpty && 
                    belowContent && belowContent !== '<' && belowContent !== '^') {
                    const confirmed = await this.showConfirmDialog(
                        `要合并的单元格包含内容"${belowContent}"，确定要合并吗？`
                    );
                    if (!confirmed) return;
                }
                
                // 设置下方单元格为垂直合并标记
                belowCell.textContent = '^';
                belowCell.setAttribute('data-merged', 'true');
                belowCell.setAttribute('data-merge-direction', 'up');
                
                // 应用样式
                this.applyMergedCellStyles(cell, [belowCell]);
                
                new Notice('已向下合并单元格');
                console.log('预览模式下向下合并单元格成功');
            }
        } catch (error) {
            console.error('向下合并单元格时出错:', error);
            new Notice(`向下合并单元格失败: ${error.message || '未知错误'}`);
        }
    }
    
    /**
     * 拆分单元格
     */
    private splitCell(): void {
        try {
            if (this.selectedCells.length !== 1) {
                console.log('需要选择一个单元格进行拆分');
                new Notice('请选择一个单元格进行拆分');
                return;
            }
            
            console.log('开始拆分单元格');
            
            const cell = this.selectedCells[0];
            
            // 获取行列索引
            const rowIndex = parseInt(cell.getAttribute('row-index') || '0');
            const colIndex = parseInt(cell.getAttribute('col-index') || '0');
            
            // 检查单元格是否已被合并（通过 colspan 或 rowspan 属性）
            const colSpan = cell.getAttribute('colspan');
            const rowSpan = cell.getAttribute('rowspan');
            
            // 检查周围单元格是否有合并标记
            const table = cell.closest('table');
            let hasMergeMarkers = false;
            
            if (table) {
                // 检查右侧单元格
                const rightCell = table.querySelector(`[row-index="${rowIndex}"][col-index="${colIndex + 1}"]`) as HTMLElement;
                if (rightCell && rightCell.textContent) {
                    const rightContent = rightCell.textContent.trim();
                    if (rightContent === '<' || rightContent === '^') {
                        hasMergeMarkers = true;
                        rightCell.textContent = '';
                        console.log('已清除右侧单元格的合并标记');
                    }
                }
                
                // 检查下方单元格
                const belowCell = table.querySelector(`[row-index="${rowIndex + 1}"][col-index="${colIndex}"]`) as HTMLElement;
                if (belowCell && belowCell.textContent) {
                    const belowContent = belowCell.textContent.trim();
                    if (belowContent === '<' || belowContent === '^') {
                        hasMergeMarkers = true;
                        belowCell.textContent = '';
                        console.log('已清除下方单元格的合并标记');
                    }
                }
                
                // 递归检查和清除右侧连续的合并标记
                for (let i = colIndex + 1; i < colIndex + 10; i++) {
                    const nextCell = table.querySelector(`[row-index="${rowIndex}"][col-index="${i}"]`) as HTMLElement;
                    if (nextCell && nextCell.textContent && nextCell.textContent.trim() === '<') {
                        nextCell.textContent = '';
                        hasMergeMarkers = true;
                        console.log(`已清除位置 (${rowIndex}, ${i}) 的水平合并标记`);
                    } else {
                        break;
                    }
                }
                
                // 递归检查和清除下方连续的合并标记
                for (let i = rowIndex + 1; i < rowIndex + 10; i++) {
                    const nextCell = table.querySelector(`[row-index="${i}"][col-index="${colIndex}"]`) as HTMLElement;
                    if (nextCell && nextCell.textContent && nextCell.textContent.trim() === '^') {
                        nextCell.textContent = '';
                        hasMergeMarkers = true;
                        console.log(`已清除位置 (${i}, ${colIndex}) 的垂直合并标记`);
                    } else {
                        break;
                    }
                }
            }
            
            if (!colSpan && !rowSpan && !hasMergeMarkers) {
                console.log('选中的单元格没有合并属性，无需拆分');
                new Notice('选中的单元格没有合并属性，无需拆分');
                return;
            }
            
            // 在 HTML 预览中，我们只能通过修改 DOM 来模拟拆分
            // 实际上需要修改 Markdown 源码才能真正拆分
            
            // 移除合并属性
            if (colSpan) {
                cell.removeAttribute('colspan');
            }
            if (rowSpan) {
                cell.removeAttribute('rowspan');
            }
            
            // 显示之前隐藏的单元格
            if (table) {
                const hiddenCells = table.querySelectorAll('td[style*="display: none"], th[style*="display: none"]');
                hiddenCells.forEach(hiddenCell => {
                    (hiddenCell as HTMLElement).style.display = '';
                });
            }
            
            new Notice('已拆分单元格');
            console.log('单元格拆分完成');
            
            // 清除选择
            this.clearCellSelection();
        } catch (error) {
            console.error('拆分单元格失败:', error);
            new Notice(`拆分单元格失败: ${error.message || '未知错误'}`);
        }
    }
    
    /**
     * 生成表格ID
     */
    private generateTableId(): void {
        try {
            // 获取当前视图
            const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
            if (!activeView) {
                new Notice('无法获取当前视图');
                return;
            }
            
            // 检查当前模式
            const isEditMode = activeView.getMode() === 'source';
            
            if (isEditMode && this.plugin.settings.enableEditModeOperations) {
                // 在编辑模式下，使用确认对话框询问用户是否要创建ID
                this.showConfirmDialog('是否为当前表格创建ID？创建后将在表格前添加HTML注释。').then(confirmed => {
                    if (!confirmed) {
                        return;
                    }
                
                // 获取编辑器
                const editor = activeView.editor;
                
                // 定位当前表格
                const tableInfo = this.plugin.markdownSourceEditor.locateTableInMarkdown(editor);
                if (tableInfo) {
                    // 检查表格是否已有ID
                    if (tableInfo.tableId) {
                        new Notice(`表格已有ID: ${tableInfo.tableId}`);
                        return;
                    }
                        
                        // 生成一个新ID
                        const newId = this.generateUniqueTableId();
                    
                    // 获取表格开始行
                    const tableStartLine = tableInfo.startLine;
                    
                        // 在表格前插入空行和注释
                    const currentPos = editor.getCursor();
                        editor.replaceRange(`<!-- table-id: ${newId} -->\n`, { line: tableStartLine, ch: 0 });
                    
                    // 恢复光标位置
                    editor.setCursor(currentPos);
                    
                        new Notice(`已为表格添加ID: ${newId}`);
                        console.log('已为表格添加ID:', newId);
                } else {
                    new Notice('未找到表格，请确保光标在表格内');
                }
                });
            } else {
                // 在预览模式下，检查是否有活动表格
                if (!this.activeTable) {
                    new Notice('请先选择一个表格');
                    return;
                }
                
                // 使用确认对话框询问用户是否要创建ID
                this.showConfirmDialog('是否为当前表格创建ID？').then(confirmed => {
                    if (!confirmed) {
                        return;
                    }
                    
                    // 使用TableIdManager的confirmAndCreateTableId方法创建ID
                    const tableId = this.activeTable ? this.plugin.tableIdManager.confirmAndCreateTableId(this.activeTable) : '';
                    
                    if (tableId) {
                        // 刷新预览以显示新添加的ID注释
                        const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
                        if (activeView) {
                            activeView.previewMode.rerender(true);
                        }
                        
                        console.log('已为表格添加ID:', tableId);
                    } else {
                        console.error('创建表格ID失败');
                        new Notice('创建表格ID失败，请手动添加');
                    }
                });
            }
        } catch (error) {
            console.error('生成表格ID时出错:', error);
            new Notice(`生成表格ID时出错: ${error.message || '未知错误'}`);
        }
    }
    
    /**
     * 生成唯一的表格ID
     * @returns 格式为 tbl-YYYYMMDD-xxxxxxxx 的唯一ID
     */
    private generateUniqueTableId(): string {
        // 获取当前日期并格式化为YYYYMMDD
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;
        
        // 生成8位随机字符串（字母和数字）
        const randomChars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let randomStr = '';
        for (let i = 0; i < 8; i++) {
            randomStr += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
        }
        
        // 组合ID
        return `tbl-${dateStr}-${randomStr}`;
    }
    
    /**
     * 检查表格是否已有ID
     * @param editor 编辑器实例
     * @returns 已有ID或null
     */
    private checkExistingTableId(editor: Editor): string | null {
        const content = editor.getValue();
        const lines = content.split('\n');
        
        // 找到表格开始的行
        let tableStartLine = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith('|') && lines[i].includes('|')) {
                // 检查是否是表格的第一行
                if (i + 1 < lines.length && lines[i + 1].trim().match(/^\|[-:\s|]*\|$/)) {
                    tableStartLine = i;
                    break;
                }
            }
        }
        
        if (tableStartLine === -1) {
            return null; // 未找到表格
        }
        
        // 检查表格前是否已有ID注释
        let idCommentLine = tableStartLine - 1;
        while (idCommentLine >= 0 && (lines[idCommentLine].trim() === '' || lines[idCommentLine].trim().startsWith('<!--'))) {
            const line = lines[idCommentLine].trim();
            if (line.includes('table-id:')) {
                // 提取ID
                const match = line.match(/table-id:\s*([^\s>]+)/);
                return match ? match[1] : null;
            }
            idCommentLine--;
        }
        
        return null;
    }
    
    /**
     * 提取并存储表格信息
     * @param tableId 表格ID
     * @param tableElement 表格元素
     * @param filePath 文件路径
     */
    extractAndStoreTableInfo(tableId: string, tableElement: HTMLElement, filePath: string): void {
        try {
            // 提取表格结构信息
            const rows = tableElement.querySelectorAll('tr');
            const rowCount = rows.length;
            let colCount = 0;
            let hasHeaders = false;
            
            // 确定列数和表头状态
            if (rowCount > 0) {
                // 检查第一行是否有th元素（表头）
                const firstRow = rows[0];
                const headerCells = firstRow.querySelectorAll('th');
                hasHeaders = headerCells.length > 0;
                
                // 获取所有行的最大列数
                for (const row of Array.from(rows)) {
                    const cellCount = row.querySelectorAll('td, th').length;
                    colCount = Math.max(colCount, cellCount);
                }
            }
            
            // 提取表格合并信息
            const mergeInfo = this.extractMergeInfo(tableElement);
            console.log(`提取表格合并信息:`, mergeInfo);
            
            // 创建简化的表格数据结构
            const tableInfo = {
                id: tableId,
                locations: [
                    {
                        path: filePath,
                        isActive: true
                    }
                ],
                structure: {
                    rowCount: rowCount,
                    colCount: colCount,
                    hasHeaders: hasHeaders
                },
                styling: {
                    rowHeights: Array(rowCount).fill('auto'),
                    colWidths: Array(colCount).fill('auto'),
                    alignment: Array(colCount).fill('left')
                }
            };
            
            console.log(`保存表格信息: ID=${tableId}, 行数=${rowCount}, 列数=${colCount}, 表头=${hasHeaders}`);
            
            // 保存表格数据
            this.plugin.saveTableData(tableInfo);
        } catch (error) {
            console.error('提取表格信息时出错:', error);
        }
    }
    
    /**
     * 提取表格的合并信息
     * @param tableElement 表格元素
     * @returns 合并信息对象
     */
    private extractMergeInfo(tableElement: HTMLElement): any {
        interface MergeCell {
            row: number;
            col: number;
            count: number;
            content: string;
        }
        
        const mergeInfo: {
            horizontal: MergeCell[];
            vertical: MergeCell[];
        } = {
            horizontal: [],
            vertical: []
        };
        
        const rows = tableElement.querySelectorAll('tr');
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex];
            const cells = row.querySelectorAll('td, th');
            
            for (let colIndex = 0; colIndex < cells.length; colIndex++) {
                const cell = cells[colIndex] as HTMLElement;
                const content = cell.textContent?.trim() || '';
                
                // 检查向左合并标记
                const leftMatch = content.match(/^(<+)$/);
                if (leftMatch) {
                    const count = leftMatch[1].length;
                    mergeInfo.horizontal.push({
                        row: rowIndex,
                        col: colIndex,
                        count: count,
                        content: content
                    });
                }
                
                // 检查向上合并标记
                const upMatch = content.match(/^(\^+)$/);
                if (upMatch) {
                    const count = upMatch[1].length;
                    mergeInfo.vertical.push({
                        row: rowIndex,
                        col: colIndex,
                        count: count,
                        content: content
                    });
                }
                
                // 检查colspan和rowspan属性
                const colspan = parseInt(cell.getAttribute('colspan') || '1');
                const rowspan = parseInt(cell.getAttribute('rowspan') || '1');
                
                if (colspan > 1 || rowspan > 1) {
                    console.log(`发现合并单元格: 位置(${rowIndex},${colIndex}), colspan=${colspan}, rowspan=${rowspan}`);
                }
            }
        }
        
        return mergeInfo;
    }
    
    /**
     * 显示添加行菜单
     */
    private showRowAddMenu(): void {
        try {
            if (!this.activeTable) {
                console.log('无活动表格，无法添加行');
                new Notice('请先选择一个表格');
                return;
            }
            
            console.log('显示添加行菜单');
            
            // 创建菜单
            const menu = new Menu();
            
            // 添加菜单项
            menu.addItem(item => 
                item
                    .setTitle('在上方添加行')
                    .setIcon('arrow-up')
                    .onClick(() => this.addRow('above'))
            );
            
            menu.addItem(item => 
                item
                    .setTitle('在下方添加行')
                    .setIcon('arrow-down')
                    .onClick(() => this.addRow('below'))
            );
            
            // 显示菜单
            const toolbarEl = this.toolbar;
            if (toolbarEl) {
                const rect = toolbarEl.getBoundingClientRect();
                menu.showAtPosition({ x: rect.left, y: rect.bottom });
            } else {
                menu.showAtMouseEvent(event as MouseEvent);
            }
        } catch (error) {
            console.error('显示添加行菜单失败:', error);
            new Notice(`显示添加行菜单失败: ${error.message || '未知错误'}`);
        }
    }
    
    /**
     * 添加行
     * @param position 位置，above 或 below
     */
    private addRow(position: 'above' | 'below'): void {
        try {
            if (!this.activeTable) {
                console.log('无活动表格，无法添加行');
                new Notice('请先选择一个表格');
                return;
            }
            
            console.log('开始添加行:', position);
            
            // 获取当前选中的单元格或第一行
            let targetRow: HTMLElement | null = null;
            
            if (this.selectedCells.length > 0) {
                // 使用选中的单元格所在行
                targetRow = this.selectedCells[0].closest('tr');
            } else {
                // 使用表格的第一行
                targetRow = this.activeTable.querySelector('tr');
            }
            
            if (!targetRow) {
                console.error('无法找到目标行');
                new Notice('无法找到目标行');
                return;
            }
            
            // 获取行中的单元格数量
            const cellCount = targetRow.querySelectorAll('td, th').length;
            
            // 创建新行
            const newRow = document.createElement('tr');
            
            // 添加单元格
            for (let i = 0; i < cellCount; i++) {
                const cell = document.createElement('td');
                cell.textContent = '';
                newRow.appendChild(cell);
            }
            
            // 插入新行
            if (position === 'above') {
                targetRow.parentNode?.insertBefore(newRow, targetRow);
            } else {
                targetRow.parentNode?.insertBefore(newRow, targetRow.nextSibling);
            }
            
            new Notice(`已在${position === 'above' ? '上方' : '下方'}添加行`);
            console.log('添加行完成:', position);
        } catch (error) {
            console.error('添加行失败:', error);
            new Notice(`添加行失败: ${error.message || '未知错误'}`);
        }
    }
    
    /**
     * 更新行索引
     */
    private updateRowIndices(): void {
        if (!this.activeTable) return;
        
        const rows = this.activeTable.querySelectorAll('tr');
        rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('td, th');
            cells.forEach((cell, colIndex) => {
                cell.setAttribute('row-index', rowIndex.toString());
                cell.setAttribute('col-index', colIndex.toString());
            });
        });
    }
    
    /**
     * 显示样式菜单
     */
    private showStyleMenu(): void {
        const menu = new Menu();
        
        menu.addItem(item => 
            item.setTitle('设置表格样式')
                .setIcon('brush')
                .onClick(() => {
                    // 显示样式对话框
                    new Notice('样式设置功能正在开发中');
                })
        );
        
        menu.addItem(item => 
            item.setTitle('设置条纹样式')
                .setIcon('lines')
                .onClick(() => this.applyStripedStyle())
        );
        
        menu.addItem(item => 
            item.setTitle('设置边框样式')
                .setIcon('box')
                .onClick(() => this.applyBorderedStyle())
        );
        
        // 获取鼠标位置显示菜单
        const button = this.toolbar.querySelector('.table-style') as HTMLElement;
        const rect = button.getBoundingClientRect();
        menu.showAtPosition({ x: rect.left, y: rect.bottom });
    }
    
    /**
     * 应用条纹样式
     */
    private applyStripedStyle(): void {
        if (!this.activeTable) {
            new Notice('请先选择一个表格');
            return;
        }
        
        const rows = this.activeTable.querySelectorAll('tr');
        rows.forEach((row, index) => {
            if (index > 0 && index % 2 === 1) { // 跳过表头行，只设置奇数行
                const cells = row.querySelectorAll('td');
                cells.forEach(cell => {
                    (cell as HTMLElement).style.backgroundColor = 'var(--background-secondary)';
                });
            }
        });
        
        new Notice('已应用条纹样式');
    }
    
    /**
     * 应用边框样式
     */
    private applyBorderedStyle(): void {
        if (!this.activeTable) {
            new Notice('请先选择一个表格');
            return;
        }
        
        this.activeTable.style.borderCollapse = 'collapse';
        
        const cells = this.activeTable.querySelectorAll('td, th');
        cells.forEach(cell => {
            (cell as HTMLElement).style.border = '1px solid var(--background-modifier-border)';
            (cell as HTMLElement).style.padding = '4px 8px';
        });
        
        new Notice('已应用边框样式');
    }
    
    /**
     * 设置活动表格
     * @param table 表格HTML元素
     */
    setActiveTable(table: HTMLElement): void {
        try {
            console.log('设置活动表格');
            
            // 记录表格信息
            console.log('表格DOM结构:', table.outerHTML.substring(0, 200) + '...');
            
            // 检查表格是否有ID
            const tableId = this.plugin.tableIdManager.getTableIdentifier(table);
            console.log(`表格ID检查结果: ${tableId || '未找到'}`);
            
            // 检查表格的前置节点
            let prevNode = table.previousSibling;
            let nodeCount = 0;
            console.log('表格前置节点检查:');
            while (prevNode && nodeCount < 5) {
                nodeCount++;
                const nodeType = prevNode.nodeType;
                const nodeTypeStr = nodeType === Node.COMMENT_NODE ? 'COMMENT' : 
                                  nodeType === Node.TEXT_NODE ? 'TEXT' : 
                                  nodeType === Node.ELEMENT_NODE ? 'ELEMENT' : 'OTHER';
                
                if (nodeType === Node.COMMENT_NODE) {
                    console.log(`  前置节点#${nodeCount}: 类型=${nodeTypeStr}, 内容="${prevNode.textContent?.trim() || ''}"`);
                } else if (nodeType === Node.TEXT_NODE) {
                    const text = prevNode.textContent?.trim() || '';
                    console.log(`  前置节点#${nodeCount}: 类型=${nodeTypeStr}, 内容="${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`);
                } else if (nodeType === Node.ELEMENT_NODE) {
                    console.log(`  前置节点#${nodeCount}: 类型=${nodeTypeStr}, 标签=<${(prevNode as Element).tagName.toLowerCase()}>`);
                }
                prevNode = prevNode.previousSibling;
            }
            
            // 设置活动表格
            this.activeTable = table;
            
            // 移除所有表格高亮
            this.plugin.removeAllTableHighlights();
            
            // 高亮当前表格
            this.plugin.highlightSelectedTable(table);
            
            // 设置表格单元格选择
            this.setupCellSelection();
            
            console.log('活动表格设置完成');
        } catch (error) {
            console.error('设置活动表格时出错:', error);
        }
    }
    
    /**
     * 设置编辑模式下的活动表格
     * @param tableInfo 表格信息
     */
    setActiveEditModeTable(tableInfo: { startLine: number, endLine: number, content: string }): void {
        try {
            // 清除之前的选择
            if (this.activeTable) {
                this.clearCellSelection();
                
                // 清除之前表格的选中状态
                this.activeTable.dataset.tableSelected = 'false';
                this.activeTable.style.outline = '';
                this.activeTable.style.outlineOffset = '';
                this.activeTable = null;
            }
            
            // 在编辑模式下，我们没有实际的表格元素
            // 但可以记录表格的位置信息
            this.editModeTableInfo = tableInfo;
            

            
            // 记录日志以便调试
            console.log('编辑模式下选择了表格:', tableInfo);
        } catch (error) {
            console.error('设置编辑模式活动表格时出错:', error);
        }
    }
    
    /**
     * 检查当前是否在编辑模式下
     * @returns 是否在编辑模式下
     */
    isInEditMode(): boolean {
        const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        return activeView ? activeView.getMode() === 'source' : false;
    }
    
    /**
     * 设置单元格选择功能
     */
    private setupCellSelection(): void {
        if (!this.activeTable) return;
        
        const cells = this.activeTable.querySelectorAll('td, th');
        cells.forEach(cell => {
            // 添加自定义属性以标识单元格
            const cellEl = cell as HTMLElement;
            
            // 添加事件监听器
            cellEl.onclick = (event: MouseEvent) => this.handleCellClick(cellEl, event);
        });
    }
    
    /**
     * 处理单元格点击事件
     * @param cell 单元格元素
     * @param event 事件对象
     */
    private handleCellClick(cell: HTMLElement, event: MouseEvent): void {
        // 阻止事件冒泡，确保不会触发表格的点击事件
        event.stopPropagation();
        
        // 检查是否按住了Ctrl键（多选）
        if (!event.ctrlKey && !event.metaKey) {
            // 取消之前的选择
            this.clearCellSelection();
        }
        
        // 切换单元格选择状态
        const index = this.selectedCells.indexOf(cell);
        if (index === -1) {
            this.selectedCells.push(cell);
            cell.classList.add('selected-cell');
            cell.style.backgroundColor = 'var(--text-selection)';
            
            // 显示简短提示
            const position = this.selectedCells.length > 1 ? '多选模式' : '已选择单元格';
            new Notice(`${position} (${this.selectedCells.length})`, 1000);
        } else {
            this.selectedCells.splice(index, 1);
            cell.classList.remove('selected-cell');
            cell.style.backgroundColor = '';
            
            // 显示取消选择提示
            if (this.selectedCells.length > 0) {
                new Notice(`已选择 ${this.selectedCells.length} 个单元格`, 1000);
            }
        }
        
        // 记录选择状态以便调试
        console.log('已选择单元格:', this.selectedCells.length);
    }
    
    /**
     * 清除单元格选择
     */
    private clearCellSelection(): void {
        this.selectedCells.forEach(cell => {
            cell.classList.remove('selected-cell');
            cell.style.backgroundColor = '';
        });
        
        this.selectedCells = [];
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
     * 应用合并单元格的样式
     * @param mainCell 主单元格（保留的单元格）
     * @param mergedCells 被合并的单元格（将被隐藏）
     */
    private applyMergedCellStyles(mainCell: HTMLElement, mergedCells: HTMLElement[]): void {
        // 为主单元格添加合并样式
        mainCell.classList.add('obs-merged-cell-main');
        
        // 如果设置了自动居中，则应用居中样式
        if (this.plugin.settings.autoCenterMergedCells) {
            mainCell.style.textAlign = 'center';
            mainCell.style.verticalAlign = 'middle';
        }
        
        // 隐藏被合并的单元格
        for (const cell of mergedCells) {
            cell.style.display = 'none';
        }
        
        // 标记主单元格为已合并
        mainCell.setAttribute('data-merged-main', 'true');
    }

    /**
     * 清除表格选择
     */
    clearSelection(): void {
        try {
            // 清除单元格选择
            this.clearCellSelection();
            
            // 清除表格选择
            if (this.activeTable) {
                this.activeTable.dataset.tableSelected = 'false';
                this.activeTable.style.outline = '';
                this.activeTable.style.outlineOffset = '';
                this.activeTable = null;
            }
            
            // 清除编辑模式表格信息
            this.editModeTableInfo = null;
            
            console.log('已清除表格选择');
        } catch (error) {
            console.error('清除表格选择时出错:', error);
        }
    }

    /**
     * 获取选中单元格的边界
     * @returns 边界信息 {minRow, maxRow, minCol, maxCol}
     */
    private getSelectedCellsBoundary(): { minRow: number, maxRow: number, minCol: number, maxCol: number } | null {
        if (!this.selectedCells || this.selectedCells.length === 0) {
            return null;
        }
        
        let minRow = Number.MAX_SAFE_INTEGER;
        let maxRow = 0;
        let minCol = Number.MAX_SAFE_INTEGER;
        let maxCol = 0;
        
        for (const cell of this.selectedCells) {
            const rowIndex = parseInt(cell.getAttribute('row-index') || '0');
            const colIndex = parseInt(cell.getAttribute('col-index') || '0');
            
            minRow = Math.min(minRow, rowIndex);
            maxRow = Math.max(maxRow, rowIndex);
            minCol = Math.min(minCol, colIndex);
            maxCol = Math.max(maxCol, colIndex);
        }
        
        return { minRow, maxRow, minCol, maxCol };
    }
}
