# 景点与天气实机录屏 · Live scenery recording

脚本 [`scripts/record_scenery.py`](../scripts/record_scenery.py)在真实浏览器里寻找景点、切换实际天气、等待近景地形加载，再逐段录屏。每段有缓慢横移和中文景点字幕；只录制已加载的场景，不把寻景与加载画面放进成片。

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

默认每镜 7 秒，横屏 1280 × 720。录屏封装为 30 FPS；实际 WebGL 帧率取决于机器，记录在 JSON 中，不能将视频编码帧率当作渲染性能。

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

同一景点重复配置不同 `mood` 即可录制天气对比。`distance` 与 `height` 控制取景距离和离地高度；脚本调用引擎的地形视线取景函数，在同一景点寻找通透的机位，然后做轻微横移。

## X 发布

[`media/myriad-worlds-x.mp4`](media/myriad-worlds-x.mp4)为 40 秒短版：保留全部十个景点与天气镜头，每镜 4 秒，H.264、1280 × 720、30 FPS，无音轨，约 6.4 MiB，可直接上传 X。搭配 [`x-post.txt`](x-post.txt)中的简短文案使用。短版从 70 秒实机录屏逐镜裁切；也可用 `--seconds 4`重新录制 40 秒片单。

参考宝玉的提示词与开发模型分工已写入文案和 README。X 发布完成后，使用帖文的公开链接更新 README 视频入口。

## 产物

`docs/media/` 保留最终 MP4、短 GIF 预览、JPG 封面和 JSON 录制清单；原始 WebM、逐镜 MP4／截图写入被 Git 忽略的 `output/scenery/`。JSON 包含来源 URL、种子、机位、景点、天气、分辨率、实际帧数和错误列表，便于复录与核验。

另有 [`scripts/record_demos.py`](../scripts/record_demos.py)用于录制巡游、天空滑块和火车视角等操作演示；这里的脚本专门展示不同天气的景点景色。
