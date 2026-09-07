# `/view` raw HTML archive

将 `/view` 使用的 Checkee HTML 原始快照放在此目录，文件扩展名使用 `.html` 或 `.htm`。

转换命令：

```bash
python scripts/view/import-checkee-html.py \
  --input-dir data/checkmate/view/raw \
  --output json/checkmate/checkee-static-snapshot.json \
  --snapshot-date YYYY-MM-DD
```

原始 HTML 不放入 `public/`，不会被前端直接提供给访客。仓库当前没有内置原始 HTML；请在更新 `/view` 数据前把新的页面快照放入此目录。
