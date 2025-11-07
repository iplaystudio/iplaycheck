// 地理位置API操作封装
export class GeolocationService {
  constructor() {
    this.watchId = null;
    this.currentPosition = null;
  }

  // 检查浏览器是否支持地理位置API
  static isSupported() {
    return 'geolocation' in navigator;
  }

  // 请求地理位置权限
  async requestPermission() {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state; // 'granted', 'denied', 'prompt'
    } catch (error) {
      console.warn('Permission API not supported:', error);
      return 'prompt';
    }
  }

  // 获取当前位置
  async getCurrentPosition(options = {}) {
    if (!GeolocationService.isSupported()) {
      throw new Error('Geolocation API is not supported in this browser');
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    const finalOptions = { ...defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentPosition = this.formatPosition(position);
          resolve(this.currentPosition);
        },
        (error) => {
          reject(this.handleGeolocationError(error));
        },
        finalOptions
      );
    });
  }

  // 监听位置变化
  watchPosition(callback, options = {}) {
    if (!GeolocationService.isSupported()) {
      throw new Error('Geolocation API is not supported in this browser');
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };

    const finalOptions = { ...defaultOptions, ...options };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.currentPosition = this.formatPosition(position);
        callback(this.currentPosition);
      },
      (error) => {
        callback(null, this.handleGeolocationError(error));
      },
      finalOptions
    );

    return this.watchId;
  }

  // 停止监听位置
  clearWatch() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  // 格式化位置信息
  formatPosition(position) {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: new Date(position.timestamp).toISOString()
    };
  }

  // 验证位置是否在允许范围内
  validateLocation(position, allowedLocations, radiusMeters) {
    if (!allowedLocations || allowedLocations.length === 0) {
      return {
        valid: true,
        distance: 0,
        location: null
      };
    }

    let minDistance = Infinity;
    let nearestLocation = null;

    for (const location of allowedLocations) {
      const distance = this.calculateDistance(
        position.latitude,
        position.longitude,
        location.latitude,
        location.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestLocation = location;
      }
    }

    const valid = minDistance <= radiusMeters;

    return {
      valid,
      distance: minDistance,
      location: nearestLocation
    };
  }

  // 计算两点之间的距离（米）
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // 地球半径（米）
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  // 角度转弧度
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // 获取地址信息(反向地理编码) - 使用第三方API
  async reverseGeocode(latitude, longitude) {
    try {
      // 这里可以使用Google Maps API、高德地图API等
      // 示例使用OpenStreetMap的Nominatim API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'TimeTrackingApp'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();
      return {
        address: data.display_name,
        details: data.address,
        raw: data
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return {
        address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        details: null,
        raw: null
      };
    }
  }

  // 处理地理位置错误
  handleGeolocationError(error) {
    const errorMessages = {
      1: '地理位置权限被拒绝,请在浏览器设置中允许位置访问',
      2: '无法获取位置信息,请检查设备的定位服务',
      3: '获取位置信息超时,请重试'
    };

    return new Error(
      errorMessages[error.code] || `地理位置错误: ${error.message}`
    );
  }

  // 获取位置精度描述
  getAccuracyDescription(accuracy) {
    if (accuracy <= 10) return '非常精确';
    if (accuracy <= 50) return '精确';
    if (accuracy <= 100) return '良好';
    if (accuracy <= 500) return '一般';
    return '较差';
  }

  // 格式化坐标显示
  static formatCoordinates(latitude, longitude, format = 'decimal') {
    if (format === 'decimal') {
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } else if (format === 'dms') {
      // 转换为度分秒格式
      const latDMS = this.decimalToDMS(latitude, 'lat');
      const lonDMS = this.decimalToDMS(longitude, 'lon');
      return `${latDMS} ${lonDMS}`;
    }
    return `${latitude}, ${longitude}`;
  }

  // 十进制度数转度分秒
  static decimalToDMS(decimal, type) {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutesDecimal = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesDecimal);
    const seconds = ((minutesDecimal - minutes) * 60).toFixed(2);

    const direction =
      type === 'lat'
        ? decimal >= 0
          ? 'N'
          : 'S'
        : decimal >= 0
        ? 'E'
        : 'W';

    return `${degrees}°${minutes}'${seconds}"${direction}`;
  }
}

export default GeolocationService;
