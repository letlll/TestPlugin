# 表格数据测试

<!-- table-id: tbl-test-styles --> 

| 产品  | 单价  | 数量  | 小计   | 
| --- | --- | --- | ---- | 
| A型  | 100 | 5   | 500  | 
| B型  | 200 | 3   | 600  | 
| 总计  |     |     | 1100 | 

## 测试紧凑格式的表格数据

```table-data
tbl-test-styles|rows:4|cols:4|headers:true|width:auto,auto,auto,auto|height:auto,auto,auto,auto|align:left,left,left,left|cellStyles:{"0,0":{"fontWeight":"bold"},"0,1":{"fontStyle":"italic"},"2,3":{"backgroundColor":"#f0f0f0"}}|merges:[{"row":2,"col":0,"rowspan":2,"colspan":1}]
```