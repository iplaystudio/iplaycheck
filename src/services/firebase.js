// Firebase配置和初始化 (Spark Plan - 不使用Storage)
import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 初始化Firebase
const app = initializeApp(firebaseConfig);

// 初始化服务 (不使用Storage - 使用ImgBB代替)
export const db = getFirestore(app);
export const auth = getAuth(app);
let messaging = null;

// 启用离线持久化
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('The current browser does not support persistence.');
  }
});

// 初始化消息服务(仅在支持的浏览器中)
export const initMessaging = async () => {
  try {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      messaging = getMessaging(app);
      return messaging;
    }
  } catch (error) {
    console.error('Messaging initialization error:', error);
  }
  return null;
};

// 请求通知权限并获取FCM token
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const msg = await initMessaging();
      if (msg) {
        const token = await getToken(msg, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
        });
        console.log('FCM Token:', token);
        return token;
      }
    }
  } catch (error) {
    console.error('Notification permission error:', error);
  }
  return null;
};

// 监听前台消息
export const onForegroundMessage = (callback) => {
  if (messaging) {
    return onMessage(messaging, callback);
  }
};

export default app;
