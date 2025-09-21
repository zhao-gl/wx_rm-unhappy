/**
 * 简化的分包加载解决方案
 * 直接在主包中包含必要的代码，避免复杂的动态导入
 */

// 直接导入原来的模块，避免分包加载问题
import Grid from './matchthree/grid.js';
import Piece from './matchthree/piece.js';
import './render';
import GameInfo from './runtime/gameinfo';
import MainMenu from './runtime/mainmenu';
import DataBus from './databus';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './render';

// 初始化数据总线
globalThis.GameGlobal = globalThis.GameGlobal || {};
GameGlobal.databus = new DataBus();

// 加载背景图片
const bgImage = wx.createImage();
bgImage.src = 'resources/images/bg.png';
bgImage.onload = () => {
    console.log('背景图片加载成功');
};
bgImage.onerror = (err) => {
    console.error('背景图片加载失败:', err);
};

/**
 * 游戏主函数（简化版）
 */
export default class Main {
    aniId = 0;
    grid = null; // 初始化为null，等待子包加载完成后创建
    gameInfo = new GameInfo();
    mainMenu = new MainMenu();

    constructor() {
        // 初始化加载进度
        this.loadProgress = 0;
        this.isLoading = true;

        // 先创建mainMenu实例，以便可以更新进度
        this.mainMenu = new MainMenu();

        // 加载子包并等待加载完成后再初始化游戏
        this.loadSubpackage()
            .then(() => {
                // 子包加载成功后初始化游戏相关内容
                this.isLoading = false;
                this.initializeGame();
            })
            .catch((err) => {
                console.error('子包加载失败:', err);
                // 即使子包加载失败也初始化游戏，使用默认资源
                this.isLoading = false;
                this.initializeGame();
            });
    }

    // 初始化游戏相关内容
    initializeGame() {
        // 创建Grid对象
        this.grid = new Grid();

        // 注册Piece对象池
        GameGlobal.databus.pool.recover('piece', new Piece());

        // 初始化触摸事件
        this.initTouchEvent();

        // 绑定游戏事件
        this.gameInfo.on('restart', this.restart.bind(this));
        this.gameInfo.on('hint', this.showHint.bind(this));
        this.mainMenu.on('startGame', this.startGame.bind(this));
        this.mainMenu.on('continueGame', this.continueGame.bind(this));
        this.mainMenu.on('backToMenu', this.backToMenu.bind(this));

        // 开始主菜单
        this.showMainMenu();
    }

    // 检查点是否在返回按钮内
    isPointInBackButton(x, y) {
        if(!this.grid) return false;
        const button = this.grid.backButton;
        return x >= button.x && x <= button.x + button.width &&
            y >= button.y && y <= button.y + button.height;
    }

    // 初始化触摸事件
    initTouchEvent() {
        wx.onTouchStart((e) => {
            const { clientX, clientY } = e.touches[0];
            if (GameGlobal.databus.gameState === 'playing') {
                if (this.isPointInBackButton(clientX, clientY)) {
                    this.showMainMenu();
                    return;
                }
                this.grid.handleTouchStart(clientX, clientY);
            }
        });

        wx.onTouchMove((e) => {
            const { clientX, clientY } = e.touches[0];
            if (GameGlobal.databus.gameState === 'playing') {
                this.grid.handleTouchMove(clientX, clientY);
            }
        });

        wx.onTouchEnd((e) => {
            if (GameGlobal.databus.gameState === 'playing') {
                this.grid.handleTouchEnd();
            }
        });
    }

    showMainMenu() {
        GameGlobal.databus.gameState = 'mainMenu';
        cancelAnimationFrame(this.aniId);
        this.aniId = requestAnimationFrame(this.loop.bind(this));
    }

    startGame() {
        GameGlobal.databus.startGame();
        this.start();
    }

    continueGame() {
        GameGlobal.databus.continueGame();
        this.start();
    }

    backToMenu() {
        GameGlobal.databus.backToMenu();
        this.showMainMenu();
    }

    restart() {
        GameGlobal.databus.reset();
        this.start();
    }

    showHint() {
        if (GameGlobal.databus.gameState === 'playing' && !GameGlobal.databus.isGameOver) {
            this.grid.showHint();
        }
    }

    start() {
        cancelAnimationFrame(this.aniId);
        this.aniId = requestAnimationFrame(this.loop.bind(this));
    }

    render() {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        // 绘制背景图片
        this.renderBackground(ctx);

        // 根据游戏状态绘制不同内容
        if (GameGlobal.databus.gameState === 'mainMenu') {
            this.mainMenu.render(ctx);
        } else if (GameGlobal.databus.gameState === 'playing') {
            this.renderGameContent(ctx);
        } else if (GameGlobal.databus.gameState === 'levelCompleteMenu') {
            this.renderGameContent(ctx);
            this.mainMenu.renderLevelCompleteMenu(ctx);
        }
    }

    renderBackground(ctx) {
        ctx.save();

        if (ctx.imageSmoothingEnabled !== undefined) {
            ctx.imageSmoothingEnabled = true;
            if (ctx.imageSmoothingQuality) {
                ctx.imageSmoothingQuality = 'high';
            }
        }

        if (bgImage.complete && bgImage.naturalWidth > 0) {
            const scaleX = SCREEN_WIDTH / bgImage.naturalWidth;
            const scaleY = SCREEN_HEIGHT / bgImage.naturalHeight;
            const scale = Math.max(scaleX, scaleY);

            const scaledWidth = bgImage.naturalWidth * scale;
            const scaledHeight = bgImage.naturalHeight * scale;

            const offsetX = (SCREEN_WIDTH - scaledWidth) / 2;
            const offsetY = (SCREEN_HEIGHT - scaledHeight) / 2;

            ctx.drawImage(bgImage, offsetX, offsetY, scaledWidth, scaledHeight);
        } else {
            const gradient = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
            gradient.addColorStop(0, '#87CEEB');
            gradient.addColorStop(0.5, '#98FB98');
            gradient.addColorStop(1, '#F0E68C');

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        }

        const overlayGradient = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
        overlayGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        overlayGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.05)');
        overlayGradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');

        ctx.fillStyle = overlayGradient;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        ctx.restore();
    }

    renderGameContent(ctx) {
        if(this.grid) this.grid.render(ctx);
        this.gameInfo.render(ctx);

        GameGlobal.databus.animations.forEach((ani) => {
            if (ani.isPlaying) {
                ani.update();
                ani.render(ctx);
            }
        });
    }

    update() {
        if (GameGlobal.databus.gameState === 'playing') {
            GameGlobal.databus.frame++;

            // 关键修复：始终调用grid.update()驱动方块动画
            // 即使通关也需要继续更新，直到所有动画完成
            if(this.grid) this.grid.update();

            // 检查关卡是否完成，如果是则切换状态
            if (GameGlobal.databus.isLevelComplete) {
                // 计算通关后的等待时间
                const levelCompleteTime = GameGlobal.databus.levelCompleteTime || Date.now();
                const waitTime = Date.now() - levelCompleteTime;
                const MAX_WAIT_TIME = 5000; // 减少到2秒，更快响应

                // 检查是否还有动画在进行中
                const hasActiveAnimations = GameGlobal.databus.animations.some(ani => ani.isPlaying);

                // 检查是否还有方块在移动（使用更宽松的阈值）
                let hasMovingPieces = false;
                for (let row = 0; row < this.grid.rows; row++) {
                    for (let col = 0; col < this.grid.cols; col++) {
                        const piece = this.grid.grid[row][col];
                        if (piece && (Math.abs(piece.x - piece.targetX) > 1 || Math.abs(piece.y - piece.targetY) > 1)) {
                            hasMovingPieces = true;
                            break;
                        }
                    }
                    if (hasMovingPieces) break;
                }

                // 检查是否还有匹配方块的消除动画在进行
                let hasMatchAnimations = false;
                const currentFrame = GameGlobal.databus.frame;
                for (let row = 0; row < this.grid.rows; row++) {
                    for (let col = 0; col < this.grid.cols; col++) {
                        const piece = this.grid.grid[row][col];
                        if (piece && piece.matched) {
                            // 检查方块是否仍在进行消除动画（闪烁中或刚开始消除）
                            const animationProgress = currentFrame - piece.matchTime;
                            if (animationProgress <= piece.MATCH_VISIBLE_TIME || piece.visible) {
                                hasMatchAnimations = true;
                                break;
                            }
                        }
                    }
                    if (hasMatchAnimations) break;
                }

                // 检查是否还有挂起的消除相关timeout任务
                const hasPendingTimeouts = this.grid.pendingTimeouts && this.grid.pendingTimeouts.length > 0;

                // 检查网格是否已填满
                const isGridFull = this.isGridFull();

                // 在所有动画完成且网格填满时立即弹窗，或者超时时切换状态
                if ((!hasActiveAnimations && !hasMovingPieces && !hasMatchAnimations && !hasPendingTimeouts && isGridFull) || waitTime > MAX_WAIT_TIME) {
                    // 清理所有挂起的timeout任务
                    this.grid.clearPendingTimeouts();
                    GameGlobal.databus.gameState = 'levelCompleteMenu';
                    GameGlobal.databus.level++;
                    console.log('通关弹窗显示：所有动画完成且网格填满，当前状态:', GameGlobal.databus.gameState);

                    if (waitTime > MAX_WAIT_TIME) {
                        console.log('通关状态切换超时，强制显示弹窗');
                    } else {
                        console.log('所有动画正常完成且网格填满：', {
                            hasActiveAnimations,
                            hasMovingPieces,
                            hasMatchAnimations,
                            hasPendingTimeouts,
                            isGridFull,
                            waitTime: waitTime + 'ms'
                        });
                    }
                }
            }
        }
    }

    loop() {
        this.update();
        this.render();
        this.aniId = requestAnimationFrame(this.loop.bind(this));
    }

    // 检查网格是否已填满
    isGridFull() {
        for (let row = 0; row < this.grid.rows; row++) {
            for (let col = 0; col < this.grid.cols; col++) {
                if (this.grid.grid[row][col] === null) {
                    return false;
                }
            }
        }
        return true;
    }

    // 加载子包
    loadSubpackage() {
        return new Promise((resolve, reject) => {
            const loadTask = wx.loadSubpackage({
                name: 'resources',
                success: (res) => {
                    console.log('子包加载成功', res);
                    this.loadProgress = 100;
                    if (this.mainMenu) {
                        this.mainMenu.loadProgress = 100;
                    }
                    this.isLoading = false;
                    resolve(res);
                },
                fail: (err) => {
                    console.error('子包加载失败', err);
                    this.loadProgress = 0;
                    if (this.mainMenu) {
                        this.mainMenu.loadProgress = 0;
                    }
                    this.isLoading = false;
                    reject(err);
                }
            });

            // 监听加载进度
            loadTask.onProgressUpdate((res) => {
                console.log('子包下载进度', res.progress);
                this.loadProgress = res.progress;
                if (this.mainMenu) {
                    this.mainMenu.loadProgress = res.progress;
                }
            });
        });
    }
}