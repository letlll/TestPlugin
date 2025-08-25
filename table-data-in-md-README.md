# 将表格数据存储在 Markdown 文件中

## 概述

本项目展示了如何将 Advanced Table 插件的数据存储方式从 data.json 改为在 Markdown 文件中使用代码块存储，以实现文件级渲染而非项目级渲染。

## 当前存储方式

目前，Advanced Table 插件将表格数据存储在 data.json 文件中，这是一种项目级的存储方式。这意味着：

1. 所有表格的数据都集中存储在一个文件中
2. 表格数据与其所在的 Markdown 文件分离
3. 当移动或复制 Markdown 文件时，表格数据不会随文件一起移动

## 提议的存储方式

我们提议将表格数据存储在其所在的 Markdown 文件中，使用代码块（如 JSON 或 CSV 格式）进行存储。这种方式有以下优点：

1. 表格数据与其所在的 Markdown 文件绑定，实现文件级渲染
2. 当移动或复制 Markdown 文件时，表格数据会随文件一起移动
3. 更好的可移植性和兼容性
4. 便于版本控制和协作

## 实现方案

### 1. 数据存储格式

在 Markdown 文件中使用特殊的代码块来存储表格数据：


<!-- table-id: tbl-example-123 -->

| 年度   | Q1  | Q2  | 合计  |
| ---- | --- | --- | --- |
| 2024 | 10  | 12  | 22  |
| 2025 | 14  | 15  | 29  |




### 2. 数据读取流程

1. 当渲染表格时，插件首先检查当前 Markdown 文件中是否有对应表格 ID 的数据代码块
2. 如果找到，则使用文件中的数据进行渲染（文件级渲染）
3. 如果没有找到，则回退到 data.json 中查找（项目级渲染，向后兼容）

### 3. 数据写入流程

1. 当用户修改表格样式或结构时，插件将更新数据
2. 如果启用了文件级存储，插件将在当前 Markdown 文件中查找或创建对应的数据代码块
3. 如果找到现有代码块，则更新其内容
4. 如果没有找到，则在表格后创建新的数据代码块
5. 同时更新 data.json 中的数据（向后兼容）

### 4. 迁移工具

提供一个命令，将 data.json 中的表格数据导出到对应的 Markdown 文件中：

1. 扫描当前打开的 Markdown 文件，查找所有带有表格 ID 的表格
2. 从 data.json 中获取这些表格的数据
3. 在 Markdown 文件中为每个表格创建或更新数据代码块

## 示例文件

- [表格数据在 Markdown 中的示例](./table-data-in-md-example.md)
- [插件实现示例](./table-data-in-md-plugin-example.ts)

## 配置选项

建议在插件设置中添加以下选项：

1. **优先使用文件存储**：启用后，插件优先从 Markdown 文件中读取表格数据，而不是 data.json
2. **自动导出到文件**：启用后，当从 data.json 中读取表格数据时，自动将数据导出到 Markdown 文件中
3. **隐藏数据代码块**：启用后，在预览模式下隐藏表格数据代码块

## 结论

将表格数据存储在 Markdown 文件中的代码块中，可以实现文件级渲染而非项目级渲染，提高表格数据的可移植性和兼容性。同时，通过保持对 data.json 的支持，可以确保向后兼容性。

```table-data
tbl-example-123|rows:3|cols:4|headers:true|width:61px,auto,109px,auto|height:34px,77px,auto|align:left,left,left,left|cellStyles:[{"row":0,"col":1,"textAlign":"left","verticalAlign":"top"},{"row":1,"col":1,"textAlign":"center","verticalAlign":"middle"},{"row":1,"col":2,"textAlign":"left","verticalAlign":"top"},{"row":1,"col":3,"textAlign":"left","verticalAlign":"top"},{"row":2,"col":2,"textAlign":"right","verticalAlign":"top"},{"row":2,"col":3,"textAlign":"left","verticalAlign":"top"}]|loc:table-data-in-md-README.md:true
```