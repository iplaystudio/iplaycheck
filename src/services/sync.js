// 数据同步服务 (使用ImgBB图片存储)
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { uploadImageToImgBB } from './imgbb';
import { 
  getUnsyncedRecords, 
  markRecordAsSynced,
  getSyncQueue,
  removeFromSyncQueue,
  addPunchRecord 
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
      console.log('Sync already in progress');
      return;
    }

    if (!navigator.onLine) {
      console.log('Device is offline, skipping sync');
      return;
    }

    this.isSyncing = true;
    this.notifyListeners('sync_started');

    try {
      // 上传未同步的记录
      await this.uploadUnsyncedRecords();

      // 下载新记录
      await this.downloadNewRecords();

      // 处理同步队列
      await this.processSyncQueue();

      this.notifyListeners('sync_completed');
    } catch (error) {
      console.error('Sync error:', error);
      this.notifyListeners('sync_error', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // 上传未同步的记录
  async uploadUnsyncedRecords() {
    const unsyncedRecords = await getUnsyncedRecords();

    for (const record of unsyncedRecords) {
      try {
        // 上传照片到ImgBB
        let photoURL = record.photo;
        if (record.photo && record.photo.startsWith('data:')) {
          try {
            const uploadResult = await uploadImageToImgBB(record.photo, `punch-${record.id}`);
            photoURL = uploadResult.url; // 使用ImgBB返回的URL
            console.log(`Photo uploaded to ImgBB: ${photoURL}`);
          } catch (uploadError) {
            console.error('ImgBB upload failed, keeping base64:', uploadError);
            // 如果上传失败，保持base64（但这会导致Firestore文档很大）
            // 或者可以选择不上传此记录
          }
        }

        // 准备上传数据
        const uploadData = {
          ...record,
          photo: photoURL,
          syncedAt: serverTimestamp()
        };

        delete uploadData.id; // Firestore会生成新的ID

        // 上传到Firestore
        const docRef = await addDoc(collection(db, 'punchRecords'), uploadData);

        // 标记为已同步
        await markRecordAsSynced(record.id);

        console.log(`Record ${record.id} synced successfully`);
      } catch (error) {
        console.error(`Failed to sync record ${record.id}:`, error);
      }
    }
  }

  // 上传照片到ImgBB (已废弃，使用uploadImageToImgBB代替)
  async uploadPhoto(recordId, base64Photo) {
    console.warn('uploadPhoto is deprecated, use uploadImageToImgBB from imgbb service');
    try {
      const result = await uploadImageToImgBB(base64Photo, `punch-${recordId}`);
      return result.url;
    } catch (error) {
      console.error('Photo upload error:', error);
      return base64Photo; // 失败时返回原始base64
    }
  }

  // 下载新记录
  async downloadNewRecords(userId = null) {
    try {
      let q = collection(db, 'punchRecords');

      if (userId) {
        q = query(
          collection(db, 'punchRecords'),
          where('userId', '==', userId),
          orderBy('timestamp', 'desc'),
          limit(50)
        );
      }

      const querySnapshot = await getDocs(q);
      const records = [];

      querySnapshot.forEach((doc) => {
        records.push({
          id: doc.id,
          ...doc.data(),
          synced: true
        });
      });

      // 保存到IndexedDB
      for (const record of records) {
        try {
          await addPunchRecord(record);
        } catch (error) {
          // 记录可能已存在,忽略错误
          console.log('Record already exists:', record.id);
        }
      }

      return records;
    } catch (error) {
      console.error('Download records error:', error);
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
        console.error(`Failed to process queue item ${item.id}:`, error);
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
        console.warn('Unknown queue action:', item.action);
    }
  }

  // 更新远程记录
  async updateRemoteRecord(data) {
    const docRef = doc(db, 'punchRecords', data.id);
    return await updateDoc(docRef, data);
  }

  // 删除远程记录
  async deleteRemoteRecord(data) {
    // 实现删除逻辑
    console.log('Delete not implemented:', data);
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
        console.error('Listener error:', error);
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
  console.log('Device is online, starting sync');
  syncService.syncData();
});

window.addEventListener('offline', () => {
  console.log('Device is offline');
});

export default syncService;
