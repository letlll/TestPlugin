import { PluginSettingTab, Setting, App, MarkdownView } from 'obsidian';
import { ObsidianSpreadsheet } from './main';

export class SheetSettingsTab extends PluginSettingTab 
{
	plugin: ObsidianSpreadsheet;

	constructor(app: App, plugin: ObsidianSpreadsheet) 
	{
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void 
	{
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Advanced Table XT 设置' });

		new Setting(containerEl)
			.setName('原生表格后处理')
			.setDesc('启用此设置以使用Obsidian Sheets的渲染器')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.nativeProcessing)
					.onChange(async value => 
					{
						this.plugin.settings.nativeProcessing = value;
						await this.plugin.saveSettings();
						// @ts-expect-error workspace.activeLeaf is deprecated and the following 
						// line is prefered but the following line does not actually work on my 
						// machine so deprecated it is I guess
						this.app.workspace.activeLeaf?.rebuildView();
						this.app.workspace.getActiveViewOfType(MarkdownView)?.previewMode.rerender(true);
					})
			);

		new Setting(containerEl)
			.setName('在单元格中使用段落')
			.setDesc('启用此设置以在表格单元格中使用段落')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.paragraphs)
					.onChange(async value => 
					{
						this.plugin.settings.paragraphs = value;
						await this.plugin.saveSettings();
						// @ts-expect-error workspace.activeLeaf is deprecated and the following 
						// line is prefered but the following line does not actually work on my 
						// machine so deprecated it is I guess
						this.app.workspace.activeLeaf?.rebuildView();
						this.app.workspace.getActiveViewOfType(MarkdownView)?.previewMode.rerender(true);
					})
			);
			
		containerEl.createEl('h3', { text: '工具栏设置' });
		
		new Setting(containerEl)
			.setName('启用表格工具栏')
			.setDesc('启用或禁用表格工具栏功能')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.toolbarEnabled)
					.onChange(async value => 
					{
						this.plugin.settings.toolbarEnabled = value;
						await this.plugin.saveSettings();
						
						if (value) {
							this.plugin.createToolbar();
						} else {
							// 移除工具栏容器
							document.querySelectorAll('.advanced-table-toolbar-container').forEach(container => {
								container.remove();
							});
						}
					})
			);
			
		containerEl.createEl('h3', { text: '编辑模式操作' });
		
		new Setting(containerEl)
			.setName('启用编辑模式下的表格操作')
			.setDesc('允许在编辑模式下直接修改 Markdown 源码中的表格')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableEditModeOperations)
					.onChange(async value => 
					{
						this.plugin.settings.enableEditModeOperations = value;
						await this.plugin.saveSettings();
					})
			);
			
		containerEl.createEl('h3', { text: '单元格合并' });
		
		new Setting(containerEl)
			.setName('启用单元格合并')
			.setDesc('启用使用 < 和 ^ 标记进行单元格合并的功能')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableCellMerging)
					.onChange(async value => 
					{
						this.plugin.settings.enableCellMerging = value;
						await this.plugin.saveSettings();
						this.app.workspace.getActiveViewOfType(MarkdownView)?.previewMode.rerender(true);
					})
			);
			
		new Setting(containerEl)
			.setName('合并非空单元格时确认')
			.setDesc('当合并包含内容的单元格时显示确认对话框')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.confirmMergeNonEmpty)
					.onChange(async value => 
					{
						this.plugin.settings.confirmMergeNonEmpty = value;
						await this.plugin.saveSettings();
					})
			);
			
		new Setting(containerEl)
			.setName('自动居中合并单元格')
			.setDesc('自动将合并单元格中的内容居中显示')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoCenterMergedCells)
					.onChange(async value => 
					{
						this.plugin.settings.autoCenterMergedCells = value;
						await this.plugin.saveSettings();
						this.app.workspace.getActiveViewOfType(MarkdownView)?.previewMode.rerender(true);
					})
			);
			
		containerEl.createEl('h3', { text: '表格ID设置' });
		
		new Setting(containerEl)
			.setName('启用表格ID')
			.setDesc('自动为表格添加ID作为HTML注释')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableTableIds)
					.onChange(async value => 
					{
						this.plugin.settings.enableTableIds = value;
						await this.plugin.saveSettings();
					})
			);
			
		new Setting(containerEl)
			.setName('使用表格注释夹模式')
			.setDesc('在表格前后添加配对的HTML注释，形成"注释夹"，提高表格ID识别的准确性')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.useTableWrapperComments)
					.onChange(async value => 
					{
						this.plugin.settings.useTableWrapperComments = value;
						await this.plugin.saveSettings();
					})
			);
			
		new Setting(containerEl)
			.setName('表格ID前缀')
			.setDesc('生成的表格ID前缀')
			.addText((text) =>
				text
					.setValue(this.plugin.settings.idPrefix)
					.onChange(async value => 
					{
						this.plugin.settings.idPrefix = value;
						await this.plugin.saveSettings();
					})
			);
			
		new Setting(containerEl)
			.setName('表格特征匹配相似度阈值')
			.setDesc('当通过特征匹配表格时，需要达到的最小相似度（0-1之间，默认0.7）')
			.addSlider(slider => 
				slider
					.setLimits(0.5, 1.0, 0.05)
					.setValue(this.plugin.settings.featureSimilarityThreshold || 0.7)
					.setDynamicTooltip()
					.onChange(async value => {
						this.plugin.settings.featureSimilarityThreshold = value;
						await this.plugin.saveSettings();
					})
			);
			
		new Setting(containerEl)
			.setName('优先使用表格特征匹配')
			.setDesc('启用后，将优先使用特征匹配而非位置匹配来识别表格ID')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.preferFeatureMatching || false)
					.onChange(async value => 
					{
						this.plugin.settings.preferFeatureMatching = value;
						await this.plugin.saveSettings();
					})
			);
			
		containerEl.createEl('h3', { text: '数据存储设置' });
		
		new Setting(containerEl)
			.setName('优先使用文件存储')
			.setDesc('启用后，表格数据将优先存储在Markdown文件中，而不是data.json文件中')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.preferFileStorage || false)
					.onChange(async value => 
					{
						this.plugin.settings.preferFileStorage = value;
						await this.plugin.saveSettings();
					})
			);
			
		new Setting(containerEl)
			.setName('自动导出到文件')
			.setDesc('启用后，即使使用data.json存储数据，也会自动将数据导出到Markdown文件中')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoExportToFile || false)
					.onChange(async value => 
					{
						this.plugin.settings.autoExportToFile = value;
						await this.plugin.saveSettings();
					})
			);
			
		new Setting(containerEl)
			.setName('使用紧凑格式存储数据')
			.setDesc('启用后，表格数据将以更紧凑的自定义格式存储，而不是完整的JSON格式')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.useCompactFormat || true)
					.onChange(async value => 
					{
						this.plugin.settings.useCompactFormat = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
