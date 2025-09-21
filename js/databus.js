import Pool from './base/pool';

let instance;

/**
 * 全局状态管理器
 * 负责管理游戏的状态，包括帧数、分数、目标分数和动画等
 */
export default class DataBus {
  // 直接在类中定义实例属性
  animations = []; // 存储动画
  frame = 0; // 当前帧数
  score = 0; // 当前分数
  targetScore = 1000; // 目标分数
  level = 1; // 当前关卡
  completedLevel = 0; // 已完成的关卡
  combo = 0; // 连续消除次数
  maxCombo = 0; // 最大连续数
  moves = 0; // 当前步数
  maxMoves = 30; // 最大步数限制
  hintsUsed = 0; // 已使用的提示次数
  maxHints = 3; // 最大提示次数
  isGameOver = false; // 游戏是否结束
  isLevelComplete = false; // 关卡是否完成
  noMoreMatches = false; // 通关后是否没有更多可消除匹配
  gameState = 'mainMenu'; // 游戏状态：'mainMenu'、'playing'、'levelCompleteMenu'
  pool = new Pool(); // 初始化对象池

  constructor() {
    // 确保单例模式
    if (instance) return instance;

    instance = this;
  }

  // 重置游戏状态
  reset(resetLevel = false) {
    this.frame = 0; // 当前帧数
    this.score = 0; // 当前分数
    this.combo = 0; // 连续消除次数
    this.maxCombo = 0; // 最大连续数
    this.moves = 0; // 重置步数
    this.hintsUsed = 0; // 重置提示次数
    this.animations = []; // 存储动画
    this.isGameOver = false; // 游戏是否结束
    this.isLevelComplete = false; // 关卡是否完成
    this.noMoreMatches = false; // 重置无更多匹配标志

    // 只有在游戏重新开始时才重置关卡，关卡完成后不重置
    if (resetLevel || this.isGameOver || this.level === undefined) {
      this.level = 1;
    }

    // 设置当前关卡的目标分数和步数限制
    this.setTargetScore();
    this.setMaxMoves();

    // 清除网格中的选中状态并重新初始化网格
    if (this.grid) {
      this.grid.selectedPiece = null;
      // 清除所有交换和拖动状态
      this.grid.isSwapping = false;
      this.grid.isDragging = false;
      this.grid.dragStartPiece = null;
      // 清除提示状态
      this.grid.showingHint = false;
      this.grid.hintPieces = [];
      this.grid.hintStartTime = 0;
      // 清理挂起的timeout任务
      this.grid.clearPendingTimeouts();

      // 重新初始化网格，确保新关卡有全新的方块布局
      this.grid.init();
    }
  }

  // 设置目标分数
  setTargetScore() {
    // 根据关卡设置目标分数，逐渐递增难度
    this.targetScore = 500 + (this.level - 1) * 300;
  }

  // 设置最大步数限制
  setMaxMoves() {
    // 根据关卡设置步数限制，逐渐递减难度（更少步数）
    this.maxMoves = Math.max(20, 35 - (this.level - 1) * 2);
  }

  // 增加步数
  addMove() {
    this.moves++;
    // 检查是否超过步数限制且未完成目标
    if (this.moves >= this.maxMoves && this.score < this.targetScore) {
      // 延迟显示失败弹窗，确保所有动画和方块渲染完成
      // 使用较长的延迟确保包括交换动画和匹配处理等操作完成
      setTimeout(() => {
        // 再次检查状态，防止在延迟期间内游戏状态发生变化
        if (this.moves >= this.maxMoves && this.score < this.targetScore && !this.isLevelComplete) {
          this.gameOver();
        }
      }, 800); // 增加到800ms延迟，给更多时间完成动画
    }
  }

  // 获取剩余步数
  getRemainingMoves() {
    return Math.max(0, this.maxMoves - this.moves);
  }

  // 检查是否接近步数上限
  isNearMoveLimit() {
    const remaining = this.getRemainingMoves();
    return remaining <= 5 && remaining > 0;
  }

  // 增加提示使用次数
  useHint() {
    this.hintsUsed++;
  }

  // 检查是否还有可用提示
  hasAvailableHints() {
    return this.hintsUsed < this.maxHints;
  }

  // 获取剩余提示次数
  getRemainingHints() {
    return Math.max(0, this.maxHints - this.hintsUsed);
  }

  // 增加分数
  addScore(baseScore, comboMultiplier = 1) {
    // 基础分数 * 连击倍数
    const finalScore = Math.floor(baseScore * comboMultiplier);
    this.score += finalScore;

    // 检查是否达到目标分数
    if (this.score >= this.targetScore) {
      this.levelComplete();
    }

    return finalScore;
  }

  // 开始连击
  startCombo() {
    this.combo++;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
  }

  // 结束连击
  endCombo() {
    this.combo = 0;
  }

  // 获取连击倍数
  getComboMultiplier() {
    if (this.combo <= 1) return 1;
    if (this.combo <= 3) return 1.2;
    if (this.combo <= 5) return 1.5;
    if (this.combo <= 10) return 2.0;
    return 2.5;
  }

  // 关卡完成
  levelComplete() {
    // 立即标记关卡完成，但不立即切换状态
    this.isLevelComplete = true;
    this.levelCompleteTime = Date.now(); // 记录通关时间
    this.completedLevel = this.level; // 记录完成的关卡

    console.log('关卡完成！当前分数:', this.score, '目标分数:', this.targetScore);

    // 不再使用setTimeout，而是通过游戏主循环来控制状态切换
    // 在下一帧渲染时检查是否所有动画都已完成
  }

  // 获取进度百分比
  getProgress() {
    return Math.min(this.score / this.targetScore, 1);
  }

  // 获取步数进度百分比
  getMovesProgress() {
    return this.moves / this.maxMoves;
  }

  // 游戏结束
  gameOver() {
    this.isGameOver = true;
  }

  // 开始游戏
  startGame() {
    this.gameState = 'playing';
    this.reset(true); // 传递true以重置关卡
  }

  // 继续下一关
  continueGame() {
    this.gameState = 'playing';
    this.isLevelComplete = false;
    this.level++; // 增加关卡数
    this.reset();
  }

  // 返回主菜单
  backToMenu() {
    this.gameState = 'mainMenu';
    this.isGameOver = false;
    this.isLevelComplete = false;
    this.level = 1;
    this.reset(true);  // 传递true以重置关卡
  }
}
