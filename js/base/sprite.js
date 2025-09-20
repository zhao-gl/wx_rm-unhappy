import Emitter from '../libs/tinyemitter';

/**
 * 游戏基础的精灵类
 */
export default class Sprite extends Emitter {
  visible = true; // 是否可见
  isLoaded = false; // 图片是否加载完成

  constructor(imgSrc = '', width = 0, height = 0, x = 0, y = 0) {
    super();

    this.img = wx.createImage();
    this.img.src = imgSrc;
    this.img.onload = () => {
      this.isLoaded = true;
    };
    this.img.onerror = (err) => {
      // console.error('图片加载失败:', imgSrc, err);
    };

    this.width = width;
    this.height = height;

    this.x = x;
    this.y = y;

    this.visible = true;
  }

  /**
   * 设置图片源
   */
  setImage(imgSrc) {
    this.isLoaded = false;
    this.img.src = imgSrc;
    this.img.onload = () => {
      this.isLoaded = true;
    };
  }

  /**
   * 将精灵图绘制在canvas上
   */
  render(ctx) {
    if (!this.visible) return;

    // 保存当前状态
    ctx.save();

    // 启用图像防锤齿和高质量渲染
    if (ctx.imageSmoothingEnabled !== undefined) {
      ctx.imageSmoothingEnabled = true;
      if (ctx.imageSmoothingQuality) {
        ctx.imageSmoothingQuality = 'high';
      }
    }

    // 只有图片加载完成后才绘制
    if (this.isLoaded) {
      // 使用整数坐标避免像素模糊
      const drawX = Math.round(this.x);
      const drawY = Math.round(this.y);
      const drawWidth = Math.round(this.width);
      const drawHeight = Math.round(this.height);

      ctx.drawImage(this.img, drawX, drawY, drawWidth, drawHeight);
    } else {
      // 图片加载完成前，绘制一个占位矩形
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(Math.round(this.x), Math.round(this.y), Math.round(this.width), Math.round(this.height));
      ctx.strokeStyle = '#999999';
      ctx.strokeRect(Math.round(this.x), Math.round(this.y), Math.round(this.width), Math.round(this.height));
    }

    // 恢复状态
    ctx.restore();
  }
}
