<template>
  <div class="data-analytics">
    <div class="analytics-header">
      <h2>数据分析</h2>
      <button
        class="refresh-btn"
        :disabled="loading"
        @click="loadAnalytics"
      >
        <span v-if="!loading">🔄</span>
        <span
          v-else
          class="spinner"
        >⏳</span>
        刷新数据
      </button>
    </div>

    <div class="analytics-grid">
      <!-- 今日统计 -->
      <div class="stat-card">
        <div
          class="card-icon"
          style="background: linear-gradient(135deg, #007aff 0%, #0051d5 100%);"
        >
          📊
        </div>
        <div class="card-content">
          <h3>今日统计</h3>
          <div class="stat-items">
            <div class="stat-item">
              <span class="label">上班打卡人数</span>
              <span class="value">{{ todayStats.uniqueUsers }}</span>
            </div>
            <div class="stat-item">
              <span class="label">平均工作时长</span>
              <span class="value">{{ todayStats.avgWorkHours }}<small>小时</small></span>
            </div>
            <div class="stat-item">
              <span class="label">总工作时长</span>
              <span class="value">{{ todayStats.totalWorkHours }}<small>小时</small></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 本周统计 -->
      <div class="stat-card">
        <div
          class="card-icon"
          style="background: linear-gradient(135deg, #34c759 0%, #30b350 100%);"
        >
          📈
        </div>
        <div class="card-content">
          <h3>本周统计</h3>
          <div class="stat-items">
            <div class="stat-item">
              <span class="label">活跃用户</span>
              <span class="value">{{ weekStats.activeUsers }}</span>
            </div>
            <div class="stat-item">
              <span class="label">总工作时长</span>
              <span class="value">{{ weekStats.totalHours }}<small>小时</small></span>
            </div>
            <div class="stat-item">
              <span class="label">打卡率</span>
              <span class="value">{{ weekStats.attendanceRate }}<small>%</small></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 用户工作时长排行 -->
      <div class="chart-card full-width">
        <h3>今日用户工作时长</h3>
        <div class="user-work-hours">
          <div
            v-for="(user, index) in userWorkHours"
            :key="user.id"
            class="user-item"
          >
            <div
              class="user-rank"
              :class="'rank-' + (index + 1)"
            >
              {{ index + 1 }}
            </div>
            <div class="user-info">
              <span class="user-name">{{ user.name }}</span>
              <div class="work-time-bar">
                <div
                  class="work-time-fill" 
                  :style="{ 
                    width: (user.hours / 12 * 100) + '%',
                    background: getWorkHoursColor(user.hours)
                  }"
                />
              </div>
            </div>
            <div class="user-hours">
              <span class="hours-value">{{ user.hours }}</span>
              <span class="hours-unit">小时</span>
            </div>
          </div>
          <div
            v-if="userWorkHours.length === 0"
            class="empty-state"
          >
            <span>今日暂无打卡记录</span>
          </div>
        </div>
      </div>

      <!-- 打卡类型分布 -->
      <div class="chart-card full-width">
        <h3>本周打卡类型分布</h3>
        <div class="type-distribution">
          <div
            v-for="item in typeDistribution"
            :key="item.type"
            class="type-item"
          >
            <div class="type-header">
              <span class="type-label">{{ item.label }}</span>
              <span class="type-count">{{ item.count }} 次</span>
            </div>
            <div class="progress-bar">
              <div
                class="progress-fill" 
                :style="{ 
                  width: item.percentage + '%',
                  background: item.color 
                }"
              >
                <span class="percentage">{{ item.percentage }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 工作时长趋势 -->
      <div class="chart-card full-width">
        <h3>过去7天工作时长</h3>
        <div class="trend-chart">
          <div class="chart-bars">
            <div
              v-for="day in weeklyTrend"
              :key="day.date"
              class="chart-bar"
            >
              <div
                class="bar-fill"
                :style="{ height: (day.hours / 12 * 100) + '%' }"
              >
                <span class="bar-label">{{ day.hours }}h</span>
              </div>
            </div>
          </div>
          <div class="chart-labels">
            <span
              v-for="day in weeklyTrend"
              :key="day.date"
              class="day-label"
            >
              {{ day.label }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { supabase } from '@/services/supabase';

const loading = ref(false);
const usersMap = ref(new Map()); // 用户映射表
let updateInterval = null; // 实时更新定时器

const todayStats = reactive({
  uniqueUsers: 0,
  avgWorkHours: 0,
  totalWorkHours: 0
});

const weekStats = reactive({
  activeUsers: 0,
  totalHours: 0,
  attendanceRate: 0
});

const typeDistribution = ref([]);
const weeklyTrend = ref([]);
const userWorkHours = ref([]);

const getWorkHoursColor = (hours) => {
  if (hours >= 8) return 'linear-gradient(90deg, #34c759 0%, #30b350 100%)'; // 绿色 - 正常
  if (hours >= 6) return 'linear-gradient(90deg, #007aff 0%, #0051d5 100%)'; // 蓝色 - 接近正常
  if (hours >= 4) return 'linear-gradient(90deg, #ff9500 0%, #ff6b00 100%)'; // 橙色 - 偏少
  return 'linear-gradient(90deg, #ff3b30 0%, #d62828 100%)'; // 红色 - 很少
};

// 加载用户数据
const loadUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error) throw error;

    const map = new Map();
    data.forEach(user => {
      map.set(user.id, user);
    });
    usersMap.value = map;
  } catch (error) {
    console.error('Load users error:', error);
  }
};

// 获取用户昵称
const getUserName = (userId) => {
  const user = usersMap.value.get(userId);
  return user.name;
};

const loadAnalytics = async () => {
  if (loading.value) return;
  loading.value = true;
  
  try {
    // 获取今日记录
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayRecords, error: todayError } = await supabase
      .from('punch_records')
      .select('*')
      .gte('timestamp', today.toISOString());

    if (todayError) throw todayError;
    
    // 只统计上班打卡的人数（去重）
    const punchInRecords = todayRecords.filter(r => r.type === 'in');
    const uniqueUsersSet = new Set(punchInRecords.map(r => r.user_id));
    
    todayStats.uniqueUsers = uniqueUsersSet.size;
    
    // 计算今日工作时长相关数据
    const workHoursData = calculateWorkHoursData(todayRecords);
    todayStats.avgWorkHours = workHoursData.avgHours;
    todayStats.totalWorkHours = workHoursData.totalHours;

    // 计算今日各用户工作时长
    userWorkHours.value = calculateUserWorkHours(todayRecords);

    // 获取本周记录
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const { data: weekRecords, error: weekError } = await supabase
      .from('punch_records')
      .select('*')
      .gte('timestamp', weekAgo.toISOString());

    if (weekError) throw weekError;

    const activeUsersSet = new Set(weekRecords.map(r => r.user_id));
    weekStats.activeUsers = activeUsersSet.size;
    weekStats.totalHours = calculateTotalHours(weekRecords);
    weekStats.attendanceRate = calculateAttendanceRate(weekRecords, activeUsersSet.size);

    // 打卡类型分布
    const typeCounts = {};
    weekRecords.forEach(record => {
      typeCounts[record.type] = (typeCounts[record.type] || 0) + 1;
    });

    const total = weekRecords.length || 1;
    typeDistribution.value = [
      { 
        type: 'in', 
        label: '上班打卡', 
        count: typeCounts['in'] || 0, 
        percentage: ((typeCounts['in'] || 0) / total * 100).toFixed(1),
        color: 'linear-gradient(90deg, #007aff 0%, #0051d5 100%)'
      },
      { 
        type: 'out', 
        label: '下班打卡', 
        count: typeCounts['out'] || 0, 
        percentage: ((typeCounts['out'] || 0) / total * 100).toFixed(1),
        color: 'linear-gradient(90deg, #34c759 0%, #30b350 100%)'
      },
      { 
        type: 'break_start', 
        label: '开始休息', 
        count: typeCounts['break_start'] || 0, 
        percentage: ((typeCounts['break_start'] || 0) / total * 100).toFixed(1),
        color: 'linear-gradient(90deg, #ff9500 0%, #ff6b00 100%)'
      },
      { 
        type: 'break_end', 
        label: '结束休息', 
        count: typeCounts['break_end'] || 0, 
        percentage: ((typeCounts['break_end'] || 0) / total * 100).toFixed(1),
        color: 'linear-gradient(90deg, #5856d6 0%, #4840ba 100%)'
      }
    ];

    // 每日趋势
    weeklyTrend.value = generateWeeklyTrend(weekRecords);
  } catch (error) {
    console.error('Load analytics error:', error);
  } finally {
    loading.value = false;
  }
};

const calculateWorkHoursData = (records) => {
  if (records.length === 0) return { avgHours: 0, totalHours: 0 };
  
  // 计算实际工作时长（扣除休息时间）
  const userWorkHours = {};
  records.forEach(record => {
    if (!userWorkHours[record.user_id]) {
      userWorkHours[record.user_id] = { 
        in: null, 
        breakStart: null,
        breakTotal: 0,
        total: 0 
      };
    }
    
    const userData = userWorkHours[record.user_id];
    
    if (record.type === 'in') {
      userData.in = new Date(record.timestamp);
      userData.breakTotal = 0; // 重置休息时间
    } else if (record.type === 'break_start') {
      userData.breakStart = new Date(record.timestamp);
    } else if (record.type === 'break_end' && userData.breakStart) {
      const breakDuration = (new Date(record.timestamp) - userData.breakStart) / (1000 * 60 * 60);
      userData.breakTotal += breakDuration;
      userData.breakStart = null;
    } else if (record.type === 'out' && userData.in) {
      const workDuration = (new Date(record.timestamp) - userData.in) / (1000 * 60 * 60);
      userData.total += Math.max(0, workDuration - userData.breakTotal); // 扣除休息时间
      userData.in = null;
      userData.breakTotal = 0;
    }
  });
  
  const totalHours = Object.values(userWorkHours).reduce((sum, user) => sum + user.total, 0);
  const uniqueUsers = Object.keys(userWorkHours).length;
  
  return {
    avgHours: uniqueUsers > 0 ? (totalHours / uniqueUsers).toFixed(1) : 0,
    totalHours: totalHours.toFixed(1)
  };
};

const calculateUserWorkHours = (records) => {
  const userWorkData = {};
  
  // 计算每个用户的工作时长（扣除休息时间）
  records.forEach(record => {
    if (!userWorkData[record.user_id]) {
      userWorkData[record.user_id] = { 
        user_id: record.user_id,
        in: null, 
        breakStart: null,
        breakTotal: 0,
        total: 0 
      };
    }
    
    const userData = userWorkData[record.user_id];
    
    if (record.type === 'in') {
      userData.in = new Date(record.timestamp);
      userData.breakTotal = 0; // 重置休息时间
    } else if (record.type === 'break_start') {
      userData.breakStart = new Date(record.timestamp);
    } else if (record.type === 'break_end' && userData.breakStart) {
      const breakDuration = (new Date(record.timestamp) - userData.breakStart) / (1000 * 60 * 60);
      userData.breakTotal += breakDuration;
      userData.breakStart = null;
    } else if (record.type === 'out' && userData.in) {
      const workDuration = (new Date(record.timestamp) - userData.in) / (1000 * 60 * 60);
      userData.total += Math.max(0, workDuration - userData.breakTotal); // 扣除休息时间
      userData.in = null;
      userData.breakTotal = 0;
    }
  });
  
  // 处理当前正在工作的用户（没有对应的 out 记录）
  const now = new Date();
  Object.values(userWorkData).forEach(userData => {
    if (userData.in && !userData.breakStart) {
      // 用户正在工作
      const workDuration = (now - userData.in) / (1000 * 60 * 60);
      userData.total += Math.max(0, workDuration - userData.breakTotal);
    } else if (userData.in && userData.breakStart) {
      // 用户正在休息
      const workDuration = (userData.breakStart - userData.in) / (1000 * 60 * 60);
      const breakDuration = (now - userData.breakStart) / (1000 * 60 * 60);
      userData.total += Math.max(0, workDuration - userData.breakTotal - breakDuration);
    }
  });
  
  // 转换为数组并排序（工作时长从高到低），同时添加用户信息
  return Object.values(userWorkData)
    .map(user => {
      const userInfo = usersMap.value.get(user.user_id);
      return {
        id: user.user_id,
        name: userInfo ? userInfo.name : '未知用户',
        email: userInfo ? userInfo.email : '',
        hours: user.total.toFixed(1)
      };
    })
    .sort((a, b) => parseFloat(b.hours) - parseFloat(a.hours));
};

const calculateTotalHours = (records) => {
  const userWorkHours = {};
  records.forEach(record => {
    if (!userWorkHours[record.user_id]) {
      userWorkHours[record.user_id] = { 
        in: null, 
        breakStart: null,
        breakTotal: 0,
        total: 0 
      };
    }
    
    const userData = userWorkHours[record.user_id];
    
    if (record.type === 'in') {
      userData.in = new Date(record.timestamp);
      userData.breakTotal = 0;
    } else if (record.type === 'break_start') {
      userData.breakStart = new Date(record.timestamp);
    } else if (record.type === 'break_end' && userData.breakStart) {
      const breakDuration = (new Date(record.timestamp) - userData.breakStart) / (1000 * 60 * 60);
      userData.breakTotal += breakDuration;
      userData.breakStart = null;
    } else if (record.type === 'out' && userData.in) {
      const workDuration = (new Date(record.timestamp) - userData.in) / (1000 * 60 * 60);
      userData.total += Math.max(0, workDuration - userData.breakTotal);
      userData.in = null;
      userData.breakTotal = 0;
    }
  });
  
  const totalHours = Object.values(userWorkHours).reduce((sum, user) => sum + user.total, 0);
  return totalHours.toFixed(0);
};

const calculateAttendanceRate = (records, activeUsers) => {
  if (activeUsers === 0) return 0;
  
  // 简化计算：假设总用户数为活跃用户数的1.2倍
  const totalUsers = Math.ceil(activeUsers * 1.2);
  return ((activeUsers / totalUsers) * 100).toFixed(1);
};

const generateWeeklyTrend = (records) => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const dayRecords = records.filter(r => {
      const recordDate = new Date(r.timestamp);
      return recordDate >= date && recordDate < nextDay;
    });

    // 计算当天的总工作时长（扣除休息时间）
    const userWorkHours = {};
    dayRecords.forEach(record => {
      if (!userWorkHours[record.user_id]) {
        userWorkHours[record.user_id] = { 
          in: null, 
          breakStart: null,
          breakTotal: 0,
          total: 0 
        };
      }
      
      const userData = userWorkHours[record.user_id];
      
      if (record.type === 'in') {
        userData.in = new Date(record.timestamp);
        userData.breakTotal = 0;
      } else if (record.type === 'break_start') {
        userData.breakStart = new Date(record.timestamp);
      } else if (record.type === 'break_end' && userData.breakStart) {
        const breakDuration = (new Date(record.timestamp) - userData.breakStart) / (1000 * 60 * 60);
        userData.breakTotal += breakDuration;
        userData.breakStart = null;
      } else if (record.type === 'out' && userData.in) {
        const workDuration = (new Date(record.timestamp) - userData.in) / (1000 * 60 * 60);
        userData.total += Math.max(0, workDuration - userData.breakTotal);
        userData.in = null;
        userData.breakTotal = 0;
      }
    });
    
    const totalHours = Object.values(userWorkHours).reduce((sum, user) => sum + user.total, 0);

    days.push({
      date: date.toISOString(),
      label: date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
      hours: Math.min(parseFloat(totalHours.toFixed(1)), 12)
    });
  }
  return days;
};

onMounted(async () => {
  await loadUsers();
  await loadAnalytics();
  
  // 启动实时更新，每30秒更新一次工作时长数据
  updateInterval = setInterval(async () => {
    try {
      await loadAnalytics();
    } catch (error) {
      console.error('Failed to update analytics:', error);
    }
  }, 30000); // 30秒更新一次
});

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});
</script>

<style scoped>
.data-analytics {
  width: 100%;
  padding: 0;
}

.analytics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.analytics-header h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #1d1d1f;
  letter-spacing: -0.5px;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(180deg, #007aff 0%, #0051d5 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
}

.refresh-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.4);
}

.refresh-btn:active:not(:disabled) {
  transform: translateY(0);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
}

/* 统计卡片 */
.stat-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: saturate(180%) blur(20px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04),
              0 8px 24px rgba(0, 0, 0, 0.06);
  display: flex;
  gap: 16px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08),
              0 12px 32px rgba(0, 0, 0, 0.1);
}

.card-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card-content {
  flex: 1;
}

.card-content h3 {
  margin: 0 0 16px 0;
  font-size: 17px;
  font-weight: 600;
  color: #1d1d1f;
  letter-spacing: -0.3px;
}

.stat-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.stat-item .label {
  font-size: 14px;
  color: #86868b;
  font-weight: 500;
}

.stat-item .value {
  font-size: 24px;
  font-weight: 700;
  color: #1d1d1f;
  letter-spacing: -0.5px;
}

.stat-item .value small {
  font-size: 14px;
  font-weight: 500;
  color: #86868b;
  margin-left: 4px;
}

/* 图表卡片 */
.chart-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: saturate(180%) blur(20px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04),
              0 8px 24px rgba(0, 0, 0, 0.06);
}

.chart-card.full-width {
  grid-column: 1 / -1;
}

.chart-card h3 {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 700;
  color: #1d1d1f;
  letter-spacing: -0.4px;
}

/* 用户工作时长 */
.user-work-hours {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.user-item:hover {
  background: rgba(0, 0, 0, 0.04);
  transform: translateX(4px);
}

.user-rank {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, #86868b 0%, #6c6c70 100%);
  flex-shrink: 0;
}

.user-rank.rank-1 {
  background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
}

.user-rank.rank-2 {
  background: linear-gradient(135deg, #c0c0c0 0%, #a8a8a8 100%);
  box-shadow: 0 4px 12px rgba(192, 192, 192, 0.4);
}

.user-rank.rank-3 {
  background: linear-gradient(135deg, #cd7f32 0%, #b86f28 100%);
  box-shadow: 0 4px 12px rgba(205, 127, 50, 0.4);
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.user-name {
  font-size: 15px;
  font-weight: 600;
  color: #1d1d1f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.work-time-bar {
  height: 24px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.work-time-fill {
  height: 100%;
  border-radius: 12px;
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.user-hours {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.hours-value {
  font-size: 24px;
  font-weight: 700;
  color: #1d1d1f;
  line-height: 1;
}

.hours-unit {
  font-size: 12px;
  color: #86868b;
  font-weight: 500;
}

.empty-state {
  padding: 48px 24px;
  text-align: center;
  color: #86868b;
  font-size: 15px;
}

/* 类型分布 */
.type-distribution {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.type-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.type-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.type-label {
  font-size: 15px;
  font-weight: 600;
  color: #1d1d1f;
}

.type-count {
  font-size: 14px;
  color: #86868b;
  font-weight: 500;
}

.progress-bar {
  height: 32px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 16px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 16px;
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
}

.percentage {
  color: white;
  font-size: 13px;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* 趋势图表 */
.trend-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 240px;
  padding: 20px 8px 0;
  gap: 8px;
  background: linear-gradient(to top, 
    rgba(0, 122, 255, 0.03) 0%,
    rgba(0, 122, 255, 0) 100%);
  border-radius: 12px;
}

.chart-bar {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  min-width: 0;
}

.bar-fill {
  width: 100%;
  max-width: 48px;
  background: linear-gradient(180deg, #007aff 0%, #0051d5 100%);
  border-radius: 8px 8px 4px 4px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 8px;
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  min-height: 40px;
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
}

.bar-fill:hover {
  transform: scaleY(1.05);
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.4);
}

.bar-label {
  color: white;
  font-size: 12px;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.chart-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 8px;
}

.day-label {
  flex: 1;
  text-align: center;
  font-size: 13px;
  color: #86868b;
  font-weight: 500;
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .analytics-header h2 {
    color: rgba(255, 255, 255, 0.92);
  }

  .stat-card,
  .chart-card {
    background: rgba(28, 28, 30, 0.8);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .card-content h3,
  .chart-card h3,
  .type-label,
  .stat-item .value,
  .user-name,
  .hours-value {
    color: rgba(255, 255, 255, 0.92);
  }

  .stat-item .label,
  .type-count,
  .stat-item .value small,
  .day-label,
  .hours-unit,
  .empty-state {
    color: rgba(255, 255, 255, 0.6);
  }

  .progress-bar,
  .work-time-bar {
    background: rgba(255, 255, 255, 0.08);
  }

  .user-item {
    background: rgba(255, 255, 255, 0.04);
  }

  .user-item:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .chart-bars {
    background: linear-gradient(to top, 
      rgba(0, 122, 255, 0.08) 0%,
      rgba(0, 122, 255, 0) 100%);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .analytics-grid {
    grid-template-columns: 1fr;
  }

  .analytics-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .analytics-header h2 {
    font-size: 24px;
  }

  .refresh-btn {
    justify-content: center;
  }

  .chart-bars {
    height: 180px;
  }

  .bar-fill {
    max-width: 32px;
  }
}

/* 动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stat-card,
.chart-card {
  animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

.stat-card:nth-child(1) { animation-delay: 0.1s; }
.stat-card:nth-child(2) { animation-delay: 0.2s; }
.chart-card:nth-child(3) { animation-delay: 0.3s; }
.chart-card:nth-child(4) { animation-delay: 0.4s; }
</style>
