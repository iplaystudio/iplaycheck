// 打卡记录状态管理
import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import {
  addPunchRecord as addPunchRecordDB,
  getAllPunchRecords,
  getPunchRecordsByUser,
  getRecordsByDateRange,
  getUnsyncedRecords,
  getDBStats
} from '@/services/indexedDB';
import CameraService from '@/services/camera';
import syncService from '@/services/sync';

export const usePunchStore = defineStore('punch', {
  state: () => ({
    records: [],
    currentRecord: null,
    todayRecords: [],
    loading: false,
    error: null,
    currentTime: new Date(), // 添加当前时间状态
    stats: {
      totalRecords: 0,
      pendingSync: 0
    },
    isWorking: false, // 是否正在工作
    isOnBreak: false, // 是否在休息
    lastPunchType: null
  }),

  getters: {
    // 获取今日记录
    getTodayRecords: (state) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return state.records.filter(record => {
        const recordDate = new Date(record.timestamp);
        recordDate.setHours(0, 0, 0, 0);
        return recordDate.getTime() === today.getTime();
      });
    },

    // 计算今日工作时长
    todayWorkDuration: (state) => {
      const todayRecords = [...state.todayRecords].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );

      let totalMinutes = 0;
      let punchInTime = null;
      let breakStartTime = null;
      let tempBreakTotal = 0; // 临时累计休息时间

      for (const record of todayRecords) {
        switch (record.type) {
          case 'in':
            punchInTime = new Date(record.timestamp);
            tempBreakTotal = 0; // 重置临时休息时间
            break;
          case 'out':
            if (punchInTime) {
              const duration = new Date(record.timestamp) - punchInTime;
              totalMinutes += Math.floor(duration / 60000) - tempBreakTotal;
              punchInTime = null;
              tempBreakTotal = 0;
            }
            break;
          case 'break_start':
            breakStartTime = new Date(record.timestamp);
            break;
          case 'break_end':
            if (breakStartTime) {
              const breakDuration = new Date(record.timestamp) - breakStartTime;
              tempBreakTotal += Math.floor(breakDuration / 60000);
              breakStartTime = null;
            }
            break;
        }
      }

      // 如果还在工作中,计算到当前时间
      if (punchInTime && !state.isOnBreak) {
        const now = state.currentTime;
        const duration = now - punchInTime;
        totalMinutes += Math.floor(duration / 60000) - tempBreakTotal;
      }

      // 如果正在休息,减去当前休息时间
      if (punchInTime && state.isOnBreak && breakStartTime) {
        const now = state.currentTime;
        const duration = now - punchInTime;
        const currentBreakDuration = Math.floor((now - breakStartTime) / 60000);
        totalMinutes += Math.floor(duration / 60000) - tempBreakTotal - currentBreakDuration;
      }

      return Math.max(0, totalMinutes);
    },

    // 计算今日休息时长
    todayBreakDuration: (state) => {
      const todayRecords = state.todayRecords.sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );

      let totalMinutes = 0;
      let breakStartTime = null;

      for (const record of todayRecords) {
        if (record.type === 'break_start') {
          breakStartTime = new Date(record.timestamp);
        } else if (record.type === 'break_end' && breakStartTime) {
          const duration = new Date(record.timestamp) - breakStartTime;
          totalMinutes += Math.floor(duration / 60000);
          breakStartTime = null;
        }
      }

      // 如果还在休息中,计算到当前时间
      if (breakStartTime && state.isOnBreak) {
        const duration = new Date() - breakStartTime;
        totalMinutes += Math.floor(duration / 60000);
      }

      return totalMinutes;
    },

    // 获取工作状态
    workStatus: (state) => {
      if (state.isOnBreak) return 'break';
      if (state.isWorking) return 'working';
      return 'idle';
    }
  },

  actions: {
    // 加载所有记录
    async loadRecords(userId = null) {
      this.loading = true;
      this.error = null;

      try {
        let records = [];
        if (userId) {
          records = await getPunchRecordsByUser(userId);
        } else {
          records = await getAllPunchRecords();
        }

        // 去重：根据 timestamp + type 组合去重
        // 因为同一时刻同一类型的打卡应该只有一条
        const uniqueRecords = [];
        const seen = new Set();
        
        for (const record of records) {
          const key = `${record.timestamp}_${record.type}_${record.userId || ''}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueRecords.push(record);
          }
        }
        
        this.records = uniqueRecords;

        // 更新今日记录
        this.updateTodayRecords();

        // 更新工作状态
        this.updateWorkStatus();

        // 加载统计信息
        await this.loadStats();
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    // 更新今日记录
    updateTodayRecords() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      this.todayRecords = this.records.filter(record => {
        const recordDate = new Date(record.timestamp);
        recordDate.setHours(0, 0, 0, 0);
        return recordDate.getTime() === today.getTime();
      }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },

    // 更新工作状态
    updateWorkStatus() {
      if (this.todayRecords.length === 0) {
        this.isWorking = false;
        this.isOnBreak = false;
        this.lastPunchType = null;
        return;
      }

      const lastRecord = this.todayRecords[this.todayRecords.length - 1];
      this.lastPunchType = lastRecord.type;

      switch (lastRecord.type) {
        case 'in':
          this.isWorking = true;
          this.isOnBreak = false;
          break;
        case 'out':
          this.isWorking = false;
          this.isOnBreak = false;
          break;
        case 'break_start':
          this.isWorking = true;
          this.isOnBreak = true;
          break;
        case 'break_end':
          this.isWorking = true;
          this.isOnBreak = false;
          break;
      }
    },

    // 创建打卡记录
    async createPunchRecord(type, userId, options = {}) {
      this.loading = true;
      this.error = null;

      try {
        // 验证打卡类型
        this.validatePunchType(type);

        // 拍照(如果需要)
        let photo = null;
        if (options.requirePhoto !== false) {
          photo = options.photo;
          
          // 压缩照片
          if (photo) {
            photo = await CameraService.compressImage(photo, 500);
          }
        }

        // 创建记录
        const record = {
          id: uuidv4(),
          userId,
          timestamp: new Date().toISOString(),
          type,
          photo,
          autoTriggered: options.autoTriggered || false,
          synced: false,
          createdAt: new Date().toISOString()
        };

        // 保存到IndexedDB
        await addPunchRecordDB(record);

        // 添加到本地记录
        this.records.push(record);
        this.updateTodayRecords();
        this.updateWorkStatus();

        // 触发同步
        syncService.syncData();

        this.currentRecord = record;
        return record;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 验证打卡类型
    validatePunchType(type) {
      const validTransitions = {
        null: ['in'],
        'in': ['out', 'break_start'],
        'out': ['in'],
        'break_start': ['break_end'],
        'break_end': ['out', 'break_start']
      };

      const allowedTypes = validTransitions[this.lastPunchType];

      if (!allowedTypes || !allowedTypes.includes(type)) {
        const typeNames = {
          'in': '上班',
          'out': '下班',
          'break_start': '开始休息',
          'break_end': '结束休息'
        };

        throw new Error(`当前状态不允许${typeNames[type]}操作`);
      }
    },

    // 打卡上班
    async punchIn(userId, options) {
      return await this.createPunchRecord('in', userId, options);
    },

    // 打卡下班
    async punchOut(userId, options) {
      return await this.createPunchRecord('out', userId, options);
    },

    // 开始休息
    async startBreak(userId, options) {
      return await this.createPunchRecord('break_start', userId, options);
    },

    // 结束休息
    async endBreak(userId, options) {
      return await this.createPunchRecord('break_end', userId, options);
    },

    // 加载统计信息
    async loadStats() {
      try {
        this.stats = await getDBStats();
      } catch (error) {
      }
    },

    // 按日期范围加载记录
    async loadRecordsByDateRange(startDate, endDate) {
      this.loading = true;
      try {
        this.records = await getRecordsByDateRange(startDate, endDate);
        return this.records;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 获取未同步记录数
    async getUnsyncedCount() {
      try {
        const records = await getUnsyncedRecords();
        return records.length;
      } catch (error) {
        return 0;
      }
    },

    // 清除错误
    clearError() {
      this.error = null;
    }
  }
});
