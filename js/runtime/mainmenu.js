import Emitter from '../libs/tinyemitter';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';

/**
 * 主菜单类
 * 负责显示游戏主菜单界面，包括开始游戏、游戏标题等
 */
export default class MainMenu extends Emitter {
    constructor() {
        super();

        // 按钮配置
        this.startButton = {
            width: 180,
            height: 55,
            x: (SCREEN_WIDTH - 180) / 2,
            y: SCREEN_HEIGHT / 2 + 50,
            text: '开始游戏'
        };

        this.continueButton = {
            width: 160,
            height: 50,
            x: (SCREEN_WIDTH - 160) / 2,
            y: SCREEN_HEIGHT / 2 + 20,
            text: '继续下一关'
        };

        this.menuButton = {
            width: 160,
            height: 50,
            x: (SCREEN_WIDTH - 160) / 2,
            y: SCREEN_HEIGHT / 2 + 85,
            text: '返回主菜单'
        };

        // 退出游戏按钮
        this.exitButton = {
            width: 160,
            height: 50,
            x: (SCREEN_WIDTH - 160) / 2,
            y: SCREEN_HEIGHT / 2 + 150,
            text: '退出游戏'
        };

        // 绑定触摸事件
        wx.onTouchStart(this.touchEventHandler.bind(this));
    }

    /**
     * 渲染主菜单
     */
    render(ctx) {
        // 保存当前状态
        ctx.save();

        // 绘制背景遮罩
        this.drawBackground(ctx);

        // 绘制主菜单内容
        this.drawMainMenu(ctx);

        // 恢复状态
        ctx.restore();
    }

    /**
     * 渲染通关后的选择菜单
     */
    renderLevelCompleteMenu(ctx) {
        // 保存当前状态
        ctx.save();

        // 绘制背景遮罩
        this.drawSimpleOverlay(ctx);

        // 绘制通关菜单卡片
        this.drawLevelCompleteCard(ctx);

        // 恢复状态
        ctx.restore();
    }

    /**
     * 绘制背景
     */
    drawBackground(ctx) {
        // 绘制半透明遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    }

    /**
     * 绘制简洁的遮罩背景
     */
    drawSimpleOverlay(ctx) {
        // 使用非常轻的半透明遮罩，让背景关卡信息仍然可见
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    }

    /**
     * 绘制主菜单内容
     */
    drawMainMenu(ctx) {
        const centerX = SCREEN_WIDTH / 2;

        // 启用高质量文本渲染
        if (ctx.textRenderingOptimization) {
            ctx.textRenderingOptimization = 'optimizeQuality';
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 绘制游戏标题
        this.drawGameTitle(ctx, centerX, SCREEN_HEIGHT / 2 - 100);

        // 绘制游戏说明
        this.drawGameDescription(ctx, centerX, SCREEN_HEIGHT / 2 - 30);

        // 绘制开始游戏按钮
        this.drawButton(ctx, this.startButton);

        // 绘制退出游戏按钮
        this.drawButton(ctx, this.exitButton);

        // 绘制版本信息
        this.drawVersionInfo(ctx, centerX);
    }

    /**
     * 绘制通关选择卡片
     */
    drawLevelCompleteCard(ctx) {
        const cardWidth = 240; // 减小卡片宽度使其更紧凑
        const cardHeight = 150; // 进一步减小高度
        const cardX = (SCREEN_WIDTH - cardWidth) / 2; // 居中显示
        const cardY = (SCREEN_HEIGHT - cardHeight) / 2 + 50; // 居中显示并向下偏移

        // 绘制简洁的阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.drawRoundedRect(ctx, cardX + 2, cardY + 2, cardWidth, cardHeight, 12, 'rgba(0, 0, 0, 0.1)');

        // 绘制卡片背景 - 更高的透明度
        this.drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 12, 'rgba(255, 255, 255, 0.98)');

        // 绘制简洁的边框
        ctx.strokeStyle = 'rgba(76, 175, 80, 0.4)';
        ctx.lineWidth = 1;
        this.strokeRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 12);

        // 绘制卡片内容
        this.drawLevelCompleteContent(ctx, cardX, cardY, cardWidth, cardHeight);
    }

    /**
     * 绘制通关内容
     */
    drawLevelCompleteContent(ctx, cardX, cardY, cardWidth, cardHeight) {
        const centerX = cardX + cardWidth / 2;

        // 启用高质量文本渲染
        if (ctx.textRenderingOptimization) {
            ctx.textRenderingOptimization = 'optimizeQuality';
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 主标题 - 简洁设计
        ctx.font = 'bold 18px Arial, "Microsoft YaHei", "SimHei", sans-serif';
        ctx.fillStyle = '#4CAF50';
        ctx.fillText('🎉 恭喜通关！', centerX, cardY + 25);

        // 统计信息区域 - 极紧凑布局
        const statsY = cardY + 50;

        // 显示得分和关卡
        ctx.font = '13px Arial, "Microsoft YaHei", "SimHei", sans-serif';
        ctx.fillStyle = '#f39c12';
        ctx.fillText(`第${GameGlobal.databus.level - 1}关  得分: ${GameGlobal.databus.score}`, centerX, statsY);

        // 绘制按钮 - 更紧凑的布局
        const buttonY = statsY + 30;
        const buttonWidth = 80; // 减小按钮宽度
        const buttonHeight = 30;  // 减小按钮高度

        const continueBtn = {
            width: buttonWidth,
            height: buttonHeight,
            x: cardX + (cardWidth - buttonWidth * 2 - 15) / 2,
            y: buttonY,
            text: '下一关'
        };
        const menuBtn = {
            width: buttonWidth,
            height: buttonHeight,
            x: cardX + (cardWidth - buttonWidth * 2 - 15) / 2 + buttonWidth + 15,
            y: buttonY,
            text: '主菜单'
        };

        this.drawButton(ctx, continueBtn);
        this.drawButton(ctx, menuBtn);

        // 存储按钮信息用于触摸事件检测
        this.continueBtn = continueBtn;
        this.menuBtn = menuBtn;
    }

    /**
     * 绘制游戏标题
     */
    drawGameTitle(ctx, centerX, y) {
        // 标题背景装饰
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, y - 40, SCREEN_WIDTH, 80);
        ctx.restore();

        // 主标题
        ctx.font = 'bold 36px Arial, "Microsoft YaHei", "SimHei", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 3;
        ctx.strokeText('消消不开心', centerX, y);
        ctx.fillText('消消不开心', centerX, y);

        // 副标题
        ctx.font = '16px Arial, "Microsoft YaHei", "SimHei", sans-serif';
        ctx.fillStyle = '#f0f0f0';
        ctx.fillText('三消益智游戏', centerX, y + 40);
    }

    /**
     * 绘制游戏说明
     */
    drawGameDescription(ctx, centerX, y) {
        ctx.font = '14px Arial, "Microsoft YaHei", "SimHei", sans-serif';
        ctx.fillStyle = '#cccccc';

        const descriptions = [
            '• 交换相邻方块，消除3个或更多相同图案',
            '• 达到目标分数即可通关',
            '• 注意步数限制，合理规划每一步'
        ];

        descriptions.forEach((desc, index) => {
            ctx.fillText(desc, centerX, y + index * 25);
        });
    }

    /**
     * 绘制按钮
     */
    drawButton(ctx, button) {
        // 保存当前状态
        ctx.save();

        // 按钮阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        this.drawRoundedRect(ctx, button.x + 2, button.y + 2, button.width, button.height, 8, 'rgba(0, 0, 0, 0.15)');

        // 按钮背景
        const buttonColor = button.text === '开始游戏' ? '#4CAF50' :
            button.text === '继续下一关' ? '#2196F3' : '#ff9800';
        this.drawRoundedRect(ctx, button.x, button.y, button.width, button.height, 8, buttonColor);

        // 按钮边框
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        this.strokeRoundedRect(ctx, button.x, button.y, button.width, button.height, 8);

        // 启用高质量文本渲染
        if (ctx.textRenderingOptimization) {
            ctx.textRenderingOptimization = 'optimizeQuality';
        }

        // 按钮文字
        ctx.font = 'bold 18px Arial, "Microsoft YaHei", "SimHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';

        const centerX = button.x + button.width / 2;
        const centerY = button.y + button.height / 2;
        ctx.fillText(button.text, centerX, centerY);

        // 恢复状态
        ctx.restore();
    }

    /**
     * 绘制版本信息
     */
    drawVersionInfo(ctx, centerX) {
        ctx.font = '12px Arial, "Microsoft YaHei", "SimHei", sans-serif';
        ctx.fillStyle = '#888888';
        ctx.fillText('版本 1.0.0', centerX, SCREEN_HEIGHT - 30);
    }

    /**
     * 绘制圆角矩形
     */
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

    /**
     * 绘制圆角矩形边框
     */
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

    /**
     * 触摸事件处理
     */
    touchEventHandler(event) {
        const { clientX, clientY } = event.touches[0];

        // 主菜单状态下的按钮检测
        if (GameGlobal.databus.gameState === 'mainMenu') {
            if (this.isPointInButton(clientX, clientY, this.startButton)) {
                this.emit('startGame');
            } else if (this.isPointInButton(clientX, clientY, this.exitButton)) {
                // 退出游戏
                wx.exitMiniProgram();
            }
        }

        // 通关选择状态下的按钮检测 - 更新为居中布局
        if (GameGlobal.databus.gameState === 'levelCompleteMenu') {
            const cardWidth = 240;
            const cardHeight = 150;
            const cardX = (SCREEN_WIDTH - cardWidth) / 2;
            const cardY = (SCREEN_HEIGHT - cardHeight) / 2 + 50;  // 与绘制时保持一致的偏移
            const buttonY = cardY + 80;
            const buttonWidth = 80;

            const continueBtn = {
                width: buttonWidth,
                height: 30,
                x: cardX + (cardWidth - buttonWidth * 2 - 15) / 2,
                y: buttonY
            };
            const menuBtn = {
                width: buttonWidth,
                height: 30,
                x: cardX + (cardWidth - buttonWidth * 2 - 15) / 2 + buttonWidth + 15,
                y: buttonY
            };

            if (this.isPointInButton(clientX, clientY, continueBtn)) {
                this.emit('continueGame');
            } else if (this.isPointInButton(clientX, clientY, menuBtn)) {
                this.emit('backToMenu');
            }
        }
    }

    /**
     * 检查点是否在按钮内
     */
    isPointInButton(x, y, button) {
        return x >= button.x &&
            x <= button.x + button.width &&
            y >= button.y &&
            y <= button.y + button.height;
    }
}