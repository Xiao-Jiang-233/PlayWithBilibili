# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 BetterNCM 插件，名为 "Play with Bilibili MV"，用于在网易云音乐播放音乐时自动在背景播放对应的 Bilibili MV 视频。

## 核心架构

### 插件结构
- **主文件**: `playwithbilio.js` - 包含所有插件逻辑
- **配置文件**: `manifest.json` - 插件元数据定义
- **预览图**: `preview.png` - 插件预览图片

### 主要功能模块

1. **配置管理系统** (`config`, `configKeys`)
   - 支持布尔值和字符串类型的配置项
   - 自动保存到 localStorage
   - 配置项包括：启用状态、模糊效果、弹幕、裁剪、亮度调节等

2. **日志系统** (`logger`)
   - 分级日志输出 (debug < info < warn < error)
   - 格式化时间戳
   - 性能计时功能

3. **视频播放器管理**
   - 创建 iframe 嵌入 Bilibili 播放器
   - 自动进入网页全屏模式
   - 隐藏控制栏和提示信息
   - 支持淡入淡出动画效果

4. **智能搜索系统**
   - 使用 Bilibili API 搜索视频
   - 缓存机制避免重复搜索
   - 标题过滤和时长匹配算法
   - 支持自定义搜索关键词模板

5. **音视频同步系统**
   - 监听网易云音乐播放状态
   - 实时同步播放进度
   - 强制静音避免音频冲突

## 开发说明

### 配置项管理
- 配置存储在 localStorage 中，键名为 `playwithbilio.{key}`
- 配置界面自动根据 `configKeys` 生成
- 支持布尔值（checkbox）和字符串（input）类型

### 事件监听
插件通过 `legacyNativeCmder.appendRegisterCall` 监听网易云音乐事件：
- `Load` - 歌曲加载时触发视频搜索
- `PlayState` - 播放状态变化时同步视频播放状态
- `PlayProgress` - 播放进度变化时同步视频进度

### API 调用
- 使用 `betterncm.ncm.findApiFunction` 获取网易云内部函数
- 通过 iframe 的 `contentWindow.fetch` 调用 Bilibili API
- 支持函数缓存优化性能

### 样式管理
- 动态生成 CSS 样式控制视觉效果
- 支持模糊、亮度调节、裁剪等效果
- 自动适配亮色/暗色主题

## 重要注意事项

1. **安全沙箱**: iframe 使用 `sandbox` 属性限制权限
2. **性能优化**: 使用防抖、缓存、定时器清理等机制
3. **错误处理**: 完善的错误捕获和日志记录
4. **兼容性**: 依赖 BetterNCM 插件系统和网易云音乐内部 API