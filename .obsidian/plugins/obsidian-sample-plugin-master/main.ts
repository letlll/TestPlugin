import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
// @ts-ignore
import { shell } from 'electron';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', async (event: MouseEvent) => {
			if (event.detail !== 2) return; // 只处理双击
			let target = event.target as HTMLElement;
			console.log('双击事件 target:', target);

			// 1. 预览模式图片
			if (
				target &&
				target.classList &&
				target.classList.contains('internal-embed') &&
				target.classList.contains('image-embed')
			) {
				let src = target.getAttribute('src');
				if (!src) {
					const img = target.querySelector('img');
					if (img) src = img.getAttribute('alt') || img.getAttribute('src');
				}
				if (!src) return;
				if (!src.startsWith('http') && !src.startsWith('data:')) {
					const file = this.app.metadataCache.getFirstLinkpathDest(src, this.app.workspace.getActiveFile()?.path || '');
					if (file && file.path) {
						const vaultBase = (this.app.vault.adapter as any).getBasePath ? (this.app.vault.adapter as any).getBasePath() : (this.app.vault.adapter as any).basePath;
						const absPath = (window as any).require('path').join(vaultBase, file.path);
						console.log('准备打开图片:', absPath);
						shell.openPath(absPath);
						event.preventDefault();
						event.stopPropagation();
					}
				}
			}
			// 2. 预览模式直接点到 <img>
			else if (target && target.tagName === 'IMG') {
				let src = target.getAttribute('alt') || target.getAttribute('src');
				if (!src) return;
				if (!src.startsWith('http') && !src.startsWith('data:')) {
					const file = this.app.metadataCache.getFirstLinkpathDest(src, this.app.workspace.getActiveFile()?.path || '');
					if (file && file.path) {
						const vaultBase = (this.app.vault.adapter as any).getBasePath ? (this.app.vault.adapter as any).getBasePath() : (this.app.vault.adapter as any).basePath;
						const absPath = (window as any).require('path').join(vaultBase, file.path);
						console.log('准备打开图片:', absPath);
						shell.openPath(absPath);
						event.preventDefault();
						event.stopPropagation();
					}
				}
			}
			// 3. 编辑模式 ![[xxx]] span
			else if (
				target &&
				target.classList &&
				target.classList.contains('cm-hmd-embed') &&
				target.classList.contains('cm-hmd-internal-link')
			) {
				let src = target.innerText;
				if (!src) return;
				if (!src.startsWith('http') && !src.startsWith('data:')) {
					const file = this.app.metadataCache.getFirstLinkpathDest(src, this.app.workspace.getActiveFile()?.path || '');
					if (file && file.path) {
						const vaultBase = (this.app.vault.adapter as any).getBasePath ? (this.app.vault.adapter as any).getBasePath() : (this.app.vault.adapter as any).basePath;
						const absPath = (window as any).require('path').join(vaultBase, file.path);
						console.log('准备打开图片:', absPath);
						shell.openPath(absPath);
						event.preventDefault();
						event.stopPropagation();
					}
				}
			}
		}, true);

		// 编辑模式下点击 ![[xxx]] 语法用系统查看器打开（已弃用 editor.cm.on，兼容新版 Obsidian）
		// 只保留全局 DOM 事件和图片打开逻辑
		// this.registerEvent(this.app.workspace.on('active-leaf-change', leaf => {
		// 	const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 	if (view && view.getMode && view.getMode() === 'source') {
		// 		const editor = view.editor;
		// 		// @ts-ignore
		// 		if (editor.cm && !editor.cm._imageClickHandler) {
		// 			// @ts-ignore
		// 			editor.cm._imageClickHandler = async (cm: any, event: MouseEvent) => {
		// 				const pos = cm.coordsChar({left: event.clientX, top: event.clientY});
		// 				const line = cm.getLine(pos.line);
		// 				const match = /!\[\[([^\]]+)\]\]/g;
		// 				let m;
		// 				while ((m = match.exec(line)) !== null) {
		// 					const start = m.index;
		// 					const end = m.index + m[0].length;
		// 					if (pos.ch >= start && pos.ch <= end) {
		// 						const filename = m[1];
		// 						const file = this.app.metadataCache.getFirstLinkpathDest(filename, this.app.workspace.getActiveFile()?.path || '');
		// 						if (file && file.path) {
		// 							const vaultBase = (this.app.vault.adapter as any).getBasePath ? (this.app.vault.adapter as any).getBasePath() : (this.app.vault.adapter as any).basePath;
		// 							const absPath = (window as any).require('path').join(vaultBase, file.path);
		// 							shell.openPath(absPath);
		// 							event.preventDefault();
		// 							break;
		// 						}
		// 					}
		// 				}
		// 			};
		// 			// @ts-ignore
		// 			editor.cm.on('mousedown', editor.cm._imageClickHandler);
		// 		}
		// 	}
		// }));

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

		// 代码块换行控制开关（美观switch版）
		const updateCodeBlockWrapState = (pre: HTMLElement, wrap: boolean) => {
			pre.style.whiteSpace = wrap ? 'pre-wrap' : 'pre';
			pre.setAttribute('data-wrap', wrap ? '1' : '0');
		};

		const getCodeBlockKey = (pre: HTMLElement) => {
			const content = pre.textContent || '';
			let hash = 0;
			for (let i = 0; i < content.length; i++) {
				hash = ((hash << 5) - hash) + content.charCodeAt(i);
				hash |= 0;
			}
			return 'codeblock-wrap-' + hash;
		};

		const restoreCodeBlockWrapState = (pre: HTMLElement) => {
			const key = getCodeBlockKey(pre);
			const wrap = localStorage.getItem(key) === '1';
			updateCodeBlockWrapState(pre, wrap);
		};

		const saveCodeBlockWrapState = (pre: HTMLElement, wrap: boolean) => {
			const key = getCodeBlockKey(pre);
			localStorage.setItem(key, wrap ? '1' : '0');
		};

		const addWrapSwitch = (pre: HTMLElement) => {
			if (pre.querySelector('.wrap-switch-container')) return;

			const container = document.createElement('div');
			container.className = 'wrap-switch-container';
			container.style.display = 'none'; // 默认隐藏

			const label = document.createElement('label');
			label.className = 'wrap-switch-label';

			const input = document.createElement('input');
			input.type = 'checkbox';
			input.className = 'wrap-switch-input';

			const slider = document.createElement('span');
			slider.className = 'wrap-switch-slider';

			const wrap = pre.getAttribute('data-wrap') === '1';
			input.checked = wrap;
			pre.style.whiteSpace = wrap ? 'pre-wrap' : 'pre';

			input.onchange = (e) => {
				const checked = input.checked;
				pre.style.whiteSpace = checked ? 'pre-wrap' : 'pre';
				pre.setAttribute('data-wrap', checked ? '1' : '0');
				saveCodeBlockWrapState(pre, checked);
			};

			label.appendChild(input);
			label.appendChild(slider);
			container.appendChild(label);

			pre.style.position = 'relative';
			pre.appendChild(container);

			// 悬停时显示，移开时隐藏
			pre.addEventListener('mouseenter', () => {
				container.style.display = 'block';
			});
			pre.addEventListener('mouseleave', () => {
				container.style.display = 'none';
			});
		};

		const processAllCodeBlocks = () => {
			const pres = document.querySelectorAll('pre');
			pres.forEach(pre => {
				if (pre.classList.contains('wrap-toggle-processed')) return;
				pre.classList.add('wrap-toggle-processed');
				restoreCodeBlockWrapState(pre as HTMLElement);
				addWrapSwitch(pre as HTMLElement);
			});
		};

		// 初始处理
		setTimeout(processAllCodeBlocks, 1000);
		// 页面变化时处理（如切换文档、滚动加载等）
		const observer = new MutationObserver(() => {
			processAllCodeBlocks();
		});
		observer.observe(document.body, { childList: true, subtree: true });
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
