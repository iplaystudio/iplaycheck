// ImgBB图片上传服务
import axios from 'axios';

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;
const IMGBB_UPLOAD_URL = import.meta.env.VITE_IMGBB_UPLOAD_URL || 'https://api.imgbb.com/1/upload';

/**
 * 将base64图片上传到ImgBB
 * @param {string} base64Image - base64格式的图片数据 (包含 data:image/... 前缀)
 * @param {string} name - 图片名称 (可选)
 * @returns {Promise<Object>} 返回包含图片URL的对象
 */
export const uploadImageToImgBB = async (base64Image, name = 'punch-photo') => {
  try {
    if (!IMGBB_API_KEY) {
      throw new Error('ImgBB API Key未配置,请在.env文件中设置VITE_IMGBB_API_KEY');
    }

    // 移除base64前缀 (data:image/png;base64,)
    const base64Data = base64Image.includes(',') 
      ? base64Image.split(',')[1] 
      : base64Image;

    // 构建表单数据
    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', base64Data);
    formData.append('name', `${name}-${Date.now()}`);

    // 上传到ImgBB
    const response = await axios.post(IMGBB_UPLOAD_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    if (response.data && response.data.success) {
      const imageData = response.data.data;
      return {
        success: true,
        url: imageData.url,           // 图片直接访问URL
        displayUrl: imageData.display_url, // 显示URL
        deleteUrl: imageData.delete_url,   // 删除URL (如需要删除功能)
        thumbUrl: imageData.thumb.url,     // 缩略图URL
        imageId: imageData.id,             // 图片ID
        title: imageData.title,
        size: imageData.size,
        width: imageData.width,
        height: imageData.height,
        expirationTime: imageData.expiration || null
      };
    } else {
      throw new Error('ImgBB上传失败: ' + (response.data?.error?.message || '未知错误'));
    }
  } catch (error) {
    // 处理不同的错误类型
    if (error.response) {
      // 服务器返回错误
      const errorMsg = error.response.data?.error?.message || error.response.statusText;
      throw new Error(`ImgBB上传失败 (${error.response.status}): ${errorMsg}`);
    } else if (error.request) {
      // 请求发送但没有响应
      throw new Error('ImgBB服务器无响应,请检查网络连接');
    } else {
      // 其他错误
      throw error;
    }
  }
};

/**
 * 将Blob对象上传到ImgBB
 * @param {Blob} blob - 图片Blob对象
 * @param {string} name - 图片名称 (可选)
 * @returns {Promise<Object>} 返回包含图片URL的对象
 */
export const uploadBlobToImgBB = async (blob, name = 'punch-photo') => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      try {
        const result = await uploadImageToImgBB(reader.result, name);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('读取图片数据失败'));
    };
    
    reader.readAsDataURL(blob);
  });
};

/**
 * 从ImgBB删除图片 (如果需要)
 * @param {string} deleteUrl - 图片的删除URL
 * @returns {Promise<boolean>} 是否删除成功
 */
export const deleteImageFromImgBB = async (deleteUrl) => {
  try {
    if (!deleteUrl) {
      throw new Error('删除URL无效');
    }

    // ImgBB的删除功能通过访问delete_url实现
    // 注意: 免费账户可能没有删除权限
    await axios.get(deleteUrl);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * 验证图片大小
 * @param {Blob|string} imageData - 图片数据
 * @param {number} maxSizeMB - 最大大小(MB) 默认32MB
 * @returns {boolean} 是否在限制内
 */
export const validateImageSize = (imageData, maxSizeMB = 32) => {
  let size = 0;
  
  if (imageData instanceof Blob) {
    size = imageData.size;
  } else if (typeof imageData === 'string') {
    // base64字符串大小估算
    const base64Length = imageData.length;
    size = (base64Length * 3) / 4; // base64编码后约为原文件的4/3
  }
  
  const maxSize = maxSizeMB * 1024 * 1024; // 转换为字节
  return size <= maxSize;
};

/**
 * 压缩图片
 * @param {string} base64Image - base64图片
 * @param {number} maxWidth - 最大宽度
 * @param {number} quality - 质量 (0-1)
 * @returns {Promise<string>} 压缩后的base64图片
 */
export const compressImage = (base64Image, maxWidth = 1920, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // 按比例缩放
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // 转换为base64
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };
    
    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };
    
    img.src = base64Image;
  });
};

export default {
  uploadImageToImgBB,
  uploadBlobToImgBB,
  deleteImageFromImgBB,
  validateImageSize,
  compressImage
};
