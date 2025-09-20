import Sprite from '../base/sprite';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';

export default class Piece extends Sprite {
  constructor() {
    super('', 60, 60);
    this.selected = false;
    this.matched = false;
    this.row = 0;
    this.col = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.matchTime = 0; // 记录匹配发生的时间，用于控制消失动画
    this.MATCH_VISIBLE_TIME = 30; // 匹配后可见的帧数
  }

  // 初始化方块
  init(type, x, y, width, height, row, col) {
    this.type = type;
    this.setImage(type); // 使用setImage方法而不是直接修改img.src
    this.width = width;
    this.height = height;
    this.row = row;
    this.col = col;
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.selected = false;
    this.matched = false;
    this.visible = true;
    this.matchTime = 0;
  }

  // 设置位置
  setPosition(row, col) {
    this.row = row;
    this.col = col;
    // 通过Grid的startX和startY来计算正确位置
    const grid = GameGlobal.databus.grid;
    if (grid) {
      this.targetX = grid.startX + col * this.width;
      this.targetY = grid.startY + row * this.height;
    }
  }

  // 选择方块
  select() {
    this.selected = true;
  }

  // 匹配方块
  match() {
    if (!this.matched) {
      this.matched = true;
      this.selected = false;
      this.matchTime = GameGlobal.databus.frame; // 记录匹配发生的帧
      // 播放匹配音效（如果有）
      // if (GameGlobal.databus.audioManager) {
      //   GameGlobal.databus.audioManager.playMatchSound();
      // }
    }
  }

  // 更新位置和状态
  update() {
    // 确保targetX和targetY已正确设置
    if (this.targetX === undefined || this.targetY === undefined) {
      return;
    }

    // 优化的移动逻辑，使动画更平滑
    const moveSpeed = 0.25; // 动画速度
    const threshold = 0.5; // 停止阈值

    // X 轴动画
    if (Math.abs(this.x - this.targetX) > threshold) {
      const dx = this.targetX - this.x;
      this.x += dx * moveSpeed;
    } else if (this.x !== this.targetX) {
      this.x = this.targetX;
    }

    // Y 轴动画
    if (Math.abs(this.y - this.targetY) > threshold) {
      const dy = this.targetY - this.y;
      this.y += dy * moveSpeed;
    } else if (this.y !== this.targetY) {
      this.y = this.targetY;
    }

    // 匹配后延迟消失，让玩家有时间看到匹配效果
    if (this.matched) {
      const currentFrame = GameGlobal.databus.frame;
      if (currentFrame - this.matchTime > this.MATCH_VISIBLE_TIME) {
        this.visible = false;
      } else {
        // 匹配后闪烁效果
        const flashInterval = 5;
        this.visible = Math.floor((currentFrame - this.matchTime) / flashInterval) % 2 === 0;
      }
    }
  }

  // 渲染方块
  render(ctx) {
    super.render(ctx);
    // 已移除选中效果的绘制
  }
}