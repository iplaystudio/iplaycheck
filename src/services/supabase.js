// Supabase配置和初始化
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// 创建Supabase客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// 导出认证和数据库实例以保持兼容性
export const auth = supabase.auth;
export const db = supabase;




// 公告相关功能
export const announcementsService = {
  // 获取所有活跃公告
  async getAnnouncements() {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // 获取所有公告（管理员用，包括未发布的）
  async getAllAnnouncements() {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // 订阅公告变化
  subscribeToAnnouncements(callback) {
    return supabase
      .channel('announcements')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'announcements'
      }, callback)
      .subscribe();
  },

  // 创建公告（管理员功能）
  async createAnnouncement(announcement) {
    const { data, error } = await supabase
      .from('announcements')
      .insert([announcement])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  // 更新公告
  async updateAnnouncement(id, updates) {
    const { data, error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  },

  // 删除公告
  async deleteAnnouncement(id) {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// 推送订阅管理 (使用原生Web Push API)
export const pushSubscriptionService = {
  // 保存推送订阅
  async saveSubscription(subscription) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('用户未登录');

    try {
      // 先检查是否已存在订阅
      const { data: existing, error: checkError } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (checkError) {
        // 如果是表不存在的错误，尝试直接插入
        if (checkError.code === 'PGRST116' || checkError.message?.includes('relation') || checkError.message?.includes('does not exist')) {
          // 推送订阅表不存在，尝试创建新订阅 - removed console.warn for production
          const { error: insertError } = await supabase
            .from('push_subscriptions')
            .insert({
              user_id: user.id,
              subscription: subscription,
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            throw new Error('推送订阅表不存在，请运行数据库设置脚本后重试');
          }
          return;
        }
        if (checkError.code !== 'PGRST116') throw checkError;
      }

      if (existing) {
        // 更新现有订阅
        const { error } = await supabase
          .from('push_subscriptions')
          .update({
            subscription: subscription,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // 插入新订阅
        const { error } = await supabase
          .from('push_subscriptions')
          .insert({
            user_id: user.id,
            subscription: subscription,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }
    } catch (error) {
      throw error;
    }
  },

  // 删除推送订阅
  async removeSubscription() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('用户未登录');

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
  },

  // 获取推送订阅状态
  async getSubscriptionStatus() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { hasSubscription: false };

    try {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // 如果是表不存在的错误，给出更明确的提示
        if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          // 推送订阅表不存在，请运行数据库设置脚本 - removed console.warn for production
          return { hasSubscription: false };
        }
        if (error.code !== 'PGRST116') throw error;
      }

      return {
        hasSubscription: !!data,
        subscription: data?.subscription
      };
    } catch (error) {
      // 检查推送订阅状态失败 - removed console.error for production
      return { hasSubscription: false };
    }
  },

  // 获取所有活跃用户的推送订阅
  async getAllActiveSubscriptions() {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .not('subscription', 'is', null);

    if (error) throw error;
    return data || [];
  },

  // 清理无效的推送订阅
  async cleanupInvalidSubscriptions() {
    try {
      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('id, subscription');

      if (error) throw error;

      const invalidIds = subscriptions
        .filter(sub => sub.subscription?.endpoint?.includes('permanently-removed.invalid'))
        .map(sub => sub.id);

      if (invalidIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('push_subscriptions')
          .delete()
          .in('id', invalidIds);

        if (deleteError) throw deleteError;
        console.log(`清理了 ${invalidIds.length} 个无效的推送订阅`);
      }
    } catch (error) {
      // 清理无效订阅失败 - removed console.error for production
    }
  }
};

export default supabase;