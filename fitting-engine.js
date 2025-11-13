// ===== iBurBa PWA - AI 가상 피팅 엔진 =====
// 작성일: 2025-11-13
// 버전: v1.0
// 특징: onclick 완전 제거, addEventListener 기반, CSP 준수

console.log('✅ fitting-engine.js 로드 완료');

// ===== 전역 상태 관리 =====
const state = {
    userImage: null,
    garmentImage: null,
    category: 'auto',
    resultImage: null,
    isProcessing: false
};

// ===== 설정 =====
// 🌐 환경 감지 (자동)
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const backendUrl = isProduction 
    ? 'https://web-production-22c96.up.railway.app'  // ✅ Railway 프로덕션
    : 'http://localhost:8000';  // 🛠️ 로컬 개발

console.log(isProduction 
    ? '🟢 Vercel 프로덕션 환경 감지' 
    : '🟡 로컬 개발 환경');
console.log('📡 Backend URL:', backendUrl);

const CONFIG = {
    API_URL: `${backendUrl}/api/pwa/virtual-tryon`,
    FETCH_IMAGE_URL: `${backendUrl}/api/fetch-image`,
    MAX_IMAGE_SIZE: 2000, // 최대 너비/높이 (px)
    JPEG_QUALITY: 0.85, // 압축 품질
    TIMEOUT: 120000, // API 타임아웃 (120초)
};

// ===== 이벤트 리스너 등록 =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 DOM 로드 완료, 이벤트 리스너 등록 시작');
    
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
            if (e.key === 'Enter') {
                handleGarmentUrl();
            }
        });
        attachEvent('garment-remove', 'click', () => removeImage('garment'));
        
        // 3. 카테고리 선택
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
        
        // 7. 기타
        attachEvent('back-btn', 'click', () => {
            window.location.href = '/index.html';
        });
        attachEvent('help-btn', 'click', toggleHelp);
        attachEvent('help-close-btn', 'click', toggleHelp);
        
        console.log('✅ 모든 이벤트 리스너 등록 완료');
        
        // 초기 상태 업데이트
        updateProgress();
        
    } catch (error) {
        console.error('❌ 이벤트 리스너 등록 실패:', error);
        showError('초기화 실패: ' + error.message);
    }
});

// ===== 이벤트 리스너 헬퍼 함수 =====
function attachEvent(elementId, eventType, handler) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`⚠️ 요소를 찾을 수 없음: ${elementId}`);
        return;
    }
    
    // 중복 방지
    if (element.hasAttribute('data-event-attached')) {
        console.log(`⏭️ 이미 등록됨: ${elementId} (${eventType})`);
        return;
    }
    
    element.addEventListener(eventType, handler);
    element.setAttribute('data-event-attached', 'true');
    console.log(`✅ 이벤트 등록: ${elementId} (${eventType})`);
}

// ===== 1. 내 사진 처리 =====
async function handleUserPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log('📸 사용자 사진 선택:', file.name, file.size, 'bytes');
    
    try {
        // 파일 읽기
        const base64 = await readFileAsBase64(file);
        
        // 이미지 압축
        const compressed = await compressImage(base64, CONFIG.MAX_IMAGE_SIZE, CONFIG.JPEG_QUALITY);
        
        // 상태 저장
        state.userImage = compressed;
        
        // 미리보기 표시
        showPreview('user', compressed);
        
        // 상태 업데이트
        updateStatus('user-status', '✅ 선택 완료');
        updateProgress();
        
        console.log('✅ 사용자 사진 처리 완료');
        
    } catch (error) {
        console.error('❌ 사진 처리 실패:', error);
        showError('사진 처리 실패: ' + error.message);
    }
}

// ===== 2. 카메라 촬영 =====
let cameraStream = null;

async function openCamera() {
    console.log('📷 카메라 열기 시작');
    
    try {
        // 모바일 카메라 접근 (후면 카메라 우선)
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment', // 후면 카메라
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });
        
        // 비디오 요소에 스트림 연결
        const video = document.getElementById('camera-video');
        video.srcObject = cameraStream;
        
        // 모달 표시
        document.getElementById('camera-modal').classList.remove('hidden');
        
        console.log('✅ 카메라 열기 완료');
        
    } catch (error) {
        console.error('❌ 카메라 접근 실패:', error);
        
        // 에러 메시지 개선
        let errorMsg = '카메라 접근 실패';
        if (error.name === 'NotAllowedError') {
            errorMsg = '카메라 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.';
        } else if (error.name === 'NotFoundError') {
            errorMsg = '카메라를 찾을 수 없습니다.';
        }
        
        showError(errorMsg);
    }
}

async function capturePhoto() {
    console.log('📸 사진 촬영 시작');
    
    try {
        const video = document.getElementById('camera-video');
        
        // Canvas에 비디오 프레임 그리기
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        // Base64 변환
        const base64 = canvas.toDataURL('image/jpeg', CONFIG.JPEG_QUALITY);
        
        // 이미지 압축
        const compressed = await compressImage(base64, CONFIG.MAX_IMAGE_SIZE, CONFIG.JPEG_QUALITY);
        
        // 상태 저장
        state.userImage = compressed;
        
        // 미리보기 표시
        showPreview('user', compressed);
        
        // 카메라 닫기
        closeCamera();
        
        // 상태 업데이트
        updateStatus('user-status', '✅ 촬영 완료');
        updateProgress();
        
        console.log('✅ 사진 촬영 완료');
        
    } catch (error) {
        console.error('❌ 사진 촬영 실패:', error);
        showError('사진 촬영 실패: ' + error.message);
    }
}

function closeCamera() {
    console.log('📷 카메라 닫기');
    
    // 스트림 중지
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    
    // 모달 숨기기
    document.getElementById('camera-modal').classList.add('hidden');
}

// ===== 3. 옷 사진 처리 =====
async function handleGarmentPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log('👔 옷 사진 선택:', file.name, file.size, 'bytes');
    
    try {
        // 파일 읽기
        const base64 = await readFileAsBase64(file);
        
        // 이미지 압축
        const compressed = await compressImage(base64, CONFIG.MAX_IMAGE_SIZE, CONFIG.JPEG_QUALITY);
        
        // 상태 저장
        state.garmentImage = compressed;
        
        // 미리보기 표시
        showPreview('garment', compressed);
        
        // 상태 업데이트
        updateStatus('garment-status', '✅ 선택 완료');
        updateProgress();
        
        console.log('✅ 옷 사진 처리 완료');
        
    } catch (error) {
        console.error('❌ 옷 사진 처리 실패:', error);
        showError('옷 사진 처리 실패: ' + error.message);
    }
}

// ===== 4. URL로 옷 이미지 로드 =====
async function handleGarmentUrl() {
    const urlInput = document.getElementById('garment-url');
    const url = urlInput.value.trim();
    
    if (!url) {
        showError('URL을 입력해주세요');
        return;
    }
    
    console.log('🔗 URL로 이미지 로드:', url);
    
    // URL 유효성 검사
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showError('올바른 URL을 입력해주세요 (http:// 또는 https://)');
        return;
    }
    
    try {
        // 로딩 표시
        updateStatus('garment-status', '⏳ 로딩 중...');
        
        // Backend를 통해 이미지 가져오기 (CORS 우회)
        const fetchUrl = `${CONFIG.FETCH_IMAGE_URL}?url=${encodeURIComponent(url)}`;
        const response = await fetch(fetchUrl);
        
        if (!response.ok) {
            throw new Error(`이미지 로드 실패: ${response.status}`);
        }
        
        const blob = await response.blob();
        
        // Blob을 Base64로 변환
        const base64 = await blobToBase64(blob);
        
        // 이미지 압축
        const compressed = await compressImage(base64, CONFIG.MAX_IMAGE_SIZE, CONFIG.JPEG_QUALITY);
        
        // 상태 저장
        state.garmentImage = compressed;
        
        // 미리보기 표시
        showPreview('garment', compressed);
        
        // 상태 업데이트
        updateStatus('garment-status', '✅ 로드 완료');
        updateProgress();
        
        console.log('✅ URL 이미지 로드 완료');
        
    } catch (error) {
        console.error('❌ URL 이미지 로드 실패:', error);
        showError('이미지 로드 실패: ' + error.message);
        updateStatus('garment-status', '❌ 로드 실패');
    }
}

// ===== 5. 이미지 제거 =====
function removeImage(type) {
    console.log(`🗑️ ${type} 이미지 제거`);
    
    if (type === 'user') {
        state.userImage = null;
        document.getElementById('user-preview').classList.add('hidden');
        document.getElementById('user-photo').value = '';
        updateStatus('user-status', '미선택');
    } else {
        state.garmentImage = null;
        document.getElementById('garment-preview').classList.add('hidden');
        document.getElementById('garment-photo').value = '';
        document.getElementById('garment-url').value = '';
        updateStatus('garment-status', '미선택');
    }
    
    updateProgress();
}

// ===== 6. 카테고리 변경 =====
function handleCategoryChange(e) {
    state.category = e.target.value;
    console.log('🎨 카테고리 변경:', state.category);
    
    // 카테고리 설명 업데이트
    const info = document.getElementById('category-info');
    const descriptions = {
        'auto': '자동 감지를 선택하면 AI가 옷 종류를 자동으로 판별합니다.',
        'tops': '티셔츠, 블라우스, 셔츠 등 상의 아이템에 적합합니다.',
        'bottoms': '바지, 치마 등 하의 아이템에 적합합니다.',
        'dresses': '원피스, 점프수트 등에 적합합니다.',
        'outerwear': '재킷, 코트, 가디건 등 아우터에 적합합니다.'
    };
    
    info.innerHTML = `
        <p class="font-semibold text-purple-600 mb-1">💡 팁</p>
        <p>${descriptions[state.category]}</p>
    `;
}

// ===== 7. 가상 피팅 시작 =====
async function startTryOn() {
    console.log('🎨 가상 피팅 시작');
    
    // 유효성 검사
    if (!state.userImage) {
        showError('내 사진을 선택해주세요');
        return;
    }
    
    if (!state.garmentImage) {
        showError('옷 사진을 선택해주세요');
        return;
    }
    
    if (state.isProcessing) {
        console.warn('⚠️ 이미 처리 중입니다');
        return;
    }
    
    state.isProcessing = true;
    
    try {
        // 로딩 표시
        showLoading(true);
        
        // API 호출
        const resultUrl = await performVirtualTryOn(
            state.userImage,
            state.garmentImage,
            state.category
        );
        
        // 상태 저장
        state.resultImage = resultUrl;
        
        // 결과 표시
        showResult(resultUrl);
        
        console.log('✅ 가상 피팅 완료');
        
    } catch (error) {
        console.error('❌ 가상 피팅 실패:', error);
        showError('피팅 실패: ' + error.message);
    } finally {
        state.isProcessing = false;
        showLoading(false);
    }
}

// ===== 8. API 호출 (JSON 형식) =====
async function performVirtualTryOn(userImage, garmentImage, category) {
    console.log('🔌 API 호출 시작');
    console.log('- 카테고리:', category);
    console.log('- 사용자 이미지 크기:', userImage.length, 'bytes');
    console.log('- 옷 이미지 크기:', garmentImage.length, 'bytes');
    
    try {
        // JSON 페이로드 생성
        const payload = {
            person_image: userImage,    // Base64 (data:image/jpeg;base64,... 형식)
            garment_image: garmentImage, // Base64
            category: category
        };
        
        console.log('📡 API 호출:', CONFIG.API_URL);
        
        // 진행률 시뮬레이션 시작
        startProgressSimulation();
        
        // API 호출
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
        
        console.log('✅ API 응답 성공:', data);
        
        // 결과 반환
        if (!data.success) {
            throw new Error(data.error || '피팅 실패');
        }
        
        if (data.result_image) {
            // URL인 경우 (https:// 또는 http://로 시작)
            if (data.result_image.startsWith('http://') || data.result_image.startsWith('https://')) {
                return data.result_image;
            }
            // Base64 이미지 (data:image/... 프리픽스 확인)
            else if (data.result_image.startsWith('data:')) {
                return data.result_image;
            }
            // Base64 문자열 (프리픽스 없음)
            else {
                return `data:image/jpeg;base64,${data.result_image}`;
            }
        } else {
            throw new Error('결과 이미지가 없습니다');
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('요청 시간 초과 (2분). 다시 시도해주세요.');
        }
        throw error;
    }
}

// ===== 9. 결과 표시 =====
function showResult(imageUrl) {
    console.log('✨ 결과 표시');
    
    // 결과 이미지 설정
    const resultImg = document.getElementById('result-img');
    resultImg.src = imageUrl;
    
    // 결과 섹션 표시
    const resultSection = document.getElementById('result');
    resultSection.classList.remove('hidden');
    
    // 스크롤
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== 10. 결과 저장 =====
function saveResult() {
    if (!state.resultImage) {
        showError('저장할 결과가 없습니다');
        return;
    }
    
    console.log('💾 결과 저장 시작');
    
    try {
        // localStorage에서 히스토리 가져오기
        const history = JSON.parse(localStorage.getItem('fitting_history') || '[]');
        
        // 새 항목 추가
        const newItem = {
            id: Date.now(),
            timestamp: Date.now(),
            userImage: state.userImage,
            garmentImage: state.garmentImage,
            resultImage: state.resultImage,
            category: state.category
        };
        
        history.unshift(newItem);
        
        // 최대 30개 제한
        if (history.length > 30) {
            history.length = 30;
        }
        
        // 저장
        localStorage.setItem('fitting_history', JSON.stringify(history));
        
        console.log('✅ 저장 완료:', history.length, '개 항목');
        
        // 알림
        showSuccess('✅ 피팅 결과가 저장되었습니다!');
        
    } catch (error) {
        console.error('❌ 저장 실패:', error);
        showError('저장 실패: ' + error.message);
    }
}

// ===== 11. 결과 공유 =====
async function shareResult() {
    if (!state.resultImage) {
        showError('공유할 결과가 없습니다');
        return;
    }
    
    console.log('📤 결과 공유 시작');
    
    try {
        // Web Share API 지원 확인
        if (navigator.share) {
            await navigator.share({
                title: 'iBurBa AI 가상 피팅 결과',
                text: 'AI로 만든 내 스타일을 확인해보세요!',
                url: window.location.href
            });
            
            console.log('✅ 공유 완료');
        } else {
            // 폴백: 클립보드 복사
            await navigator.clipboard.writeText(window.location.href);
            showSuccess('링크가 클립보드에 복사되었습니다!');
        }
        
    } catch (error) {
        console.error('❌ 공유 실패:', error);
        
        if (error.name !== 'AbortError') {
            showError('공유 실패: ' + error.message);
        }
    }
}

// ===== 12. 다시 피팅하기 =====
function retryFitting() {
    console.log('🔄 다시 피팅하기');
    
    // 결과 숨기기
    document.getElementById('result').classList.add('hidden');
    
    // 상태 초기화 (이미지는 유지)
    state.resultImage = null;
    state.isProcessing = false;
    
    // 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== 유틸리티 함수 =====

// 파일을 Base64로 읽기
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('파일 읽기 실패'));
        reader.readAsDataURL(file);
    });
}

// Blob을 Base64로 변환
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Blob 변환 실패'));
        reader.readAsDataURL(blob);
    });
}

// Base64를 Blob으로 변환
async function base64ToBlob(base64) {
    const response = await fetch(base64);
    return await response.blob();
}

// 이미지 압축
function compressImage(base64, maxSize, quality) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            // Canvas 생성
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // 리사이즈
            if (width > maxSize || height > maxSize) {
                if (width > height) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                } else {
                    width = Math.round((width * maxSize) / height);
                    height = maxSize;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // 그리기
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Base64 변환
            const compressed = canvas.toDataURL('image/jpeg', quality);
            
            console.log(`📐 이미지 압축: ${img.width}x${img.height} → ${width}x${height}`);
            console.log(`📦 크기: ${base64.length} → ${compressed.length} bytes`);
            
            resolve(compressed);
        };
        img.onerror = () => reject(new Error('이미지 압축 실패'));
        img.src = base64;
    });
}

// 미리보기 표시
function showPreview(type, base64) {
    const previewDiv = document.getElementById(`${type}-preview`);
    const previewImg = document.getElementById(`${type}-img`);
    
    previewImg.src = base64;
    previewDiv.classList.remove('hidden');
    
    // 페이드인 효과
    previewDiv.classList.add('fade-in');
}

// 상태 업데이트
function updateStatus(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

// 진행 상태 업데이트
function updateProgress() {
    let progress = 0;
    let text = '0/3';
    
    if (state.userImage) progress++;
    if (state.garmentImage) progress++;
    
    text = `${progress}/3`;
    
    // 진행률 바 업데이트
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    progressBar.style.width = `${(progress / 3) * 100}%`;
    progressText.textContent = text;
    
    // 피팅 버튼 활성화/비활성화
    const tryOnBtn = document.getElementById('try-on-btn');
    if (progress >= 2) {
        tryOnBtn.disabled = false;
        tryOnBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        tryOnBtn.disabled = true;
        tryOnBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

// 로딩 표시
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

// 진행률 시뮬레이션
let progressInterval = null;

function startProgressSimulation() {
    const progressBar = document.getElementById('api-progress');
    let width = 0;
    
    // 기존 인터벌 정리
    if (progressInterval) {
        clearInterval(progressInterval);
    }
    
    // 새 인터벌 시작
    progressInterval = setInterval(() => {
        if (width < 90) {
            width += Math.random() * 5;
            progressBar.style.width = `${width}%`;
        }
    }, 500);
}

function stopProgressSimulation() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    
    // 100% 완료
    const progressBar = document.getElementById('api-progress');
    progressBar.style.width = '100%';
}

// 에러 표시
function showError(message) {
    console.error('❌ 에러:', message);
    
    const toast = document.getElementById('error-toast');
    const messageEl = document.getElementById('error-message');
    
    messageEl.textContent = message;
    toast.classList.remove('hidden');
    
    // 3초 후 자동 숨김
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// 성공 메시지
function showSuccess(message) {
    console.log('✅ 성공:', message);
    
    // 간단한 토스트 (에러 토스트 재사용)
    const toast = document.getElementById('error-toast');
    const messageEl = document.getElementById('error-message');
    
    // 색상 변경
    toast.classList.remove('bg-red-500');
    toast.classList.add('bg-green-500');
    
    messageEl.textContent = message;
    toast.classList.remove('hidden');
    
    // 3초 후 자동 숨김
    setTimeout(() => {
        toast.classList.add('hidden');
        toast.classList.remove('bg-green-500');
        toast.classList.add('bg-red-500');
    }, 3000);
}

// 도움말 토글
function toggleHelp() {
    const modal = document.getElementById('help-modal');
    modal.classList.toggle('hidden');
}

// ===== 전역 객체 노출 (디버깅용) =====
window.iBurBaFitting = {
    state,
    config: CONFIG,
    startTryOn,
    saveResult,
    shareResult,
    showError,
    showSuccess
};

console.log('✅ fitting-engine.js 초기화 완료');
console.log('📊 디버깅: window.iBurBaFitting 사용 가능');