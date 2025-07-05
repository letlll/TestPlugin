// import { MetaParser } from 'metaParser';
import { MarkdownPostProcessorContext, Plugin, htmlToMarkdown } from 'obsidian';
import { SheetSettingsTab } from './settings';
import { SheetElement } from './sheetElement';
import * as JSON5 from 'json5';

interface PluginSettings {
	nativeProcessing: boolean;
	paragraphs: boolean;
}

const DEFAULT_SETTINGS: PluginSettings = {
	nativeProcessing: true,
	paragraphs: true,
};

export class ObsidianSpreadsheet extends Plugin {
	settings: PluginSettings;

	async onload() {
		this.loadSettings();
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

		// this.registerMarkdownCodeBlockProcessor(
		// 	'sheet_meta',
		// 	async (
		// 		source: string,
		// 		el,
		// 		ctx
		// 	) =>
		// 	{
		// 		ctx.addChild(new MetaParser(el, source, ctx, this.app, this));
		// 	}
		// );
		
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

					const sec = ctx.getSectionInfo(tableEl);
					let source: string = '';
					if (!sec)
					{
						tableEl.querySelectorAll(':scope td').forEach(({ childNodes }) => childNodes.forEach(node => 
						{
							if (node.nodeType == 3) // Text node type
								node.textContent = node.textContent?.replace(/[*_`[\]$()]|[~=]{2}/g, '\\$&') || '';
							// See https://help.obsidian.md/Editing+and+formatting/Basic+formatting+syntax#Styling+text
						}));
						tableEl.querySelectorAll(':scope a.internal-link').forEach((link: HTMLAnchorElement) => 
						{ 
							const parsedLink = document.createElement('span');
							parsedLink.innerText = `[[${link.getAttr('href')}|${link.innerText}]]`;
							link.replaceWith(parsedLink);
						});
						tableEl.querySelectorAll(':scope span.math').forEach((link: HTMLSpanElement) =>
							link.textContent?.trim().length ? link.textContent = `$${link.textContent || ''}$` : null
						);

						source = htmlToMarkdown(tableEl).trim().replace(/\\\\/g, '$&$&');
						if (!source) return;
					}
					else
					{
						const {text, lineStart, lineEnd} = sec;
						let textContent = text
							.split('\n')
							.slice(lineStart, 1 + lineEnd)
							.map(line => line.replace(/^.*?(?=\|(?![^[]*]))/, ''));
						const endIndex = textContent.findIndex(line => /^(?!\|)/.test(line));

						if (textContent[0].startsWith('```')) return;
						if (endIndex !== -1) textContent = textContent.slice(0, endIndex + 1);
					
						if (
							!textContent
								.filter((row) => /(?<!\\)\|/.test(row))
								.map((row) => row.split(/(?<!\\)\|/)
									.map(cell => cell.trim()))
								.every(
									(row) => !row.pop()?.trim() && !row.shift()?.trim()
								)
						) return; // Need a better way to figure out if not randering a table; use test for validity on actual table function here since if get to here table is valid.
						source = textContent.join('\n');
					}
		
					tableEl.empty();
					ctx.addChild(new SheetElement(tableEl, source.trim(), ctx, this.app, this));
				}
				return;
			}
			const tableEl = el.closest('table');
			if (!tableEl) return;
			if (tableEl?.id === 'obsidian-sheets-parsed') return;

			const rawMarkdown =
				ctx.getSectionInfo(tableEl)?.text || htmlToMarkdown(tableEl);
			const rawMarkdownArray =
				rawMarkdown
					.replace(/\n\s*\|\s*-+.*?(?=\n)/g, '') // remove newlines and heading delim
					.replace(/^\||\|$/gm, '')
					.split(/\||\n/g);
			const toChange = rawMarkdownArray
				.reduce((cum, curr, i) => {
					/(?<!~|\\)~(?!~)|^(-+|<|\^)\s*$/.test(curr) &&
						cum.push(i);
					return cum;
				}, [] as number[]);

			const tableHead = Array.from(tableEl.querySelectorAll('th'));
			const tableWidth = tableHead.length;
			const DOMCellArray = [...tableHead, ...Array.from(tableEl.querySelectorAll('td'))];

			for (const index of toChange) {
				const column = index % tableWidth;
				const row = Math.floor(index / tableWidth);
				const cellContent = rawMarkdownArray[index];
				if (/(?<!~|\\)~(?!~)/.test(cellContent)) {
					const cellStyles = cellContent.split(/(?<![\\~])~(?!~)/)[1];
					const classes = cellStyles.match(/(?<=\.)\S+/g)?.map(m => m.toString()) || [];

					let cellStyle = {};

					const inlineStyle = cellStyles.match(/\{.*\}/)?.[0] || '{}';
					try {
						cellStyle = { ...cellStyle, ...JSON5.parse(inlineStyle) };
					}
					catch
					{
						console.error(`Invalid cell style \`${inlineStyle}\``);
					}

					const DOMContent: HTMLTableCellElement = DOMCellArray[index].querySelector('.table-cell-wrapper') || DOMCellArray[index];
					Object.assign(DOMContent.style, cellStyle);
					DOMContent.classList.add(...classes);
					DOMContent.innerText = DOMContent.innerText.split(/(?<![\\~])~(?!~)/)[0];
				}
				// merging currently does not work - the cells get merged but the `<`/`^` cells still stay on the table
				// merge left
				else if (/^\s*<\s*$/.test(cellContent) && column > 0) { 
					if (!DOMCellArray[index - 1].colSpan) DOMCellArray[index - 1].colSpan = 1;
					DOMCellArray[index - 1].colSpan += 1;
					// .remove() does not work - table editor renders on top and rebuilds the cell
					DOMCellArray[index].style.display = 'none'; 
					delete DOMCellArray[index];
					DOMCellArray[index] = DOMCellArray[index - 1];
				}
				// merge up
				else if (/^\s*\^\s*$/.test(cellContent) && row > 1) {
					if (!DOMCellArray[index - tableWidth].rowSpan) DOMCellArray[index - 1].rowSpan = 1;
					DOMCellArray[index - tableWidth].rowSpan += 1;
					DOMCellArray[index].style.display = 'none';
					delete DOMCellArray[index];
					DOMCellArray[index] = DOMCellArray[index - tableWidth];
				} 
				// TODO: row headers
				// else if (/^\s*-+\s*$/.test(cellContent)) {
				// } 
				// classes and styling
			}

			return tableEl.id = 'obsidian-sheets-parsed';

		});

		this.addSettingTab(new SheetSettingsTab(this.app, this));
	}

	onunload() {
		// console.log('unloading spreadsheet plugin');
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
}

export default ObsidianSpreadsheet;
