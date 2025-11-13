// 数据同步服务 (使用ImgBB图片存储)
import { supabase } from './supabase';
import { uploadImageToImgBB } from './imgbb';
import { 
  getUnsyncedRecords, 
  markRecordAsSynced,
  getSyncQueue,
  removeFromSyncQueue,
  addPunchRecord,
  updatePunchRecord
} from './indexedDB';

export class SyncService {
  constructor() {
    this.isSyncing = false;
    this.syncInterval = null;
    this.listeners = [];
  }

  // 开始自动同步
  startAutoSync(intervalMs = 60000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // 立即执行一次同步
    this.syncData();

    // 设置定时同步
    this.syncInterval = setInterval(() => {
      this.syncData();
    }, intervalMs);
  }

  // 停止自动同步
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // 同步数据
  async syncData() {
    if (this.isSyncing) {
      return;
    }

    if (!navigator.onLine) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners('sync_started');

    try {
      // 获取当前用户信息
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return;
      }

      // 检查用户角色
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin = userProfile?.role === 'admin';

      // 上传未同步的记录
      await this.uploadUnsyncedRecords();

      // 下载新记录：管理员下载所有记录，普通用户只下载自己的
      if (isAdmin) {
        await this.downloadNewRecords(); // 不传userId，下载所有记录
      } else {
        await this.downloadNewRecords(user.id);
      }

      // 处理同步队列
      await this.processSyncQueue();

      this.notifyListeners('sync_completed');
    } catch (error) {
      this.notifyListeners('sync_error', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // 上传未同步的记录
  async uploadUnsyncedRecords() {
    const unsyncedRecords = await getUnsyncedRecords();

    if (unsyncedRecords.length === 0) {
      return;
    }

    // 检查认证状态
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return;
    }

    // 检查用户角色
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userProfile?.role === 'admin';

    for (const record of unsyncedRecords) {
      try {
        // 验证记录所有权：管理员可以上传所有记录，普通用户只能上传自己的
        if (!isAdmin && record.userId !== user.id) {
          if (record.userId === null) {
            // 修复旧记录中缺失的userId
            record.userId = user.id;
            // 更新IndexedDB中的记录
            await updatePunchRecord(record);
          } else {
            continue;
          }
        }
        // 上传照片到ImgBB
        let photoURL = record.photo;
        if (record.photo && record.photo.startsWith('data:')) {
          try {
            const uploadResult = await uploadImageToImgBB(record.photo, `punch-${record.id}`);
            photoURL = uploadResult.url; // 使用ImgBB返回的URL
          } catch (uploadError) {
            // 如果上传失败，保持base64（但这会导致Firestore文档很大）
            // 或者可以选择不上传此记录
          }
        }

        // 准备上传数据
        const uploadData = {
          ...record,
          photo: photoURL,
          synced_at: new Date().toISOString()
        };

        delete uploadData.id; // Supabase会生成新的ID

        // 上传到Supabase
        const { error } = await supabase
          .from('punch_records')
          .insert([{
            user_id: uploadData.userId, // 修复字段名：userId -> user_id
            type: uploadData.type,
            timestamp: uploadData.timestamp,
            photo: uploadData.photo,
            location: uploadData.location,
            synced_at: uploadData.synced_at
          }]);

        if (error) {
          throw error;
        }

        // 标记为已同步
        await markRecordAsSynced(record.id);

      } catch (error) {
      }
    }
  }

  // 上传照片到ImgBB (已废弃，使用uploadImageToImgBB代替)
  async uploadPhoto(recordId, base64Photo) {
    try {
      const result = await uploadImageToImgBB(base64Photo, `punch-${recordId}`);
      return result.url;
    } catch (error) {
      return base64Photo; // 失败时返回原始base64
    }
  }

  // 下载新记录
  async downloadNewRecords(userId = null) {
    try {
      let query = supabase
        .from('punch_records')
        .select('*')
        .order('timestamp', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId).limit(50);
      }

      const { data: records, error } = await query;

      if (error) {
        throw error;
      }

      // 处理记录格式
      const processedRecords = records.map(record => ({
        id: record.id,
        userId: record.user_id, // 转换为camelCase
        type: record.type,
        timestamp: record.timestamp,
        photo: record.photo,
        location: record.location,
        synced_at: record.synced_at,
        synced: true
      }));

      // 保存到IndexedDB
      for (const record of processedRecords) {
        try {
          await addPunchRecord(record);
        } catch (error) {
          // 记录可能已存在,忽略错误
        }
      }

      return processedRecords;
    } catch (error) {
      throw error;
    }
  }

  // 处理同步队列
  async processSyncQueue() {
    const queue = await getSyncQueue();

    for (const item of queue) {
      try {
        await this.executeQueueItem(item);
        await removeFromSyncQueue(item.id);
      } catch (error) {
        // 可以实现重试逻辑
      }
    }
  }

  // 执行队列项
  async executeQueueItem(item) {
    switch (item.action) {
      case 'update':
        return await this.updateRemoteRecord(item.data);
      case 'delete':
        return await this.deleteRemoteRecord(item.data);
      default:
    }
  }

  // 更新远程记录
  async updateRemoteRecord(data) {
    const { error } = await supabase
      .from('punch_records')
      .update(data)
      .eq('id', data.id);

    if (error) throw error;
  }

  // 删除远程记录
  async deleteRemoteRecord(data) {
    const { error } = await supabase
      .from('punch_records')
      .delete()
      .eq('id', data.id);

    if (error) throw error;
  }

  // 添加同步监听器
  addListener(callback) {
    this.listeners.push(callback);
  }

  // 移除同步监听器
  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  // 通知监听器
  notifyListeners(event, data = null) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
      }
    });
  }

  // 强制同步
  async forceSync() {
    this.isSyncing = false; // 重置标志
    return await this.syncData();
  }

  // 检查同步状态
  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      isAutoSyncEnabled: this.syncInterval !== null,
      isOnline: navigator.onLine
    };
  }
}

// 创建单例
const syncService = new SyncService();

// 监听在线/离线事件
window.addEventListener('online', () => {
  syncService.syncData();
});

window.addEventListener('offline', () => {
});

export default syncService;
