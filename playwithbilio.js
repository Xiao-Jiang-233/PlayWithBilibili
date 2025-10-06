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

// 创建嵌入式的Bilibili播放器iframe
const ifr = document.createElement('iframe')
ifr.classList.add('betterncm-plugin-playwithbilio') // 添加插件专用CSS类名
ifr.src = 'https://www.bilibili.com' // 设置初始源为B站首页
ifr.sandbox = 'allow-scripts allow-forms allow-same-origin' // 安全沙箱设置，允许脚本、表单和同源访问

// 创建插件的样式元素
const pluginStyle = document.createElement('style')
pluginStyle.innerHTML = `` // 初始化为空样式，后续会动态更新
document.head.appendChild(pluginStyle) // 将样式添加到页面头部

/**
 * 更新插件样式
 * 根据配置动态生成CSS样式，控制视频播放器的视觉效果
 * 包括模糊、亮度调节、透明度、位置等属性
 */
const updatePluginStyle = () => {
    pluginStyle.innerHTML = `
    iframe.betterncm-plugin-playwithbilio {
        filter: blur(${config.blur ? 10 : 0}px) ${
        config.darken ? 'brightness(0.5)' : ''
    } ${config.lighten ? 'brightness(1.5)' : ''};
        width: 100%;
        height: 100%;
        opacity: 0;                                    // 初始透明，用于淡入淡出效果
        position: fixed;                                // 固定定位覆盖整个屏幕
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        transition: opacity 200ms;                      // 200ms淡入淡出动画
        z-index: 9;                                     // 层级设置，确保在网易云下方
    }
    `
}

/**
 * 切换视频URL并执行后续操作
 * @param {string} url - 要切换到的视频URL
 * @param {Function} after - 切换完成后要执行的回调函数
 * @returns {Promise} 返回Promise，表示切换完成
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
 * @returns {Promise} 返回200ms延迟后的Promise
 */
const fadeOut = () => {
    ifr.style.opacity = 0 // 设置透明度为0
    return betterncm.utils.delay(200) // 等待200ms动画完成
}

/**
 * 淡入动画效果
 * 将iframe透明度设置为1，实现视频淡入效果
 * @returns {Promise} 返回200ms延迟后的Promise
 */
const fadeIn = () => {
    ifr.style.opacity = 1 // 设置透明度为1
    return betterncm.utils.delay(200) // 等待200ms动画完成
}

// 插件主入口函数
plugin.onLoad(() => {
    // 从localStorage逐个加载配置项
    for (const key in configKeys) {
        try {
            config[key] = JSON.parse(localStorage[`playwithbilio.${key}`])
        } catch (e) {} // 忽略解析错误，使用默认值
    }
    updatePluginStyle() // 应用初始样式

    /**
     * 初始化Bilibili播放器
     * 自动进入网页全屏、隐藏控制栏、设置弹幕状态等
     */
    const initBiliPlayer = async () => {
        // 等待并找到网页全屏按钮
        const btnFullScreen = await betterncm.utils.waitForFunction(
            () => ifr.contentDocument.querySelector('[aria-label="网页全屏"]'),
            100
        )
        btnFullScreen.click() // 点击进入网页全屏模式

        // 在iframe内部添加自定义样式
        const style = ifr.contentDocument.createElement('style')

        /**
         * 更新iframe内部样式
         * 隐藏播放器控制栏和设置视频适配模式
         */
        const updateStyle = () => {
            style.innerHTML = `
            .bpx-player-control-bottom,      // 播放器底部控制栏
            .bpx-player-toast-wrap,          // 提示信息
            .bpx-player-control-wrap{        // 播放器控制容器
                display: none !important;    // 隐藏这些元素
            }

            video {
                object-fit: ${
                    config.cover ? 'cover' : 'contain'
                };  // 视频适配模式：裁剪或包含
            }
        `
        }

        updateStyle() // 应用初始样式
        ifr.contentDocument.head.appendChild(style) // 将样式添加到iframe头部

        // 设置定时器，持续监控和控制播放器状态
        ifr.contentWindow.setInterval(() => {
            // 检查并关闭登录提示弹窗
            const loginCloseBtn = ifr.contentDocument.querySelector(
                '.bili-mini-close-icon'
            )
            if (loginCloseBtn) loginCloseBtn.click()

            // 设置弹幕开关状态
            const danmakuCheckbox = ifr.contentDocument.querySelector(
                '.bui-danmaku-switch-input'
            )
            if (danmakuCheckbox.checked !== config.danmmaku)
                // 如果弹幕状态与配置不符
                danmakuCheckbox.click() // 切换弹幕状态

            // 检查是否处于网页全屏状态，若不是则重新进入
            const isFullScreen =
                ifr.contentDocument.querySelector('.webscreen-fix')
            if (!isFullScreen) btnFullScreen.click()

            updateStyle() // 重新应用样式，确保设置生效
        }, 100) // 每100ms检查一次
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
    const searchVideo = async (kwd) =>
        await biliFetch(
            `https://api.bilibili.com/x/web-interface/wbi/search/type?search_type=video&order=a&keyword=${encodeURIComponent(
                kwd
            )}`
        ).then((res) => res.json())

        /**
     * 获取当前播放歌曲信息的闭包函数
     * 使用缓存机制优化性能，避免重复搜索网易云API函数
     * 基于LibSongInfo库实现
     */
    const getPlayingSong = (() => {
        // 函数缓存Map，避免重复查找API函数
        const cachedFunctionMap = new Map()

        // LibSongInfo库参考：https://github.com/Steve-xmh/LibSongInfo/blob/main/index.ts

        /**
         * 调用缓存的搜索函数
         * 使用缓存机制查找并调用网易云音乐的API函数
         * @param {string} searchFunctionName - 要查找的函数名
         * @param {Array} args - 传递给函数的参数数组
         * @returns {*} 函数执行结果
         * @throws {TypeError} 当函数未找到时抛出异常
         */
        function callCachedSearchFunction(searchFunctionName, args) {
            // 检查函数是否已缓存
            if (!cachedFunctionMap.has(searchFunctionName.toString())) {
                // 通过BetterNCM API查找网易云音乐的内部函数
                const findResult = betterncm.ncm.findApiFunction(searchFunctionName)
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
            const cachedFunc = cachedFunctionMap.get(searchFunctionName.toString())
            if (cachedFunc) {
                return cachedFunc.apply(null, args)  // 执行函数并返回结果
            } else {
                throw new TypeError(`函数 ${searchFunctionName.toString()} 未找到`)
            }
        }

        /**
         * 获取当前正在播放的歌曲信息
         * @returns {Object} 返回包含歌曲名、歌手、时长等信息的对象
         */
        return function getPlayingSong() {
            return callCachedSearchFunction('getPlaying', [])  // 调用网易云的getPlaying函数
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
        // 检查插件是否启用
        if (!config.enable) return

        // 获取当前播放歌曲的信息
        const {
            data: { name, artists, duration },  // 解构获取歌曲名、歌手、时长
        } = getPlayingSong()

        // 构建搜索关键词，支持变量替换
        const kwd =
            config['search-kwd']
                .replace('{name}', name)          // 替换歌曲名
                .replace('{artist}', artists[0].name) ??  // 替换歌手名
            `MV ${name} - ${artists[0].name}`    // 默认搜索关键词格式

        console.log('[PlayWithBilibili] Searching: ', kwd)

        // 如果缓存中没有搜索结果，则进行搜索
        if (!urlMap[kwd]) {
            urlMap[kwd] = await searchVideo(kwd).then(
                (result) => (
                    console.log('[PlayWithBilibili] Result: ', result), result
                )
            )
        }

        // 默认使用第一个搜索结果
        let url = urlMap[kwd].data.result[0].arcurl

        // 如果启用了时长过滤功能
        if (config['filter-length']) {
            // 时长匹配算法：
            // 1. 将搜索结果转换为 [URL, 时长(秒)] 的数组格式
            // 2. 过滤出与音频时长相差小于5秒的视频
            // 3. 按时长相似度排序，选择最匹配的视频
            const video = urlMap[kwd].data.result
                .map((v) => [
                    v.arcurl,
                    // 解析时长字符串为秒数：支持 "mm:ss" 或 "hh:mm:ss" 格式
                    v.duration
                        .split(':')                          // 按冒号分割
                        .reverse()                          // 反转数组，秒在前
                        .reduce((a, b, i) => a + b * Math.pow(60, i), 0),  // 转换为总秒数
                ])
                .filter((v) => Math.abs(v[1] - duration / 1000) < 5)  // 5秒误差过滤
                .sort(  // 按时长相似度排序，相似度高的在前
                    (a, b) =>
                        Math.abs(a[1] - duration / 1000) >
                        Math.abs(b[1] - duration / 1000)
                )

            if (video.length > 0) {
                url = video[0]  // 使用时长最匹配的视频
            } else {
                url = null       // 没有找到合适的视频
            }
        }

        if (url) {
            // 切换到视频页面并初始化播放器
            await switchUrl(urlMap[kwd].data.result[0].arcurl, initBiliPlayer)

            // 等待并获取iframe内部的video元素
            ifrVideo = await betterncm.utils.waitForFunction(
                () => ifr.contentDocument.querySelector('video'),
                100
            )

            console.log('[ PlayWithBili ] Video loaded', ifrVideo)
            ifrVideo.volume = 0  // 强制静音，避免音频干扰
        } else {
            // 没有找到匹配的视频，清空播放器
            await fadeOut()
            ifr.src = 'about:blank'  // 加载空白页面
        }
    }

        // 注册音频加载事件监听器
    // 当网易云播放器加载新歌曲时，触发视频重新加载
    // 使用防抖优化，避免频繁切换歌曲时的重复调用
    legacyNativeCmder.appendRegisterCall(
        'Load',                                    // 事件类型：加载
        'audioplayer',                            // 目标组件：音频播放器
        betterncm.utils.debounce(reloadVideo)     // 使用防抖包装的重载视频函数
    )

    // 注册播放状态同步监听器
    // 监听网易云播放器的播放状态变化，同步控制视频播放状态
    legacyNativeCmder.appendRegisterCall(
        'PlayState',                               // 事件类型：播放状态变化
        'audioplayer',                            // 目标组件：音频播放器
        (_, __, state) => {                       // 回调函数，state为播放状态（1=播放，0=暂停）
            if (state === 1) ifrVideo?.play()    // 音频播放时，视频也播放
            else ifrVideo?.pause()                // 音频暂停时，视频也暂停
        }
    )

    // 注册播放进度同步监听器
    // 监听音频播放进度，实时同步视频进度，确保音视频完全同步
    legacyNativeCmder.appendRegisterCall(
        'PlayProgress',                            // 事件类型：播放进度变化
        'audioplayer',                            // 目标组件：音频播放器
        (_, progress) => {                        // 回调函数，progress为当前播放时间（秒）
            if (!ifrVideo) return                 // 如果没有视频元素，直接返回

            // 进度同步：当视频进度与音频进度相差超过0.3秒时，强制同步
            if (Math.abs(ifrVideo?.currentTime - progress) > 0.3)
                ifrVideo.currentTime = progress

            // 播放状态检查：确保音频播放时视频也在播放
            // 通过检查LibFrontendPlay插件的播放状态来判断
            if (loadedPlugins.LibFrontendPlay?.currentAudioPlayer?.paused === false)
                ifrVideo?.play()

            // 强制静音：确保视频始终静音，避免与音频冲突
            ifrVideo.volume = 0
        }
    )
})

// 插件配置界面生成函数
plugin.onConfig((tools) => {
    const configDoms = []  // 存储所有配置项DOM元素的数组

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
            <span class="setting-item-name">${name}</span>                    // 配置项名称
            <span class="setting-item-description">${description}</span>      // 配置项描述
            <input type="${
                typeof config[key] === 'boolean' ? 'checkbox' : 'input'     // 根据配置类型选择输入控件
            }" style="color:black;">                                           // 输入控件样式
        `

        // 获取输入控件的引用
        const checkbox = configDom.querySelector('input')

        // 根据配置类型设置初始值
        if (typeof config[key] === 'boolean') checkbox.checked = config[key]  // 布尔值：设置勾选状态
        else if (typeof config[key] === 'string') checkbox.value = config[key] // 字符串：设置输入值

        // 绑定值变化事件处理器
        checkbox.addEventListener('change', () => {
            // 根据配置类型更新配置对象
            config[key] = typeof config[key] === 'boolean' ? checkbox.checked : checkbox.value

            saveConfig()        // 保存配置到localStorage
            updatePluginStyle() // 立即应用样式更改
        })

        configDoms.push(configDom)  // 将配置项添加到DOM数组
    }

    // 创建并注入配置界面的美化CSS样式
    const style = document.createElement('style')
    style.innerHTML = `
        .setting-item {
            display: flex;                           // 弹性布局
            align-items: center;                     // 垂直居中对齐
            justify-content: space-between;          // 两端对齐
            padding: 0 10px;                         // 内边距
            height: 40px;                            // 固定高度
            border-bottom: 1px solid #e5e5e5;        // 底部边框
            background: #ffffff;                     // 白色背景
        }

        .setting-item-name {
            font-size: 14px;                         // 配置名称字体大小
            color: #333;                             // 深灰色文字
            white-space: nowrap;                     // 不换行
            overflow: hidden;                        // 隐藏溢出
            text-overflow: ellipsis;                 // 省略号显示
        }

        .setting-item-description {
            font-size: 12px;                         // 描述文字字体大小
            color: #999;                             // 浅灰色文字
            white-space: nowrap;                     // 不换行
            overflow: hidden;                        // 隐藏溢出
            text-overflow: ellipsis;                 // 省略号显示
        }

        .switch {
            position: relative;                      // 相对定位
            display: inline-block;                   // 行内块级元素
            width: 60px;                             // 开关宽度
            height: 34px;                            // 开关高度
        }

        .switch-input {
            opacity: 0;                             // 透明度0
            width: 0;                                // 宽度0
            height: 0;                               // 高度0
        }

        .login-iframe{
            width: 100%;                             // 登录iframe宽度
            height: 500px;                           // 登录iframe高度
        }
        `

    /**
     * 保存配置到localStorage并应用设置
     * 遍历所有配置项，将当前配置值序列化存储
     * 根据启用状态控制视频播放器的显示
     */
    function saveConfig() {
        // 逐个保存配置项到localStorage
        for (const key in configKeys) {
            localStorage[`playwithbilio.${key}`] = JSON.stringify(config[key])
        }

        // 根据启用状态控制视频播放器
        if (config.enable) {
            fadeIn()             // 启用时淡入视频
        } else {
            fadeOut()            // 禁用时淡出视频
            ifr.src = 'about:blank'  // 清空iframe内容
        }
    }

        /**
     * 创建Bilibili登录功能组件
     * 提供内嵌式登录界面，自动检测登录状态并定制化显示
     */
    const loginIfr = dom(
        'div',                                         // 容器元素
        {},
        // 登录按钮
        dom('button', {
            innerHTML: '登录',                         // 按钮文本
            style: {
                color: 'black',                        // 黑色文字
                border: 'none',                        // 无边框
                padding: '20px 20px',                  // 内边距
                width: '100%',                         // 全宽按钮
            },
            // 按钮点击事件处理器
            onclick: () => {
                // 移除按钮，准备显示登录iframe
                loginIfr.firstChild.remove()

                // 添加登录iframe到容器
                loginIfr.prepend(
                    dom('iframe', {
                        src: 'https://bilibili.com',  // B站登录页面
                        sandbox: 'allow-scripts allow-forms allow-same-origin',  // 安全沙箱设置
                        class: ['login-iframe'],        // CSS类名
                        // iframe加载完成后的处理逻辑
                        async onload() {
                            const td = this.contentWindow.document
                            await betterncm.utils.delay(200)  // 等待页面渲染

                            // 查找并点击登录按钮
                            const goLoginBtn = td.querySelector('.go-login-btn')
                            if (goLoginBtn) {
                                goLoginBtn.click()  // 触发登录流程

                                // 创建并注入自定义样式，优化登录界面显示
                                const s = document.createElement('style')
                                s.innerHTML = `
.bili-mini-content-wp {                   // 登录弹窗容器
    position: absolute;                     // 绝对定位
    left: 0;                               // 左边对齐
    top: 0;                                // 顶部对齐
    right: 0;                              // 右边对齐
    width: 100% !important;                // 强制宽度100%
    height: 500px !important;              // 强制高度500px
    border-radius: 0;                      // 无圆角
}
body{                                     // 页面主体
    overflow:hidden;                       // 隐藏滚动条
}
.bili-mini-close-icon,.i_cecream{        // 关闭按钮和其他不需要的元素
    display:none;                          // 隐藏显示
}
    `
                                td.head.append(s)  // 将样式添加到页面头部
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
        'div',                                         // 主容器
        {
            // 插件标题和描述部分
            innerHTML: ` <div class="setting-item">
        <span class="setting-item-name">Play With Bilibili MV</span>        // 插件名称
        <span class="setting-item-description">使用 Bilibili 播放器自动播放 MV</span>  // 功能描述
    </div>`,
        },
        ...configDoms,                               // 展开所有配置项DOM
        loginIfr,                                    // 登录组件
        style                                        // 样式定义
    )
})
