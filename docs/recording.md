# 景点与天气实机录屏 · Live scenery recording

脚本 [`scripts/record_scenery.py`](../scripts/record_scenery.py)在真实浏览器里寻找景点、切换实际天气、等待近景地形加载，再逐段录屏。每段使用固定的已检查机位和中文景点字幕；只录制已加载的场景，不把寻景与加载画面放进成片。

## 默认片单

| 世界 | 景点 | 时段／天气 |
| --- | --- | --- |
| 山水中国 | 九寨彩湖 | 晨雾 |
| 山水中国 | 王宫御苑 | 暮光 |
| 山水中国 | 江南竹海 | 细雨 |
| 山水中国 | 湖心亭榭 | 薄暮 |
| 山水中国 | 长安灯市 | 月夜 |
| 花见日本 | 山寺古院 | 晨雾 |
| 花见日本 | 樱花山林 | 暮光 |
| 花见日本 | 湖畔 | 细雨 |
| 花见日本 | 朱红神社 | 薄暮 |
| 花见日本 | 大名城下町 | 月夜 |

默认每镜 7 秒，横屏 **3840 × 2160 原生 4K**，使用当前 `q=high` 高清模式和 `capture=stable` 稳定采集设置。录制时固定体积雾采样相位，关闭天空／调色的逐帧颗粒；雨、雾、云层、植被和角色的正常运动继续生效。使用固定机位避免跨 LOD／阴影网格跳变。中国场景关闭云海，逐帧核验实际 shader 强度为零。采集仅在完整渲染结束后拷贝同尺寸画布，不放大旧视频，不插入逐镜黑场。H.264 使用 CRF 18，封装为 30 FPS；实际渲染和采集帧率另存于 JSON，遇到渲染停止或严重缺帧会失败。`--resolution 1080p` / `720p` 可选择较小输出。

## 运行

依赖 Python 3.10+、Node.js 22+、Chrome、ffmpeg、ffprobe。首次使用 `npx` 会获取 Playwright CLI；也可通过 `--cli` 指定已有 CLI 或包装脚本。无需视频生成服务或 API token。

```sh
# 只查看片单；不打开浏览器
python3 scripts/record_scenery.py --dry-run

# 从正式站录制，默认两种世界、10 镜、70 秒
python3 scripts/record_scenery.py --url https://myriad-worlds.pages.dev/

# 竖屏；输出 scenery-tour-portrait.mp4
python3 scripts/record_scenery.py --format portrait --seconds 7

# 只录中国，改变种子、画质与每镜时长
python3 scripts/record_scenery.py --themes shanshui --seed yuki --quality lite --seconds 5
```

本地录制先构建并启动静态站，在另一终端执行录屏：

```sh
npm ci
npm run build
python3 -m http.server 8765 --directory dist --bind 127.0.0.1
```

```sh
python3 scripts/record_scenery.py --url http://127.0.0.1:8765/
```

`--out` 修改成片目录；`--session` 为并行录屏选择独立浏览器会话。已有会话可以同时提供 `--session <名称> --reuse-session`；脚本只关闭自己新建的会话。每镜最长 20 秒，CLI 操作有超时，遇到缺失景点、区块加载失败、应用错误或编码失败会停止并报告。

## 自定义片单

`--shots <JSON 文件>` 接受数组。`place` 可以是地标键（如 `palace`、`changan`、`temple`、`shrine`、`castle`）或生态名（如 `LAKE`、`BAMBOO`、`SAKURA`、`PADDY`、`CEDAR`）。`mood` 支持 `morning`、`golden`、`dusk`、`night`、`rain`。

```json
[
  {"theme":"shanshui","place":"palace","mood":"morning","title":"王宫御苑 · 晨雾","distance":100,"height":30},
  {"theme":"shanshui","place":"palace","mood":"night","title":"王宫御苑 · 月夜","distance":100,"height":30}
]
```

同一景点重复配置不同 `mood` 即可录制天气对比。`distance` 与 `height` 控制取景距离和离地高度；脚本调用引擎的地形视线取景函数，在同一景点寻找通透的机位并保持固定，保留真实天气与角色运动。

## 高清截图

[`scripts/capture_screenshots.py`](../scripts/capture_screenshots.py)使用当前 `q=high` 模式重新捕获文档中的六张截图。中国云海关闭；截图调用应用的 PNG 导出功能，保存实际渲染画布，再编码 JPG，不放大旧截图。`docs/screenshots/capture.json`记录分辨率、像素比例、机位、质量与云海强度。运行：

```sh
python3 scripts/capture_screenshots.py --url https://myriad-worlds.pages.dev/
```

## X 文案

[`x-post.txt`](x-post.txt)保留简短文案、宝玉的提示词来源与 Opus 5.5 / GLM 5.3F 的开发分工。视频只发布 4K 完整版，不再生成或发布单独的 X 短片。X 发布完成后，使用帖文的公开链接更新 README 视频入口。

## 产物

完整 4K 成片与原始素材写入被 Git 忽略的 `output/media/` / `output/scenery/`，成片作为 GitHub Release 附件分发。`docs/media/`只保留 GIF 预览、JPG 封面和 JSON 清单。JSON 记录原生画布、质量、稳定采样、实际采集速率、逐帧亮度与云海强度、错误列表以及最终时长。大文件不加入 Git 当前代码树；X 短片已移除。

另有 [`scripts/record_demos.py`](../scripts/record_demos.py)用于录制巡游、天空滑块和火车视角等操作演示；这里的脚本专门展示不同天气的景点景色。
