# 在 Markdown 文件中存储表格数据示例

## 表格一



<!-- table-id: tbl-20250824-9xel3vux -->

| 年度   | Q1  | Q2  | 合计  |
| ---- | --- | --- | --- |
| 2024 | 10  | 12  | 22  |
| 2025 | 14  | 15  | 29  |

<!-- table-id: tbl-20250824-9xel3vux -->

## 表格二



<!-- table-id: tbl-20250824-3hq1orzk -->

| 产品  | 单价  | 数量  | 小计   |
| --- | --- | --- | ---- |
| A型  | 100 | 5   | 500  |
| B型  | 200 | 3   | 600  |
| 总计  |     |     | 1100 |

<!-- table-id: tbl-20250824-3hq1orzk -->

## 实现思路

1. 修改插件以支持从 Markdown 文件中的代码块读取表格数据
2. 在渲染表格时，先检查当前文件中是否有对应表格 ID 的数据代码块
3. 如果找到，则使用文件中的数据进行渲染（文件级渲染）
4. 如果没有找到，则回退到 data.json 中查找（项目级渲染）
5. 提供命令将 data.json 中的表格数据导出到对应的 Markdown 文件中

## 代码块格式说明

- 使用 ```json:table-data 作为代码块的开始标记
- 只需提供必要的表格数据，插件会自动完善其余信息
- 表格数据可以存储在一个数组中，包含文件中所有表格的数据
- 表格数据代码块可以放置在文件末尾，集中管理所有表格数据
- 表格 ID 用于关联表格和其数据

## 简化数据结构

- 只需提供 `id` 字段和需要自定义的样式属性
- 插件会根据实际表格内容自动计算行数、列数和表头信息
- 默认样式（如行高、对齐方式）会自动应用，只需指定非默认值
- 表格一示例：只指定列宽和表格包裹方式
- 表格二示例：只指定对齐方式

## 数据组织方式

- **单表数据格式**：每个表格后面跟一个包含单个表格数据的代码块
- **多表数据格式**：在文件中使用一个代码块包含所有表格数据的数组
- 多表数据格式更简洁，减少了代码块的数量，便于管理

## 数据格式选项

插件支持多种数据格式，可根据需要选择最适合的格式：

1. **标准JSON格式**：完整的数据结构，包含所有字段
2. **简化JSON格式**：压缩的JSON，减少换行和空格，但保持完整的数据结构
3. **CSV格式**：以逗号分隔的表格数据，结构更紧凑，但JSON字段需要转义
4. **自定义简化格式**：使用自定义语法，最简洁的表示方式，通过插件解析还原完整数据

不同格式的优缺点：
- JSON格式：最通用，易于编辑，但较冗长
- CSV格式：紧凑，但嵌套结构需要转义
- 自定义格式：最简洁，但需要了解特定语法

## 表格数据（文件末尾）

### JSON 简化格式

```json:table-data
[
  {
    "id": "tbl-example-123",
    "structure": { "useTableWrapper": true },
    "styling": { "colWidths": ["100px", "50px", "50px", "70px"] }
  },
  {
    "id": "tbl-example-456",
    "styling": { "alignment": ["left", "right", "center", "right"] }
  }
]
```

### CSV 格式（替代方案）

```csv:table-data
id,structure,styling
tbl-example-123,{"useTableWrapper":true},{"colWidths":["100px","50px","50px","70px"]}
tbl-example-456,,{"alignment":["left","right","center","right"]}
```

### 自定义简化格式

```table-data
tbl-example-123|wrapper:true|width:100px,50px,50px,70px
tbl-example-456|align:left,right,center,right|height:auto,30px,40px
```

## 自定义简化格式语法说明

自定义简化格式使用以下语法规则：

```
tableId|key1:value1|key2:value2,value3,...
```

### 支持的键值对

| 键名 | 说明 | 值格式 | 示例 |
| ---- | ---- | ------ | ---- |
| wrapper | 是否使用表格包裹方式 | true/false | wrapper:true |
| width | 列宽设置 | 逗号分隔的CSS宽度值 | width:100px,50px,auto |
| align | 列对齐方式 | 逗号分隔的对齐值(left/right/center) | align:left,right,center |
| height | 行高设置 | 逗号分隔的CSS高度值 | height:auto,30px,40px |

### 示例解析

```
tbl-example-123|wrapper:true|width:100px,50px,50px,70px
```

这行代码表示：
- 表格ID: tbl-example-123
- 使用表格包裹方式: true
- 列宽设置: 第一列100px，第二列50px，第三列50px，第四列70px

插件会自动将这种简化格式转换为完整的表格数据结构，并应用到对应ID的表格上。

## 本文件的表格数据

```table-data
tbl-20250824-9xel3vux|wrapper:true|width:100px,50px,50px,70px|align:left,right,right,right
tbl-20250824-3hq1orzk|wrapper:true|width:100px,70px,50px,70px|align:left,right,center,right
```