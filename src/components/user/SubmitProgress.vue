<template>
  <div class="submit-progress">
    <AppleCard class="submit-card">
      <div class="card-header">
        <div class="header-text">
          <h3>提交进度</h3>
          <p>记录你的工作进展，支持文字或图片</p>
        </div>
      </div>

      <div class="form-section">
        <div class="form-group">
          <label>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
              <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2"/>
              <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2"/>
              <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2"/>
            </svg>
            文字内容
            <span class="optional">可选</span>
          </label>
          <textarea 
            v-model="text" 
            placeholder="描述你的进度或工作内容..." 
            rows="5"
            class="text-input"
          ></textarea>
          <div class="char-count">{{ text.length }} 字</div>
        </div>

        <div class="form-group">
          <label>
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
              <polyline points="21 15 16 10 5 21" stroke="currentColor" stroke-width="2"/>
            </svg>
            图片附件
            <span class="optional">可选</span>
          </label>
          
          <div v-if="!preview" class="upload-area" @click="triggerFileInput" @dragover.prevent @drop.prevent="onDrop">
            <input 
              ref="fileInput"
              type="file" 
              accept="image/*" 
              @change="onFileChange" 
              class="file-input-hidden"
            />
            <div class="upload-content">
              <p class="upload-text">点击或拖拽图片到此处上传</p>
              <p class="upload-hint">支持 JPG、PNG 等格式，最大 32MB</p>
            </div>
          </div>

          <div v-else class="preview">
            <div class="preview-image">
              <img :src="preview" alt="preview" />
              <button class="remove-btn" @click="clearImage">
                <svg viewBox="0 0 24 24" fill="none">
                  <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
            <p class="preview-hint">点击右上角移除图片</p>
          </div>
        </div>
      </div>

      <div class="actions">
        <AppleButton variant="secondary" size="large" @click="clearAll">重置</AppleButton>
        <AppleButton variant="primary" size="large" :loading="submitting" @click="submit">提交进度</AppleButton>
      </div>

      <AppleToast :visible="!!error" type="error" :message="error" @update:visible="error = ''" />
      <AppleToast :visible="success" type="success" message="提交成功！" @update:visible="success = false" />
    </AppleCard>
  </div>
</template>

<script>
import { ref } from 'vue';
import AppleCard from '@/components/shared/AppleCard.vue';
import AppleButton from '@/components/shared/AppleButton.vue';
import AppleToast from '@/components/shared/AppleToast.vue';
import { uploadBlobToImgBB, validateImageSize, compressImage } from '@/services/imgbb';
import { supabase } from '@/services/supabase';
import { useUserStore } from '@/store/user';

export default {
  name: 'SubmitProgress',
  components: { AppleCard, AppleButton, AppleToast },
  setup() {
    const text = ref('');
    const file = ref(null);
    const preview = ref(null);
    const submitting = ref(false);
    const error = ref('');
    const success = ref(false);
    const fileInput = ref(null);

    const userStore = useUserStore();

    const triggerFileInput = () => {
      fileInput.value?.click();
    };

    const onDrop = (e) => {
      const f = e.dataTransfer?.files?.[0];
      if (f && f.type.startsWith('image/')) {
        if (!validateImageSize(f, 32)) {
          error.value = '图片超过大小限制（32MB）';
          return;
        }
        file.value = f;
        preview.value = URL.createObjectURL(f);
      }
    };

    const onFileChange = (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;

      if (!validateImageSize(f, 32)) {
        error.value = '图片超过大小限制（32MB）';
        return;
      }

      file.value = f;
      preview.value = URL.createObjectURL(f);
    };

    const clearImage = () => {
      file.value = null;
      preview.value = null;
    };

    const clearAll = () => {
      text.value = '';
      clearImage();
    };

    const submit = async () => {
      error.value = '';
      submitting.value = true;

      try {
        if (!text.value && !file.value) {
          throw new Error('请填写文字或选择图片后再提交');
        }

        let imageUrl = null;

        if (file.value) {
          // 优先压缩为base64再上传以控制体积
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('读取图片失败'));
            reader.readAsDataURL(file.value);
          });

          const compressed = await compressImage(base64, 1600, 0.8).catch(() => base64);
          const result = await uploadBlobToImgBB(dataURLToBlob(compressed), 'progress');
          if (!result || !result.url) throw new Error('图片上传失败');
          imageUrl = result.url;
        }

        // 将提交保存到 Supabase 表 progress_submissions
        const payload = {
          user_id: userStore.userId || null,
          content: text.value || null,
          image_url: imageUrl,
          created_at: new Date().toISOString()
        };

        const { data, error: insertError } = await supabase
          .from('progress_submissions')
          .insert([payload])
          .select()
          .single();

        if (insertError) throw insertError;

        success.value = true;
        clearAll();
      } catch (err) {
        error.value = err.message || String(err);
      } finally {
        submitting.value = false;
      }
    };

    // 工具: 将 dataURL 转为 Blob
    const dataURLToBlob = (dataurl) => {
      const arr = dataurl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    };

    return {
      text,
      file,
      preview,
      submitting,
      error,
      success,
      fileInput,
      onFileChange,
      clearImage,
      clearAll,
      submit,
      triggerFileInput,
      onDrop
    };
  }
};
</script>

<style scoped>
.submit-progress {
  width: 100%;
  min-height: 100%;
}

.submit-card {
  padding: 32px;
  max-width: 680px;
  margin: 0 auto;
}

/* Card Header */
.card-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--systemFill);
}

.header-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--keyColor) 0%, #5856d6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
}

.header-icon svg {
  width: 28px;
  height: 28px;
}

.header-text h3 {
  margin: 0 0 6px 0;
  font: var(--title-2-emphasized);
  color: var(--systemPrimary);
}

.header-text p {
  margin: 0;
  font: var(--body);
  color: var(--systemSecondary);
}

/* Form Section */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  font: var(--body-emphasized);
  color: var(--systemPrimary);
}

.form-group label svg {
  width: 18px;
  height: 18px;
  color: var(--keyColor);
}

.optional {
  font: var(--caption-1);
  color: var(--systemTertiary);
  background: var(--systemQuaternary);
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 4px;
}

.text-input {
  width: 100%;
  padding: 16px;
  border-radius: var(--global-border-radius-medium);
  border: 1px solid var(--systemFill);
  background: var(--surface);
  font: var(--body);
  color: var(--systemPrimary);
  resize: vertical;
  min-height: 120px;
  transition: all 0.2s var(--ease-out);
  font-family: inherit;
}

.text-input:focus {
  outline: none;
  border-color: var(--keyColor);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.text-input::placeholder {
  color: var(--systemTertiary);
}

.char-count {
  font: var(--caption-1);
  color: var(--systemTertiary);
  text-align: right;
}

/* Upload Area */
.upload-area {
  border: 2px dashed var(--systemFill);
  border-radius: var(--global-border-radius-large);
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s var(--ease-out);
  background: var(--systemQuaternary);
}

.upload-area:hover {
  border-color: var(--keyColor);
  background: rgba(0, 122, 255, 0.05);
}

.file-input-hidden {
  display: none;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.upload-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--keyColor);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.upload-icon svg {
  width: 28px;
  height: 28px;
}

.upload-text {
  margin: 0;
  font: var(--body-emphasized);
  color: var(--systemPrimary);
}

.upload-hint {
  margin: 0;
  font: var(--caption-1);
  color: var(--systemTertiary);
}

/* Preview */
.preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-image {
  position: relative;
  border-radius: var(--global-border-radius-large);
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.preview-image img {
  width: 100%;
  display: block;
  max-height: 400px;
  object-fit: contain;
  background: var(--systemQuaternary);
}

.remove-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s var(--ease-out);
  backdrop-filter: blur(10px);
}

.remove-btn svg {
  width: 18px;
  height: 18px;
}

.remove-btn:hover {
  background: var(--systemRed);
  transform: scale(1.1);
}

.preview-hint {
  margin: 0;
  font: var(--caption-1);
  color: var(--systemTertiary);
  text-align: center;
}

/* Actions */
.actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--systemFill);
}

.actions button {
  display: flex;
  align-items: center;
  gap: 8px;
}

.actions button svg {
  width: 18px;
  height: 18px;
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  .upload-area:hover {
    background: rgba(0, 122, 255, 0.1);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .submit-card {
    padding: 20px;
    margin: 0;
  }
  
  .card-header {
    flex-direction: column;
    text-align: center;
    align-items: center;
  }
  
  .header-icon {
    width: 48px;
    height: 48px;
  }
  
  .header-icon svg {
    width: 24px;
    height: 24px;
  }
  
  .header-text h3 {
    font: var(--title-3-emphasized);
  }
  
  .actions {
    flex-direction: column;
  }
  
  .actions button {
    width: 100%;
    justify-content: center;
  }
}
</style>
