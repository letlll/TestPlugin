// import { MetaParser } from 'metaParser';
import { MarkdownPostProcessorContext, Plugin, htmlToMarkdown, Notice, MarkdownView, MarkdownEditView, Menu, MenuItem } from 'obsidian';
import { SheetSettingsTab } from './settings';
import { SheetElement } from './sheetElement';
import * as JSON5 from 'json5';
import { MarkdownTableDetector } from './markdownTableDetector';
import { TableIdManager } from './tableIdManager';
import { TableToolbar } from './tableToolbar';
import { MarkdownSourceEditor } from './markdownSourceEditor';
import { loadIcons } from './icons';
import { Editor } from 'obsidian';
import { App, PluginManifest } from 'obsidian';
import { setupPreviewModeTableSelection } from './setupPreviewModeTableSelection';
import { renderTablesWithStoredStyles } from './tableStyleRenderer';

interface PluginSettings {
	nativeProcessing: boolean;
	paragraphs: boolean;
	enableCellMerging: boolean;
	confirmMergeNonEmpty: boolean;
	enableTableIds: boolean;
	idPrefix: string;
	autoCenterMergedCells: boolean;
	toolbarEnabled: boolean;
	enableEditModeOperations: boolean;
}

const DEFAULT_SETTINGS: PluginSettings = {
	nativeProcessing: true,
	paragraphs: true,
	enableCellMerging: true,
	confirmMergeNonEmpty: true,
	enableTableIds: true,
	idPrefix: 'tbl',
	autoCenterMergedCells: true,
	toolbarEnabled: true,
	enableEditModeOperations: true,
};

export class ObsidianSpreadsheet extends Plugin {
	settings: PluginSettings;
	ribbonIcon: HTMLElement;
	tableIdManager: TableIdManager;
	tableDetector: MarkdownTableDetector;
	tableToolbar: TableToolbar;
	markdownSourceEditor: MarkdownSourceEditor;
	currentEditingTable: { startLine: number, endLine: number, content: string } | null = null;
	
	// 添加视图模式状态跟踪
	lastPreviewModeState: boolean = false;
	viewModeChangeHandler: () => void;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.handleTableClick = this.handleTableClick.bind(this);
		this.handleDocumentClick = this.handleDocumentClick.bind(this);
	}
	
	// 移除文档点击事件处理函数

	async onload() {
		try {
			console.log('Loading Advanced Table XT plugin');
			
			await this.loadSettings();
			
			// 确保 toolbarEnabled 属性存在
			if (this.settings.toolbarEnabled === undefined) {
				this.settings.toolbarEnabled = true;
				await this.saveSettings();
			}
			
			// 确保 enableEditModeOperations 属性存在
			if (this.settings.enableEditModeOperations === undefined) {
				this.settings.enableEditModeOperations = true;
				await this.saveSettings();
			}
			
			// Load custom icons
			loadIcons();
			
			// Initialize components in correct order
			console.log('Initializing plugin components');
			this.tableIdManager = new TableIdManager(this);
			this.markdownSourceEditor = new MarkdownSourceEditor(this); // Initialize before TableToolbar
			this.tableDetector = new MarkdownTableDetector(this);
			this.tableToolbar = new TableToolbar(this);
			
			// Add ribbon icon for toolbar toggle
			this.ribbonIcon = this.addRibbonIcon('table-toolbar-toggle', '表格工具栏', (evt: MouseEvent) => {
				this.toggleToolbarState();
			});
			
			// Add ribbon icon for edit mode operations
			this.addRibbonIcon('table-edit-mode', '编辑模式表格操作', (evt: MouseEvent) => {
				// 获取当前视图
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!activeView) {
					new Notice('未找到活动视图');
					return;
				}
				
				// 检查当前模式
				const isEditMode = activeView.getMode() === 'source';
				
				if (!isEditMode) {
					new Notice('请切换到编辑模式使用此功能');
					return;
				}
				
				// 显示编辑模式操作菜单
				const menu = new Menu();
				
				menu.addItem((item: MenuItem) => {
					item.setTitle('为表格添加ID')
						.setIcon('table-id')
						.onClick(async () => {
							await this.markdownSourceEditor.addTableIdToMarkdown();
						});
				});
				
				menu.addItem((item: MenuItem) => {
					item.setTitle('向右合并单元格')
						.setIcon('merge-right')
						.onClick(async () => {
							await this.markdownSourceEditor.mergeCells('right');
						});
				});
				
				menu.addItem((item: MenuItem) => {
					item.setTitle('向下合并单元格')
						.setIcon('merge-down')
						.onClick(async () => {
							await this.markdownSourceEditor.mergeCells('down');
						});
				});
				
				// 显示菜单
				menu.showAtMouseEvent(evt);
			});
			
			// Update ribbon icon state
			this.updateRibbonIcon();
			
			// 如果工具栏启用，创建工具栏
			if (this.settings.toolbarEnabled) {
				this.createToolbar();
			}
			
			// 监听活动视图变化，重新设置表格选择
			this.registerEvent(
				this.app.workspace.on('active-leaf-change', () => {
					if (this.settings.toolbarEnabled) {
						// 延迟执行，确保视图已完全加载
						setTimeout(() => {
							this.setupTableSelection();
						}, 300);
					}
				})
			);
			
			// 监听文档内容变化，重新设置表格选择
			this.registerEvent(
				this.app.workspace.on('layout-change', () => {
					if (this.settings.toolbarEnabled) {
						// 延迟执行，确保视图已完全加载
						setTimeout(() => {
							this.setupTableSelection();
						}, 300);
					}
				})
			);
			
			// 监听编辑器光标活动，检测表格
			this.registerEvent(
				this.app.workspace.on('editor-change', (editor, view) => {
					if (this.settings.toolbarEnabled && this.settings.enableEditModeOperations) {
						// 检查是否在编辑模式下
						if (view instanceof MarkdownView && view.getMode() === 'source') {
							// 延迟执行，避免频繁触发
							this.debounce(() => {
								// 检查光标是否在表格内
								const tableInfo = this.markdownSourceEditor.locateTableInMarkdown(editor);
								if (tableInfo) {
									// 设置编辑模式下的活动表格
									this.setupEditModeTableSelection(editor);
								}
							}, 500)();
						}
					}
				})
			);
			
			// 监听编辑器点击事件，检测表格
			this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
				if (this.settings.toolbarEnabled && this.settings.enableEditModeOperations) {
					// 获取当前视图
					const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
					if (activeView && activeView.getMode() === 'source') {
						// 延迟执行，确保光标已更新
						setTimeout(() => {
							const editor = activeView.editor;
							// 检查光标是否在表格内
							const tableInfo = this.markdownSourceEditor.locateTableInMarkdown(editor);
							if (tableInfo) {
								// 设置编辑模式下的活动表格
								this.setupEditModeTableSelection(editor);
							}
						}, 100);
					}
				}
			});
			
			// 添加命令 - 在编辑模式下为表格添加ID
			this.addCommand({
				id: 'add-table-id-in-edit-mode',
				name: '在编辑模式下为表格添加ID',
				editorCallback: async (editor) => {
					if (this.settings.enableEditModeOperations) {
						await this.markdownSourceEditor.addTableIdToMarkdown();
					} else {
						new Notice('编辑模式下的表格操作已禁用，请在设置中启用');
					}
				}
			});
			
			// 添加命令 - 在编辑模式下向右合并单元格
			this.addCommand({
				id: 'merge-cell-right-in-edit-mode',
				name: '在编辑模式下向右合并单元格',
				editorCallback: async (editor) => {
					if (this.settings.enableEditModeOperations) {
						await this.markdownSourceEditor.mergeCells('right');
					} else {
						new Notice('编辑模式下的表格操作已禁用，请在设置中启用');
					}
				}
			});
			
			// 添加命令 - 在编辑模式下向下合并单元格
			this.addCommand({
				id: 'merge-cell-down-in-edit-mode',
				name: '在编辑模式下向下合并单元格',
				editorCallback: async (editor) => {
					if (this.settings.enableEditModeOperations) {
						await this.markdownSourceEditor.mergeCells('down');
					} else {
						new Notice('编辑模式下的表格操作已禁用，请在设置中启用');
					}
				}
			});
			
			// 添加命令 - 显示当前表格ID
			this.addCommand({
				id: 'show-current-table-id',
				name: '显示当前表格ID',
				callback: async () => {
					await this.showCurrentTableId();
				}
			});
			
			// 添加命令 - 拆分已合并的单元格
			this.addCommand({
				id: 'split-merged-cells',
				name: '拆分已合并的单元格',
				editorCallback: async (editor) => {
					if (this.settings.enableEditModeOperations) {
						await this.markdownSourceEditor.splitMergedCells();
					} else {
						new Notice('编辑模式下的表格操作已禁用，请在设置中启用');
					}
				}
			});
			
			// 添加命令 - 修复表格合并标记
			this.addCommand({
				id: 'fix-merge-markers',
				name: '修复表格合并标记',
				editorCallback: async (editor) => {
					if (this.settings.enableEditModeOperations) {
						await this.markdownSourceEditor.detectAndFixMergeMarkers();
					} else {
						new Notice('编辑模式下的表格操作已禁用，请在设置中启用');
					}
				}
			});
			
			// 注册其他事件和处理器
		this.registerMarkdownCodeBlockProcessor(
			'sheet',
			async (
				source: string,
				el: HTMLTableElement,
				ctx: MarkdownPostProcessorContext
			) => {
				source = source.trim();
				ctx.addChild(
					new SheetElement(
						el,
						source,
						ctx,
						this.app,
						this
					)
				);
			}
		);

			// 注册 Markdown 后处理器
		this.registerMarkdownPostProcessor(async (el, ctx) => 
		{
			if (!this.settings.nativeProcessing) return;
			if (ctx.frontmatter?.['disable-sheet'] === true) return;

			const tableEls = el.querySelectorAll('table');
			if (tableEls.length) {
				for (const tableEl of Array.from(tableEls))
				{
					if (!tableEl) return;
					if (tableEl?.id === 'obsidian-sheets-parsed') return;

					// 确保表格有ID（如果启用了表格ID功能）
					if (this.settings.enableTableIds) {
						this.tableIdManager.ensureTableHasId(tableEl as HTMLElement);
					}
					
					// 应用合并单元格标记（如果启用了单元格合并功能）
					if (this.settings.enableCellMerging !== false) {
						// 优先使用增强的渲染方法
						this.renderMergedCells(tableEl as HTMLTableElement, ctx);
						// 如果表格有rowspan/colspan属性，也应用工具栏样式
						if (tableEl.querySelector('[rowspan], [colspan]')) {
							this.tableDetector.applyMergeCellsMarkers(tableEl as HTMLElement);
						}
					}

					// 处理表格...
					// 这里保留表格处理逻辑，但移除与工具栏显示/隐藏相关的代码
				}
			}
		});
			
			// 添加设置选项卡
			this.addSettingTab(new SheetSettingsTab(this.app, this));
			
			console.log('Advanced Table XT plugin loaded successfully');
		} catch (error) {
			console.error('Error loading Advanced Table XT plugin:', error);
		}
		
		// 设置视图模式变化监听
		this.setupViewModeChangeListener();
		
		// 初始检查当前模式
		this.checkAndRenderTables();
		
		console.log('Advanced Table XT 插件已加载');
	}
	
	/**
	 * 防抖函数
	 * @param func 要执行的函数
	 * @param wait 等待时间（毫秒）
	 */
	private debounce(func: Function, wait: number) {
		let timeout: NodeJS.Timeout | null = null;
		
		return function(...args: any[]) {
			const context = this;
			
			const later = function() {
				timeout = null;
				func.apply(context, args);
			};
			
			if (timeout) clearTimeout(timeout);
			timeout = setTimeout(later, wait);
		};
	}
	
	// 创建工具栏 - 新方法，只在需要时创建工具栏
	createToolbar(): void {
		try {
			// 移除已有的工具栏
			document.querySelectorAll('.advanced-table-toolbar-container').forEach(container => {
				container.remove();
			});
			
			// 创建工具栏容器
			const toolbarContainer = document.createElement('div');
			toolbarContainer.className = 'advanced-table-toolbar-container';
			document.body.appendChild(toolbarContainer);
			
			// 创建工具栏
			this.tableToolbar.createToolbar(toolbarContainer);
			
			// 添加文档点击事件，用于处理表格外点击
			document.addEventListener('click', this.handleDocumentClick);
			
			// 获取当前视图
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				// 检查当前模式
				const isEditMode = activeView.getMode() === 'source';
				
				if (isEditMode) {
					// 在编辑模式下，检查光标是否在表格内
					const tableInfo = this.markdownSourceEditor.locateTableInMarkdown(activeView.editor);
					if (tableInfo) {
						// 设置编辑模式下的活动表格
						this.setupEditModeTableSelection(activeView.editor);
					}
				} else {
					// 在预览模式下，设置表格选择
					this.setupPreviewModeTableSelection();
				}
			}
			
			console.log('工具栏已创建');
		} catch (error) {
			console.error('创建工具栏时出错:', error);
		}
	}
	
	/**
	 * 设置表格选择功能
	 */
	setupTableSelection(): void {
		try {
			// 获取当前视图
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!activeView) return;

			// 检查当前模式
			const isEditMode = activeView.getMode() === 'source';

			if (isEditMode) {
				// 在编辑模式下，使用编辑器事件
				this.setupEditModeTableSelection(activeView.editor);
			} else {
				// 在预览模式下，使用DOM事件
				this.setupPreviewModeTableSelection();
			}
		} catch (error) {
			console.error('设置表格选择时出错:', error);
		}
	}

	/**
	 * 设置编辑模式下的表格选择功能
	 * @param editor 编辑器实例
	 */
	setupEditModeTableSelection(editor: Editor): void {
		try {
			// 获取当前光标位置
			const cursor = editor.getCursor();
			console.log(`编辑模式下光标位置: 行=${cursor.line}, 列=${cursor.ch}`);
			
			// 检查光标是否在表格内
			const tableInfo = this.markdownSourceEditor.locateTableInMarkdown(editor);
			if (!tableInfo) {
				console.log('编辑模式下未找到表格');
				// 如果没有找到表格，清除当前编辑表格状态
				if (this.currentEditingTable) {
					this.currentEditingTable = null;
					// 清除工具栏的表格选择
					if (this.tableToolbar) {
						this.tableToolbar.clearSelection();
					}
				}
				return;
			}
			
			console.log(`编辑模式下找到表格: 范围=${tableInfo.startLine}-${tableInfo.endLine}`);
			
			// 创建工具栏（如果尚未创建）
			if (!document.querySelector('.advanced-table-toolbar-container')) {
				this.createToolbar();
			}
			
			// 保存当前编辑表格信息
			this.currentEditingTable = {
				startLine: tableInfo.startLine,
				endLine: tableInfo.endLine,
				content: tableInfo.content
			};
			
			// 设置活动表格
			this.tableToolbar.setActiveEditModeTable(this.currentEditingTable);
			
			// 获取单元格位置信息（用于调试）
			const cellPosition = this.markdownSourceEditor.getCellPosition(editor);
			if (cellPosition) {
				console.log(`编辑模式下光标位于单元格: 行=${cellPosition.rowIndex}, 列=${cellPosition.colIndex}`);
			} else {
				console.log('编辑模式下无法确定光标所在单元格');
			}
			
			console.log('编辑模式下选择了表格:', this.currentEditingTable);
		} catch (error) {
			console.error('设置编辑模式表格选择时出错:', error);
		}
	}

	/**
	 * 设置预览模式下的表格选择功能
	 */
	setupPreviewModeTableSelection(): void {
		try {
			// 使用独立的setupPreviewModeTableSelection方法
			setupPreviewModeTableSelection(this);
		} catch (error) {
			console.error('设置预览模式表格选择时出错:', error);
		}
	}

	onunload() {
		console.log('卸载 Advanced Table XT 插件');
		
		// 移除工具栏容器
		document.querySelectorAll('.advanced-table-toolbar-container').forEach(container => {
			container.remove();
		});
		
		// 移除所有表格高亮和选择状态
		this.removeAllTableHighlights();
		
		// 清除表格上的自定义数据属性
		document.querySelectorAll('table[data-table-processed]').forEach(table => {
			const tableEl = table as HTMLElement;
			delete tableEl.dataset.tableProcessed;
			delete tableEl.dataset.tableSelected;
			tableEl.style.outline = '';
			tableEl.style.outlineOffset = '';
			
			// 移除点击事件
			tableEl.onclick = null;
		});
		
		// 不再需要移除文档级事件监听器，因为我们已经移除了它
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
	
	highlightSelectedTable(table: HTMLElement): void {
		// 移除所有表格的高亮
		this.removeAllTableHighlights();
		
		// 高亮选中的表格
		table.style.outline = '2px solid var(--interactive-accent)';
		table.style.outlineOffset = '2px';
		table.dataset.tableSelected = 'true';
	}
	
	removeAllTableHighlights(): void {
		document.querySelectorAll('table[data-table-selected="true"]').forEach(table => {
			const tableEl = table as HTMLElement;
			tableEl.style.outline = '';
			tableEl.style.outlineOffset = '';
			delete tableEl.dataset.tableSelected;
		});
	}
	
	createTableData(table: HTMLElement, tableId: string): void {
		try {
			// 验证表格ID是否来自HTML注释
			const commentId = this.tableIdManager.getTableIdentifier(table);
			
			// 如果没有从HTML注释中获取到ID，或者与传入的ID不匹配，则不创建数据
			if (!commentId || commentId !== tableId) {
				console.warn(`表格ID验证失败: 传入ID=${tableId}, HTML注释ID=${commentId || '无'}`);
				console.warn('只有在HTML注释中明确定义的表格ID才能创建数据');
				return;
			}
			
			// 获取当前活动视图
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!activeView) {
				console.warn('无法获取当前视图，不创建表格数据');
				return;
			}
			
			// 获取文件路径
			const filePath = activeView.file?.path;
			if (!filePath) {
				console.warn('无法获取文件路径，不创建表格数据');
				return;
			}
			
			console.log(`为有效的HTML注释ID创建表格数据: ${tableId}`);
			
			// 提取表格信息
			this.tableToolbar.extractAndStoreTableInfo(tableId, table, filePath);
		} catch (error) {
			console.error('创建表格数据时出错:', error);
		}
	}
	
	async saveTableData(tableData: any): Promise<void> {
		try {
			// 验证表格ID是否有效
			if (!tableData || !tableData.id) {
				console.warn('无效的表格数据，缺少ID');
				return;
			}
			
			// 检查是否为从HTML注释中获取的ID
			// 这里我们无法直接验证ID来源，但可以通过日志提醒
			console.log(`准备保存表格数据: ${tableData.id}`);
			
			// 获取当前存储的表格数据
			const existingData = await this.loadData() || {};
			
			// 确保存在表格数据对象
			if (!existingData.tables) {
				existingData.tables = {};
			}
			
			// 更新特定表格的数据
			existingData.tables[tableData.id] = tableData;
			
			// 保存更新后的数据
			await this.saveData(existingData);
			
			console.log(`已保存表格数据: ${tableData.id}`);
		} catch (error) {
			console.error('保存表格数据时出错:', error);
		}
	}
	
	private updateRibbonIcon(): void {
		if (!this.ribbonIcon) return;
		
		// 清除现有图标
		this.ribbonIcon.empty();
		
		// 根据工具栏状态设置图标
		if (this.settings.toolbarEnabled) {
			// 工具栏启用 - 显示彩色图标
			const iconEl = this.ribbonIcon.createEl('div', {
				cls: 'ribbon-icon-active'
			});
			
			// 设置图标
			iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>`;
			
			// 添加激活样式
			iconEl.style.color = 'var(--interactive-accent)';
		} else {
			// 工具栏禁用 - 显示灰色图标
			const iconEl = this.ribbonIcon.createEl('div');
			
			// 设置图标
			iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>`;
		}
	}
	
	toggleToolbarState(): void {
		// 切换工具栏状态
		this.settings.toolbarEnabled = !this.settings.toolbarEnabled;
		
		// 更新设置
		this.saveSettings();
		
		// 更新图标状态
		this.updateRibbonIcon();
		
		// 根据状态创建或移除工具栏
		if (this.settings.toolbarEnabled) {
			this.createToolbar();
			new Notice('表格工具栏已启用');
		} else {
			// 移除工具栏容器
			document.querySelectorAll('.advanced-table-toolbar-container').forEach(container => {
				container.remove();
			});
			new Notice('表格工具栏已禁用');
		}
	}

	/**
	 * 处理表格点击事件
	 * @param event 点击事件
	 */
	handleTableClick = (event: MouseEvent): void => {
		try {
			const target = event.target as HTMLElement;
			const table = target.closest('table') as HTMLElement;
			
			if (!table) return;
			
			// 设置为活动表格
			this.tableToolbar.setActiveTable(table);
			
			// 高亮显示选中的表格
			this.highlightSelectedTable(table);
			
			// 阻止事件冒泡
			event.stopPropagation();
		} catch (error) {
			console.error('处理表格点击事件时出错:', error);
		}
	}

	/**
	 * 处理文档点击事件
	 * @param event 点击事件
	 */
	handleDocumentClick = (event: MouseEvent): void => {
		try {
			// 检查点击是否在工具栏内
			const isClickInToolbar = event.target instanceof Node && 
				document.querySelector('.advanced-table-toolbar-container')?.contains(event.target);
			
			// 检查点击是否在表格内
			const isClickInTable = event.target instanceof Node && 
				(event.target as HTMLElement).closest('table') !== null;
			
			// 如果点击不在工具栏或表格内，清除表格选择
			if (!isClickInToolbar && !isClickInTable) {
				// 清除表格选择
				if (this.tableToolbar.activeTable) {
					this.tableToolbar.clearSelection();
				}
			}
		} catch (error) {
			console.error('处理文档点击事件时出错:', error);
		}
	}

	/**
	 * 显示当前表格ID
	 */
	async showCurrentTableId(): Promise<void> {
		try {
			// 获取当前视图
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!activeView) {
				new Notice('未找到活动视图');
				return;
			}
			
			// 检查当前模式
			const isEditMode = activeView.getMode() === 'source';
			
			let tableId: string | null = null;
			
			if (isEditMode) {
				// 在编辑模式下，使用 MarkdownSourceEditor 获取表格ID
				tableId = await this.markdownSourceEditor.getCurrentTableId();
			} else {
				// 在预览模式下，使用 TableIdManager 获取表格ID
				if (this.tableToolbar.activeTable) {
					tableId = this.tableIdManager.getTableIdentifier(this.tableToolbar.activeTable);
				}
			}
			
			if (tableId) {
				new Notice(`当前表格ID: ${tableId}`);
				console.log('当前表格ID:', tableId);
			} else {
				new Notice('未找到表格ID，请确保光标在表格内或已选择表格');
			}
		} catch (error) {
			console.error('显示当前表格ID时出错:', error);
		}
	}

	/**
	 * 渲染合并单元格
	 * @param tableEl 表格元素
	 * @param ctx Markdown处理上下文
	 */
	private renderMergedCells(tableEl: HTMLTableElement, ctx: MarkdownPostProcessorContext): void {
		try {
			// 检查表格是否已经处理过
			if ((tableEl as HTMLElement).dataset.tableMergeProcessed === 'true') {
				return;
			}
			
			// 获取表格内容
			const rawMarkdown = ctx.getSectionInfo(tableEl)?.text || htmlToMarkdown(tableEl);
			if (!rawMarkdown) return;
			
			// 解析表格内容
			const lines = rawMarkdown.split('\n');
			const tableLines = lines.filter(line => line.trim().startsWith('|') && line.trim().endsWith('|'));
			
			// 如果没有找到有效的表格行，返回
			if (tableLines.length < 2) return;
			
			// 移除表头分隔行（第二行）
			const contentLines = [tableLines[0]].concat(tableLines.slice(2));
			
			// 解析表格结构
			const rows: string[][] = [];
			for (const line of contentLines) {
				const cells = line.split('|')
					.filter((_, i, arr) => i > 0 && i < arr.length - 1)
					.map(cell => cell.trim());
				rows.push(cells);
			}
			
			// 获取表格DOM结构
			const domRows = tableEl.querySelectorAll('tr');
			if (domRows.length !== rows.length) return;
			
			// 处理合并单元格
			for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
				const rowCells = rows[rowIndex];
				const domRow = domRows[rowIndex];
				const domCells = domRow.querySelectorAll('th, td');
				
				if (domCells.length !== rowCells.length) continue;
				
				for (let colIndex = 0; colIndex < rowCells.length; colIndex++) {
					const cellContent = rowCells[colIndex];
					const domCell = domCells[colIndex] as HTMLTableCellElement;
					
					// 处理向左合并
					if ((cellContent === '<' || cellContent === '\\<' || 
						 cellContent === ' < ' || cellContent === ' \\< ') && colIndex > 0) {
						const leftCell = domCells[colIndex - 1] as HTMLTableCellElement;
						leftCell.colSpan = (leftCell.colSpan || 1) + 1;
						domCell.style.display = 'none';
						
						// 如果启用了自动居中
						if (this.settings.autoCenterMergedCells) {
							leftCell.style.textAlign = 'center';
							leftCell.style.verticalAlign = 'middle';
						}
						
						// 添加合并样式类
						leftCell.classList.add('obs-merged-cell');
					}
					// 处理向上合并
					else if ((cellContent === '^' || cellContent === '\\^' || 
							  cellContent === ' ^ ' || cellContent === ' \\^ ') && rowIndex > 0) {
						const aboveRow = domRows[rowIndex - 1];
						const aboveCells = aboveRow.querySelectorAll('th, td');
						
						if (colIndex < aboveCells.length) {
							const aboveCell = aboveCells[colIndex] as HTMLTableCellElement;
							aboveCell.rowSpan = (aboveCell.rowSpan || 1) + 1;
							domCell.style.display = 'none';
							
							// 如果启用了自动居中
							if (this.settings.autoCenterMergedCells) {
								aboveCell.style.textAlign = 'center';
								aboveCell.style.verticalAlign = 'middle';
							}
							
							// 添加合并样式类
							aboveCell.classList.add('obs-merged-cell');
						}
					}
				}
			}
			
			// 标记表格为已处理
			(tableEl as HTMLElement).dataset.tableMergeProcessed = 'true';
			
			console.log('已渲染表格合并单元格');
		} catch (error) {
			console.error('渲染合并单元格时出错:', error);
		}
	}

	/**
	 * 从Markdown文件中读取表格ID
	 * 这是一个更可靠的方法，因为它不依赖于DOM结构
	 * @param table 表格元素
	 * @returns Promise<string | null>
	 */
	async readTableIdFromMarkdown(table: HTMLElement): Promise<string | null> {
		try {
			// 尝试从表格元素的data-table-id属性获取ID
			const existingId = table.getAttribute('data-table-id');
			if (existingId) {
				console.log(`从表格元素属性中获取ID: ${existingId}`);
				return existingId;
			}
			
			// 获取当前活动视图
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!activeView) {
				console.log('未找到活动视图');
				return null;
			}
			
			// 尝试从预览模式的渲染上下文获取ID
			if (activeView.getMode() === 'preview') {
				// @ts-ignore - Obsidian API可能没有完全类型化
				const sectionInfo = activeView.previewMode.renderer?.getSectionInfo?.(table);
				if (sectionInfo && sectionInfo.text) {
					const text = sectionInfo.text;
					const idMatch = text.match(/<!--\s*table[-_]?id:\s*([a-zA-Z0-9_\-:.]+)\s*-->/i) || 
								  text.match(/<!--\s*tableid:\s*([a-zA-Z0-9_\-:.]+)\s*-->/i) ||
								  text.match(/<!--\s*id:\s*([a-zA-Z0-9_\-:.]+)\s*-->/i) ||
								  text.match(/<!--\s*(tbl|table):\s*([a-zA-Z0-9_\-:.]+)\s*-->/i) ||
								  text.match(/<!--table-id:([a-zA-Z0-9_\-:.]+)-->/i);
					
					if (idMatch) {
						const id = idMatch[1] || idMatch[2];
						console.log(`从预览模式渲染上下文中找到表格ID: ${id}`);
						return id;
					}
				}
			}
			
			// 获取当前活动文件
			const activeFile = this.app.workspace.getActiveFile();
			if (!activeFile) {
				console.log('未找到活动文件');
				return null;
			}
			
			console.log(`尝试从文件内容中查找表格ID: ${activeFile.path}`);
			
			// 获取页面中所有表格
			const allTables = Array.from(document.querySelectorAll('table'));
			
			// 找到当前表格的索引
			const tableIndex = allTables.indexOf(table as HTMLTableElement);
			if (tableIndex === -1) {
				console.log('未找到表格索引');
				return null;
			}
			
			console.log(`表格位置: 第${tableIndex}个表格`);
			
			// 读取文件内容
			const content = await this.app.vault.read(activeFile);
			const lines = content.split('\n');
			
			// 查找所有表格和对应的ID
			let tableCount = 0;
			
			for (let i = 0; i < lines.length; i++) {
				// 检查是否是表格开始行
				if (lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
					// 检查是否是表格的第一行（有分隔行）
					if (i + 1 < lines.length && lines[i + 1].trim().match(/^\|[-:\s|]*\|$/)) {
						// 如果找到了对应索引的表格
						if (tableCount === tableIndex) {
							// 向上查找ID注释
							for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
								const line = lines[j].trim();
								
								// 检查各种ID格式
								const idMatch = line.match(/<!--\s*table[-_]?id:\s*([a-zA-Z0-9_\-:.]+)\s*-->/i) || 
											  line.match(/<!--\s*tableid:\s*([a-zA-Z0-9_\-:.]+)\s*-->/i) ||
											  line.match(/<!--\s*id:\s*([a-zA-Z0-9_\-:.]+)\s*-->/i) ||
											  line.match(/<!--\s*(tbl|table):\s*([a-zA-Z0-9_\-:.]+)\s*-->/i) ||
											  line.match(/<!--table-id:([a-zA-Z0-9_\-:.]+)-->/i);
								
								if (idMatch) {
									// 提取ID
									const id = idMatch[1] || idMatch[2];
									console.log(`从Markdown内容中找到表格ID: ${id}`);
									
									// 将ID保存到表格元素上，以便后续使用
									table.setAttribute('data-table-id', id);
									
									return id;
								}
								
								// 如果遇到非空行且不是注释行，则停止搜索
								if (line !== '' && !line.startsWith('<!--') && !line.startsWith('//')) {
									break;
								}
							}
							
							// 如果没有找到ID，生成一个新的ID
							if (this.settings.enableTableIds) {
								const newId = this.tableIdManager.generateTableId();
								console.log(`未找到表格ID，生成新ID: ${newId}`);
								
								// 将ID保存到表格元素上，以便后续使用
								table.setAttribute('data-table-id', newId);
								
								return newId;
							}
							
							// 如果禁用了表格ID功能，则返回null
							console.log('未在Markdown内容中找到表格ID，且表格ID功能已禁用');
							return null;
						}
						
						// 增加表格计数
						tableCount++;
					}
				}
			}
			
			console.log(`在文件中只找到 ${tableCount} 个表格，索引 ${tableIndex} 超出范围`);
			return null;
		} catch (error) {
			console.error('从Markdown内容读取表格ID时出错:', error);
			return null;
		}
	}
	
	
	/**
	 * 设置视图模式变化监听
	 */
	setupViewModeChangeListener(): void {
		// 移除可能存在的旧监听器
		if (this.viewModeChangeHandler) {
			this.app.workspace.off('active-leaf-change', this.viewModeChangeHandler);
			this.app.workspace.off('layout-change', this.viewModeChangeHandler);
		}
		
		// 创建新的处理函数
		this.viewModeChangeHandler = () => {
			this.checkAndRenderTables();
		};
		
		// 注册监听器
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', this.viewModeChangeHandler)
		);
		
		this.registerEvent(
			this.app.workspace.on('layout-change', this.viewModeChangeHandler)
		);
		
		console.log("已设置视图模式变化监听器");
	}

	/**
	 * 检查当前模式并在需要时渲染表格
	 */
	checkAndRenderTables(): void {
		// 获取当前活动视图
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) return;
		
		// 检查是否是预览模式
		const isPreviewMode = activeView.getMode() === 'preview';
		
		// 如果是预览模式，且与上次状态不同，触发渲染
		if (isPreviewMode && !this.lastPreviewModeState) {
			// 延迟执行，确保DOM已完全加载
			setTimeout(() => {
				renderTablesWithStoredStyles(this);
			}, 300);
		}
		
		// 记录当前状态
		this.lastPreviewModeState = isPreviewMode;
	}
}

// 默认导出插件类
export default ObsidianSpreadsheet;
