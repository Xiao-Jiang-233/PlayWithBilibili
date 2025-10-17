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
    'filter-play': 5000, // 播放量过滤阈值，-1为禁用，默认5000
    'log-enable': true, // 是否启用日志系统
    'log-level': 'info', // 日志级别：debug/info/warn/error
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
    'filter-play': [
        '播放量过滤',
        '过滤播放量低于指定值的视频，-1为禁用，默认5000',
    ],
    'log-enable': ['日志系统', '启用插件日志系统'],
    'log-level': ['日志级别', '日志输出级别：debug/info/warn/error'],
}

/**
 * 日志系统 - PlayWithBilibili Logger
 *
 * 提供分级日志输出、格式化时间戳、配置控制等功能
 * 支持日志级别：debug < info < warn < error
 *
 * 使用示例：
 * logger.debug('调试信息', { data: 'test' })
 * logger.info('普通信息', '操作完成')
 * logger.warn('警告信息', '可能出现问题')
 * logger.error('错误信息', error, { context: 'search' })
 */
const logger = {
    // 日志级别优先级映射
    levels: {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
    },

    /**
     * 格式化时间戳为易读格式
     * @returns {string} 格式化的时间字符串 HH:MM:SS.mmm
     */
    formatTimestamp() {
        const now = new Date()
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        const seconds = String(now.getSeconds()).padStart(2, '0')
        const milliseconds = String(now.getMilliseconds()).padStart(3, '0')
        return `${hours}:${minutes}:${seconds}.${milliseconds}`
    },

    /**
     * 检查当前日志级别是否允许输出
     * @param {string} level - 要检查的日志级别
     * @returns {boolean} 是否允许输出
     */
    shouldLog(level) {
        if (!config['log-enable']) return false

        const currentLevel = config['log-level'] || 'info'
        const currentPriority = this.levels[currentLevel] || 1
        const messagePriority = this.levels[level] || 1

        return messagePriority >= currentPriority
    },

    /**
     * 核心日志输出方法
     * @param {string} level - 日志级别
     * @param {string} message - 主要消息
     * @param {...any} args - 附加参数
     */
    log(level, message, ...args) {
        if (!this.shouldLog(level)) return

        const timestamp = this.formatTimestamp()
        const prefix = `[PlayWithBilibili][${timestamp}][${level.toUpperCase()}]`

        // 根据级别选择不同的console方法
        switch (level) {
            case 'debug':
                console.debug(prefix, message, ...args)
                break
            case 'info':
                console.info(prefix, message, ...args)
                break
            case 'warn':
                console.warn(prefix, message, ...args)
                break
            case 'error':
                console.error(prefix, message, ...args)
                break
            default:
                console.log(prefix, message, ...args)
        }
    },

    /**
     * 调试级别日志 - 详细的调试信息
     * @param {string} message - 日志消息
     * @param {...any} args - 附加数据
     */
    debug(message, ...args) {
        this.log('debug', message, ...args)
    },

    /**
     * 信息级别日志 - 一般信息
     * @param {string} message - 日志消息
     * @param {...any} args - 附加数据
     */
    info(message, ...args) {
        this.log('info', message, ...args)
    },

    /**
     * 警告级别日志 - 警告信息
     * @param {string} message - 日志消息
     * @param {...any} args - 附加数据
     */
    warn(message, ...args) {
        this.log('warn', message, ...args)
    },

    /**
     * 错误级别日志 - 错误信息
     * @param {string} message - 日志消息
     * @param {...any} args - 附加数据
     */
    error(message, ...args) {
        this.log('error', message, ...args)
    },

    /**
     * 开始性能计时
     * @param {string} label - 计时标签
     * @returns {Function} 结束计时的函数
     */
    time(label) {
        if (!this.shouldLog('debug')) return () => {}

        const fullLabel = `[PlayWithBilibili][${label}]`
        console.time(fullLabel)

        return () => {
            console.timeEnd(fullLabel)
        }
    },
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
    logger.info('插件开始加载', {
        version: 'Pro',
        timestamp: new Date().toISOString(),
    })

    // 从localStorage逐个加载配置项
    for (const key in configKeys) {
        try {
            config[key] = JSON.parse(localStorage[`playwithbilio.${key}`])
        } catch (e) {} // 忽略解析错误，使用默认值
    }
    logger.info('配置加载完成', config)
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
        logger.debug('播放器状态已重置')
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
            logger.debug('播放器已初始化，跳过重复初始化')
            return
        }

        logger.info('开始初始化Bilibili播放器')

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
                logger.error('未找到网页全屏按钮')
                return
            }

            logger.debug('找到网页全屏按钮，点击进入全屏模式')
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
                object-fit: ${config.cover ? 'cover' : 'contain'};
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
                    logger.debug('重新进入网页全屏模式')
                }

                updateStyle() // 重新应用样式，确保设置生效
            }, 500) // 降低检查频率到500ms，减少性能开销

            // 标记播放器已初始化
            playerInitialized = true
            logger.info('Bilibili播放器初始化完成')
        } catch (error) {
            logger.error('Bilibili播放器初始化失败', error)
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
        const endTimer = logger.time('searchVideo')
        logger.debug('开始搜索视频', { keyword: kwd })

        try {
            const response = await biliFetch(
                `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(
                    kwd
                )}`
            )
            const result = await response.json()

            logger.debug('视频搜索完成', {
                keyword: kwd,
                resultCount: result.data?.result?.length || 0,
                statusCode: result.code,
                firstResult: result.data?.result?.[0]
                    ? {
                          title: result.data.result[0].title,
                          duration: result.data.result[0].duration,
                          bvid: result.data.result[0].bvid,
                          aid: result.data.result[0].aid,
                      }
                    : null,
            })

            endTimer()
            return result
        } catch (error) {
            logger.error('视频搜索失败', {
                keyword: kwd,
                error: error.message,
            })
            endTimer()
            throw error
        }
    }


    /**
     * 解析搜索API返回的JSON数据为标准视频数组格式
     * 将Bilibili API返回的复杂结构简化为统一格式
     *
     * @param {Object} jsonData - Bilibili搜索API返回的JSON数据
     * @returns {Array} 返回标准格式的视频对象数组
     */
    const parseSearchResults = (jsonData) => {
        logger.debug('开始解析搜索结果')

        if (!jsonData?.data?.result || !Array.isArray(jsonData.data.result)) {
            logger.warn('搜索结果格式无效', jsonData)
            return []
        }

        const videos = jsonData.data.result.map((video) => ({
            title:
                video.title?.replace(/<em class="keyword">|<\/em>/g, '') || '', // 移除关键词高亮标签
            bvid: video.bvid || '',
            duration: video.duration || '', // MM:SS格式的时长字符串
            playCount: video.play || 0, // 观看数
            author: video.author || '',
            arcurl: video.arcurl || '',
        }))

        logger.debug('搜索结果解析完成', {
            totalVideos: videos.length,
            firstVideo: videos[0] || null,
        })

        return videos
    }

    /**
     * 清理歌名中的括号内容
     * 移除【】、[]、{}、()、「」、『』等括号及其之间的内容
     * @param {string} songName - 原始歌名
     * @returns {string} 清理后的歌名
     */
    const cleanSongName = (songName) => {
        if (!songName || typeof songName !== 'string') return songName || ''

        // 移除各种括号及其内容
        const cleaned = songName
            .replace(/【.*?】|\[.*?\]|\{.*?\}|\(.*?\)|「.*?」|『.*?』/g, '')
            .replace(/\s+/g, ' ') // 标准化空格
            .trim()

        logger.debug('歌名清理', {
            original: songName,
            cleaned: cleaned
        })

        return cleaned
    }

    /**
     * 智能相似度计算
     * 处理包含额外信息的标题，优先匹配核心关键词
     * @param {string} videoTitle - 视频标题
     * @param {string} songName - 歌曲名
     * @param {string} artistName - 歌手名
     * @returns {number} 相似度百分比（0-1）
     */
    const calculateSimilarity = (videoTitle, songName, artistName) => {
        if (!videoTitle || !songName) return 0

        const title = videoTitle.toLowerCase()
        const song = songName.toLowerCase()
        const artist = artistName?.toLowerCase() || ''

        // 移除常见干扰符号和词语
        const cleanTitle = title
            .replace(/【.*?】|\[.*?\]|\(.*?\)|「.*?」|『.*?』/g, '') // 移除括号内容
            .replace(/官方投稿|official|mv|pv|feat\.?|ft\.?/gi, '') // 移除常见关键词
            .replace(/[\s\-\|\/]+/g, ' ') // 标准化分隔符
            .trim()

        // 计算基础相似度（基于最长公共子序列）
        const baseSimilarity = calculateBaseSimilarity(cleanTitle, song)

        // 计算歌手相似度
        const artistSimilarity = artist ? calculateBaseSimilarity(cleanTitle, artist) : 0

        // 计算组合相似度
        let finalSimilarity = baseSimilarity

        // 如果歌手相似度较高，提升整体相似度
        if (artistSimilarity > 0.3) {
            finalSimilarity = Math.max(finalSimilarity, (baseSimilarity + artistSimilarity) / 2)
        }

        // 如果标题包含歌曲名，直接给高分
        if (cleanTitle.includes(song)) {
            finalSimilarity = Math.max(finalSimilarity, 0.8)
        }

        // 如果标题包含歌手名，提升相似度
        if (artist && cleanTitle.includes(artist.replace('official', '').trim())) {
            finalSimilarity = Math.max(finalSimilarity, 0.7)
        }

        return Math.min(finalSimilarity, 1.0)
    }

    /**
     * 基础相似度计算（基于最长公共子序列）
     * @param {string} str1 - 第一个字符串
     * @param {string} str2 - 第二个字符串
     * @returns {number} 相似度百分比（0-1）
     */
    const calculateBaseSimilarity = (str1, str2) => {
        if (!str1 || !str2) return 0

        const s1 = str1.toLowerCase()
        const s2 = str2.toLowerCase()

        // 计算最长公共子序列长度
        const m = s1.length
        const n = s2.length
        const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0))

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (s1[i - 1] === s2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
                }
            }
        }

        const lcsLength = dp[m][n]
        const maxLength = Math.max(m, n)

        return lcsLength / maxLength
    }

    /**
     * 按标题相似度过滤视频
     * 使用智能相似度匹配，50%相似度阈值
     *
     * @param {Array} videos - 视频对象数组
     * @param {string} songName - 歌曲名
     * @param {string} artistName - 歌手名
     * @returns {Array} 过滤后的视频数组
     */
    const filterByTitle = (videos, songName, artistName) => {
        logger.debug('开始按标题相似度过滤', {
            songName,
            artistName,
            videoCount: videos.length,
            similarityThreshold: 0.5,
        })

        if (!songName || songName.trim() === '') {
            logger.debug('歌曲名为空，跳过标题过滤')
            return videos
        }

        const filteredVideos = videos.filter((video) => {
            const similarity = calculateSimilarity(video.title, songName, artistName)
            const isMatch = similarity >= 0.5

            if (!isMatch) {
                logger.debug('标题相似度过滤失败', {
                    videoTitle: video.title,
                    songName,
                    artistName,
                    similarity: Math.round(similarity * 100),
                    reason: '相似度低于50%',
                })
            } else {
                logger.debug('标题相似度过滤通过', {
                    videoTitle: video.title,
                    songName,
                    artistName,
                    similarity: Math.round(similarity * 100),
                })
            }

            return isMatch
        })

        logger.debug('标题相似度过滤完成', {
            originalCount: videos.length,
            filteredCount: filteredVideos.length,
            songName,
            artistName,
            similarityThreshold: '50%',
            filteredTitles: filteredVideos.map((v) => v.title),
            failedCount: videos.length - filteredVideos.length,
            similarityScores: filteredVideos.map(v =>
                Math.round(calculateSimilarity(v.title, songName, artistName) * 100)
            ),
        })

        return filteredVideos
    }

    /**
     * 按播放量过滤视频
     * 根据配置的播放量阈值过滤视频，-1为禁用
     *
     * @param {Array} videos - 视频对象数组
     * @param {number} playThreshold - 播放量阈值，-1为禁用
     * @returns {Array} 过滤后的视频数组
     */
    const filterByPlayCount = (videos, playThreshold) => {
        logger.debug('开始按播放量过滤', {
            videoCount: videos.length,
            playThreshold,
        })

        // 如果播放量过滤被禁用（-1），直接返回原数组
        if (playThreshold === -1) {
            logger.debug('播放量过滤已禁用，跳过过滤')
            return videos
        }

        const filteredVideos = videos.filter((video) => {
            const isMatch = video.playCount >= playThreshold

            if (!isMatch) {
                logger.debug('播放量过滤失败', {
                    videoTitle: video.title,
                    playCount: video.playCount,
                    threshold: playThreshold,
                    reason: '播放量低于阈值',
                })
            }

            return isMatch
        })

        logger.debug('播放量过滤完成', {
            originalCount: videos.length,
            filteredCount: filteredVideos.length,
            playThreshold,
            filteredTitles: filteredVideos.map((v) => v.title),
            failedCount: videos.length - filteredVideos.length,
            playCounts: filteredVideos.map((v) => v.playCount),
        })

        return filteredVideos
    }

    /**
     * 按时长过滤和匹配视频
     * 根据配置项决定是否进行时长匹配
     *
     * @param {Array} videos - 视频对象数组
     * @param {number} audioDuration - 音频时长（毫秒）
     * @param {boolean} enableFilter - 是否启用时长过滤
     * @returns {Promise<Array>} 返回按相似度排序的视频数组
     */
    const filterByDuration = async (videos, audioDuration, enableFilter) => {
        const endTimer = logger.time('filterByDuration')
        logger.debug('开始按时长过滤', {
            videoCount: videos.length,
            audioDuration: audioDuration / 1000, // 转换为秒
            enableFilter,
        })

        if (!enableFilter) {
            // 如果不启用时长过滤，直接返回原数组的第一个视频
            logger.debug('时长过滤已禁用，返回第一个结果')
            endTimer()
            return videos.length > 0 ? [videos[0]] : []
        }

        const audioSeconds = Math.floor(audioDuration / 1000)
        const audioMinutes = Math.floor(audioSeconds / 60)

        // 阶段一：按分钟过滤
        const minuteFilteredVideos = videos.filter((video) => {
            // 解析视频时长字符串 MM:SS（分钟:秒格式）
            const durationParts = video.duration.split(':')
            let videoSeconds = 0

            if (durationParts.length === 2) {
                // 格式：分钟:秒
                const minutes = parseInt(durationParts[0] || 0)
                const seconds = parseInt(durationParts[1] || 0)
                videoSeconds = minutes * 60 + seconds
            } else if (durationParts.length === 3) {
                // 格式：小时:分钟:秒（处理特殊情况）
                const hours = parseInt(durationParts[0] || 0)
                const minutes = parseInt(durationParts[1] || 0)
                const seconds = parseInt(durationParts[2] || 0)
                videoSeconds = hours * 3600 + minutes * 60 + seconds
            }

            const videoMinutes = Math.floor(videoSeconds / 60)
            const isMatch = videoMinutes === audioMinutes

            if (!isMatch) {
                logger.debug('分钟过滤失败', {
                    videoTitle: video.title,
                    videoMinutes,
                    audioMinutes,
                    reason: '分钟数不匹配',
                })
            }

            // 分钟数必须相同
            return isMatch
        })

        logger.debug('分钟过滤完成', {
            originalCount: videos.length,
            minuteFilteredCount: minuteFilteredVideos.length,
            audioMinutes,
            filteredTitles: minuteFilteredVideos.map((v) => v.title),
            failedCount: videos.length - minuteFilteredVideos.length,
        })

        if (minuteFilteredVideos.length === 0) {
            logger.debug('没有分钟匹配的视频，返回空数组')
            endTimer()
            return []
        }

        // 阶段二：从MM:SS格式计算精确秒数
        const videosWithExactDuration = minuteFilteredVideos.map((video) => {
            // 解析视频时长字符串 MM:SS（分钟:秒格式）
            const durationParts = video.duration.split(':')
            let exactSeconds = 0

            if (durationParts.length === 2) {
                // 格式：分钟:秒
                const minutes = parseInt(durationParts[0] || 0)
                const seconds = parseInt(durationParts[1] || 0)
                exactSeconds = minutes * 60 + seconds
            } else if (durationParts.length === 3) {
                // 格式：小时:分钟:秒（处理特殊情况）
                const hours = parseInt(durationParts[0] || 0)
                const minutes = parseInt(durationParts[1] || 0)
                const seconds = parseInt(durationParts[2] || 0)
                exactSeconds = hours * 3600 + minutes * 60 + seconds
            }

            logger.debug('从MM:SS格式计算精确时长', {
                videoTitle: video.title,
                bvid: video.bvid,
                durationString: video.duration,
                exactSeconds,
            })

            return {
                ...video,
                exactSeconds,
            }
        })

        // 阶段三：按原始顺序找到首个时长相差5s以内的视频
        const matchedVideo = videosWithExactDuration.find((video) => {
            const timeDiff = Math.abs(video.exactSeconds - audioSeconds)
            const isMatch = timeDiff < 5 // 5秒误差

            if (!isMatch) {
                logger.debug('秒级时长过滤失败', {
                    videoTitle: video.title,
                    videoSeconds: video.exactSeconds,
                    audioSeconds,
                    timeDifference: timeDiff,
                    reason: '时长差异超过5秒',
                })
            }

            return isMatch
        })

        logger.debug('时长匹配完成', {
            hasMatch: !!matchedVideo,
            matchedVideo: matchedVideo
                ? {
                      title: matchedVideo.title,
                      bvid: matchedVideo.bvid,
                      duration: matchedVideo.exactSeconds,
                      timeDifference: Math.abs(
                          matchedVideo.exactSeconds - audioSeconds
                      ),
                  }
                : null,
            checkedVideos: videosWithExactDuration.map((v) => ({
                title: v.title,
                duration: v.exactSeconds,
                timeDifference: Math.abs(v.exactSeconds - audioSeconds),
            })),
        })

        endTimer()
        return matchedVideo ? [matchedVideo] : []
    }

    /**
     * 缓存搜索结果
     * 将歌曲和对应的bvid缓存起来，避免重复搜索
     *
     * @param {string} songKey - 歌曲缓存键（格式：歌曲名-歌手名）
     * @param {string} bvid - 视频的bvid
     */
    const cacheResult = (songKey, bvid) => {
        logger.debug('缓存搜索结果', { songKey, bvid })
        urlMap[songKey] = bvid
    }

    /**
     * 带缓存的视频搜索主函数
     * 实现重构计划的7步搜索流程：
     * 1. 先查找缓存
     * 2. 执行搜索
     * 3. 解析结果
     * 4. 标题相似度过滤（50%阈值）
     * 5. 时长过滤
     * 6. 播放量过滤
     * 7. 返回结果并缓存
     *
     * @param {string} songName - 歌曲名
     * @param {string} artistName - 歌手名
     * @param {number} audioDuration - 音频时长（毫秒）
     * @returns {Promise<string|null>} 返回匹配的bvid，未找到返回null
     */
    const searchVideoWithCache = async (
        songName,
        artistName,
        audioDuration
    ) => {
        const endTimer = logger.time('searchVideoWithCache')
        const songKey = `${songName}-${artistName}`

        logger.info('开始智能视频搜索', {
            songName,
            artistName,
            audioDuration: audioDuration / 1000,
        })

        // 步骤1：先查找缓存
        if (urlMap[songKey]) {
            logger.info('使用缓存结果', {
                songKey,
                bvid: urlMap[songKey],
            })
            endTimer()
            return urlMap[songKey]
        }

        // 步骤2：执行搜索
        const cleanedSongName = cleanSongName(songName)
        const keyword =
            config['search-kwd']
                .replace('{name}', cleanedSongName)
                .replace('{artist}', artistName) ||
            `MV ${cleanedSongName} - ${artistName}`

        logger.info('搜索关键词', keyword)

        let searchResult
        try {
            searchResult = await searchVideo(keyword)
        } catch (error) {
            logger.error('搜索失败', error)
            endTimer()
            return null
        }

        // 步骤3：解析结果为标准格式
        const videos = parseSearchResults(searchResult)
        if (videos.length === 0) {
            logger.warn('搜索结果为空')
            endTimer()
            return null
        }

        logger.info('搜索结果解析完成', {
            totalVideos: videos.length,
            videoTitles: videos.map((v) => v.title),
            videoDurations: videos.map((v) => v.duration),
            videoPlayCounts: videos.map((v) => v.playCount),
        })

        // 步骤4：标题相似度过滤
        const titleFilteredVideos = filterByTitle(videos, songName, artistName)
        if (titleFilteredVideos.length === 0) {
            logger.warn('标题相似度过滤后无结果', {
                originalCount: videos.length,
                songName,
                artistName,
                similarityThreshold: '50%',
                reason: '所有视频标题与歌曲名相似度都低于50%',
            })
            endTimer()
            return null
        }

        logger.info('标题相似度过滤完成', {
            originalCount: videos.length,
            filteredCount: titleFilteredVideos.length,
            similarityThreshold: '50%',
            remainingTitles: titleFilteredVideos.map((v) => v.title),
            similarityScores: titleFilteredVideos.map(v =>
                Math.round(calculateSimilarity(v.title, songName, artistName) * 100)
            ),
        })

        // 步骤5：时长过滤
        const durationFilteredVideos = await filterByDuration(
            titleFilteredVideos,
            audioDuration,
            config['filter-length']
        )
        if (durationFilteredVideos.length === 0) {
            logger.warn('时长过滤后无结果', {
                originalCount: titleFilteredVideos.length,
                audioDuration: audioDuration / 1000,
                reason: '没有视频时长与音频时长匹配',
            })
            endTimer()
            return null
        }

        logger.info('时长过滤完成', {
            originalCount: titleFilteredVideos.length,
            filteredCount: durationFilteredVideos.length,
            matchedVideo: durationFilteredVideos[0]
                ? {
                      title: durationFilteredVideos[0].title,
                      duration:
                          durationFilteredVideos[0].exactSeconds ||
                          durationFilteredVideos[0].duration,
                  }
                : null,
        })

        // 步骤6：播放量过滤
        const playFilteredVideos = filterByPlayCount(
            durationFilteredVideos,
            config['filter-play']
        )
        if (playFilteredVideos.length === 0) {
            logger.warn('播放量过滤后无结果', {
                originalCount: durationFilteredVideos.length,
                playThreshold: config['filter-play'],
                reason: '所有视频播放量都低于阈值',
            })
            endTimer()
            return null
        }

        logger.info('播放量过滤完成', {
            originalCount: durationFilteredVideos.length,
            filteredCount: playFilteredVideos.length,
            playThreshold: config['filter-play'],
            remainingTitles: playFilteredVideos.map((v) => v.title),
            remainingPlayCounts: playFilteredVideos.map((v) => v.playCount),
        })

        // 步骤7：返回结果并缓存
        const selectedVideo = playFilteredVideos[0]
        logger.info('搜索完成，选择视频', {
            title: selectedVideo.title,
            bvid: selectedVideo.bvid,
            duration: selectedVideo.exactSeconds || selectedVideo.duration,
            playCount: selectedVideo.playCount,
            author: selectedVideo.author,
            searchProcess: {
                originalResults: videos.length,
                afterTitleFilter: titleFilteredVideos.length,
                afterDurationFilter: durationFilteredVideos.length,
                afterPlayFilter: playFilteredVideos.length,
            },
        })

        cacheResult(songKey, selectedVideo.bvid)
        endTimer()
        return selectedVideo.bvid
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
     * 重新加载视频的核心函数（重构后）
     * 使用新的搜索流程，简化逻辑，提高可维护性
     */
    const reloadVideo = async () => {
        const endTimer = logger.time('reloadVideo')
        // 重置播放器状态，允许重新初始化
        resetPlayerState()

        try {
            // 获取当前播放歌曲的信息
            const {
                data: { name, artists, duration }, // 解构获取歌曲名、歌手、时长
            } = getPlayingSong()

            const artistName = artists[0]?.name || '未知歌手'

            logger.info('开始加载视频', {
                songName: name,
                artist: artistName,
                duration: duration / 1000, // 转换为秒
            })

            // 使用新的搜索流程
            const bvid = await searchVideoWithCache(name, artistName, duration)

            if (bvid) {
                // 构建视频页面URL
                const videoUrl = `https://www.bilibili.com/video/${bvid}`

                logger.info('找到匹配视频', {
                    bvid,
                    url: videoUrl,
                })

                // 切换到视频页面并初始化播放器
                await switchUrl(videoUrl, initBiliPlayer)

                // 等待并获取iframe内部的video元素
                ifrVideo = await betterncm.utils.waitForFunction(
                    () => ifr.contentDocument.querySelector('video'),
                    100
                )

                logger.debug('视频加载完成', ifrVideo)
                ifrVideo.volume = 0 // 强制静音，避免音频干扰
            } else {
                // 没有找到匹配的视频，清空播放器
                logger.warn('未找到匹配的视频', {
                    songName: name,
                    artist: artistName,
                })
                await fadeOut()
                ifr.src = 'about:blank' // 加载空白页面
            }
        } catch (error) {
            logger.error('视频加载失败', error)
            // 加载失败时清空播放器
            await fadeOut()
            ifr.src = 'about:blank'
        } finally {
            endTimer()
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

    logger.info('插件加载完成')
})

// 插件配置界面生成函数
plugin.onConfig((tools) => {
    logger.debug('打开配置界面')
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
        if (key === 'log-level') {
            // 日志级别使用下拉选择框
            configDom.innerHTML = `
                <span class="setting-item-name">${name}</span>
                <span class="setting-item-description">${description}</span>
                <select style="color:black; padding: 4px; border-radius: 4px;">
                    <option value="debug">Debug - 调试信息</option>
                    <option value="info">Info - 一般信息</option>
                    <option value="warn">Warn - 警告信息</option>
                    <option value="error">Error - 错误信息</option>
                </select>
            `

            const select = configDom.querySelector('select')
            select.value = config[key]

            select.addEventListener('change', () => {
                config[key] = select.value
                saveConfig()
                updatePluginStyle()
            })
        } else {
            // 其他配置项使用原有的checkbox和input
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
            else if (typeof config[key] === 'string')
                checkbox.value = config[key] // 字符串：设置输入值

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
        }

        configDoms.push(configDom) // 将配置项添加到DOM数组
    }

    // 创建并注入配置界面的美化CSS样式
    const style = document.createElement('style')
    style.innerHTML = `
        .setting-item {
            display: flex;
            flex-direction: column;
            padding: 12px 16px;
            border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
            background: transparent;
            gap: 4px;
        }

        .setting-item-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
        }

        .setting-item-name {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-color, #333);
            flex: 1;
        }

        .setting-item-description {
            font-size: 12px;
            color: var(--description-color, #999);
            line-height: 1.4;
            word-break: break-word;
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
        logger.debug('保存配置变更', {
            oldConfig: { ...config },
        })

        // 逐个保存配置项到localStorage
        for (const key in configKeys) {
            localStorage[`playwithbilio.${key}`] = JSON.stringify(config[key])
        }

        logger.debug('配置已保存到localStorage', config)
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
