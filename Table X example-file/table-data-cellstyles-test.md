# 单元格样式测试

<!-- table-id: tbl-cellstyles-test --> 

| 产品  | 单价  | 数量  | 小计   | 
| --- | --- | --- | ---- | 
| A型  | 100 | 5   | 500  | 
| B型  | 200 | 3   | 600  | 
| 总计  |     |     | 1100 | 

## 测试紧凑格式的表格数据

```table-data
tbl-cellstyles-test|rows:4|cols:4|headers:true|width:auto,auto,auto,auto|height:auto,auto,auto,auto|align:left,left,left,left|cellStyles:[{"row":3,"col":3,"textAlign":"left","verticalAlign":"top"}]|loc:Table X example-file/table-data-cellstyles-test.md:true
```