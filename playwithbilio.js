/**
 * Play with Bilibili MV Pro - BetterNCM插件
 *
 * 功能说明：
 * 在网易云音乐播放音乐时，自动在背景播放对应的Bilibili MV视频
 * 支持智能匹配视频时长、音频同步、视觉效果配置等
 *
 * 主要特性：
 * - 自动搜索并匹配Bilibili MV视频
 * - 音频播放状态与视频播放状态完全同步
 * - 支持模糊、亮度调节、裁剪等视觉效果
 * - 智能时长匹配算法，选择最合适的MV版本
 * - 缓存机制优化性能
 * - 内置Bilibili登录功能
 */

// 插件默认配置
const config = {
    enable: true, // 是否启用插件
    blur: false, // 是否启用模糊效果
    danmmaku: false, // 是否显示弹幕
    cover: true, // 是否将视频裁剪至窗口分辨率
    darken: false, // 是否暗化背景
    lighten: false, // 是否亮化背景
    'search-kwd': '{name} {artist} MV/PV', // 搜索关键词模板
    'filter-length': true, // 是否根据音频时长过滤视频
}

// 配置项的中文显示名称和描述
const configKeys = {
    enable: ['启用', '启用 Bilibili 播放器'],
    blur: ['模糊', '启用模糊效果'],
    danmmaku: ['弹幕', '启用弹幕'],
    cover: ['裁剪', '将视频自动裁剪至窗口分辨率'],
    darken: ['暗化', '暗化背景'],
    lighten: ['亮化', '亮化背景'],
    'search-kwd': [
        '搜索关键词',
        '搜索关键词，支持变量替换，{name} 为歌曲名，{artist} 为歌手名',
    ],
    'filter-length': ['过滤时长', '根据音频时长匹配视频'],
}


// 创建Bilibili播放器iframe
const ifr = document.createElement('iframe')
ifr.classList.add('betterncm-plugin-playwithbilio') // 插件专用CSS类名
ifr.src = 'https://www.bilibili.com' // 初始源为B站首页
ifr.sandbox = 'allow-scripts allow-forms allow-same-origin' // 安全沙箱设置

// 创建插件样式元素
const pluginStyle = document.createElement('style')
pluginStyle.innerHTML = `` // 初始化为空样式
document.head.appendChild(pluginStyle) // 添加到页面头部

/**
 * 更新插件样式
 * 根据配置动态生成CSS样式，控制视频播放器的视觉效果
 *
 * 样式特性：
 * - 模糊效果：10px模糊
 * - 亮度调节：暗化(0.5x)或亮化(1.5x)
 * - 透明度控制：支持淡入淡出动画
 * - 全屏覆盖：固定定位，覆盖整个窗口
 * - 层级管理：z-index:9，在网易云界面下方
 *
 * @returns {void}
 */
const updatePluginStyle = () => {
    pluginStyle.innerHTML = `
    iframe.betterncm-plugin-playwithbilio {
        filter: blur(${config.blur ? 10 : 0}px) ${
        config.darken ? 'brightness(0.5)' : ''
    } ${config.lighten ? 'brightness(1.5)' : ''};
        width: 100%;
        height: 100%;
        opacity: 0;                                    // 初始透明，用于淡入淡出
        position: fixed;                                // 固定定位覆盖整个屏幕
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        transition: opacity 200ms;                      // 200ms淡入淡出动画
        z-index: 9;                                     // 层级设置，在网易云下方
    }
    `
}

/**
 * 切换视频URL并执行后续操作
 * 实现平滑的视频切换效果，包含淡入淡出动画
 *
 * 切换流程：
 * 1. 淡出当前视频（200ms动画）
 * 2. 设置新的URL
 * 3. 等待新页面加载完成
 * 4. 淡入新视频（200ms动画）
 * 5. 执行后续回调函数
 *
 * @param {string} url - 要切换到的视频URL
 * @param {Function} after - 切换完成后要执行的回调函数
 * @returns {Promise<void>} 返回Promise，表示切换完成
 */
const switchUrl = (url, after) => {
    return new Promise(async (rs) => {
        await fadeOut() // 先淡出当前视频
        ifr.src = url // 设置新的URL
        ifr.onload = async () => {
            // 等待新页面加载完成
            await fadeIn() // 淡入新视频
            await after() // 执行后续操作（如初始化播放器）
            rs() // 完成Promise
        }
    })
}

/**
 * 淡出动画效果
 * 将iframe透明度设置为0，实现视频淡出效果
 * 与CSS transition属性配合实现平滑的淡出动画
 *
 * @returns {Promise<void>} 返回200ms延迟后的Promise，确保动画完成
 */
const fadeOut = () => {
    ifr.style.opacity = 0 // 设置透明度为0
    return betterncm.utils.delay(200) // 等待200ms动画完成
}

/**
 * 淡入动画效果
 * 将iframe透明度设置为1，实现视频淡入效果
 * 与CSS transition属性配合实现平滑的淡入动画
 *
 * @returns {Promise<void>} 返回200ms延迟后的Promise，确保动画完成
 */
const fadeIn = () => {
    ifr.style.opacity = 1 // 设置透明度为1
    return betterncm.utils.delay(200) // 等待200ms动画完成
}

// 插件主入口函数
plugin.onLoad(() => {
    console.log('[PlayWithBilibili] 插件开始加载', {
        version: 'Pro',
        timestamp: new Date().toISOString(),
    })

    // 从localStorage逐个加载配置项
    for (const key in configKeys) {
        try {
            config[key] = JSON.parse(localStorage[`playwithbilio.${key}`])
        } catch (e) {} // 忽略解析错误，使用默认值
    }
    console.log('[PlayWithBilibili] 配置加载完成', config)
    updatePluginStyle() // 应用初始样式

    // 播放器状态标志，避免重复初始化
    let playerInitialized = false
    let playerIntervalId = null

    /**
     * 重置播放器状态
     * 当切换歌曲时调用，允许重新初始化播放器
     *
     * 功能说明：
     * - 重置播放器初始化标志
     * - 清理定时器防止内存泄漏
     * - 允许新歌曲重新初始化播放器
     *
     * @returns {void}
     */
    const resetPlayerState = () => {
        playerInitialized = false
        if (playerIntervalId) {
            try {
                ifr.contentWindow.clearInterval(playerIntervalId)
            } catch (error) {
                // 忽略清理错误
            }
            playerIntervalId = null
        }
        console.log('[PlayWithBilibili] 播放器状态已重置')
    }

    /**
     * 初始化Bilibili播放器
     * 自动进入网页全屏、隐藏控制栏、设置弹幕状态等
     *
     * 初始化流程：
     * 1. 检查是否已初始化，避免重复操作
     * 2. 查找并点击网页全屏按钮
     * 3. 注入自定义CSS样式
     * 4. 设置定时器监控播放器状态
     * 5. 处理弹幕开关和登录弹窗
     */
    const initBiliPlayer = async () => {
        // 如果播放器已经初始化，直接返回
        if (playerInitialized) {
            console.log('[PlayWithBilibili] 播放器已初始化，跳过重复初始化')
            return
        }

        console.log('[PlayWithBilibili] 开始初始化Bilibili播放器')

        try {
            // 等待并找到网页全屏按钮
            const btnFullScreen = await betterncm.utils.waitForFunction(
                () =>
                    ifr.contentDocument.querySelector(
                        '[aria-label="网页全屏"]'
                    ),
                100
            )

            if (!btnFullScreen) {
                console.error('[PlayWithBilibili] 未找到网页全屏按钮')
                return
            }

            console.log('[PlayWithBilibili] 找到网页全屏按钮，点击进入全屏模式')
            btnFullScreen.click() // 点击进入网页全屏模式

            // 在iframe内部添加自定义样式
            const style = ifr.contentDocument.createElement('style')

            /**
             * 更新iframe内部样式
             * 隐藏播放器控制栏和设置视频适配模式
             */
            const updateStyle = () => {
                style.innerHTML = `
            /* 播放器底部控制栏 */
            .bpx-player-control-bottom,
            /* 提示信息 */
            .bpx-player-toast-wrap,
            /* 播放器控制容器 */
            .bpx-player-control-wrap{
                display: none !important;    /* 隐藏这些元素 */
            }

            /* 视频适配模式：裁剪或包含 */
            video {
                object-fit: ${
                    config.cover ? 'cover' : 'contain'
                };
            }
        `
            }

            updateStyle() // 应用初始样式
            ifr.contentDocument.head.appendChild(style) // 将样式添加到iframe头部

            // 清理之前的定时器（如果有）
            if (playerIntervalId) {
                ifr.contentWindow.clearInterval(playerIntervalId)
            }

            // 全屏检查防抖机制
            let lastFullScreenCheck = 0
            const FULL_SCREEN_CHECK_INTERVAL = 2000 // 2秒检查一次

            // 设置定时器，持续监控和控制播放器状态
            playerIntervalId = ifr.contentWindow.setInterval(() => {
                const now = Date.now()

                // 检查并关闭登录提示弹窗
                const loginCloseBtn = ifr.contentDocument.querySelector(
                    '.bili-mini-close-icon'
                )
                if (loginCloseBtn) {
                    loginCloseBtn.click()
                }

                // 设置弹幕开关状态
                const danmakuCheckbox = ifr.contentDocument.querySelector(
                    '.bui-danmaku-switch-input'
                )
                if (danmakuCheckbox) {
                    if (danmakuCheckbox.checked !== config.danmmaku) {
                        danmakuCheckbox.click() // 切换弹幕状态
                    }
                }

                // 检查是否处于网页全屏状态，若不是则重新进入
                const isFullScreen =
                    ifr.contentDocument.querySelector('.mode-webscreen')
                if (
                    !isFullScreen &&
                    now - lastFullScreenCheck > FULL_SCREEN_CHECK_INTERVAL
                ) {
                    btnFullScreen.click()
                    lastFullScreenCheck = now
                    console.log('[PlayWithBilibili] 重新进入网页全屏模式')
                }

                updateStyle() // 重新应用样式，确保设置生效
            }, 500) // 降低检查频率到500ms，减少性能开销

            // 标记播放器已初始化
            playerInitialized = true
            console.log('[PlayWithBilibili] Bilibili播放器初始化完成')
        } catch (error) {
            console.error('[PlayWithBilibili] Bilibili播放器初始化失败', error)
        }
    }

    // 将iframe添加到页面顶部，确保作为背景层显示
    document.body.prepend(ifr)

    // 获取iframe内部window的fetch方法，用于调用Bilibili API
    const biliFetch = ifr.contentWindow.fetch

    /**
     * 搜索Bilibili视频
     * 使用Bilibili官方API搜索视频内容
     * @param {string} kwd - 搜索关键词
     * @returns {Promise<Object>} 返回搜索结果的JSON对象
     */
    const searchVideo = async (kwd) => {
        console.log('[PlayWithBilibili] 开始搜索视频', { keyword: kwd })
        try {
            const response = await biliFetch(
                `https://api.bilibili.com/x/web-interface/search/type?search_type=video&order=a&keyword=${encodeURIComponent(
                    kwd
                )}`
            )
            const result = await response.json()

            console.log('[PlayWithBilibili] 视频搜索完成', {
                keyword: kwd,
                resultCount: result.data?.result?.length || 0,
                statusCode: result.code,
            })

            return result
        } catch (error) {
            console.error('[PlayWithBilibili] 视频搜索失败', { keyword: kwd, error: error.message })
            throw error
        }
    }

    /**
     * 获取当前播放歌曲信息的闭包函数
     * 使用缓存机制优化性能，避免重复搜索网易云API函数
     * 基于LibSongInfo库实现
     *
     * 缓存机制说明：
     * - 使用Map缓存已找到的API函数
     * - 避免重复调用BetterNCM的findApiFunction
     * - 提高性能，减少函数查找开销
     */
    const getPlayingSong = (() => {
        // 函数缓存Map，避免重复查找API函数
        const cachedFunctionMap = new Map()

        // LibSongInfo库参考：https://github.com/Steve-xmh/LibSongInfo/blob/main/index.ts

        /**
         * 调用缓存的搜索函数
         * 使用缓存机制查找并调用网易云音乐的API函数
         *
         * 缓存策略：
         * 1. 检查函数是否已缓存
         * 2. 未缓存时通过BetterNCM API查找函数
         * 3. 绑定函数到正确上下文并缓存
         * 4. 执行缓存的函数
         *
         * @param {string} searchFunctionName - 要查找的函数名
         * @param {Array} args - 传递给函数的参数数组
         * @returns {*} 函数执行结果
         * @throws {TypeError} 当函数未找到时抛出异常
         */
        function callCachedSearchFunction(searchFunctionName, args) {
            // 检查函数是否已缓存
            if (!cachedFunctionMap.has(searchFunctionName.toString())) {
                // 通过BetterNCM API查找网易云音乐的内部函数
                const findResult =
                    betterncm.ncm.findApiFunction(searchFunctionName)
                if (findResult) {
                    const [func, funcRoot] = findResult
                    // 绑定函数到正确的上下文并缓存
                    cachedFunctionMap.set(
                        searchFunctionName.toString(),
                        func.bind(funcRoot)
                    )
                }
            }

            // 获取缓存的函数
            const cachedFunc = cachedFunctionMap.get(
                searchFunctionName.toString()
            )
            if (cachedFunc) {
                return cachedFunc.apply(null, args) // 执行函数并返回结果
            } else {
                throw new TypeError(
                    `函数 ${searchFunctionName.toString()} 未找到`
                )
            }
        }

        /**
         * 获取当前正在播放的歌曲信息
         * @returns {Object} 返回包含歌曲名、歌手、时长等信息的对象
         */
        return function getPlayingSong() {
            return callCachedSearchFunction('getPlaying', []) // 调用网易云的getPlaying函数
        }
    })()

    // 搜索结果缓存对象，避免重复API调用
    const urlMap = {}

    // iframe内部视频元素的引用，用于控制播放
    let ifrVideo = null

    /**
     * 重新加载视频的核心函数
     * 根据当前播放的歌曲搜索并加载对应的MV视频
     * 实现智能匹配、时长过滤、缓存优化等功能
     */
    const reloadVideo = async () => {
        // 重置播放器状态，允许重新初始化
        resetPlayerState()

        try {
            // 获取当前播放歌曲的信息
            const {
                data: { name, artists, duration }, // 解构获取歌曲名、歌手、时长
            } = getPlayingSong()

            // 构建搜索关键词，支持变量替换
            const kwd =
                config['search-kwd']
                    .replace('{name}', name) // 替换歌曲名
                    .replace('{artist}', artists[0].name) ?? // 替换歌手名
                `MV ${name} - ${artists[0].name}` // 默认搜索关键词格式

            console.log('[PlayWithBilibili] 开始加载视频', {
                songName: name,
                artist: artists[0].name,
                duration: duration,
                searchKeyword: kwd,
            })

            console.log('[PlayWithBilibili] Searching: ', kwd)

            // 如果缓存中没有搜索结果，则进行搜索
            if (!urlMap[kwd]) {
                urlMap[kwd] = await searchVideo(kwd).then(
                    (result) => (
                        console.log('[PlayWithBilibili] Result: ', result),
                        result
                    )
                )
            }

            // 默认使用第一个搜索结果
            let url = urlMap[kwd].data.result[0].arcurl

            // 如果启用了时长过滤功能
            if (config['filter-length']) {
                /**
                 * 时长匹配算法
                 * 目标：找到与音频时长最接近的MV视频
                 *
                 * 算法步骤：
                 * 1. 转换：将搜索结果转换为 [URL, 时长(秒)] 数组
                 * 2. 过滤：保留与音频时长相差小于5秒的视频
                 * 3. 排序：按时长相似度排序（误差小的在前）
                 *
                 * 时长解析逻辑：
                 * - 支持 "mm:ss" 或 "hh:mm:ss" 格式
                 * - 按冒号分割后反转数组，秒在前
                 * - 使用reduce计算总秒数：秒 + 分*60 + 时*3600
                 */
                const video = urlMap[kwd].data.result
                    .map((v) => [
                        v.arcurl,
                        // 解析时长字符串为秒数
                        v.duration
                            .split(':') // 按冒号分割
                            .reverse() // 反转数组，秒在前
                            .reduce((a, b, i) => a + b * Math.pow(60, i), 0), // 转换为总秒数
                    ])
                    .filter((v) => Math.abs(v[1] - duration / 1000) < 5) // 5秒误差过滤
                    .sort(
                        // 按时长相似度排序，相似度高的在前
                        (a, b) =>
                            Math.abs(a[1] - duration / 1000) >
                            Math.abs(b[1] - duration / 1000)
                    )

                if (video.length > 0) {
                    url = video[0] // 使用时长最匹配的视频
                } else {
                    url = null // 没有找到合适的视频
                }
            }

            if (url) {
                // 切换到视频页面并初始化播放器
                await switchUrl(
                    urlMap[kwd].data.result[0].arcurl,
                    initBiliPlayer
                )

                // 等待并获取iframe内部的video元素
                ifrVideo = await betterncm.utils.waitForFunction(
                    () => ifr.contentDocument.querySelector('video'),
                    100
                )

                console.log('[ PlayWithBili ] Video loaded', ifrVideo)
                ifrVideo.volume = 0 // 强制静音，避免音频干扰
            } else {
                // 没有找到匹配的视频，清空播放器
                console.warn('[PlayWithBilibili] 未找到匹配的视频', { keyword: kwd })
                await fadeOut()
                ifr.src = 'about:blank' // 加载空白页面
            }
        } catch (error) {
            console.error('[PlayWithBilibili] 视频加载失败', error)
            // 加载失败时清空播放器
            await fadeOut()
            ifr.src = 'about:blank'
        }
    }

    // 注册音频加载事件监听器
    // 当网易云播放器加载新歌曲时，触发视频重新加载
    // 使用防抖优化，避免频繁切换歌曲时的重复调用
    legacyNativeCmder.appendRegisterCall(
        'Load', // 事件类型：加载
        'audioplayer', // 目标组件：音频播放器
        betterncm.utils.debounce(reloadVideo) // 使用防抖包装的重载视频函数
    )

    // 注册播放状态同步监听器
    // 监听网易云播放器的播放状态变化，同步控制视频播放状态
    legacyNativeCmder.appendRegisterCall(
        'PlayState', // 事件类型：播放状态变化
        'audioplayer', // 目标组件：音频播放器
        (_, __, state) => {
            // 回调函数，state为播放状态（1=播放，0=暂停）

            if (state === 1) {
                ifrVideo?.play() // 音频播放时，视频也播放
            } else {
                ifrVideo?.pause() // 音频暂停时，视频也暂停
            }
        }
    )

    // 注册播放进度同步监听器
    // 监听音频播放进度，实时同步视频进度，确保音视频完全同步
    legacyNativeCmder.appendRegisterCall(
        'PlayProgress', // 事件类型：播放进度变化
        'audioplayer', // 目标组件：音频播放器
        (_, progress) => {
            // 回调函数，progress为当前播放时间（秒）
            if (!ifrVideo) {
                return // 如果没有视频元素，直接返回
            }

            // 进度同步：当视频进度与音频进度相差超过0.3秒时，强制同步
            const timeDiff = Math.abs(ifrVideo?.currentTime - progress)
            if (timeDiff > 0.3) {
                ifrVideo.currentTime = progress
            }

            // 播放状态检查：确保音频播放时视频也在播放
            // 通过检查LibFrontendPlay插件的播放状态来判断
            if (
                loadedPlugins.LibFrontendPlay?.currentAudioPlayer?.paused ===
                false
            ) {
                ifrVideo?.play()
            }

            // 强制静音：确保视频始终静音，避免与音频冲突
            ifrVideo.volume = 0
        }
    )

    console.log('[PlayWithBilibili] 插件加载完成')
})

// 插件配置界面生成函数
plugin.onConfig((tools) => {
    console.log('[PlayWithBilibili] 打开配置界面')
    const configDoms = [] // 存储所有配置项DOM元素的数组

    /**
     * 动态生成配置项DOM并绑定事件处理器
     * 根据configKeys自动创建配置界面，支持布尔值和字符串类型
     * 配置更改后自动保存到localStorage并应用效果
     */
    for (const [key, [name, description]] of Object.entries(configKeys)) {
        // 创建配置项容器
        const configDom = document.createElement('div')
        configDom.classList.add('setting-item')

        // 生成配置项的HTML结构，包括名称、描述和输入控件
        configDom.innerHTML = `
            <span class="setting-item-name">${name}</span>
            <span class="setting-item-description">${description}</span>
            <input type="${
                typeof config[key] === 'boolean' ? 'checkbox' : 'input'
            }" style="color:black;">
        `

        // 获取输入控件的引用
        const checkbox = configDom.querySelector('input')

        // 根据配置类型设置初始值
        if (typeof config[key] === 'boolean')
            checkbox.checked = config[key] // 布尔值：设置勾选状态
        else if (typeof config[key] === 'string') checkbox.value = config[key] // 字符串：设置输入值

        // 绑定值变化事件处理器
        checkbox.addEventListener('change', () => {
            // 根据配置类型更新配置对象
            config[key] =
                typeof config[key] === 'boolean'
                    ? checkbox.checked
                    : checkbox.value

            saveConfig() // 保存配置到localStorage
            updatePluginStyle() // 立即应用样式更改
        })

        configDoms.push(configDom) // 将配置项添加到DOM数组
    }

    // 创建并注入配置界面的美化CSS样式
    const style = document.createElement('style')
    style.innerHTML = `
        .setting-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 10px;
            height: 40px;
            border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
            background: transparent;
        }

        .setting-item-name {
            font-size: 14px;
            color: var(--text-color, #333);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .setting-item-description {
            font-size: 12px;
            color: var(--description-color, #999);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .switch {
            position: relative;
            display: inline-block;
            width: 60px;
            height: 34px;
        }

        .switch-input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .login-iframe{
            width: 100%;
            height: 500px;
        }

        /* 亮色主题 */
        :root {
            --background-color: rgba(255, 255, 255, 0.1);
            --border-color: rgba(255, 255, 255, 0.2);
            --text-color: #333;
            --description-color: #999;
        }

        /* 暗色主题 */
        @media (prefers-color-scheme: dark) {
            :root {
                --background-color: rgba(0, 0, 0, 0.2);
                --border-color: rgba(255, 255, 255, 0.1);
                --text-color: #fff;
                --description-color: #ccc;
            }
        }
        `

    /**
     * 保存配置到localStorage并应用设置
     * 遍历所有配置项，将当前配置值序列化存储
     * 根据启用状态控制视频播放器的显示
     *
     * 功能说明：
     * - 序列化配置对象并存储到localStorage
     * - 记录配置变更日志
     * - 根据日志启用状态更新日志功能
     *
     * @returns {void}
     */
    function saveConfig() {
        console.log('[PlayWithBilibili] 保存配置变更', { oldConfig: { ...config } })

        // 逐个保存配置项到localStorage
        for (const key in configKeys) {
            localStorage[`playwithbilio.${key}`] = JSON.stringify(config[key])
        }

        console.log('[PlayWithBilibili] 配置已保存到localStorage', config)

    }

    /**
     * 创建Bilibili登录功能组件
     * 提供内嵌式登录界面，自动检测登录状态并定制化显示
     */
    const loginIfr = dom(
        'div', // 容器元素
        {},
        // 登录按钮
        dom('button', {
            innerHTML: '登录', // 按钮文本
            style: {
                color: 'black', // 黑色文字
                border: 'none', // 无边框
                padding: '20px 20px', // 内边距
                width: '100%', // 全宽按钮
            },
            // 按钮点击事件处理器
            onclick: () => {
                // 移除按钮，准备显示登录iframe
                loginIfr.firstChild.remove()

                // 添加登录iframe到容器
                loginIfr.prepend(
                    dom('iframe', {
                        src: 'https://bilibili.com', // B站登录页面
                        sandbox: 'allow-scripts allow-forms allow-same-origin', // 安全沙箱设置
                        class: ['login-iframe'], // CSS类名
                        // iframe加载完成后的处理逻辑
                        async onload() {
                            const td = this.contentWindow.document
                            await betterncm.utils.delay(200) // 等待页面渲染

                            // 查找并点击登录按钮
                            const goLoginBtn = td.querySelector('.go-login-btn')
                            if (goLoginBtn) {
                                goLoginBtn.click() // 触发登录流程

                                // 创建并注入自定义样式，优化登录界面显示
                                const s = document.createElement('style')
                                s.innerHTML = `
                                    .bili-mini-content-wp {
                                        position: absolute;
                                        left: 0;
                                        top: 0;
                                        right: 0;
                                        width: 100% !important;
                                        height: 500px !important;
                                        border-radius: 0;
                                    }
                                    body{
                                        overflow:hidden;
                                    }
                                    .bili-mini-close-icon,.i_cecream{
                                        display:none;
                                    }
                                `
                                td.head.append(s) // 将样式添加到页面头部
                            } else {
                                // 如果没有找到登录按钮，说明已经登录，移除登录组件
                                loginIfr.remove()
                            }
                        },
                    })
                )
            },
        })
    )


    /**
     * 返回完整的配置界面DOM结构
     * 包含标题、配置项列表、登录组件和样式定义
     */
    return dom(
        'div', // 主容器
        {
            // 插件标题和描述部分
            innerHTML: ` <div class="setting-item">
        <span class="setting-item-name">Play With Bilibili MV</span>
        <span class="setting-item-description">使用 Bilibili 播放器自动播放 MV</span>
    </div>`,
        },
        ...configDoms, // 展开所有配置项DOM
        loginIfr, // 登录组件
        style // 样式定义
    )
})
