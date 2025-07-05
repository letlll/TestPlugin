import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface NbspHideSettings {
	hideNbsp: boolean;
	visibleColor: string;
	hiddenColor: string;
}

const DEFAULT_SETTINGS: NbspHideSettings = {
	hideNbsp: true,
	visibleColor: "#000000", // 黑色，可见状态
	hiddenColor: "#ff0000"   // 红色，隐藏状态
}

export default class NbspHidePlugin extends Plugin {
	settings: NbspHideSettings;
	statusBarItem: HTMLElement | null = null;
	
	async onload() {
		await this.loadSettings();
		
		// 添加状态栏
		this.statusBarItem = this.addStatusBarItem();
		this.updateStatusBar();
		
		// 添加图标按钮
		this.addRibbonIcon('eye-off', '切换&nbsp;可见性', async () => {
			this.settings.hideNbsp = !this.settings.hideNbsp;
			await this.saveSettings();
			this.updateStatusBar();
			this.updateNbspInEditor();
			new Notice(`非断行空格现在${this.settings.hideNbsp ? '已隐藏' : '可见'}`);
		});
		
		// 添加切换命令
		this.addCommand({
			id: 'toggle-nbsp-visibility',
			name: '切换&nbsp;可见性',
			callback: async () => {
				this.settings.hideNbsp = !this.settings.hideNbsp;
				await this.saveSettings();
				this.updateStatusBar();
				this.updateNbspInEditor();
				new Notice(`非断行空格现在${this.settings.hideNbsp ? '已隐藏' : '可见'}`);
			}
		});
		
		// 添加替换命令
		this.addCommand({
			id: 'replace-nbsp-with-space',
			name: '将&nbsp;替换为普通空格（文件内容）',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const content = editor.getValue();
				const newContent = content.replace(/&nbsp;/g, ' ');
				editor.setValue(newContent);
				new Notice(`已将所有&nbsp;替换为普通空格，文件内容已修改`);
			}
		});
		
		// 添加强制刷新命令
		this.addCommand({
			id: 'refresh-nbsp-display',
			name: '强制刷新&nbsp;显示',
			callback: () => {
				this.updateNbspInEditor(true);
				new Notice('已刷新&nbsp;显示');
			}
		});
		
		// 添加强制显示命令
		this.addCommand({
			id: 'force-show-nbsp',
			name: '强制显示所有&nbsp;',
			callback: async () => {
				this.settings.hideNbsp = false;
				await this.saveSettings();
				this.updateStatusBar();
				this.updateNbspInEditor(true);
				new Notice('已强制显示所有非断行空格');
			}
		});
		
		// 添加设置选项卡
		this.addSettingTab(new NbspHideSettingTab(this.app, this));
		
		// 监听编辑器变化
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				this.handleActiveLeafChange();
			})
		);
		
		this.registerEvent(
			this.app.workspace.on('file-open', () => {
				this.handleFileOpen();
			})
		);
		
		// 初始化
		this.handleActiveLeafChange();
	}
	
	// 更新状态栏
	updateStatusBar() {
		if (this.statusBarItem) {
			this.statusBarItem.setText('');
			this.statusBarItem.setText('NBSP: ' + (this.settings.hideNbsp ? '已隐藏' : '可见'));
			
			if (this.settings.hideNbsp) {
				this.statusBarItem.addClass('nbsp-hidden-status');
				this.statusBarItem.removeClass('nbsp-visible-status');
			} else {
				this.statusBarItem.addClass('nbsp-visible-status');
				this.statusBarItem.removeClass('nbsp-hidden-status');
			}
		} else {
			this.statusBarItem = this.addStatusBarItem();
			this.statusBarItem.setText('NBSP: ' + (this.settings.hideNbsp ? '已隐藏' : '可见'));
		}
	}
	
	// 检查是否在源码模式
	isInSourceMode(view?: MarkdownView): boolean {
		const activeView = view || this.app.workspace.getActiveViewOfType(MarkdownView);
		return activeView ? activeView.getMode() === 'source' : false;
	}
	
	// 处理活动叶子变化
	handleActiveLeafChange() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView && this.isInSourceMode(activeView)) {
			this.updateNbspInEditor();
		}
	}
	
	// 处理文件打开
	handleFileOpen() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView && this.isInSourceMode(activeView)) {
			this.updateNbspInEditor();
		}
	}
	
	// 更新编辑器中的&nbsp;
	updateNbspInEditor(force = false) {
		// 获取当前活动视图
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;
		
		// 检查是否在源码模式
		if (!this.isInSourceMode(view)) return;
		
		const editor = view.editor;
		if (!editor) return;
		
		// 获取当前内容
		const content = editor.getValue();
		
		// 检查是否包含&nbsp;或旧格式的span标签或带颜色的字体标签
		if (!content.includes('&nbsp;') && 
			!content.includes('class="nbsp-replacement"') && 
			!content.includes('<font color="') && 
			!force) return;
		
		// 获取当前光标位置和选择
		const cursor = editor.getCursor();
		const scrollInfo = editor.getScrollInfo();
		
		// 创建新内容
		let newContent = content;
		
		// 1. 先替换旧格式的span标签
		const spanRegex = /<span class="nbsp-replacement" title="Non-breaking space">&nbsp;<\/span>/g;
		newContent = newContent.replace(spanRegex, '&nbsp;');
		
		// 2. 再替换已有的带颜色的字体标签
		const fontReplaceRegex = /<font color="#[0-9a-fA-F]{6}">&nbsp;<\/font>/g;
		newContent = newContent.replace(fontReplaceRegex, '&nbsp;');
		
		// 3. 根据隐藏模式处理&nbsp;
		// 如果是隐藏模式，用红色字体标签替换；如果是可见模式，保持&nbsp;原样
		if (this.settings.hideNbsp) {
			// 隐藏模式 - 使用红色字体
			const nbspRegex = /&nbsp;/g;
			newContent = newContent.replace(nbspRegex, `<font color="${this.settings.hiddenColor}">&nbsp;</font>`);
		}
		// 在可见模式中，不对&nbsp;做任何处理，保留其原始形式
		
		// 更新编辑器内容
		if (newContent !== content) {
			editor.setValue(newContent);
			
			// 恢复光标位置和滚动位置
			editor.setCursor(cursor);
			editor.scrollTo(scrollInfo.left, scrollInfo.top);
		}
	}
	
	onunload() {
		// 尝试恢复所有带颜色的&nbsp;为普通&nbsp;
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view && this.isInSourceMode(view)) {
			const editor = view.editor;
			if (editor) {
				const content = editor.getValue();
				
				// 替换所有格式的标签
				const fontReplaceRegex = /<font color="#[0-9a-fA-F]{6}">&nbsp;<\/font>/g;
				const spanRegex = /<span class="nbsp-replacement" title="Non-breaking space">&nbsp;<\/span>/g;
				
				let newContent = content;
				newContent = newContent.replace(fontReplaceRegex, '&nbsp;');
				newContent = newContent.replace(spanRegex, '&nbsp;');
				
				if (newContent !== content) {
					const cursor = editor.getCursor();
					const scrollInfo = editor.getScrollInfo();
					
					editor.setValue(newContent);
					editor.setCursor(cursor);
					editor.scrollTo(scrollInfo.left, scrollInfo.top);
				}
			}
		}
	}
	
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}
	
	async saveSettings() {
		await this.saveData(this.settings);
		this.updateStatusBar();
		this.updateNbspInEditor(true);
	}
}

// &nbsp;空格装饰小部件
class NbspSpaceWidget {
	toDOM() {
		const span = document.createElement('span');
		span.textContent = ' '; // 显示为普通空格
		span.className = 'nbsp-space-widget';
		span.setAttribute('aria-label', 'Non-breaking space');
		span.setAttribute('title', 'Non-breaking space &nbsp;');
		return span;
	}
}

class NbspHideSettingTab extends PluginSettingTab {
	plugin: NbspHidePlugin;
	
	constructor(app: App, plugin: NbspHidePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}
	
	display(): void {
		const {containerEl} = this;
		containerEl.empty();
		
		new Setting(containerEl)
			.setName('隐藏源码模式下的&nbsp;')
			.setDesc('启用后，在源码模式下将&nbsp;实体替换为红色字体；禁用时恢复为普通&nbsp;')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.hideNbsp)
				.onChange(async (value) => {
					this.plugin.settings.hideNbsp = value;
					await this.plugin.saveSettings();
					this.plugin.updateStatusBar();
				}));
		
		new Setting(containerEl)
			.setName('隐藏状态颜色')
			.setDesc('设置&nbsp;在隐藏状态下的颜色（默认为红色 #ff0000）')
			.addText(text => text
				.setValue(this.plugin.settings.hiddenColor)
				.onChange(async (value) => {
					// 验证是否为有效的十六进制颜色
					if (/^#[0-9a-fA-F]{6}$/.test(value)) {
						this.plugin.settings.hiddenColor = value;
						await this.plugin.saveSettings();
					} else {
						new Notice('请输入有效的十六进制颜色值，例如 #ff0000');
					}
				}));
		
		containerEl.createEl('div', {
			text: '说明：本插件在隐藏模式下将&nbsp;替换为带颜色的字体标签，在可见模式下恢复为普通&nbsp;。'
		}).addClass('setting-item-description');
		
		containerEl.createEl('div', {
			text: '颜色值必须是有效的十六进制格式，例如 #ff0000（红色）。'
		}).addClass('setting-item-description');
		
		containerEl.createEl('div', {
			text: '如果需要永久将文件中的&nbsp;替换为普通空格，请使用命令面板中的"将&nbsp;替换为普通空格"命令。'
		}).addClass('setting-item-description');
	}
}
