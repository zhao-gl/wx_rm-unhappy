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

// 声明背景图片变量，但不在这里加载
let bgImage = null;

/**
 * 游戏主函数（简化版）
 */
export default class Main {
    aniId = 0;
    grid = null; // 初始化为null，等待子包加载完成后创建
    gameInfo = new GameInfo();
    // mainMenu = new MainMenu();
    showBackConfirmDialog = false; // 是否显示返回确认弹窗

    constructor() {
        // 初始化加载进度
        this.loadProgress = 0;
        this.isLoading = true;

        // 先创建mainMenu实例，以便可以更新进度
        this.mainMenu = new MainMenu(this.loadProgress);

        // 立即启动渲染循环，显示加载界面
        this.start();

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
            // 处理确认弹窗中的按钮点击
            if (this.showBackConfirmDialog) {
                // 检查取消按钮
                if (clientX >= this.cancelBackButton.x &&
                    clientX <= this.cancelBackButton.x + this.cancelBackButton.width &&
                    clientY >= this.cancelBackButton.y &&
                    clientY <= this.cancelBackButton.y + this.cancelBackButton.height) {
                    // 隐藏确认弹窗
                    this.showBackConfirmDialog = false;
                    return;
                }

                // 检查确认按钮
                if (clientX >= this.confirmBackButton.x &&
                    clientX <= this.confirmBackButton.x + this.confirmBackButton.width &&
                    clientY >= this.confirmBackButton.y &&
                    clientY <= this.confirmBackButton.y + this.confirmBackButton.height) {
                    // 隐藏确认弹窗并返回主菜单
                    this.showBackConfirmDialog = false;
                    this.showMainMenu();
                    return;
                }
            }

            if (GameGlobal.databus.gameState === 'playing') {
                if (this.isPointInBackButton(clientX, clientY)) {
                    // 显示确认弹窗而不是直接返回主菜单
                    this.showBackConfirmDialog = true;
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
        // 确保主菜单的加载进度保持正确状态
        console.log('主菜单加载进度:', this.loadProgress)
        if (this.mainMenu && !this.isLoading) {
            this.mainMenu.loadProgress = this.loadProgress;
        }
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

        if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
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

        // 绘制返回确认弹窗（如果需要显示）
        this.drawBackConfirmDialog(ctx)
    }

    // 绘制返回确认弹窗
    drawBackConfirmDialog(ctx) {
        if (!this.showBackConfirmDialog) return;

        const dialogWidth = 240;
        const dialogHeight = 120;
        const dialogX = (SCREEN_WIDTH - dialogWidth) / 2;
        const dialogY = (SCREEN_HEIGHT - dialogHeight) / 2;

        // 绘制半透明遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        // 绘制对话框背景
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.drawRoundedRect(ctx, dialogX, dialogY, dialogWidth, dialogHeight, 10, 'rgba(255, 255, 255, 0.95)');

        // 绘制边框
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        this.strokeRoundedRect(ctx, dialogX, dialogY, dialogWidth, dialogHeight, 10);

        // 绘制标题
        ctx.font = 'bold 16px Arial, "Microsoft YaHei", "SimHei", sans-serif';
        ctx.fillStyle = '#333333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('确认返回主菜单', dialogX + dialogWidth / 2, dialogY + 30);

        // 绘制提示文本
        ctx.font = '14px Arial, "Microsoft YaHei", "SimHei", sans-serif';
        ctx.fillStyle = '#666666';
        ctx.fillText('确定要返回主菜单吗？', dialogX + dialogWidth / 2, dialogY + 60);

        // 绘制按钮
        const buttonWidth = 70;
        const buttonHeight = 30;
        const buttonY = dialogY + dialogHeight - 40;

        this.cancelBackButton = {
            width: buttonWidth,
            height: buttonHeight,
            x: dialogX + dialogWidth / 2 - buttonWidth - 10,
            y: buttonY,
            text: '取消'
        };

        this.confirmBackButton = {
            width: buttonWidth,
            height: buttonHeight,
            x: dialogX + dialogWidth / 2 + 10,
            y: buttonY,
            text: '确定'
        };

        this.drawButton(ctx, this.cancelBackButton);
        this.drawButton(ctx, this.confirmBackButton);
    }

    // 绘制圆角矩形
    drawRoundedRect(ctx, x, y, width, height, radius, fillColor) {
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }

    // 绘制圆角矩形边框
    strokeRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.stroke();
    }

    // 绘制按钮
    drawButton(ctx, button) {
        // 保存当前状态
        ctx.save();

        // 按钮阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.drawRoundedRect(ctx, button.x + 1, button.y + 1, button.width, button.height, 6, 'rgba(0, 0, 0, 0.1)');

        // 按钮背景
        const buttonColor = button.text === '确定' ? '#4CAF50' : '#ff9800';
        this.drawRoundedRect(ctx, button.x, button.y, button.width, button.height, 6, buttonColor);

        // 按钮边框
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        this.strokeRoundedRect(ctx, button.x, button.y, button.width, button.height, 6);

        // 按钮文字
        ctx.font = 'bold 14px Arial, "Microsoft YaHei", "SimHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';

        const centerX = button.x + button.width / 2;
        const centerY = button.y + button.height / 2;
        ctx.fillText(button.text, centerX, centerY);

        // 恢复状态
        ctx.restore();
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
                const MAX_WAIT_TIME = 5000; // 最大等待时间，超时后强制显示弹窗

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

                // 检查网格是否已填满
                const isGridFull = this.isGridFull();

                // 在所有动画完成且网格填满时立即弹窗，或者超时时切换状态
                if ((!hasActiveAnimations && !hasMovingPieces && !hasMatchAnimations && isGridFull) || waitTime > MAX_WAIT_TIME) {
                    // 清理所有挂起的timeout任务
                    this.grid.clearPendingTimeouts();
                    GameGlobal.databus.gameState = 'levelCompleteMenu';
                    GameGlobal.databus.completedLevel = GameGlobal.databus.level; // 记录完成的关卡
                    console.log('通关弹窗显示：所有动画完成且网格填满，当前状态:', GameGlobal.databus.gameState);

                    if (waitTime > MAX_WAIT_TIME) {
                        console.log('通关状态切换超时，强制显示弹窗');
                    } else {
                        console.log('所有动画正常完成且网格填满：', {
                            hasActiveAnimations,
                            hasMovingPieces,
                            hasMatchAnimations,
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
                    bgImage = wx.createImage();
                    bgImage.src = 'resources/images/bg.png';
                    bgImage.onload = () => {
                        console.log('背景图片加载成功');
                        this.isLoading = false;
                    };
                    bgImage.onerror = (err) => {
                        console.error('背景图片加载失败:', err);
                        this.isLoading = false;
                    };
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
                let progress = res.progress;
                if(progress >= 0 && progress <= 1){
                    progress = progress * 100;
                }
                // 处理加载进度超出1后变成负数的情况
                if(progress < 0){
                    progress = 100;
                }
                // 确保进度值在有效范围内
                this.loadProgress = Math.min(100, Math.max(0, progress));
                if (this.mainMenu) {
                    this.mainMenu.loadProgress = this.loadProgress;
                }
            });
        });
    }
}