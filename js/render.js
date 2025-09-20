GameGlobal.canvas = wx.createCanvas();

const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();

// 获取设备像素比，解决高DPI屏幕模糊问题
const dpr = windowInfo.pixelRatio || 1;
const screenWidth = windowInfo.screenWidth;
const screenHeight = windowInfo.screenHeight;

// 设置canvas的实际像素尺寸（考虑像素比）
canvas.width = screenWidth * dpr;
canvas.height = screenHeight * dpr;

// 设置canvas的CSS显示尺寸（逻辑像素）
canvas.style = canvas.style || {};
canvas.style.width = screenWidth + 'px';
canvas.style.height = screenHeight + 'px';

// 获取绘图上下文并设置缩放比例
const ctx = canvas.getContext('2d');
ctx.scale(dpr, dpr);

// 启用文本防锤齿（如果支持）
if (ctx.textRenderingOptimization) {
    ctx.textRenderingOptimization = 'optimizeSpeed';
}
if (ctx.imageSmoothingEnabled !== undefined) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
}

// 导出逻辑像素尺寸（不含像素比）
export const SCREEN_WIDTH = screenWidth;
export const SCREEN_HEIGHT = screenHeight;
export const DEVICE_PIXEL_RATIO = dpr;