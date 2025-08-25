# Table X 插件

## 项目简介

**Table X** 是为 Obsidian 设计的高级表格增强插件，提供全方位的 Markdown 表格编辑体验。本插件支持单元格合并、精确对齐、尺寸调整、唯一 ID 标识、元数据持久化等高级功能，让您在 Obsidian 中创建专业级复杂表格。插件完美兼容 Obsidian 编辑与阅读模式，支持多端同步与协作，特别适合需要复杂表格编辑和数据一致性的用户。

本项目基于开源项目 [Advanced Table XT](https://github.com/NicoNekoru/obsidan-advanced-table-xt) 进行二次开发，增强了原有功能并优化了性能和用户体验。

```
仓库在 Table X 文件夹中提供多个测试文件，可用于体验和测试插件功能
```

> **核心优势**：Table X 将复杂表格功能与 Markdown 简洁性完美结合，让您在保持文档可读性的同时，获得类似 Excel 的表格编辑体验。

---
## 安装方法

### 方法一：从 GitHub 仓库安装

1. 下载`.obsidian/plugins/obsidian-table-x/`的插件源码。
2. 将`obsidian-table-x`文件夹放置于你的 Obsidian 仓库的 `.obsidian/plugins/` 目录下
3. 重启 Obsidian 并在设置 → 第三方插件中启用 Table X 插件
4. （可选）在插件设置中自定义合并、对齐、尺寸等功能选项

### 方法二：手动构建安装

如果您是开发者或希望使用最新版本：

1. 克隆本仓库到本地
2. 运行 `npm install` 安装依赖
3. 运行 `npm run build` 构建插件
4. 将 `main.js`、`manifest.json` 和 `styles.css`  (可选) 复制到 `.obsidian/plugins/obsidian-table-x/` 目录
5. 重启 Obsidian 并启用插件

> **开发者提示**：您也可以参考 `.obsidian/plugins/advanced-table` 目录下的文件进行二次开发

---
## 效果展示

![表格编辑界面](assets/Pasted%20image%2020250825124111.png)
![表格样式设置](assets/Pasted%20image%2020250825124205.png)
![插件设置界面](assets/Pasted%20image%2020250825133611.png)

## 主要功能

### 表格编辑增强

- **单元格合并**：支持通过右键菜单或浮动工具栏进行横向（`<`）和纵向（`^`）合并，支持多单元格合并与取消合并
- **表格尺寸调整**：可拖拽调整列宽、行高，支持自定义并自动记忆每个表格的尺寸
- **单元格对齐**：支持左/中/右对齐、上/中/下对齐等多种组合对齐方式
- **格式化控制**：一键美化表格，自动调整列宽以适应内容
- **快捷键支持**：提供丰富的键盘快捷键，提高编辑效率

### 数据管理与持久化

- **唯一表格 ID**：每个表格自动生成唯一 UUID，通过 HTML 注释 `<!-- tbl-id: ... -->` 持久化
- **元数据持久化**：行高、列宽、对齐方式等样式信息可持久保存，支持 Style Settings 插件联动
- **文件级数据存储**：支持将表格数据存储在当前 Markdown 文件中，便于版本控制和共享
- **项目级数据存储**：支持将表格数据存储在项目级 data.json 中，便于跨文件引用

### 协作与用户体验

- **复制粘贴感知**：表格复制到其他文件时自动检测并处理 ID 冲突，支持"共享"或"分叉"模式
- **浮动工具栏**：选择表格后自动显示浮动工具栏，提供常用操作按钮
- **上下文菜单**：右键点击表格可访问丰富的上下文菜单选项
- **实时预览**：编辑模式下实时预览表格样式变化
- **性能优化**：异步渲染和数据处理，确保大型表格的流畅操作

## 开发路线图

### 近期计划 (v1.4.0)

- [ ] **渲染的PDF导出**：支持使用官方的PDF导出工具，导出Table X渲染后的表格样式
- [ ] **表格搜索与过滤**：添加表格内容搜索和动态过滤功能
- [ ] **性能优化**：提升大型表格的渲染和编辑性能，隐藏数据代码块在渲染视图中的显示，保证文档美观

### 中期计划 (v1.5.0)

- [ ] **多人协作支持**：兼容 Git/SYNC，支持多端同步、冲突检测与恢复
- [ ] **表格模板系统**：预设多种表格模板，支持自定义和共享模板
- [ ] **数据可视化**：支持简单图表生成，基于表格数据
- [ ] **表格链接**：支持表格间数据引用和链接

### 长期愿景

- [ ] **公式与计算**：支持类似电子表格的公式和计算功能
- [ ] **条件格式化**：根据单元格内容自动应用不同样式
- [ ] **数据导入/导出**：支持CSV、Excel等格式的导入导出
- [ ] **插件生态集成**：与其他Obsidian插件深度集成

---

## 插件设置与自定义

### 基本设置

在 Obsidian 设置 → 第三方插件 → Table X 设置中，您可以配置以下选项：

- **外观设置**
  - 默认行高和列宽
  - 表格边框样式和颜色
  - 表头样式（粗体、背景色等）
  - 合并单元格边框显示方式

- **功能设置**
  - 启用/禁用浮动工具栏
  - 启用/禁用自动表格格式化
  - 启用/禁用编辑模式样式应用
  - 启用/禁用ID冲突检测

- **性能设置**
  - 渲染延迟（毫秒）
  - 数据保存频率
  - 异步处理选项

### 样式自定义

 Table X 支持通过 CSS 片段进行深度自定义：

```css
/* 自定义表格样式示例 */
.table-x-container {
  /* 表格容器样式 */
  font-family: 'Your Preferred Font', sans-serif;
}

.table-x-header {
  /* 表头样式 */
  background-color: #f0f0f0;
  font-weight: bold;
}

.table-x-merged-cell {
  /* 合并单元格样式 */
  background-color: rgba(200, 200, 255, 0.1);
}
```

### 主题集成

如果您是主题开发者，可以通过以下CSS变量与 Table X 集成：

```css
:root {
  --table-x-border-color: #ddd;
  --table-x-header-bg: #f5f5f5;
  --table-x-cell-padding: 8px;
  --table-x-toolbar-bg: rgba(0, 0, 0, 0.6);
  --table-x-toolbar-color: white;
}
```

---
## 使用指南

### 基础操作

- **创建表格**：使用标准 Markdown 表格语法创建表格，插件会自动为新表格分配唯一ID
- **编辑内容**：直接在编辑模式下修改表格内容，支持标准Markdown表格编辑方式
- **表格导航**：使用Tab键在单元格间导航，Shift+Tab反向导航

### 高级编辑功能

- **合并单元格**：
  - 右键点击表格单元格，选择"向右合并"或"向下合并"
  - 支持连续合并（如 `<<`表示向右合并两个单元格，`^^`表示向下合并两个单元格）
  - 在浮动工具栏中使用合并按钮快速合并选中单元格

- **调整尺寸**：
  - 鼠标悬停在表格边缘，出现调整控制柄
  - 拖动控制柄调整列宽/行高
  - 双击列分隔线自动调整为最佳宽度

- **对齐设置**：
  - 右键菜单选择水平对齐方式（左/中/右）
  - 右键菜单选择垂直对齐方式（上/中/下）
  - 通过浮动工具栏一键切换对齐方式

### 数据管理

- **复制粘贴表格**：
  - 复制表格时请包含表格ID注释行 `<!-- tbl-id: ... -->`
  - 插件会自动处理ID与元数据，确保样式一致性

- **冲突处理**：
  - 检测到同一ID出现在多个文件时，插件会提示选择处理方式
  - "共享"模式：多个表格共享同一ID和样式设置
  - "分叉"模式：为新表格分配新ID，独立管理样式

- **数据存储切换**：
  - 使用命令面板中的"导出表格数据到当前文件"将数据从项目级存储迁移到文件级存储
  - 使用"从文件导入表格数据"将文件级数据导入到项目级存储

---

## 数据结构说明

### 项目级数据存储 (data.json)

插件采用简化的数据结构，仅保留渲染所需的关键信息，存储在项目根目录的 `data.json` 文件中：

```json
{
  "tables": {
    "tbl-20241015-abcd1234": {
      "locations": [
        { "path": "文件1.md", "isActive": true },
        { "path": "文件2.md", "isActive": false }
      ],
      "structure": { 
        "rowCount": 5, 
        "colCount": 3, 
        "hasHeaders": true,
        "mergedCells": [
          { "row": 1, "col": 1, "rowspan": 2, "colspan": 1 }
        ]
      },
      "styling": {
        "rowHeights": ["30px", "40px", "30px", "30px", "30px"],
        "colWidths": ["120px", "80px", "100px"],
        "alignment": [
          { "row": 0, "col": 0, "horizontal": "left", "vertical": "middle" },
          { "row": 1, "col": 1, "horizontal": "center", "vertical": "top" }
        ],
        "theme": "default"
      }
    }
  },
  "settings": {
    "defaultRowHeight": "30px",
    "defaultColWidth": "100px",
    "defaultAlignment": { "horizontal": "left", "vertical": "middle" }
  }
}
```

### 文件级数据存储

表格数据也可以直接存储在 Markdown 文件中，使用特殊代码块：

````markdown
# 文档标题

<!-- table-id: tbl-20241015-abcd1234 -->
| 列1 | 列2 | 列3 |
| --- | --- | --- |
| 数据1 | 数据2 | 数据3 |
<!-- table-id: tbl-20241015-abcd1234 -->

```json:table-data
{
  "tbl-20241015-abcd1234": {
    "styling": {
      "colWidths": ["120px", "80px", "100px"],
      "alignment": [
        { "row": 0, "col": 0, "horizontal": "left", "vertical": "middle" }
      ]
    }
  }
}
```
````

### 数据结构字段说明

| 字段 | 说明 |
| --- | --- |
| `tables` | 存储所有表格数据的对象 |
| `tables.[id]` | 以表格ID为键的表格数据对象 |
| `locations` | 表格出现的文件位置列表 |
| `structure` | 表格结构信息（行数、列数、表头、合并单元格等） |
| `styling` | 表格样式信息（行高、列宽、对齐方式等） |
| `settings` | 全局默认设置 |

---

## 常见问题解答

### 功能问题

- **问**：如何在表格中添加新行或新列？  
  **答**：可以使用右键菜单中的"插入行"/"插入列"选项，或使用快捷键 Ctrl+Down（添加行）和 Ctrl+Right（添加列）。

- **问**：如何取消已合并的单元格？  
  **答**：右键点击已合并的单元格，选择"取消合并"选项，或在浮动工具栏中使用取消合并按钮。

- **问**：表格样式在阅读模式和编辑模式下看起来不一样，怎么解决？  
  **答**：确保在插件设置中启用了"在编辑模式中应用样式"选项，并检查是否有CSS片段或主题与插件样式冲突。

### 数据与同步问题

- **问**：表格 ID 丢失或出现冲突怎么办？  
  **答**：插件会自动检测并提示处理，建议复制表格时务必包含表格ID注释行。如果ID已丢失，可以使用命令面板中的"重新生成表格ID"命令。

- **问**：为什么我设置的表格尺寸或样式没有保存？  
  **答**：请确保已在设置中启用相关持久化选项，并检查是否与其他表格插件冲突。也可能是数据存储路径权限问题，尝试重启Obsidian或检查data.json文件权限。

- **问**：在多设备间同步表格样式时出现问题怎么办？   
  **答**：建议使用文件级数据存储方式，将表格数据直接存储在Markdown文件中，这样可以通过Git或其他同步工具一并同步表格样式。也可以在设置中开启"冲突检测"选项，当检测到同一ID的表格在不同设备上有不同样式时会提示处理。

### 性能与兼容性

- **问**：大型表格编辑时感觉卡顿，如何优化？   
  **答**：在设置中启用"延迟渲染"和"异步数据处理"选项，减少实时渲染频率。对于特别大的表格，可以考虑禁用部分高级功能以提升性能。

- **问**：插件与其他表格插件（如Advanced Tables）兼容吗？   
  **答**：Table X 可以与大多数表格插件共存，但可能会有功能重叠或样式冲突。建议禁用功能重叠的插件，或在设置中调整优先级。

- **问**：移动端（如iPad、Android）上可以使用所有功能吗？   
  **答**：基本功能在移动端可用，但部分依赖鼠标操作的功能（如拖拽调整尺寸）在触摸设备上体验可能不佳。我们正在优化移动端体验，敬请期待。

---

## 参考资料与相关链接

### 官方资源

- [Obsidian 官方网站](https://obsidian.md/)
- [Obsidian 插件开发文档](https://docs.obsidian.md/Plugins/Plugin+development+guide)
- [Obsidian API 文档](https://github.com/obsidianmd/obsidian-api)

### 相关技术讨论

- [Markdown 表格合并单元格讨论](https://github.com/quarto-dev/quarto-cli/discussions/8427)
- [Obsidian 论坛表格功能讨论](https://forum.obsidian.md/tag/tables)
- [Markdown 表格扩展规范](https://github.com/markdown-it/markdown-it-multimd-table)

### 推荐插件

- [Style Settings 插件](https://github.com/mgmeyers/obsidian-style-settings) - 可与 Table X 联动自定义表格样式
- [Advanced Tables](https://github.com/tgrosinger/advanced-tables-obsidian) - 另一个优秀的表格插件，提供互补功能
- [Obsidian Excel](https://github.com/ljcoder2015/obsidian-excel) - 提供类似电子表格的功能

---

## 贡献与反馈

我们非常欢迎社区贡献和反馈，帮助 Table X 变得更好！

### 如何贡献

- **提交问题**：如果您发现 bug 或有功能建议，请[提交 Issue](https://github.com/letlll/TestPlugin/issues)
- **贡献代码**：欢迎提交 Pull Request，请确保遵循项目的代码规范
- **改进文档**：帮助我们完善文档、教程或示例
- **分享使用案例**：在社区分享您使用 Table X 的创意方式

### 联系方式

- **QQ** ：1427623704
- **WeChat** ：letlching
- **邮箱** ：letlching@gmail.com

### 支持项目

如果您喜欢这个插件，可以通过以下方式支持我们：

- 在 GitHub 上给项目点星
- 向朋友推荐这个插件

---

