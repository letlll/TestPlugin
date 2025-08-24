# 测试表格数据存储

这是一个测试文件，用于测试从Markdown文件中读取表格数据的功能。

| 列1 | 列2 | 列3 |
| --- | --- | --- |
| 数据1 | 数据2 | 数据3 |
| 数据4 | 数据5 | 数据6 |

<!-- table-id: test-table -->

```json:table-data
{
  "id": "test-table",
  "location": {
    "line": 5,
    "column": 0
  },
  "structure": {
    "rows": 3,
    "columns": 3,
    "hasHeader": true
  },
  "styling": {
    "rowHeights": [30, 30, 30],
    "colWidths": [100, 100, 100],
    "alignment": ["left", "center", "right"]
  }
}
```

## 第二个表格

| A | B | C |
| --- | --- | --- |
| 1 | 2 | 3 |
| 4 | 5 | 6 |
| 7 | 8 | 9 |

<!-- table-id: test-table-2 -->

```csv:table-data
id,test-table-2
row,4
col,3
header,true
rowHeights,30,30,30,30
colWidths,80,80,80
alignment,left,center,right
```

## 第三个表格

| X | Y | Z |
| --- | --- | --- |
| 10 | 20 | 30 |

<!-- table-id: test-table-3 -->

```
id: test-table-3
row: 2
col: 3
header: true
rowHeights: 25, 25
colWidths: 70, 70, 70
alignment: center, center, center
```