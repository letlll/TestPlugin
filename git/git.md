## 4. 后续开发

每次有新改动后：

```sh
git add .
git commit -m "你的修改说明"
git push
```

明白！你的 GitHub 仓库地址是：  
**https://github.com/letlll/TestPlugin.git**

下面是完整的操作步骤和命令，确保你能顺利把本地插件代码推送到该仓库。

---

## 1. 本地初始化 Git 仓库

在 PowerShell 或 CMD 里执行：

```sh
cd /g:/documents/obsidian/TEST插件
git init
git add .
git commit -m "初始化插件代码"
```

---

## 2. 关联远程仓库

```sh
git remote add origin https://github.com/letlll/TestPlugin.git
git branch -M main
```

---

## 3. 推送到 GitHub

```sh
git push -u origin main
```

> **注意：**  
> - 第一次 push 需要输入 GitHub 账号和密码（推荐使用 [GitHub Token](https://github.com/settings/tokens) 作为密码）。
> - 如果提示权限问题，请检查你是否登录了正确的 GitHub 账号，或者仓库是否已创建。

---

## 4. 后续开发

每次有新改动后：

```sh
git add .
git commit -m "你的修改说明"
git push
```

---

## 5. 可选：添加 .gitignore 文件

如果你不想上传某些文件（如临时文件、系统文件），可以新建 `.gitignore` 文件，内容例如：

```
.DS_Store
node_modules/
*.log
```

---

## 一键命令（适合首次推送）

如果你已经在 `/g:/documents/obsidian/TEST插件` 目录下，可以直接复制粘贴：

```sh
git init
git add .
git commit -m "初始化插件代码"
git remote add origin https://github.com/letlll/TestPlugin.git
git branch -M main
git push -u origin main
```

---

需要我帮你生成 `.gitignore` 或有其他 Git 问题，随时告诉我！