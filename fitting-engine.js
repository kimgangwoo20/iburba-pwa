// ===== iBurBa PWA - AI 가상 피팅 엔진 v3.0 =====
// 작성일: 2025-11-13
// 버전: v3.0 - Vercel/Railway 프로덕션 배포
// 특징: 환경 자동 감지, CORS 지원, 모바일 최적화

console.log('✅ fitting-engine.js v3.0 로드 완료 (프로덕션)');

// ===== 🔥 환경별 자동 Backend URL 설정 =====
function getAPIConfig() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    console.log('🌍 현재 호스트:', hostname);
    
    // 1. Vercel 프로덕션 환경
    if (hostname.includes('vercel.app') || hostname.includes('iburba.')) {
        console.log('🚀 Vercel 프로덕션 환경 감지');
        
        // ⚠️ 배포 후 Railway URL로 업데이트하세요!
        // Railway 배포 완료 후 이 URL을 실제 주소로 변경
        const backendUrl = 'https://web-production-22c96.up.railway.app';
        
        return {
            API_URL: `${backendUrl}/api/pwa/virtual-tryon`,
            FETCH_IMAGE_URL: `${backendUrl}/api/fetch-image`,
            mode: 'production'
        };
    }
    
    // 2. 로컬 개발 환경
    else if (hostname === 'localhost' || hostname === '127.0.0.1') {
        console.log('💻 로컬 개발 환경 감지');
        return {
            API_URL: 'http://localhost:8000/api/pwa/virtual-tryon',
            FETCH_IMAGE_URL: 'http://localhost:8000/api/fetch-image',
            mode: 'development'
        };
    }
    
    // 3. 기타 환경 (폴백)
    else {
        console.log('🔧 커스텀 환경');
        return {
            API_URL: `${protocol}//${hostname}/api/pwa/virtual-tryon`,
            FETCH_IMAGE_URL: `${protocol}//${hostname}/api/fetch-image`,
            mode: 'custom'
        };
    }
}

// 환경 설정 적용
const apiConfig = getAPIConfig();
console.log('📍 현재 모드:', apiConfig.mode);
console.log('📡 Backend API:', apiConfig.API_URL);

// ===== 전역 상태 관리 =====
const state = {
    userImage: null,
    garmentImage: null,
    category: 'auto',
    resultImage: null,
    isProcessing: false
};

// ===== 설정 =====
const CONFIG = {
    API_URL: apiConfig.API_URL,
    FETCH_IMAGE_URL: apiConfig.FETCH_IMAGE_URL,
    MAX_IMAGE_SIZE: 2000,
    JPEG_QUALITY: 0.85,
    TIMEOUT: 120000,
};

// ===== 이벤트 리스너 헬퍼 =====
function attachEvent(elementId, eventType, handler) {
    const element = document.getElementById(elementId);
    if (element) {
        element.addEventListener(eventType, handler);
        console.log(`✅ 이벤트 등록: ${elementId}.${eventType}`);
    } else {
        console.warn(`⚠️ 요소 없음: ${elementId}`);
    }
}

// ===== 초기화 =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 DOM 로드 완료');
    
    try {
        // 1. 내 사진 업로드
        attachEvent('gallery-btn', 'click', () => {
            document.getElementById('user-photo').click();
        });
        
        attachEvent('user-photo', 'change', handleUserPhoto);
        attachEvent('camera-btn', 'click', openCamera);
        attachEvent('user-remove', 'click', () => removeImage('user'));
        
        // 2. 옷 선택
        attachEvent('garment-file-btn', 'click', () => {
            document.getElementById('garment-photo').click();
        });
        
        attachEvent('garment-photo', 'change', handleGarmentPhoto);
        attachEvent('url-load-btn', 'click', handleGarmentUrl);
        attachEvent('garment-url', 'keypress', (e) => {
            if (e.key === 'Enter') handleGarmentUrl();
        });
        attachEvent('garment-remove', 'click', () => removeImage('garment'));
        
        // 3. 카테고리
        attachEvent('category', 'change', handleCategoryChange);
        
        // 4. 피팅 시작
        attachEvent('try-on-btn', 'click', startTryOn);
        
        // 5. 결과 버튼
        attachEvent('save-btn', 'click', saveResult);
        attachEvent('share-btn', 'click', shareResult);
        attachEvent('retry-btn', 'click', retryFitting);
        
        // 6. 카메라 모달
        attachEvent('capture-btn', 'click', capturePhoto);
        attachEvent('camera-close-btn', 'click', closeCamera);
        
        // 7. 도움말
        attachEvent('help-btn', 'click', toggleHelp);
        attachEvent('help-close-btn', 'click', toggleHelp);
        
        console.log('✅ 모든 이벤트 등록 완료');
        
    } catch (error) {
        console.error('❌ 초기화 실패:', error);
    }
});

// ===== 사용자 사진 처리 =====
async function handleUserPhoto(event) {
    console.log('📸 사용자 사진 선택');
    
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const base64 = await compressAndConvertImage(file);
        state.userImage = base64;
        
        const preview = document.getElementById('user-preview');
        const placeholder = document.getElementById('user-placeholder');
        const removeBtn = document.getElementById('user-remove');
        
        preview.src = base64;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
        removeBtn.classList.remove('hidden');
        
        console.log('✅ 사용자 사진 처리 완료');
        checkReadyState();
        
    } catch (error) {
        console.error('❌ 처리 실패:', error);
        showError('사진을 처리할 수 없습니다');
    }
}

// ===== 옷 사진 처리 =====
async function handleGarmentPhoto(event) {
    console.log('👔 옷 사진 선택');
    
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const base64 = await compressAndConvertImage(file);
        state.garmentImage = base64;
        
        const preview = document.getElementById('garment-preview');
        const placeholder = document.getElementById('garment-placeholder');
        const removeBtn = document.getElementById('garment-remove');
        
        preview.src = base64;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
        removeBtn.classList.remove('hidden');
        
        console.log('✅ 옷 사진 처리 완료');
        checkReadyState();
        
    } catch (error) {
        console.error('❌ 처리 실패:', error);
        showError('사진을 처리할 수 없습니다');
    }
}

// ===== URL로 옷 이미지 로드 =====
async function handleGarmentUrl() {
    const urlInput = document.getElementById('garment-url');
    const url = urlInput.value.trim();
    
    if (!url) {
        showError('URL을 입력해주세요');
        return;
    }
    
    console.log('🔗 URL 로드:', url);
    
    try {
        const loadBtn = document.getElementById('url-load-btn');
        const originalText = loadBtn.textContent;
        loadBtn.textContent = '로딩 중...';
        loadBtn.disabled = true;
        
        const proxyUrl = `${CONFIG.FETCH_IMAGE_URL}?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error('이미지를 가져올 수 없습니다');
        }
        
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);
        
        state.garmentImage = base64;
        
        const preview = document.getElementById('garment-preview');
        const placeholder = document.getElementById('garment-placeholder');
        const removeBtn = document.getElementById('garment-remove');
        
        preview.src = base64;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
        removeBtn.classList.remove('hidden');
        
        loadBtn.textContent = originalText;
        loadBtn.disabled = false;
        urlInput.value = '';
        
        console.log('✅ URL 로드 완료');
        checkReadyState();
        
    } catch (error) {
        console.error('❌ URL 로드 실패:', error);
        showError('이미지를 불러올 수 없습니다');
        
        const loadBtn = document.getElementById('url-load-btn');
        loadBtn.textContent = '불러오기';
        loadBtn.disabled = false;
    }
}

// ===== 이미지 제거 =====
function removeImage(type) {
    console.log(`🗑️ ${type} 제거`);
    
    if (type === 'user') {
        state.userImage = null;
        document.getElementById('user-preview').classList.add('hidden');
        document.getElementById('user-placeholder').classList.remove('hidden');
        document.getElementById('user-remove').classList.add('hidden');
        document.getElementById('user-photo').value = '';
    } else if (type === 'garment') {
        state.garmentImage = null;
        document.getElementById('garment-preview').classList.add('hidden');
        document.getElementById('garment-placeholder').classList.remove('hidden');
        document.getElementById('garment-remove').classList.add('hidden');
        document.getElementById('garment-photo').value = '';
    }
    
    checkReadyState();
}

// ===== 카메라 =====
function openCamera() {
    console.log('📷 카메라 열기');
    
    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('camera-video');
    
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
        } 
    })
    .then(stream => {
        video.srcObject = stream;
        modal.classList.remove('hidden');
        console.log('✅ 카메라 시작');
    })
    .catch(error => {
        console.error('❌ 카메라 실패:', error);
        showError('카메라를 사용할 수 없습니다');
    });
}

function closeCamera() {
    console.log('❌ 카메라 닫기');
    
    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('camera-video');
    
    const stream = video.srcObject;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    
    modal.classList.add('hidden');
}

async function capturePhoto() {
    console.log('📸 촬영');
    
    const video = document.getElementById('camera-video');
    const canvas = document.createElement('canvas');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    const base64 = canvas.toDataURL('image/jpeg', CONFIG.JPEG_QUALITY);
    state.userImage = base64;
    
    const preview = document.getElementById('user-preview');
    const placeholder = document.getElementById('user-placeholder');
    const removeBtn = document.getElementById('user-remove');
    
    preview.src = base64;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
    removeBtn.classList.remove('hidden');
    
    closeCamera();
    
    console.log('✅ 촬영 완료');
    checkReadyState();
}

// ===== 가상 피팅 =====
async function startTryOn() {
    console.log('🎨 피팅 시작');
    
    if (state.isProcessing) return;
    if (!state.userImage || !state.garmentImage) {
        showError('사진을 모두 선택해주세요');
        return;
    }
    
    state.isProcessing = true;
    
    const tryOnBtn = document.getElementById('try-on-btn');
    const progressSection = document.getElementById('progress');
    const resultSection = document.getElementById('result');
    
    tryOnBtn.disabled = true;
    tryOnBtn.textContent = '피팅 중...';
    progressSection.classList.remove('hidden');
    resultSection.classList.add('hidden');
    
    try {
        console.log('🚀 API 호출');
        
        const resultImageUrl = await performVirtualTryOn(
            state.userImage,
            state.garmentImage,
            state.category
        );
        
        state.resultImage = resultImageUrl;
        showResult(resultImageUrl);
        
        console.log('✅ 피팅 완료');
        
    } catch (error) {
        console.error('❌ 피팅 실패:', error);
        showError(error.message || '피팅에 실패했습니다');
        
    } finally {
        state.isProcessing = false;
        tryOnBtn.disabled = false;
        tryOnBtn.textContent = '🎨 가상 피팅 시작';
        progressSection.classList.add('hidden');
    }
}

// ===== API 호출 =====
async function performVirtualTryOn(userImage, garmentImage, category) {
    console.log('🔌 API 호출');
    console.log('- 카테고리:', category);
    
    try {
        const payload = {
            person_image: userImage,
            garment_image: garmentImage,
            category: category
        };
        
        console.log('📡 호출:', CONFIG.API_URL);
        
        startProgressSimulation();
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
        
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `API 에러: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('✅ 응답 성공:', data);
        
        if (!data.success) {
            throw new Error(data.error || '피팅 실패');
        }
        
        if (data.result_image) {
            if (data.result_image.startsWith('http://') || data.result_image.startsWith('https://')) {
                return data.result_image;
            } else if (data.result_image.startsWith('data:')) {
                return data.result_image;
            } else {
                return `data:image/jpeg;base64,${data.result_image}`;
            }
        } else {
            throw new Error('결과 이미지 없음');
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('요청 시간 초과 (2분)');
        }
        throw error;
    }
}

// ===== 결과 표시 =====
function showResult(imageUrl) {
    console.log('✨ 결과 표시');
    
    const resultImg = document.getElementById('result-img');
    resultImg.src = imageUrl;
    
    const resultSection = document.getElementById('result');
    resultSection.classList.remove('hidden');
    
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== 진행률 시뮬레이션 =====
function startProgressSimulation() {
    const progressBar = document.getElementById('api-progress');
    const statusText = document.getElementById('api-status');
    
    const steps = [
        { percent: 10, text: '이미지 업로드 중...' },
        { percent: 30, text: 'AI 분석 중...' },
        { percent: 50, text: '가상 피팅 생성 중...' },
        { percent: 70, text: '이미지 처리 중...' },
        { percent: 90, text: '결과 준비 중...' }
    ];
    
    let stepIndex = 0;
    
    const interval = setInterval(() => {
        if (stepIndex < steps.length) {
            const step = steps[stepIndex];
            progressBar.style.width = step.percent + '%';
            statusText.textContent = step.text;
            stepIndex++;
        } else {
            clearInterval(interval);
        }
    }, 4000);
    
    window.progressInterval = interval;
}

// ===== 카테고리 변경 =====
function handleCategoryChange(event) {
    state.category = event.target.value;
    console.log('📂 카테고리:', state.category);
}

// ===== 준비 상태 확인 =====
function checkReadyState() {
    const tryOnBtn = document.getElementById('try-on-btn');
    const ready = state.userImage && state.garmentImage;
    
    tryOnBtn.disabled = !ready;
    
    if (ready) {
        tryOnBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        tryOnBtn.classList.add('hover:bg-purple-700');
    } else {
        tryOnBtn.classList.add('opacity-50', 'cursor-not-allowed');
        tryOnBtn.classList.remove('hover:bg-purple-700');
    }
}

// ===== 결과 저장 =====
async function saveResult() {
    if (!state.resultImage) {
        showError('저장할 결과가 없습니다');
        return;
    }
    
    console.log('💾 저장');
    
    try {
        const link = document.createElement('a');
        link.href = state.resultImage;
        link.download = `iburba-fitting-${Date.now()}.jpg`;
        link.click();
        
        showSuccess('✅ 다운로드 완료');
        
    } catch (error) {
        console.error('❌ 저장 실패:', error);
        showError('저장 실패');
    }
}

// ===== 결과 공유 =====
async function shareResult() {
    if (!state.resultImage) {
        showError('공유할 결과가 없습니다');
        return;
    }
    
    console.log('📤 공유');
    
    try {
        if (navigator.share) {
            const blob = await fetch(state.resultImage).then(r => r.blob());
            const file = new File([blob], 'iburba-fitting.jpg', { type: 'image/jpeg' });
            
            await navigator.share({
                title: 'iBurBa AI 가상 피팅',
                text: 'AI로 옷을 입어봤어요!',
                files: [file]
            });
            
            showSuccess('✅ 공유 완료');
            
        } else {
            showError('이 브라우저는 공유를 지원하지 않습니다');
        }
        
    } catch (error) {
        console.error('❌ 공유 실패:', error);
        if (error.name !== 'AbortError') {
            showError('공유 실패');
        }
    }
}

// ===== 다시 시도 =====
function retryFitting() {
    console.log('🔄 다시 시도');
    
    document.getElementById('result').classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== 이미지 압축 =====
async function compressAndConvertImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > CONFIG.MAX_IMAGE_SIZE || height > CONFIG.MAX_IMAGE_SIZE) {
                    if (width > height) {
                        height = (height / width) * CONFIG.MAX_IMAGE_SIZE;
                        width = CONFIG.MAX_IMAGE_SIZE;
                    } else {
                        width = (width / height) * CONFIG.MAX_IMAGE_SIZE;
                        height = CONFIG.MAX_IMAGE_SIZE;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const base64 = canvas.toDataURL('image/jpeg', CONFIG.JPEG_QUALITY);
                resolve(base64);
            };
            
            img.onerror = () => reject(new Error('이미지 로드 실패'));
            img.src = e.target.result;
        };
        
        reader.onerror = () => reject(new Error('파일 읽기 실패'));
        reader.readAsDataURL(file);
    });
}

// ===== Blob → Base64 =====
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// ===== 에러 표시 =====
function showError(message) {
    console.error('❌', message);
    
    const toast = document.getElementById('error-toast');
    const messageEl = document.getElementById('error-message');
    
    messageEl.textContent = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// ===== 성공 메시지 =====
function showSuccess(message) {
    console.log('✅', message);
    
    const toast = document.getElementById('error-toast');
    const messageEl = document.getElementById('error-message');
    
    toast.classList.remove('bg-red-500');
    toast.classList.add('bg-green-500');
    
    messageEl.textContent = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
        toast.classList.remove('bg-green-500');
        toast.classList.add('bg-red-500');
    }, 3000);
}

// ===== 도움말 토글 =====
function toggleHelp() {
    const modal = document.getElementById('help-modal');
    modal.classList.toggle('hidden');
}

// ===== 전역 디버깅 =====
window.iBurBaFitting = {
    state,
    config: CONFIG,
    apiConfig,
    startTryOn,
    saveResult,
    shareResult,
    showError,
    showSuccess
};

console.log('✅ 초기화 완료');
console.log('🌐 환경:', apiConfig.mode);
console.log('📡 Backend:', CONFIG.API_URL);
