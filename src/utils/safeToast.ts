import { toast } from 'sonner@2.0.3';

// 統一的安全Toast管理系統
interface ToastOptions {
  description?: string;
  duration?: number;
  action?: any;
  onDismiss?: () => void;
  [key: string]: any;
}

// 防重複機制 - 記錄最近顯示的toast
const recentToasts = new Map<string, number>();
const DUPLICATE_THRESHOLD = 1000; // 1秒內不顯示相同內容的toast

const isDuplicateToast = (title: string, description?: string): boolean => {
  const key = `${title}|${description || ''}`;
  const now = Date.now();
  const lastShown = recentToasts.get(key);
  
  // 特殊處理：上傳流程相關toast不應被視為重複
  const uploadKeywords = ['正在上傳', '上傳成功', '資料上傳', '號段資料', '學區資料'];
  const isUploadRelated = uploadKeywords.some(keyword => title?.includes(keyword));
  
  if (isUploadRelated) {
    // 清理舊的上傳相關記錄，確保新的toast能正常顯示
    const uploadKeys = Array.from(recentToasts.keys()).filter(k => 
      uploadKeywords.some(keyword => k.includes(keyword))
    );
    uploadKeys.forEach(k => {
      if (now - (recentToasts.get(k) || 0) > 5000) { // 5秒後清理舊記錄
        recentToasts.delete(k);
      }
    });
    return false; // 允許上傳相關toast顯示
  }
  
  if (lastShown && (now - lastShown) < DUPLICATE_THRESHOLD) {
    console.log('🚫 防重複：跳過相同內容的toast', { title });
    return true;
  }
  
  recentToasts.set(key, now);
  return false;
};

// 內容驗證函數 - 更嚴格的檢查
const validateContent = (title?: string, description?: string): boolean => {
  // 檢查標題
  const hasValidTitle = title && 
                       typeof title === 'string' && 
                       title.trim().length > 0 &&
                       title !== 'undefined' &&
                       title !== 'null' &&
                       title !== '' &&
                       !title.match(/^\s*$/);

  // 檢查描述
  const hasValidDescription = !description || 
                             (typeof description === 'string' && 
                              description.trim().length > 0 &&
                              description !== 'undefined' &&
                              description !== 'null' &&
                              description !== '' &&
                              !description.match(/^\s*$/));

  return hasValidTitle && hasValidDescription;
};

// 智能延遲函數 - 等待DOM更新和內容準備
const smartDelayedToast = (
  toastFn: (title: string, options?: ToastOptions) => void,
  title: string,
  options: ToastOptions = {},
  delay: number = 200
) => {
  // 雙重檢查：先檢查一次，延遲後再檢查一次
  if (!validateContent(title, options.description)) {
    console.warn('Toast被跳過：初始內容驗證失敗', { title, description: options.description });
    return;
  }

  setTimeout(() => {
    // 再次驗證，確保內容仍然有效
    if (!validateContent(title, options.description)) {
      console.warn('Toast被跳過：延遲後內容驗證失敗', { title, description: options.description });
      return;
    }

    console.log(`✅ 顯示安全toast: ${title}`, options);
    toastFn(title, options);
  }, delay);
};

// 終極安全Toast對象 - 絕對防止任何空白toast
export const safeToast = {
  success: (title?: string, descriptionOrOptions?: string | ToastOptions, optionsOverride?: ToastOptions) => {
    // 處理參數重載：支援 success(title) 和 success(title, description) 兩種調用方式
    let options: ToastOptions = {};
    let description: string | undefined;
    
    if (typeof descriptionOrOptions === 'string') {
      description = descriptionOrOptions;
      options = optionsOverride || {};
    } else if (typeof descriptionOrOptions === 'object') {
      options = descriptionOrOptions || {};
      description = options.description;
    }
    
    // 如果有description參數，設置到options中
    if (description) {
      options = { ...options, description };
    }
    
    // 防重複檢查
    if (isDuplicateToast(title || '', options.description)) {
      return;
    }
    
    // 驗證標題
    const hasValidTitle = title && 
                         typeof title === 'string' && 
                         title.trim().length > 0 &&
                         title !== 'undefined' &&
                         title !== 'null' &&
                         title !== 'empty';

    // 驗證描述（如果提供的話）
    const hasValidDescription = !options.description || 
                               (typeof options.description === 'string' && 
                                options.description.trim().length > 0 &&
                                options.description !== 'undefined' &&
                                options.description !== 'null' &&
                                options.description !== 'empty');

    if (!hasValidTitle) {
      console.error('🚫 Success toast被阻止：標題無效', { title: title || 'EMPTY' });
      return;
    }

    if (!hasValidDescription) {
      console.error('🚫 Success toast被阻止：描述無效', { description: options.description || 'EMPTY' });
      return;
    }

    console.log('✅ 顯示Success toast:', title, options);
    smartDelayedToast(toast.success, title, options, 300);
  },

  error: (title?: string, descriptionOrOptions?: string | ToastOptions, optionsOverride?: ToastOptions) => {
    // 處理參數重載：支援 error(title) 和 error(title, description) 兩種調用方式
    let options: ToastOptions = {};
    let description: string | undefined;
    
    if (typeof descriptionOrOptions === 'string') {
      description = descriptionOrOptions;
      options = optionsOverride || {};
    } else if (typeof descriptionOrOptions === 'object') {
      options = descriptionOrOptions || {};
      description = options.description;
    }
    
    // 如果有description參數，設置到options中
    if (description) {
      options = { ...options, description };
    }
    
    // 防重複檢查
    if (isDuplicateToast(title || '', options.description)) {
      return;
    }
    
    const hasValidTitle = title && 
                         typeof title === 'string' && 
                         title.trim().length > 0 &&
                         title !== 'undefined' &&
                         title !== 'null';

    // 驗證描述（如果提供的話）
    const hasValidDescription = !options.description || 
                               (typeof options.description === 'string' && 
                                options.description.trim().length > 0 &&
                                options.description !== 'undefined' &&
                                options.description !== 'null');

    if (!hasValidTitle) {
      console.error('🚫 Error toast被阻止：標題無效', { title: title || 'EMPTY' });
      return;
    }

    if (!hasValidDescription) {
      console.error('🚫 Error toast被阻止：描述無效', { description: options.description || 'EMPTY' });
      return;
    }

    console.log('✅ 顯示Error toast:', title, options);
    smartDelayedToast(toast.error, title, options, 200);
  },

  warning: (title?: string, descriptionOrOptions?: string | ToastOptions, optionsOverride?: ToastOptions) => {
    // 處理參數重載：支援 warning(title) 和 warning(title, description) 兩種調用方式
    let options: ToastOptions = {};
    let description: string | undefined;
    
    if (typeof descriptionOrOptions === 'string') {
      description = descriptionOrOptions;
      options = optionsOverride || {};
    } else if (typeof descriptionOrOptions === 'object') {
      options = descriptionOrOptions || {};
      description = options.description;
    }
    
    // 如果有description參數，設置到options中
    if (description) {
      options = { ...options, description };
    }
    
    // 防重複檢查
    if (isDuplicateToast(title || '', options.description)) {
      return;
    }
    
    const hasValidTitle = title && 
                         typeof title === 'string' && 
                         title.trim().length > 0 &&
                         title !== 'undefined' &&
                         title !== 'null';

    // 驗證描述（如果提供的話）
    const hasValidDescription = !options.description || 
                               (typeof options.description === 'string' && 
                                options.description.trim().length > 0 &&
                                options.description !== 'undefined' &&
                                options.description !== 'null');

    if (!hasValidTitle) {
      console.error('🚫 Warning toast被阻止：標題無效', { title: title || 'EMPTY' });
      return;
    }

    if (!hasValidDescription) {
      console.error('🚫 Warning toast被阻止：描述無效', { description: options.description || 'EMPTY' });
      return;
    }

    console.log('✅ 顯示Warning toast:', title, options);
    smartDelayedToast(toast.warning, title, options, 200);
  },

  loading: (title?: string, options: ToastOptions = {}) => {
    // 防重複檢查
    if (isDuplicateToast(title || '', options.description)) {
      return;
    }
    
    const hasValidTitle = title && 
                         typeof title === 'string' && 
                         title.trim().length > 0 &&
                         title !== 'undefined' &&
                         title !== 'null';

    // 驗證描述（如果提供的話）
    const hasValidDescription = !options.description || 
                               (typeof options.description === 'string' && 
                                options.description.trim().length > 0 &&
                                options.description !== 'undefined' &&
                                options.description !== 'null');

    if (!hasValidTitle) {
      console.error('🚫 Loading toast被阻止：標題無效', { title: title || 'EMPTY' });
      return;
    }

    if (!hasValidDescription) {
      console.error('🚫 Loading toast被阻止：描述無效', { description: options.description || 'EMPTY' });
      return;
    }

    console.log('✅ 顯示Loading toast:', title, options);
    
    // 簡化的loading toast實現
    smartDelayedToast((title: string, options?: ToastOptions) => {
      const toastId = toast(title, {
        ...options,
        icon: '⏳',
        className: 'toast-loading',
      });
      return toastId;
    }, title, options, 100);
  },

  info: (title?: string, options: ToastOptions = {}) => {
    // 完全禁用 Info toast - 不再顯示藍色通知
    
    // 如果內容有效，可以選擇轉換為成功通知（可選）
    if (title && title.trim() && options.description && options.description.trim()) {
      console.log('💡 建議：可以考慮改用 safeToast.success 顯示此內容');
    }
    
    // 完全不顯示任何通知
    return;
  }
};

// 攔截不安全的toast調用
export const deprecatedToast = {
  success: (title?: string, options?: ToastOptions) => {
    console.error('🚫 阻止不安全的toast.success調用！', { title, options });
    console.warn('請使用 safeToast.success 代替，以防止空白toast');
    
    // 如果內容有效，自動轉發到安全版本
    if (title && title.trim() && options?.description && options.description.trim()) {
      console.log('自動轉發到安全版本...');
      safeToast.success(title, options);
    }
  },
  error: (title?: string, options?: ToastOptions) => {
    console.error('🚫 阻止不安全的toast.error調用！', { title, options });
    console.warn('請使用 safeToast.error 代替');
    
    if (title && title.trim()) {
      console.log('自動轉發到安全版本...');
      safeToast.error(title, options);
    }
  },
  warning: (title?: string, options?: ToastOptions) => {
    console.error('🚫 阻止不安全的toast.warning調用！', { title, options });
    console.warn('請使用 safeToast.warning 代替');
    
    if (title && title.trim()) {
      console.log('自動轉發到安全版本...');
      safeToast.warning(title, options);
    }
  },
  loading: (title?: string, options?: ToastOptions) => {
    console.error('🚫 阻止不安全的toast.loading調用！', { title, options });
    console.warn('請使用 safeToast.loading 代替');
    
    if (title && title.trim()) {
      console.log('自動轉發到安全版本...');
      safeToast.loading(title, options);
    }
  },
  info: (title?: string, options?: ToastOptions) => {
    
    // 完全不顯示，也不轉發
    return;
  }
};

// 創建一個全局toast攔截器
export const installToastInterceptor = () => {
  if (typeof window !== 'undefined') {
    // 攔截可能的直接toast調用
    (window as any).toast = deprecatedToast;
    
  }
};