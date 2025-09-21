import Piece from './piece';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';

// 游戏网格配置
const GRID_ROWS = 8;
const GRID_COLS = 6;
const PIECE_SIZE = 60;
// 使用项目中实际存在的图片
const PIECE_TYPES = [
  'resources/images/angry.png',
  'resources/images/sad.png',
  'resources/images/happy.png',
  'resources/images/surprise.png',
  'resources/images/confused.png',
  'resources/images/wronged.png',
];

export default class Grid {
  constructor() {
    this.rows = GRID_ROWS;
    this.cols = GRID_COLS;
    this.pieceSize = PIECE_SIZE;
    this.grid = [];
    this.selectedPiece = null;
    this.isSwapping = false; // 添加交换状态标志
    this.pendingTimeouts = []; // 存储挂起的timeout IDs

    // 拖动相关状态
    this.isDragging = false;
    this.dragStartPiece = null;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragCurrentX = 0;
    this.dragCurrentY = 0;
    this.DRAG_THRESHOLD = 20; // 拖动阈值，超过这个距离才认为是拖动

    // 提示相关状态
    this.hintPieces = []; // 存储提示的方块
    this.showingHint = false; // 是否正在显示提示
    this.hintStartTime = 0; // 提示开始时间
    this.HINT_DURATION = 3000; // 提示显示时间3秒

    // 重新排列提示相关状态
    this.showingShuffleHint = false; // 是否正在显示重新排列提示
    this.shuffleHintStartTime = 0; // 重新排列提示开始时间
    this.SHUFFLE_HINT_DURATION = 2000; // 重新排列提示显示时间2秒

    // 返回主菜单按钮
    this.backButton = {
      x: 15,
      y: 15,
      width: 30,
      height: 30,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: 'rgba(255, 255, 255, 0.8)',
      borderRadius: 15,
      shadowColor: 'rgba(0, 0, 0, 0.3)',
      iconColor: '#e1e1e1'
    };

    // 获取微信菜单按钮位置信息，用于对齐
    if (wx.getMenuButtonBoundingClientRect) {
      const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
      // 将返回按钮的Y坐标与微信菜单按钮对齐
      this.backButton.y = menuButtonInfo.top;
    }

    this.init();
    // 将grid实例存储到全局变量中，供Piece使用
    GameGlobal.databus.grid = this;
  }

  // 初始化网格
  init() {
    // 清理之前的网格状态和挂起的任务
    this.clearPendingTimeouts();
    this.grid = [];
    this.selectedPiece = null;
    this.isSwapping = false;
    this.isDragging = false;
    this.dragStartPiece = null;
    this.showingHint = false;
    this.hintPieces = [];
    this.hintStartTime = 0;

    // 计算网格起始位置，使其居中显示，为顶部UI留出更多空间
    this.startX = (SCREEN_WIDTH - this.cols * this.pieceSize) / 2;
    this.startY = (SCREEN_HEIGHT - this.rows * this.pieceSize) / 2 + 90; // 增加上方空间为步数信息腾出空间

    // 创建网格
    for (let row = 0; row < this.rows; row++) {
      this.grid[row] = [];
      for (let col = 0; col < this.cols; col++) {
        // 确保不会创建初始匹配
        let type;
        do {
          type = this.getRandomType();
        } while (
          this.isMatch(row, col, type) &&
          (col >= 2 || row >= 2)
        );

        const piece = GameGlobal.databus.pool.getItemByClass('piece', Piece);
        piece.init(
          type,
          this.startX + col * this.pieceSize,
          this.startY + row * this.pieceSize,
          this.pieceSize,
          this.pieceSize,
          row,
          col
        );
        this.grid[row][col] = piece;
      }
    }

    // 初始化后重新检查是否有初始匹配，如果有则重新打乱直到没有初始匹配
    let attempts = 0;
    const maxAttempts = 10;
    while (this.findMatches().length > 0 && attempts < maxAttempts) {
      console.log(`检测到初始匹配，第${attempts + 1}次重新打乱...`);
      this.shuffleGrid();
      attempts++;
    }

    // 最后检查是否有可消除的方块，如果没有则重新打乱
    if (!this.hasValidMoves()) {
      this.shuffleGrid();
    }
  }

  // 清理挂起的timeouts
  clearPendingTimeouts() {
    if (this.pendingTimeouts && this.pendingTimeouts.length > 0) {
      this.pendingTimeouts.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      this.pendingTimeouts = [];
    }
  }

  // 获取随机方块类型
  getRandomType() {
    return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
  }

  // 检查是否会形成匹配
  isMatch(row, col, type) {
    // 检查水平方向
    if (col >= 2 &&
      this.grid[row] && this.grid[row][col - 1] && this.grid[row][col - 1].type === type &&
      this.grid[row] && this.grid[row][col - 2] && this.grid[row][col - 2].type === type) {
      return true;
    }

    // 检查垂直方向
    if (row >= 2 &&
      this.grid[row - 1] && this.grid[row - 1][col] && this.grid[row - 1][col].type === type &&
      this.grid[row - 2] && this.grid[row - 2][col] && this.grid[row - 2][col].type === type) {
      return true;
    }

    return false;
  }

  // 获取触摸点对应的网格位置
  getTouchGridPosition(x, y) {
    const col = Math.floor((x - this.startX) / this.pieceSize);
    const row = Math.floor((y - this.startY) / this.pieceSize);

    // 检查是否在网格范围内
    if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
      return { row, col, valid: true };
    }
    return { row: -1, col: -1, valid: false };
  }

  // 处理触摸开始事件
  handleTouchStart(x, y) {
    // 如果正在交换中，忽略新的触摸事件
    if (this.isSwapping) {
      return;
    }

    const position = this.getTouchGridPosition(x, y);
    if (position.valid) {
      this.dragStartPiece = { row: position.row, col: position.col };
      this.dragStartX = x;
      this.dragStartY = y;
      this.dragCurrentX = x;
      this.dragCurrentY = y;
      this.isDragging = false;

      // 清除选中状态（不再显示视觉效果）
      this.clearSelection();
    }
  }

  // 处理触摸移动事件
  handleTouchMove(x, y) {
    if (!this.dragStartPiece || this.isSwapping) {
      return;
    }

    this.dragCurrentX = x;
    this.dragCurrentY = y;

    // 计算拖动距离
    const deltaX = Math.abs(x - this.dragStartX);
    const deltaY = Math.abs(y - this.dragStartY);
    const dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // 如果超过拖动阈值，开始拖动
    if (dragDistance > this.DRAG_THRESHOLD) {
      this.isDragging = true;
    }
  }

  // 处理触摸结束事件
  handleTouchEnd() {
    if (!this.dragStartPiece || this.isSwapping) {
      return;
    }

    if (this.isDragging) {
      // 计算拖动方向
      const deltaX = this.dragCurrentX - this.dragStartX;
      const deltaY = this.dragCurrentY - this.dragStartY;

      let targetRow = this.dragStartPiece.row;
      let targetCol = this.dragStartPiece.col;

      // 根据拖动方向确定目标位置
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // 水平拖动
        if (deltaX > 0) {
          targetCol = this.dragStartPiece.col + 1; // 向右
        } else {
          targetCol = this.dragStartPiece.col - 1; // 向左
        }
      } else {
        // 垂直拖动
        if (deltaY > 0) {
          targetRow = this.dragStartPiece.row + 1; // 向下
        } else {
          targetRow = this.dragStartPiece.row - 1; // 向上
        }
      }

      // 检查目标位置是否有效
      if (targetRow >= 0 && targetRow < this.rows &&
        targetCol >= 0 && targetCol < this.cols) {
        // 执行交换
        this.swapPieces(this.dragStartPiece, { row: targetRow, col: targetCol });
      }
    }

    // 重置拖动状态
    this.isDragging = false;
    this.dragStartPiece = null;
    this.clearSelection();
  }

  // 清除所有选中状态
  clearSelection() {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.grid[row][col]) {
          this.grid[row][col].selected = false;
        }
      }
    }
  }

  // 检查两个方块是否相邻
  isAdjacent(p1, p2) {
    const rowDiff = Math.abs(p1.row - p2.row);
    const colDiff = Math.abs(p1.col - p2.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }

  // 交换方块
  swapPieces(p1, p2) {
    // 检查游戏是否已结束或步数用完
    if (GameGlobal.databus.isGameOver || GameGlobal.databus.getRemainingMoves() <= 0) {
      this.isSwapping = false;
      return;
    }

    // 设置交换状态
    this.isSwapping = true;

    const temp = this.grid[p1.row][p1.col];
    this.grid[p1.row][p1.col] = this.grid[p2.row][p2.col];
    this.grid[p2.row][p2.col] = temp;

    // 更新位置
    this.grid[p1.row][p1.col].setPosition(p1.row, p1.col);
    this.grid[p2.row][p2.col].setPosition(p2.row, p2.col);

    // 检查匹配
    const matches = this.findMatches();
    if (matches.length === 0) {
      // 如果没有匹配，直接交换回来（不再调用swapPieces避免无限循环）
      setTimeout(() => {
        const temp2 = this.grid[p1.row][p1.col];
        this.grid[p1.row][p1.col] = this.grid[p2.row][p2.col];
        this.grid[p2.row][p2.col] = temp2;

        // 更新位置回到原来的位置
        this.grid[p1.row][p1.col].setPosition(p1.row, p1.col);
        this.grid[p2.row][p2.col].setPosition(p2.row, p2.col);

        // 重置交换状态
        this.isSwapping = false;
      }, 300);
    } else {
      // 有匹配时增加步数
      GameGlobal.databus.addMove();

      // 处理匹配
      this.processMatches(matches);
      // 重置交换状态
      this.isSwapping = false;
    }
  }

  // 查找所有匹配
  findMatches() {
    const matches = [];
    const matched = [];

    // 初始化matched数组
    for (let row = 0; row < this.rows; row++) {
      matched[row] = [];
      for (let col = 0; col < this.cols; col++) {
        matched[row][col] = false;
      }
    }

    // 检查水平匹配
    for (let row = 0; row < this.rows; row++) {
      let count = 1;
      let currentType = this.grid[row][0]?.type;

      for (let col = 1; col < this.cols; col++) {
        const piece = this.grid[row][col];
        if (piece && piece.type === currentType && currentType !== null) {
          count++;
        } else {
          // 如果连续3个或以上，标记为匹配
          if (count >= 3) {
            for (let i = col - count; i < col; i++) {
              matched[row][i] = true;
            }
          }
          count = 1;
          currentType = piece?.type;
        }
      }

      // 检查行的最后一组
      if (count >= 3) {
        for (let i = this.cols - count; i < this.cols; i++) {
          matched[row][i] = true;
        }
      }
    }

    // 检查垂直匹配
    for (let col = 0; col < this.cols; col++) {
      let count = 1;
      let currentType = this.grid[0][col]?.type;

      for (let row = 1; row < this.rows; row++) {
        const piece = this.grid[row][col];
        if (piece && piece.type === currentType && currentType !== null) {
          count++;
        } else {
          // 如果连续3个或以上，标记为匹配
          if (count >= 3) {
            for (let i = row - count; i < row; i++) {
              matched[i][col] = true;
            }
          }
          count = 1;
          currentType = piece?.type;
        }
      }

      // 检查列的最后一组
      if (count >= 3) {
        for (let i = this.rows - count; i < this.rows; i++) {
          matched[i][col] = true;
        }
      }
    }

    // 将所有匹配的位置转换为match对象
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (matched[row][col]) {
          matches.push({ row, col });
        }
      }
    }

    return matches;
  }

  // 处理匹配
  processMatches(matches) {
    if (matches.length === 0) {
      // 没有匹配，结束连击
      GameGlobal.databus.endCombo();
      return;
    }

    // 通关后的特殊处理：仍然可以消除，但不增加分数
    if (GameGlobal.databus.isLevelComplete) {
      console.log('通关后继续消除，保持游戏活跃');
      // 标记匹配的方块但不计分
      matches.forEach(match => {
        const piece = this.grid[match.row][match.col];
        if (piece) {
          piece.match();
        }
      });
    } else {
      // 正常游戏中的消除逻辑
      if (GameGlobal.databus.isGameOver) {
        return;
      }

      // 开始连击
      GameGlobal.databus.startCombo();
      const comboMultiplier = GameGlobal.databus.getComboMultiplier();

      // 标记匹配的方块并计算分数
      let totalBaseScore = 0;
      matches.forEach(match => {
        const piece = this.grid[match.row][match.col];
        if (piece) {
          piece.match();
          // 基础分数：每个方块 10 分
          totalBaseScore += 10;
        }
      });

      // 根据消除数量给予奖励分数
      if (matches.length >= 4) {
        totalBaseScore += 20; // 4个或以上奖励20分
      }
      if (matches.length >= 5) {
        totalBaseScore += 30; // 5个或以上再奖励30分
      }

      // 应用连击倍数
      const finalScore = GameGlobal.databus.addScore(totalBaseScore, comboMultiplier);

      // 显示得分提示（可选）
      this.showScorePopup(finalScore, matches.length);
    }

    // 移除匹配的方块并填充新方块
    setTimeout(() => {
      // 只有在游戏结束时才停止处理
      if (GameGlobal.databus.isGameOver) {
        return;
      }

      this.removeMatchedPieces();
      this.fillEmptySpaces();
      // 检查新的匹配
      setTimeout(() => {
        // 再次检查游戏状态
        if (GameGlobal.databus.isGameOver) {
          return;
        }

        const newMatches = this.findMatches();
        if (newMatches.length > 0) {
          this.processMatches(newMatches);
        } else {
          // 没有新匹配，结束连击并检查是否有可移动的方块
          if (!GameGlobal.databus.isLevelComplete) {
            GameGlobal.databus.endCombo();
          }
          // 检查是否没有可消除的方块，如果没有则重新打乱
          if (!this.hasValidMoves()) {
            setTimeout(() => {
              // 第三次检查游戏状态
              if (GameGlobal.databus.isGameOver) {
                return;
              }
              // 通关后不再重新打乱，让网格保持现状即可
              if (!GameGlobal.databus.isLevelComplete) {
                this.shuffleGrid();
              }
            }, 500); // 稍微延迟以便玩家能感知到打乱操作
          }
        }
      }, 300); // 减少延迟时间
    }, 300); // 减少延迟时间
  }

  // 移除匹配的方块
  removeMatchedPieces() {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.grid[row][col] && this.grid[row][col].matched) {
          this.grid[row][col] = null;
        }
      }
    }
  }

  // 填充空白位置
  fillEmptySpaces() {
    // 始终执行现有方块的下落，即使已通关
    // 这确保被消除方块留下的空隙能被上方方块填补
    for (let col = 0; col < this.cols; col++) {
      // 从下往上检查每一行
      for (let row = this.rows - 1; row >= 0; row--) {
        if (this.grid[row][col] === null) {
          // 向上查找第一个非空方块
          for (let aboveRow = row - 1; aboveRow >= 0; aboveRow--) {
            if (this.grid[aboveRow][col] !== null) {
              // 移动方块到新位置
              this.grid[row][col] = this.grid[aboveRow][col];
              this.grid[aboveRow][col] = null;
              // 设置目标位置（触发动画）
              this.grid[row][col].setPosition(row, col);
              break;
            }
          }
        }
      }
    }

    // 在游戏进行中或通关后继续消除时才添加新方块
    // 通关后也允许创建新方块，让游戏继续进行直到没有可消除的匹配
    if (GameGlobal.databus.gameState === 'playing' && !GameGlobal.databus.isGameOver) {
      let delay = 50; // 减少初始延迟
      const fallInterval = 80; // 减少每列之间的下落间隔
      const timeoutIds = []; // 存储setTimeout的ID，用于清理

      if (GameGlobal.databus.isLevelComplete) {
        console.log('通关后继续填充新方块，保持游戏活跃');
      } else {
        console.log('正常游戏中创建新方块填充空位');
      }

      for (let col = 0; col < this.cols; col++) {
        // 计算当前列顶部有多少个空位需要填充
        let emptyPositions = [];
        for (let row = 0; row < this.rows; row++) {
          if (this.grid[row][col] === null) {
            emptyPositions.push(row);
          } else {
            break; // 遇到非空方块就停止计算
          }
        }

        // 为每个空位添加新方块
        for (let i = 0; i < emptyPositions.length; i++) {
          const row = emptyPositions[i];

          // 使用setTimeout实现逐个下落效果
          const timeoutId = setTimeout(() => {
            // 再次检查游戏状态，避免在延迟期间内游戏状态发生变化
            if (GameGlobal.databus.gameState !== 'playing' || GameGlobal.databus.isGameOver) {
              return; // 游戏已结束，不再创建新方块
            }

            const piece = GameGlobal.databus.pool.getItemByClass('piece', Piece);
            // 从顶部开始下落
            piece.init(
              this.getRandomType(),
              this.startX + col * this.pieceSize,
              this.startY - this.pieceSize, // 从网格上方开始
              this.pieceSize,
              this.pieceSize,
              row,
              col
            );
            this.grid[row][col] = piece;
            // 设置目标位置
            piece.setPosition(row, col);
          }, delay + i * 30); // 减少同一列内方块间隔

          timeoutIds.push(timeoutId);
        }

        // 增加列之间的延迟
        if (emptyPositions.length > 0) {
          delay += fallInterval;
        }
      }

      // 检查是否有可消除的方块，如果没有则重新打乱
      const checkTimeoutId = setTimeout(() => {
        // 再次检查游戏状态
        if (GameGlobal.databus.gameState !== 'playing' || GameGlobal.databus.isGameOver) {
          return;
        }

        if (!this.hasValidMoves()) {
          if (!GameGlobal.databus.isLevelComplete) {
            console.log('检测到没有可消除的方块，即将重新打乱...');
            this.shuffleGrid();
          }
          // 通关后如果没有可移动方块，不做任何处理，让网格保持现状
        }
      }, delay + 200); // 减少等待时间

      timeoutIds.push(checkTimeoutId);

      // 将timeout IDs存储到实例中，以便在需要时清理
      this.pendingTimeouts = timeoutIds;
    }
  }

  // 更新
  update() {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        this.grid[row][col]?.update();
      }
    }
  }

  // 渲染
  render(ctx) {
    // 绘制美化的网格背景
    this.renderGridBackground(ctx);

    // 绘制所有方块
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        this.grid[row][col]?.render(ctx);
      }
    }

    // 绘制提示高亮效果
    if (this.showingHint) {
      this.renderHintHighlight(ctx);
    }

    // 绘制重新排列提示
    this.renderShuffleHint(ctx);

    // 绘制返回主菜单按钮
    this.renderBackButton(ctx);
  }

  // 绘制网格背景
  renderGridBackground(ctx) {
    ctx.save();

    const padding = 15;
    const bgX = this.startX - padding;
    const bgY = this.startY - padding;
    const bgWidth = this.cols * this.pieceSize + padding * 2;
    const bgHeight = this.rows * this.pieceSize + padding * 2;

    // 绘制阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    this.drawRoundedRect(ctx, bgX + 3, bgY + 3, bgWidth, bgHeight, 15);

    // 绘制主背景（渐变效果）
    const gradient = ctx.createLinearGradient(bgX, bgY, bgX, bgY + bgHeight);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    gradient.addColorStop(0.5, 'rgba(248, 249, 250, 0.9)');
    gradient.addColorStop(1, 'rgba(233, 236, 239, 0.85)');

    ctx.fillStyle = gradient;
    this.drawRoundedRect(ctx, bgX, bgY, bgWidth, bgHeight, 15);

    // 绘制边框
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    this.strokeRoundedRect(ctx, bgX, bgY, bgWidth, bgHeight, 15);

    // 绘制网格线（细微的分割线）
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.lineWidth = 1;

    // 垂直线
    for (let col = 1; col < this.cols; col++) {
      const x = this.startX + col * this.pieceSize;
      ctx.beginPath();
      ctx.moveTo(x, this.startY);
      ctx.lineTo(x, this.startY + this.rows * this.pieceSize);
      ctx.stroke();
    }

    // 水平线
    for (let row = 1; row < this.rows; row++) {
      const y = this.startY + row * this.pieceSize;
      ctx.beginPath();
      ctx.moveTo(this.startX, y);
      ctx.lineTo(this.startX + this.cols * this.pieceSize, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  // 绘制返回主菜单按钮
  renderBackButton(ctx) {
    const button = this.backButton;

    ctx.save();

    // 绘制阴影
    ctx.fillStyle = button.shadowColor;
    this.drawRoundedRect(ctx, button.x + 1, button.y + 1, button.width, button.height, button.borderRadius, button.shadowColor);

    // 绘制按钮背景
    this.drawRoundedRect(ctx, button.x, button.y, button.width, button.height, button.borderRadius, button.backgroundColor);

    // 绘制边框
    ctx.strokeStyle = button.borderColor;
    ctx.lineWidth = 1;
    this.strokeRoundedRect(ctx, button.x, button.y, button.width, button.height, button.borderRadius);

    // 绘制返回图标（简单箭头）
    ctx.strokeStyle = button.iconColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    // 箭头头部
    ctx.moveTo(button.x + 18, button.y + 10);
    ctx.lineTo(button.x + 12, button.y + 15);
    ctx.lineTo(button.x + 18, button.y + 20);
    // 箭头杆
    ctx.moveTo(button.x + 12, button.y + 15);
    ctx.lineTo(button.x + 20, button.y + 15);
    ctx.stroke();

    ctx.restore();
  }

  // 绘制圆角矩形工具函数
  drawRoundedRect(ctx, x, y, width, height, radius) {
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

  // 绘制圆角矩形边框工具函数
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

  // 显示得分提示
  showScorePopup(score, matchCount) {
    // 这里可以添加得分动画效果

  }

  // 检查是否有可消除的方块（检查所有可能的移动）
  hasValidMoves() {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        // 检查水平交换
        if (col < this.cols - 1) {
          if (this.wouldCreateMatch(row, col, row, col + 1)) {
            return true;
          }
        }
        // 检查垂直交换
        if (row < this.rows - 1) {
          if (this.wouldCreateMatch(row, col, row + 1, col)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // 检查交换两个方块是否会产生匹配
  wouldCreateMatch(row1, col1, row2, col2) {
    if (!this.grid[row1] || !this.grid[row1][col1] || !this.grid[row2] || !this.grid[row2][col2]) {
      return false;
    }

    // 临时交换
    const piece1 = this.grid[row1][col1];
    const piece2 = this.grid[row2][col2];

    this.grid[row1][col1] = piece2;
    this.grid[row2][col2] = piece1;

    // 检查是否产生匹配
    const hasMatch = this.checkMatchAt(row1, col1) || this.checkMatchAt(row2, col2);

    // 恢复交换
    this.grid[row1][col1] = piece1;
    this.grid[row2][col2] = piece2;

    return hasMatch;
  }

  // 检查指定位置是否形成匹配
  checkMatchAt(row, col) {
    if (!this.grid[row] || !this.grid[row][col]) {
      return false;
    }

    const type = this.grid[row][col].type;

    // 检查水平匹配
    let horizontalCount = 1;
    // 向左检查
    for (let c = col - 1; c >= 0 && this.grid[row][c] && this.grid[row][c].type === type; c--) {
      horizontalCount++;
    }
    // 向右检查
    for (let c = col + 1; c < this.cols && this.grid[row][c] && this.grid[row][c].type === type; c++) {
      horizontalCount++;
    }

    if (horizontalCount >= 3) {
      return true;
    }

    // 检查垂直匹配
    let verticalCount = 1;
    // 向上检查
    for (let r = row - 1; r >= 0 && this.grid[r][col] && this.grid[r][col].type === type; r--) {
      verticalCount++;
    }
    // 向下检查
    for (let r = row + 1; r < this.rows && this.grid[r][col] && this.grid[r][col].type === type; r++) {
      verticalCount++;
    }

    return verticalCount >= 3;
  }

  // 重新打乱方块
  shuffleGrid() {
    console.log('检测到没有可消除的方块，重新打乱...');

    // 设置重新排列提示显示状态
    this.showingShuffleHint = true;
    this.shuffleHintStartTime = Date.now();

    // 收集所有方块类型
    const allTypes = [];
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.grid[row][col]) {
          allTypes.push(this.grid[row][col].type);
        }
      }
    }

    // Fisher-Yates 洗牌算法打乱类型数组
    for (let i = allTypes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allTypes[i], allTypes[j]] = [allTypes[j], allTypes[i]];
    }

    // 重新分配类型到方块
    let typeIndex = 0;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.grid[row][col] && typeIndex < allTypes.length) {
          this.grid[row][col].type = allTypes[typeIndex];
          this.grid[row][col].setImage(allTypes[typeIndex]);
          typeIndex++;
        }
      }
    }

    // 如果打乱后仍然没有可消除的方块，尝试更激进的打乱方式
    if (!this.hasValidMoves()) {
      this.forceCreateValidMoves();
    }
  }

  // 强制创建可消除的方块（保证至少有一个可行的移动）
  forceCreateValidMoves() {
    console.log('强制创建可消除的方块...');

    // 找到一个随机位置，在其附近创建一个可消除的组合
    const centerRow = Math.floor(this.rows / 2);
    const centerCol = Math.floor(this.cols / 2);

    // 选择一个类型作为目标类型
    const targetType = this.getRandomType();

    // 在中心位置创建一个水平的三个相同方块（但不相邻）
    if (centerCol + 2 < this.cols) {
      // 在位置 (centerRow, centerCol), (centerRow, centerCol+2) 放置相同类型
      if (this.grid[centerRow] && this.grid[centerRow][centerCol]) {
        this.grid[centerRow][centerCol].type = targetType;
        this.grid[centerRow][centerCol].setImage(targetType);
      }
      if (this.grid[centerRow] && this.grid[centerRow][centerCol + 2]) {
        this.grid[centerRow][centerCol + 2].type = targetType;
        this.grid[centerRow][centerCol + 2].setImage(targetType);
      }
      // 在 (centerRow, centerCol+1) 放置不同类型，这样移动后就能形成三消
      const differentType = this.getDifferentType(targetType);
      if (this.grid[centerRow] && this.grid[centerRow][centerCol + 1]) {
        this.grid[centerRow][centerCol + 1].type = differentType;
        this.grid[centerRow][centerCol + 1].setImage(differentType);
      }
    }
  }

  // 获取与指定类型不同的随机类型
  getDifferentType(excludeType) {
    const availableTypes = PIECE_TYPES.filter(type => type !== excludeType);
    return availableTypes[Math.floor(Math.random() * availableTypes.length)];
  }

  // 获取一个可行的提示移动
  getHint() {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        // 检查水平交换
        if (col < this.cols - 1) {
          if (this.wouldCreateMatch(row, col, row, col + 1)) {
            return {
              piece1: { row, col },
              piece2: { row, col: col + 1 }
            };
          }
        }
        // 检查垂直交换
        if (row < this.rows - 1) {
          if (this.wouldCreateMatch(row, col, row + 1, col)) {
            return {
              piece1: { row, col },
              piece2: { row: row + 1, col }
            };
          }
        }
      }
    }
    return null; // 没有找到可行的移动
  }

  // 显示提示
  showHint() {
    // 如果已经在显示提示，先清除
    if (this.showingHint) {
      this.clearHint();
    }

    const hint = this.getHint();
    if (hint) {
      this.hintPieces = [hint.piece1, hint.piece2];
      this.showingHint = true;
      this.hintStartTime = Date.now();

      console.log('提示: 尝试移动位置', hint.piece1, '和', hint.piece2);

      // 设置定时器自动清除提示，使用固定的1.5秒
      setTimeout(() => {
        this.clearHint();
      }, 1500);
    } else {
      console.log('没有找到可行的移动，请等待系统重新打乱');
    }
  }

  // 清除提示
  clearHint() {
    this.hintPieces = [];
    this.showingHint = false;
    this.hintStartTime = 0;
  }

  // 检查是否在提示中
  isHintPiece(row, col) {
    return this.hintPieces.some(piece => piece.row === row && piece.col === col);
  }

  // 绘制提示高亮效果
  renderHintHighlight(ctx) {
    if (!this.showingHint || this.hintPieces.length === 0) {
      return;
    }

    ctx.save();

    const totalDuration = 1500; // 总时长1.5秒
    const flashCount = 3; // 固定闪烁3次
    const cycleDuration = totalDuration / (flashCount * 2); // 每次闪烁包含一次显示和一次隐藏

    const elapsed = Date.now() - this.hintStartTime;

    // 计算当前闪烁次数
    const currentFlash = Math.floor(elapsed / cycleDuration);

    // 如果已经完成指定次数的闪烁，停止动画
    if (currentFlash >= flashCount * 2) {
      ctx.restore();
      return;
    }

    // 计算当前是显示还是隐藏阶段（偶数为显示，奇数为隐藏）
    const isShowing = currentFlash % 2 === 0;

    // 如果是隐藏阶段，不绘制任何内容
    if (!isShowing) {
      ctx.restore();
      return;
    }

    // 计算透明度（在显示阶段逐渐变化，使效果更平滑）
    const phaseInCycle = (elapsed % cycleDuration) / cycleDuration;
    const alpha = 0.3 + 0.4 * phaseInCycle;

    // 为每个提示方块绘制高亮效果
    this.hintPieces.forEach(piece => {
      const x = this.startX + piece.col * this.pieceSize;
      const y = this.startY + piece.row * this.pieceSize;

      // 绘制高亮边框
      ctx.strokeStyle = `rgba(255, 255, 0, ${alpha})`; // 黄色闪烁边框
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, this.pieceSize - 4, this.pieceSize - 4);

      // 绘制高亮背景
      ctx.fillStyle = `rgba(255, 255, 0, ${alpha * 0.3})`; // 黄色半透明背景
      ctx.fillRect(x + 2, y + 2, this.pieceSize - 4, this.pieceSize - 4);
    });

    // 绘制连接线（显示两个方块之间的关系）
    if (this.hintPieces.length === 2) {
      const piece1 = this.hintPieces[0];
      const piece2 = this.hintPieces[1];

      const x1 = this.startX + piece1.col * this.pieceSize + this.pieceSize / 2;
      const y1 = this.startY + piece1.row * this.pieceSize + this.pieceSize / 2;
      const x2 = this.startX + piece2.col * this.pieceSize + this.pieceSize / 2;
      const y2 = this.startY + piece2.row * this.pieceSize + this.pieceSize / 2;

      // 绘制箭头指示线
      ctx.strokeStyle = `rgba(255, 165, 0, ${alpha})`; // 橙色箭头
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]); // 虚线
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]); // 重置虚线

      // 绘制箭头
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const arrowLength = 15;
      const arrowAngle = Math.PI / 6;

      ctx.strokeStyle = `rgba(255, 165, 0, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - arrowLength * Math.cos(angle - arrowAngle),
        y2 - arrowLength * Math.sin(angle - arrowAngle)
      );
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - arrowLength * Math.cos(angle + arrowAngle),
        y2 - arrowLength * Math.sin(angle + arrowAngle)
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  // 绘制重新排列提示
  renderShuffleHint(ctx) {
    // 检查是否需要显示提示以及是否超过显示时间
    if (!this.showingShuffleHint || (Date.now() - this.shuffleHintStartTime) > this.SHUFFLE_HINT_DURATION) {
      this.showingShuffleHint = false;
      return;
    }

    ctx.save();

    // 设置字体和样式
    ctx.font = 'bold 24px Arial, "Microsoft YaHei", "SimHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 计算透明度（淡入淡出效果）
    const elapsed = Date.now() - this.shuffleHintStartTime;
    let alpha = 1.0;

    // 淡入效果（前0.5秒）
    if (elapsed < 500) {
      alpha = elapsed / 500;
    }
    // 淡出效果（最后0.5秒）
    else if (elapsed > (this.SHUFFLE_HINT_DURATION - 500)) {
      alpha = (this.SHUFFLE_HINT_DURATION - elapsed) / 500;
    }

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.5})`;
    ctx.lineWidth = 2;

    // 绘制文本
    const centerX = SCREEN_WIDTH / 2;
    const centerY = SCREEN_HEIGHT / 2;
    ctx.strokeText('重新排列中...', centerX, centerY);
    ctx.fillText('重新排列中...', centerX, centerY);

    ctx.restore();
  }

}