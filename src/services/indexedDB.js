// IndexedDB操作封装
import { openDB } from 'idb';

const DB_NAME = 'TimeTrackingDB';
const DB_VERSION = 1;
const PUNCH_STORE = 'punchRecords';
const SYNC_QUEUE_STORE = 'syncQueue';

// 初始化数据库
export const initDB = async () => {
  return await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // 创建打卡记录表
      if (!db.objectStoreNames.contains(PUNCH_STORE)) {
        const punchStore = db.createObjectStore(PUNCH_STORE, {
          keyPath: 'id',
          autoIncrement: false
        });
        punchStore.createIndex('userId', 'userId', { unique: false });
        punchStore.createIndex('timestamp', 'timestamp', { unique: false });
        punchStore.createIndex('synced', 'synced', { unique: false });
        punchStore.createIndex('type', 'type', { unique: false });
      }

      // 创建同步队列表
      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        const syncStore = db.createObjectStore(SYNC_QUEUE_STORE, {
          keyPath: 'id',
          autoIncrement: true
        });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    }
  });
};

// 添加打卡记录 (如果存在则更新)
export const addPunchRecord = async (record) => {
  const db = await initDB();
  return await db.put(PUNCH_STORE, record);
};

// 获取所有打卡记录
export const getAllPunchRecords = async () => {
  const db = await initDB();
  return await db.getAll(PUNCH_STORE);
};

// 根据用户ID获取记录
export const getPunchRecordsByUser = async (userId) => {
  const db = await initDB();
  const index = db.transaction(PUNCH_STORE).store.index('userId');
  return await index.getAll(userId);
};

// 获取未同步的记录
export const getUnsyncedRecords = async () => {
  const db = await initDB();
  const tx = db.transaction(PUNCH_STORE, 'readonly');
  const store = tx.objectStore(PUNCH_STORE);
  const allRecords = await store.getAll();
  
  // 手动过滤未同步的记录
  return allRecords.filter(record => record.synced === false || !record.synced);
};

// 更新记录
export const updatePunchRecord = async (record) => {
  const db = await initDB();
  return await db.put(PUNCH_STORE, record);
};

// 标记记录为已同步
export const markRecordAsSynced = async (id) => {
  const db = await initDB();
  const record = await db.get(PUNCH_STORE, id);
  if (record) {
    record.synced = true;
    record.syncedAt = new Date().toISOString();
    return await db.put(PUNCH_STORE, record);
  }
};

// 删除记录
export const deletePunchRecord = async (id) => {
  const db = await initDB();
  return await db.delete(PUNCH_STORE, id);
};

// 根据日期范围获取记录
export const getRecordsByDateRange = async (startDate, endDate) => {
  const db = await initDB();
  const tx = db.transaction(PUNCH_STORE, 'readonly');
  const index = tx.store.index('timestamp');
  const range = IDBKeyRange.bound(startDate.toISOString(), endDate.toISOString());
  return await index.getAll(range);
};

// 添加到同步队列
export const addToSyncQueue = async (action, data) => {
  const db = await initDB();
  return await db.add(SYNC_QUEUE_STORE, {
    action,
    data,
    timestamp: new Date().toISOString(),
    retries: 0
  });
};

// 获取同步队列
export const getSyncQueue = async () => {
  const db = await initDB();
  return await db.getAll(SYNC_QUEUE_STORE);
};

// 从同步队列删除
export const removeFromSyncQueue = async (id) => {
  const db = await initDB();
  return await db.delete(SYNC_QUEUE_STORE, id);
};

// 清空所有数据
export const clearAllData = async () => {
  const db = await initDB();
  const tx = db.transaction([PUNCH_STORE, SYNC_QUEUE_STORE], 'readwrite');
  await tx.objectStore(PUNCH_STORE).clear();
  await tx.objectStore(SYNC_QUEUE_STORE).clear();
  await tx.done;
};

// 获取数据库统计信息
export const getDBStats = async () => {
  const db = await initDB();
  const punchCount = await db.count(PUNCH_STORE);
  
  // 统计未同步的打卡记录（synced: false）
  const allRecords = await db.getAll(PUNCH_STORE);
  const unsyncedCount = allRecords.filter(record => !record.synced).length;
  
  return {
    totalRecords: punchCount,
    pendingSync: unsyncedCount
  };
};

export default {
  initDB,
  addPunchRecord,
  getAllPunchRecords,
  getPunchRecordsByUser,
  getUnsyncedRecords,
  updatePunchRecord,
  markRecordAsSynced,
  deletePunchRecord,
  getRecordsByDateRange,
  addToSyncQueue,
  getSyncQueue,
  removeFromSyncQueue,
  clearAllData,
  getDBStats
};
