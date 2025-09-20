import Emitter from '../libs/tinyemitter';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';

const atlas = wx.createImage();
atlas.src = 'images/Common.png';

export default class GameInfo extends Emitter {
  constructor() {
    super();

    this.btnArea = {
      startX: SCREEN_WIDTH / 2 - 40,
      startY: SCREEN_HEIGHT / 2 - 100 + 180,
      endX: SCREEN_WIDTH / 2 + 50,
      endY: SCREEN_HEIGHT / 2 - 100 + 255,
    };

    // 进度条参数 - 美化样式
    this.progressBar = {
      x: 15,
      y: 88,
      width: SCREEN_WIDTH - 30,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(255, 255, 255, 0.9)', // 半透明白色背景
      fillColor: '#4CAF50',
      borderColor: 'rgba(255, 255, 255, 0.8)',
      borderWidth: 2,
      shadowColor: 'rgba(0, 0, 0, 0.2)' // 添加阴影
    };

    // 统计信息位置 - 美化背景
    this.statsArea = {
      x: 15,
      y: 115,
      width: SCREEN_WIDTH - 30,
      height: 38,
      backgroundColor: 'rgba(255, 255, 255, 0.85)', // 半透明背景
      borderRadius: 12,
      shadowColor: 'rgba(0, 0, 0, 0.15)'
    };

    // 步数信息位置 - 在统计信息下方
    this.movesArea = {
      x: 15,
      y: 158,
      width: SCREEN_WIDTH - 30,
      height: 28,
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      borderRadius: 10,
      shadowColor: 'rgba(0, 0, 0, 0.15)'
    };

    // 提示按钮位置 - 在步数信息下方
    this.hintButton = {
      x: SCREEN_WIDTH - 70,
      y: 195,
      width: 55,
      height: 30,
      backgroundColor: '#ff9800',
      borderRadius: 15,
      shadowColor: 'rgba(0, 0, 0, 0.2)'
    };

    // 绑定触摸事件
    wx.onTouchStart(this.touchEventHandler.bind(this))
  }

  // 绘制统计信息
  renderStats(ctx) {
    const stats = this.statsArea;
    const databus = GameGlobal.databus;

    // 保存当前状态
    ctx.save();

    // 绘制统计信息背景
    this.drawStatsBackground(ctx, stats);

    // 启用文本防锤齿
    if (ctx.textRenderingOptimization) {
      ctx.textRenderingOptimization = 'optimizeQuality';
    }
    ctx.textBaseline = 'middle';

    // 使用整数坐标避免文本模糊
    const baseY = Math.round(stats.y + 12);
    const secondY = Math.round(stats.y + 26);

    // 左侧：当前分数 / 目标分数
    ctx.font = '13px Arial, "Microsoft YaHei", "SimHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#2c3e50'; // 深色文字
    ctx.fillText(`当前: ${databus.score}`, Math.round(stats.x + 10), baseY);
    ctx.fillText(`目标: ${databus.targetScore}`, Math.round(stats.x + 10), secondY);

    // 中间：关卡信息
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px Arial, "Microsoft YaHei", "SimHei", sans-serif';
    ctx.fillStyle = '#e74c3c'; // 红色关卡显示
    ctx.fillText(`第 ${databus.level} 关`, Math.round(SCREEN_WIDTH / 2), Math.round(stats.y + 19));

    // 右侧：连击信息
    ctx.textAlign = 'right';
    ctx.font = '13px Arial, "Microsoft YaHei", "SimHei", sans-serif';
    if (databus.combo > 1) {
      ctx.fillStyle = '#f39c12'; // 橙色连击
      ctx.fillText(`连击: ${databus.combo}x`, Math.round(stats.x + stats.width - 10), baseY);
    }
    ctx.fillStyle = '#7f8c8d'; // 灰色最大连击
    ctx.fillText(`最大: ${databus.maxCombo}x`, Math.round(stats.x + stats.width - 10), secondY);

    // 恢复状态
    ctx.restore();
  }

  // 绘制统计信息背景
  drawStatsBackground(ctx, stats) {
    // 绘制阴影
    ctx.fillStyle = stats.shadowColor;
    this.drawRoundedRect(ctx, stats.x + 2, stats.y + 2, stats.width, stats.height, stats.borderRadius, stats.shadowColor);

    // 绘制主背景
    this.drawRoundedRect(ctx, stats.x, stats.y, stats.width, stats.height, stats.borderRadius, stats.backgroundColor);

    // 绘制边框
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    this.strokeRoundedRect(ctx, stats.x, stats.y, stats.width, stats.height, stats.borderRadius);
  }

  // 绘制步数信息
  renderMoves(ctx) {
    const moves = this.movesArea;
    const databus = GameGlobal.databus;

    // 保存当前状态
    ctx.save();

    // 绘制步数信息背景
    this.drawMovesBackground(ctx, moves);

    // 启用文本防锤齿
    if (ctx.textRenderingOptimization) {
      ctx.textRenderingOptimization = 'optimizeQuality';
    }
    ctx.textBaseline = 'middle';

    const centerY = Math.round(moves.y + moves.height / 2);
    const remainingMoves = databus.getRemainingMoves();

    // 左侧：当前步数
    ctx.font = '13px Arial, "Microsoft YaHei", "SimHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#2c3e50';
    ctx.fillText(`已用: ${databus.moves}`, Math.round(moves.x + 10), centerY);

    // 中间：步数限制标题
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px Arial, "Microsoft YaHei", "SimHei", sans-serif';
    ctx.fillStyle = '#8e44ad';
    ctx.fillText(`步数限制: ${databus.maxMoves}`, Math.round(SCREEN_WIDTH / 2), centerY);

    // 右侧：剩余步数（根据剩余数量改变颜色）
    ctx.textAlign = 'right';
    ctx.font = 'bold 13px Arial, "Microsoft YaHei", "SimHei", sans-serif';

    // 根据剩余步数设置颜色
    if (remainingMoves <= 3) {
      ctx.fillStyle = '#e74c3c'; // 红色警告
    } else if (remainingMoves <= 8) {
      ctx.fillStyle = '#f39c12'; // 橙色提醒
    } else {
      ctx.fillStyle = '#27ae60'; // 绿色正常
    }

    ctx.fillText(`剩余: ${remainingMoves}`, Math.round(moves.x + moves.width - 10), centerY);

    // 恢复状态
    ctx.restore();
  }

  // 绘制步数信息背景
  drawMovesBackground(ctx, moves) {
    // 绘制阴影
    ctx.fillStyle = moves.shadowColor;
    this.drawRoundedRect(ctx, moves.x + 2, moves.y + 2, moves.width, moves.height, moves.borderRadius, moves.shadowColor);

    // 绘制主背景
    this.drawRoundedRect(ctx, moves.x, moves.y, moves.width, moves.height, moves.borderRadius, moves.backgroundColor);

    // 绘制边框
    ctx.strokeStyle = 'rgba(142, 68, 173, 0.4)'; // 紫色边框
    ctx.lineWidth = 1;
    this.strokeRoundedRect(ctx, moves.x, moves.y, moves.width, moves.height, moves.borderRadius);
  }

  // 绘制提示按钮
  renderHintButton(ctx) {
    const hint = this.hintButton;

    // 保存当前状态
    ctx.save();

    // 绘制阴影
    ctx.fillStyle = hint.shadowColor;
    this.drawRoundedRect(ctx, hint.x + 2, hint.y + 2, hint.width, hint.height, hint.borderRadius, hint.shadowColor);

    // 绘制按钮背景
    this.drawRoundedRect(ctx, hint.x, hint.y, hint.width, hint.height, hint.borderRadius, hint.backgroundColor);

    // 绘制边框
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    this.strokeRoundedRect(ctx, hint.x, hint.y, hint.width, hint.height, hint.borderRadius);

    // 绘制按钮文字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial, "Microsoft YaHei", "SimHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const centerX = hint.x + hint.width / 2;
    const centerY = hint.y + hint.height / 2;
    ctx.fillText('提示', centerX, centerY);

    // 恢复状态
    ctx.restore();
  }

  render(ctx) {
    // 只在游戏进行中绘制UI元素
    if (GameGlobal.databus.gameState === 'playing') {
      // 绘制进度条和分数信息
      this.renderProgressBar(ctx);
      this.renderStats(ctx);
      this.renderMoves(ctx); // 绘制步数信息
      this.renderHintButton(ctx); // 绘制提示按钮
    }

    // 游戏结束时停止帧循环并显示游戏结束画面
    if (GameGlobal.databus.isGameOver) {
      this.renderGameOver(ctx, GameGlobal.databus.score); // 绘制游戏结束画面
    }
  }

  // 绘制进度条
  renderProgressBar(ctx) {
    const progress = GameGlobal.databus.getProgress();
    const bar = this.progressBar;

    // 保存当前状态
    ctx.save();

    // 启用高质量渲染
    if (ctx.imageSmoothingEnabled !== undefined) {
      ctx.imageSmoothingEnabled = true;
      if (ctx.imageSmoothingQuality) {
        ctx.imageSmoothingQuality = 'high';
      }
    }

    // 使用整数坐标避免像素模糊
    const x = Math.round(bar.x);
    const y = Math.round(bar.y);
    const width = Math.round(bar.width);
    const height = Math.round(bar.height);

    // 绘制阴影
    ctx.fillStyle = bar.shadowColor;
    this.drawRoundedRect(ctx, x + 2, y + 2, width, height, bar.borderRadius, bar.shadowColor);

    // 绘制背景圆角矩形
    this.drawRoundedRect(ctx, x, y, width, height, bar.borderRadius, bar.backgroundColor);

    // 绘制边框
    ctx.strokeStyle = bar.borderColor;
    ctx.lineWidth = bar.borderWidth;
    this.strokeRoundedRect(ctx, x, y, width, height, bar.borderRadius);

    // 绘制进度填充（渐变效果）
    if (progress > 0) {
      const fillWidth = Math.round((width - 4) * progress);
      if (fillWidth > 0) {
        // 创建渐变进度条
        const gradient = ctx.createLinearGradient(x + 2, y + 2, x + 2 + fillWidth, y + 2);
        gradient.addColorStop(0, '#66BB6A'); // 浅绿
        gradient.addColorStop(0.5, '#4CAF50'); // 主绿色
        gradient.addColorStop(1, '#388E3C'); // 深绿

        this.drawRoundedRect(ctx, x + 2, y + 2, fillWidth, height - 4, bar.borderRadius - 2, gradient);

        // 添加高光效果
        const highlightGradient = ctx.createLinearGradient(x + 2, y + 2, x + 2, y + height / 2);
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        this.drawRoundedRect(ctx, x + 2, y + 2, fillWidth, (height - 4) / 2, bar.borderRadius - 2, highlightGradient);
      }
    }

    // 绘制进度百分比文本（优化文本渲染）
    if (ctx.textRenderingOptimization) {
      ctx.textRenderingOptimization = 'optimizeQuality';
    }
    ctx.fillStyle = '#2c3e50'; // 深色文字
    ctx.strokeStyle = '#ffffff'; // 白色描边
    ctx.lineWidth = 2;
    ctx.font = 'bold 12px Arial, "Microsoft YaHei", "SimHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const percentage = Math.floor(progress * 100);
    const textX = Math.round(x + width / 2);
    const textY = Math.round(y + height / 2);
    ctx.strokeText(`${percentage}%`, textX, textY);
    ctx.fillText(`${percentage}%`, textX, textY);

    // 恢复状态
    ctx.restore();
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

  // 绘制游戏结束画面
  renderGameOver(ctx, score) {
    this.drawSimpleOverlay(ctx);
    this.drawGameOverCard(ctx, score);
    this.drawRestartButton(ctx);
  }

  // 绘制简洁的遮罩背景
  drawSimpleOverlay(ctx) {
    // 使用非常轻的半透明遮罩，让背景关卡信息仍然可见
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  }



  // 绘制游戏结束卡片
  drawGameOverCard(ctx, score) {
    ctx.save();

    const cardWidth = SCREEN_WIDTH - 60;
    const cardHeight = 260; // 减小高度使其更紧凑
    const cardX = 30;
    const cardY = (SCREEN_HEIGHT - cardHeight) / 2; // 居中显示

    // 绘制简洁的阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    this.drawRoundedRect(ctx, cardX + 2, cardY + 2, cardWidth, cardHeight, 12, 'rgba(0, 0, 0, 0.1)');

    // 绘制卡片背景 - 更高的透明度
    this.drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 12, 'rgba(255, 255, 255, 0.98)');

    // 绘制简洁的边框
    ctx.strokeStyle = 'rgba(244, 67, 54, 0.4)';
    ctx.lineWidth = 1;
    this.strokeRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 12);

    // 绘制失败内容
    this.drawFailureContent(ctx, cardX, cardY, cardWidth, cardHeight, score);

    ctx.restore();
  }

  // 绘制失败内容
  drawFailureContent(ctx, cardX, cardY, cardWidth, cardHeight, score) {
    const centerX = cardX + cardWidth / 2;

    // 启用高质量文本渲染
    if (ctx.textRenderingOptimization) {
      ctx.textRenderingOptimization = 'optimizeQuality';
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 主标题 - 简洁设计
    ctx.font = 'bold 20px Arial, "Microsoft YaHei", "SimHei", sans-serif';
    ctx.fillStyle = '#e74c3c';
    ctx.fillText('😢 游戏失败', centerX, cardY + 30);

    // 失败原因分析 - 简化
    ctx.font = '13px Arial, "Microsoft YaHei", "SimHei", sans-serif';
    ctx.fillStyle = '#c0392b';
    if (GameGlobal.databus.moves >= GameGlobal.databus.maxMoves && GameGlobal.databus.score < GameGlobal.databus.targetScore) {
      ctx.fillText('步数用完，未达成目标分数', centerX, cardY + 55);
    } else {
      ctx.fillText('未能在限定步数内完成目标', centerX, cardY + 55);
    }

    // 统计信息区域 - 紧凑布局
    const statsY = cardY + 85;

    // 一行显示得分和目标
    ctx.font = 'bold 16px Arial, "Microsoft YaHei", "SimHei", sans-serif';
    ctx.fillStyle = '#f39c12';
    ctx.fillText(`得分: ${score} / 目标: ${GameGlobal.databus.targetScore}`, centerX, statsY);

    // 二行显示关卡和连击
    ctx.font = '14px Arial, "Microsoft YaHei", "SimHei", sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText(`第${GameGlobal.databus.level}关  最大连击: ${GameGlobal.databus.maxCombo}x`, centerX, statsY + 25);

    // 三行显示步数统计
    ctx.fillText(`步数: ${GameGlobal.databus.moves}/${GameGlobal.databus.maxMoves}`, centerX, statsY + 45);

    // 鼓励性文字
    ctx.font = '13px Arial, "Microsoft YaHei", "SimHei", sans-serif';
    ctx.fillStyle = '#7f8c8d';
    ctx.fillText('不要放弃，再来一次！', centerX, statsY + 75);
  }



  // 绘制游戏结束文本
  drawGameOverText(ctx, score) {
    // 保存当前状态
    ctx.save();

    // 启用高质量文本渲染
    if (ctx.textRenderingOptimization) {
      ctx.textRenderingOptimization = 'optimizeQuality';
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '19px Arial, "Microsoft YaHei", "SimHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const centerX = Math.round(SCREEN_WIDTH / 2);
    const baseY = Math.round(SCREEN_HEIGHT / 2 - 100);

    ctx.fillText('游戏结束', centerX, baseY + 50);
    ctx.fillText(`最终得分: ${score}`, centerX, baseY + 90);
    ctx.fillText(`最高关卡: ${GameGlobal.databus.level}`, centerX, baseY + 110);
    ctx.fillText(`最大连击: ${GameGlobal.databus.maxCombo}x`, centerX, baseY + 130);

    // 恢复状态
    ctx.restore();
  }

  // 绘制重新开始按钮
  drawRestartButton(ctx) {
    // 保存当前状态
    ctx.save();

    const buttonWidth = 140;
    const buttonHeight = 40;
    const buttonX = (SCREEN_WIDTH - buttonWidth) / 2;
    const buttonY = (SCREEN_HEIGHT + 260) / 2 - 30; // 按照新的卡片高度调整位置

    // 按钮阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    this.drawRoundedRect(ctx, buttonX + 1, buttonY + 1, buttonWidth, buttonHeight, 8, 'rgba(0, 0, 0, 0.1)');

    // 按钮背景 - 与游戏UI一致的绿色
    this.drawRoundedRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 8, '#4CAF50');

    // 按钮边框
    ctx.strokeStyle = 'rgba(76, 175, 80, 0.8)';
    ctx.lineWidth = 1;
    this.strokeRoundedRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 8);

    // 启用高质量文本渲染
    if (ctx.textRenderingOptimization) {
      ctx.textRenderingOptimization = 'optimizeQuality';
    }

    // 按钮文字
    ctx.font = 'bold 16px Arial, "Microsoft YaHei", "SimHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const centerX = buttonX + buttonWidth / 2;
    const centerY = buttonY + buttonHeight / 2;

    // 主文字
    ctx.fillStyle = '#ffffff';
    ctx.fillText('重新开始', centerX, centerY);

    // 恢复状态
    ctx.restore();
  }

  // 触摸事件处理
  touchEventHandler(event) {
    const { clientX, clientY } = event.touches[0]; // 获取触摸点的坐标

    // 检查提示按钮点击（只在游戏进行中）
    if (GameGlobal.databus.gameState === 'playing' && !GameGlobal.databus.isGameOver) {
      const hint = this.hintButton;
      if (
        clientX >= hint.x &&
        clientX <= hint.x + hint.width &&
        clientY >= hint.y &&
        clientY <= hint.y + hint.height
      ) {
        // 触发提示事件
        this.emit('hint');
        return;
      }
    }

    // 当前只有游戏结束时展示了UI，所以只处理游戏结束时的状态
    if (GameGlobal.databus.isGameOver) {
      // 检查触摸是否在按钮区域内（更新按钮位置）
      const buttonWidth = 140;
      const buttonHeight = 40;
      const buttonX = (SCREEN_WIDTH - buttonWidth) / 2;
      const buttonY = (SCREEN_HEIGHT + 260) / 2 - 30;

      if (
        clientX >= buttonX &&
        clientX <= buttonX + buttonWidth &&
        clientY >= buttonY &&
        clientY <= buttonY + buttonHeight
      ) {
        // 调用重启游戏的回调函数
        this.emit('restart');
      }
    }
  }
}
