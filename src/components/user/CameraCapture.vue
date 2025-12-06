<template>
  <div class="camera-capture">
    <div class="camera-container">
      <video
        ref="videoElement"
        class="camera-video"
        autoplay
        playsinline
        :class="{ 'camera-active': isCameraActive }"
      />

      <canvas
        ref="canvasElement"
        class="camera-canvas"
        :class="{ 'show-preview': showPreview }"
      />

      <div
        v-if="capturedPhoto"
        class="photo-preview"
      >
        <img
          :src="capturedPhoto"
          alt="Captured Photo"
        >
      </div>
    </div>

    <div class="camera-controls">
      <AppleButton
        v-if="!isCameraActive"
        variant="secondary"
        size="large"
        :loading="loading"
        class="full-width-btn"
        @click="startCamera"
      >
        启动相机
      </AppleButton>

      <template v-else>
        <AppleButton
          variant="secondary"
          size="large"
          :disabled="loading"
          @click="capturePhoto"
        >
          拍照
        </AppleButton>

        <AppleButton
          v-if="hasMutipleCameras"
          variant="secondary"
          size="large"
          :disabled="loading"
          @click="switchCamera"
        >
          切换相机
        </AppleButton>

        <AppleButton
          variant="secondary"
          size="large"
          :disabled="loading"
          @click="stopCamera"
        >
          关闭
        </AppleButton>
      </template>

      <AppleButton
        v-if="capturedPhoto"
        variant="secondary"
        size="large"
        @click="retakePhoto"
      >
        重拍
      </AppleButton>

      <AppleButton
        v-if="capturedPhoto"
        variant="secondary"
        size="large"
        @click="confirmPhoto"
      >
        确认
      </AppleButton>
    </div>

    <AppleCard
      v-if="permissionDenied"
      variant="elevated"
      class="permission-guide"
    >
      <h3>需要相机权限</h3>
      <p>请在浏览器设置中允许相机访问:</p>
      <ol>
        <li>点击地址栏的锁图标或设置图标</li>
        <li>找到"相机"权限设置</li>
        <li>选择"允许"</li>
        <li>刷新页面</li>
      </ol>
    </AppleCard>

    <AppleToast
      :visible="!!error"
      type="error"
      :message="error"
      @update:visible="error = ''"
    />
  </div>
</template>

<script>
import { ref, onUnmounted } from 'vue';
import CameraService from '@/services/camera';
import AppleButton from '@/components/shared/AppleButton.vue';
import AppleCard from '@/components/shared/AppleCard.vue';
import AppleToast from '@/components/shared/AppleToast.vue';

export default {
  name: 'CameraCapture',

  components: {
    AppleButton,
    AppleCard,
    AppleToast
  },

  emits: ['photo-captured', 'photo-confirmed'],

  setup(props, { emit }) {
    const videoElement = ref(null);
    const canvasElement = ref(null);
    const cameraService = new CameraService();

    const isCameraActive = ref(false);
    const capturedPhoto = ref(null);
    const showPreview = ref(false);
    const loading = ref(false);
    const error = ref(null);
    const permissionDenied = ref(false);
    const hasMutipleCameras = ref(false);

    // 启动相机
    const startCamera = async () => {
      loading.value = true;
      error.value = null;
      permissionDenied.value = false;

      try {
        if (!CameraService.isSupported()) {
          throw new Error('您的浏览器不支持相机功能');
        }

        await cameraService.startCamera(videoElement.value);
        isCameraActive.value = true;

        // 检查是否有多个相机
        const cameras = await CameraService.getAvailableCameras();
        hasMutipleCameras.value = cameras.length > 1;
      } catch (err) {
        error.value = err.message;
        if (err.message.includes('权限被拒绝')) {
          permissionDenied.value = true;
        }
      } finally {
        loading.value = false;
      }
    };

    // 停止相机
    const stopCamera = () => {
      cameraService.stopCamera();
      isCameraActive.value = false;
    };

    // 切换相机
    const switchCamera = async () => {
      loading.value = true;
      try {
        await cameraService.switchCamera();
      } catch (err) {
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    };

    // 拍照
    const capturePhoto = () => {
      try {
        const photo = cameraService.capturePhoto(videoElement.value, {
          width: 1280,
          height: 720,
          quality: 0.92,
          addTimestamp: true
        });

        capturedPhoto.value = photo;
        showPreview.value = true;
        emit('photo-captured', photo);
      } catch (err) {
        error.value = err.message;
      }
    };

    // 重拍
    const retakePhoto = () => {
      capturedPhoto.value = null;
      showPreview.value = false;
    };

    // 确认照片
    const confirmPhoto = () => {
      emit('photo-confirmed', capturedPhoto.value);
      stopCamera();
    };

    // 组件卸载时清理
    onUnmounted(() => {
      stopCamera();
    });

    return {
      videoElement,
      canvasElement,
      isCameraActive,
      capturedPhoto,
      showPreview,
      loading,
      error,
      permissionDenied,
      hasMutipleCameras,
      startCamera,
      stopCamera,
      switchCamera,
      capturePhoto,
      retakePhoto,
      confirmPhoto
    };
  }
};
</script>

<style scoped>
.camera-capture {
  padding: 24px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.camera-container {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  max-height: min(70vh, 80vw * 1.33);
  background: var(--systemFill);
  border-radius: var(--global-border-radius-large);
  overflow: hidden;
  margin-bottom: 24px;
}

.camera-video,
.camera-canvas,
.photo-preview {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camera-video {
  opacity: 0;
  transition: opacity 0.3s var(--ease-out);
}

.camera-video.camera-active {
  opacity: 1;
}

.camera-canvas {
  opacity: 0;
  pointer-events: none;
}

.camera-canvas.show-preview {
  opacity: 1;
}

.photo-preview {
  z-index: 2;
}

.photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camera-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}

.camera-controls > * {
  flex: 1;
  min-width: 140px;
}

.full-width-btn {
  width: 100%;
  flex: 1 1 100%;
}

.permission-guide {
  padding: 24px;
}

.permission-guide h3 {
  font: var(--title-2-emphasized);
  color: var(--systemPrimary);
  margin: 0 0 12px 0;
}

.permission-guide p {
  font: var(--body);
  color: var(--systemSecondary);
  margin: 0 0 16px 0;
}

.permission-guide ol {
  font: var(--body);
  color: var(--systemPrimary);
  padding-left: 24px;
  margin: 0;
}

.permission-guide li {
  margin-bottom: 8px;
}

.permission-guide li:last-child {
  margin-bottom: 0;
}

/* 响应式 */
@media (max-width: 480px) {
  .camera-capture {
    padding: 16px;
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
  }

  .camera-controls > * {
    min-width: 120px;
  }

  .camera-controls {
    flex-direction: column;
  }

  .camera-container {
    aspect-ratio: auto;
    height: min(65vh, 100vw * 1.33);
    max-height: 70vh;
  }

  .camera-video,
  .camera-canvas,
  .photo-preview img {
    object-fit: cover;
  }
}
</style>
