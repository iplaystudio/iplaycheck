// 相机API操作封装
export class CameraService {
  constructor() {
    this.stream = null;
    this.videoElement = null;
  }

  // 检查浏览器是否支持相机API
  static isSupported() {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  }

  // 请求相机权限
  async requestPermission() {
    try {
      const result = await navigator.permissions.query({ name: 'camera' });
      return result.state; // 'granted', 'denied', 'prompt'
    } catch (error) {
      // Permission API 不受支持：调试输出已移除
      return 'prompt';
    }
  }

  // 启动相机流
  async startCamera(videoElement, constraints = {}) {
    if (!CameraService.isSupported()) {
      throw new Error('Camera API is not supported in this browser');
    }

    const defaultConstraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user' // 前置摄像头
      },
      audio: false
    };

    // Deep merge the video constraints so we don't lose width/height when passing
    // a small constraints object like { video: { facingMode: 'environment' } }
    const finalConstraints = {
      ...defaultConstraints,
      ...constraints,
      video: {
        ...defaultConstraints.video,
        ...(constraints.video || {})
      }
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
      this.videoElement = videoElement;
      
      if (videoElement) {
        videoElement.srcObject = this.stream;
        await videoElement.play();
      }

      return this.stream;
    } catch (error) {
      // Error accessing camera: debug output removed
      throw this.handleCameraError(error);
    }
  }

  // 切换前后摄像头
  async switchCamera() {
    if (!this.stream) {
      throw new Error('No active camera stream');
    }

    const track = this.stream.getVideoTracks()[0];
    const settings = track.getSettings();

    // Save a reference to the current video element, because stopCamera clears it
    const videoElement = this.videoElement;

    // Prefer switching by deviceId (more reliable). If not available, fallback to
    // toggling the facingMode constraint.
    try {
      const devices = await CameraService.getAvailableCameras();

      // If more than one camera, pick the next device != current
      if (devices.length > 1) {
        const currentDeviceId = settings.deviceId;

        let targetDevice = null;
        if (currentDeviceId) {
          const idx = devices.findIndex(d => d.deviceId === currentDeviceId);
          // choose next device in list, wrap around
          const nextIndex = idx >= 0 ? (idx + 1) % devices.length : 0;
          targetDevice = devices[nextIndex];
        } else {
          // fallback: choose any other device with a different label
          targetDevice = devices.find(d => d.label && d.label !== devices[0].label) || devices[0];
        }

        await this.stopCamera(true); // preserve video element for restart

        return await this.startCamera(videoElement, {
          video: { deviceId: { exact: targetDevice.deviceId } }
        });
      }

      // Fallback to toggling facingMode
      const currentFacingMode = settings.facingMode;
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

      await this.stopCamera(true);
      return await this.startCamera(videoElement, {
        video: { facingMode: newFacingMode }
      });
    } catch (err) {
      // If something fails, rethrow nicely
      throw this.handleCameraError(err);
    }
  }

  // 捕获照片
  capturePhoto(videoElement, options = {}) {
    const {
      width = 1280,
      height = 720,
      quality = 0.92,
      format = 'image/jpeg'
    } = options;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    context.drawImage(videoElement, 0, 0, width, height);

    // 添加时间戳水印
    if (options.addTimestamp) {
      this.addWatermark(context, width, height);
    }

    return canvas.toDataURL(format, quality);
  }

  // 添加水印
  addWatermark(context, width, height) {
    const now = new Date();
    const timestamp = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    context.font = '20px Arial';
    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    context.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    context.lineWidth = 2;

    const text = timestamp;
    const x = 10;
    const y = height - 10;

    context.strokeText(text, x, y);
    context.fillText(text, x, y);
  }

  // 停止相机
  // Stop the camera stream and optionally preserve the video element reference.
  // When switching cameras we want to remove tracks but keep the element so we
  // can reuse it for the new stream.
  stopCamera(preserveVideoElement = false) {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      if (!preserveVideoElement) {
        this.videoElement = null;
      }
    }
  }

  // 获取可用相机列表
  static async getAvailableCameras() {
    if (!CameraService.isSupported()) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      // Error enumerating devices: debug output removed
      return [];
    }
  }

  // 处理相机错误
  handleCameraError(error) {
    const errorMessages = {
      NotAllowedError: '相机权限被拒绝,请在浏览器设置中允许相机访问',
      NotFoundError: '未找到可用的相机设备',
      NotReadableError: '相机正在被其他应用使用',
      OverconstrainedError: '相机不支持请求的配置',
      SecurityError: '安全错误:请确保使用HTTPS协议',
      TypeError: '配置参数错误'
    };

    return new Error(errorMessages[error.name] || `相机错误: ${error.message}`);
  }

  // 压缩图片
  static compressImage(base64Image, maxSizeKB = 500) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let quality = 0.9;
        let result = base64Image;

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        // 逐步降低质量直到满足大小要求
        while (quality > 0.1) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          result = canvas.toDataURL('image/jpeg', quality);

          // 计算base64大小(字节)
          const sizeKB = (result.length * 3) / 4 / 1024;

          if (sizeKB <= maxSizeKB) {
            break;
          }

          quality -= 0.1;
        }

        resolve(result);
      };
      img.src = base64Image;
    });
  }
}

export default CameraService;
