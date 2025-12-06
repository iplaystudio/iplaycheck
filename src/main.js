import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import pinia from './store';
import './registerServiceWorker';
import { usePunchStore } from './store/punch';
import { useUserStore } from './store/user';

const app = createApp(App);

// 捕获 beforeinstallprompt 事件尽早注册，但在原生壳（Capacitor）/已安装环境不提示 PWA 安装
const isNativeCapacitor = !!(window.Capacitor &&
  (window.Capacitor.isNativePlatform?.() || ['android', 'ios'].includes(window.Capacitor.getPlatform?.())));
const isStandaloneDisplay = window.matchMedia?.('(display-mode: standalone)').matches;

if (!isNativeCapacitor && !isStandaloneDisplay) {
	window.addEventListener('beforeinstallprompt', (e) => {
		// 不在这里调用 preventDefault()，避免在页面没有及时调用 prompt() 时被浏览器报告
		// 将事件保存到全局，组件在准备好展示并响应用户交互时负责调用 e.preventDefault() 和 e.prompt()
		window.__deferredPWAInstallPrompt = e;
	});
}


app.use(pinia);
app.use(router);

app.mount('#app');

// 全局定时器：保持 punch store 的 currentTime 更新
// 这保证即使在没有挂载 PunchClock 组件时, duration 计算仍保持实时更新
try {
	const punchStore = usePunchStore();
	setInterval(() => {
		punchStore.$patch({ currentTime: new Date() });
	}, 1000);
} catch (err) {
	// 如果 store 初始化失败, 忽略
}

// 自动下班计划：每天 22:30 自动创建下班记录（如果用户尚未下班）
try {
	const punchStore = usePunchStore();
	const userStore = useUserStore();

	// 每分钟检查一次
	setInterval(async () => {
		try {
			// 仅当用户已登录时才触发
			if (!userStore.isAuthenticated) return;

			const now = new Date();
			const autoHour = 22;
			const autoMinute = 30;

			// 检查当前是否到了 22:30 的时刻
			if (now.getHours() === autoHour && now.getMinutes() === autoMinute) {
				const key = `iplaycheck_auto_out_${userStore.userId}`;
				const lastDate = localStorage.getItem(key);
				const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

				// 如果已经执行过当天自动下班则跳过
				if (lastDate === todayStr) return;

				// 如果当天最后一条记录不是 'out', 才创建自动下班
				const last = punchStore.todayRecords[punchStore.todayRecords.length - 1];
				if (!last || last.type === 'out') {
					// 设置 key, 避免重复检查
					localStorage.setItem(key, todayStr);
					return;
				}

				// 触发自动下班
				const record = await punchStore.autoPunchOut(userStore.userId);
								if (record) {
									localStorage.setItem(key, todayStr);
								}
			}
		} catch (e) {
			// 自动下班检查出错 - 调试信息已移除
		}
	}, 60 * 1000);
} catch (err) {
	// 无法启动自动下班计划器 - 调试信息已移除
}
