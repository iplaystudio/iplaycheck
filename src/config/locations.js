// 打卡位置配置
// 可以在这里添加公司的多个打卡点

export const punchLocations = {
  // 是否启用位置验证(false则允许任何位置打卡)
  enabled: false, // 改为 true 启用位置限制
  
  // 允许的打卡半径(米)
  radiusMeters: 200, // 200米范围内可以打卡
  
  // 允许的打卡位置列表
  allowedLocations: [
    {
      id: 'office-main',
      name: '公司总部',
      latitude: 39.9042, // 北京天安门示例坐标
      longitude: 116.4074,
      address: '北京市东城区',
      description: '主办公区'
    },
    {
      id: 'office-branch',
      name: '分公司',
      latitude: 31.2304, // 上海外滩示例坐标
      longitude: 121.4737,
      address: '上海市黄浦区',
      description: '分公司办公区'
    }
    // 可以继续添加更多位置...
  ]
}

// 获取当前配置
export const getPunchLocationConfig = () => {
  return {
    enabled: punchLocations.enabled,
    radiusMeters: punchLocations.radiusMeters,
    allowedLocations: punchLocations.enabled ? punchLocations.allowedLocations : []
  }
}

// 添加新的打卡位置
export const addPunchLocation = (location) => {
  if (!location.id || !location.name || !location.latitude || !location.longitude) {
    throw new Error('位置信息不完整')
  }
  punchLocations.allowedLocations.push(location)
}

// 移除打卡位置
export const removePunchLocation = (locationId) => {
  const index = punchLocations.allowedLocations.findIndex(loc => loc.id === locationId)
  if (index !== -1) {
    punchLocations.allowedLocations.splice(index, 1)
  }
}

// 更新打卡半径
export const updateRadius = (meters) => {
  punchLocations.radiusMeters = meters
}

// 启用/禁用位置验证
export const toggleLocationValidation = (enabled) => {
  punchLocations.enabled = enabled
}

export default punchLocations
