// 用户状态管理
import { defineStore } from 'pinia';
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    profile: null,
    isAuthenticated: false,
    isAdmin: false,
    loading: false,
    error: null
  }),

  getters: {
    userId: (state) => state.user?.uid || null,
    userEmail: (state) => state.user?.email || null,
    userName: (state) => state.profile?.name || state.user?.email || 'Unknown',
    userRole: (state) => state.profile?.role || 'user'
  },

  actions: {
    // 初始化认证监听
    initAuth() {
      return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
          if (user) {
            this.user = user;
            this.isAuthenticated = true;
            await this.loadUserProfile(user.uid);
            resolve(user);
          } else {
            this.user = null;
            this.profile = null;
            this.isAuthenticated = false;
            this.isAdmin = false;
            resolve(null);
          }
        });
      });
    },

    // 加载用户资料
    async loadUserProfile(userId) {
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          this.profile = docSnap.data();
          this.isAdmin = this.profile.role === 'admin';
        } else {
          // 创建默认用户资料
          this.profile = {
            name: this.user.email,
            role: 'user',
            createdAt: new Date().toISOString()
          };
          await setDoc(docRef, this.profile);
        }
      } catch (error) {
        console.error('Load profile error:', error);
        this.error = error.message;
      }
    },

    // 登录
    async login(email, password) {
      this.loading = true;
      this.error = null;

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // 等待认证状态同步
        return new Promise((resolve, reject) => {
          const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe(); // 只监听一次
            
            if (user) {
              this.user = user;
              this.isAuthenticated = true;
              await this.loadUserProfile(user.uid);
              resolve(user);
            } else {
              reject(new Error('认证状态同步失败'));
            }
          });
        });
      } catch (error) {
        console.error('Login error:', error);
        this.error = this.getErrorMessage(error.code);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 注册
    async register(email, password, name) {
      this.loading = true;
      this.error = null;

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;

        // 创建用户资料
        await setDoc(doc(db, 'users', userId), {
          name: name || email,
          email,
          role: 'user',
          createdAt: new Date().toISOString()
        });

        // 等待认证状态同步
        return new Promise((resolve, reject) => {
          const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe(); // 只监听一次
            
            if (user) {
              this.user = user;
              this.isAuthenticated = true;
              await this.loadUserProfile(user.uid);
              resolve(user);
            } else {
              reject(new Error('认证状态同步失败'));
            }
          });
        });
      } catch (error) {
        console.error('Register error:', error);
        this.error = this.getErrorMessage(error.code);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 登出
    async logout() {
      try {
        await signOut(auth);
        this.user = null;
        this.profile = null;
        this.isAuthenticated = false;
        this.isAdmin = false;
      } catch (error) {
        console.error('Logout error:', error);
        this.error = error.message;
      }
    },

    // 更新用户资料
    async updateProfile(updates) {
      if (!this.userId) return;

      try {
        const docRef = doc(db, 'users', this.userId);
        await setDoc(docRef, updates, { merge: true });
        this.profile = { ...this.profile, ...updates };
      } catch (error) {
        console.error('Update profile error:', error);
        this.error = error.message;
        throw error;
      }
    },

    // 获取错误信息
    getErrorMessage(errorCode) {
      const errorMessages = {
        'auth/invalid-email': '邮箱格式无效',
        'auth/user-disabled': '该账号已被禁用',
        'auth/user-not-found': '用户不存在',
        'auth/wrong-password': '密码错误',
        'auth/email-already-in-use': '该邮箱已被注册',
        'auth/weak-password': '密码强度太弱',
        'auth/network-request-failed': '网络连接失败',
        'auth/too-many-requests': '请求次数过多,请稍后再试'
      };

      return errorMessages[errorCode] || '认证错误,请重试';
    }
  }
});
