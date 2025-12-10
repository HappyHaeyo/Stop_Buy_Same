// 전역 변수 설정
let lipsticks = [];
let myChart = null; // Home tab chart
let scatterChart = null;
let brandChart = null; // New Analysis tab chart
let textureChart = null; // New Analysis tab chart
const colorThief = new ColorThief();

// --- HTML 로딩 후 실행 ---
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    loadData();

    // 1. 이미지 및 색상 추출
    const imageInput = document.getElementById('imageInput');
    if (imageInput) {
        const imagePreview = document.getElementById('imagePreview');
        imageInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function (event) {
                if (imagePreview) {
                    imagePreview.src = event.target.result;
                    imagePreview.classList.remove('hidden');
                }
                const img = new Image();
                img.src = event.target.result;
                img.onload = function () {
                    try {
                        const color = colorThief.getColor(img);
                        const hex = rgbToHex(color[0], color[1], color[2]);
                        const inputHex = document.getElementById('inputHex');
                        if (inputHex) {
                            inputHex.value = hex;
                            checkDuplicateColor(hex); // 🔍 중복 체크 실행
                        }

                        const suggestedTone = suggestTone(color[0], color[1], color[2]);
                        const selectBox = document.getElementById('inputPersonalColor');
                        if (selectBox) {
                            selectBox.value = suggestedTone;
                            selectBox.classList.add('bg-rose-100');
                            setTimeout(() => selectBox.classList.remove('bg-rose-100'), 1000);
                        }
                    } catch (err) { }
                };
            };
            reader.readAsDataURL(file);
        });
    }

    // 색상 수동 변경 감지
    const hexInput = document.getElementById('inputHex');
    if (hexInput) {
        hexInput.addEventListener('input', (e) => {
            checkDuplicateColor(e.target.value);
        });
    }

    // 2. 등록 버튼
    const addBtn = document.getElementById('addBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const brand = document.getElementById('inputBrand')?.value;
            const name = document.getElementById('inputName')?.value;
            const colorName = document.getElementById('inputColorName')?.value;
            const pColor = document.getElementById('inputPersonalColor')?.value;
            const hex = document.getElementById('inputHex')?.value;

            if (!brand && !name) { alert('정보를 입력해주세요!'); return; }
            if (!pColor) { alert('퍼스널 컬러를 선택해주세요!'); return; }

            const newItem = {
                id: Date.now(),
                brand: brand || '', name: name || '', colorNum: colorName || '',
                personalColor: pColor, colorCode: hex || '#000000',
                texture: document.getElementById('inputTexture')?.value || '',
                date: new Date().toISOString()
            };
            lipsticks.push(newItem);
            saveData();
            render();
            updateAnalysis();
            updateScatterChart(); // 차트 업데이트

            // 초기화
            document.getElementById('inputBrand').value = '';
            document.getElementById('inputName').value = '';
            document.getElementById('inputColorName').value = '';
        });
    }

    // 3. 샘플 추가
    const sampleBtn = document.getElementById('sampleBtn');
    if (sampleBtn) {
        sampleBtn.addEventListener('click', () => {
            const samples = [
                { id: Date.now() + 1, brand: '롬앤', name: '쥬시래스팅', colorNum: '피그베리', personalColor: '여름 쿨 뮤트', colorCode: '#C85A65', texture: '글로우' },
                { id: Date.now() + 2, brand: '페리페라', name: '갓기천사', colorNum: '06호', personalColor: '여름 쿨 브라이트', colorCode: '#FE59C2', texture: '글리터' },
                { id: Date.now() + 3, brand: '3CE', name: '다포딜', colorNum: '벨벳틴트', personalColor: '가을 웜 딥', colorCode: '#B25049', texture: '매트' },
                { id: Date.now() + 4, brand: '입생로랑', name: '더 슬림 1966', colorNum: '루주 리브르', personalColor: '가을 웜 다크', colorCode: '#4B3621', texture: '매트' },
                { id: Date.now() + 5, brand: '샤넬', name: '루쥬 알뤼르', colorNum: '99호', personalColor: '겨울 쿨 다크', colorCode: '#3E0015', texture: '매트' },
                { id: Date.now() + 6, brand: '라카', name: '프루티글램', colorNum: '103 험밍', colorCode: '#FFDAC1', personalColor: '봄 웜 라이트', texture: '글로우' }
            ];
            lipsticks = [...lipsticks, ...samples];
            saveData();
            render();
            updateAnalysis();
            updateScatterChart();

            // 피드백 효과
            const originalText = sampleBtn.innerHTML;
            sampleBtn.innerHTML = '<span class="text-green-600 font-bold">✔ 완료!</span>';
            setTimeout(() => { sampleBtn.innerHTML = originalText; }, 1500);
        });
    }

    // 4. 초기화
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('정말 모든 데이터를 삭제할까요?')) {
                lipsticks = []; saveData(); render(); updateAnalysis(); updateScatterChart();
            }
        });
    }

    // 5. CSV 백업
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (lipsticks.length === 0) { alert('데이터가 없어요!'); return; }
            let csvContent = "브랜드,제품명,컬러명,퍼스널컬러,색상코드,제형\n";
            lipsticks.forEach(lip => {
                const row = [lip.brand, lip.name, lip.colorNum, lip.personalColor, lip.colorCode, lip.texture || ''].join(",");
                csvContent += row + "\n";
            });
            const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
            link.setAttribute("href", url);
            link.setAttribute("download", `MyLipstick_${date}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // 6. CSV 가져오기
    const csvUpload = document.getElementById('csvUpload');
    if (csvUpload) {
        csvUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                const lines = text.split('\n');
                let addedCount = 0;
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    const parts = line.split(',');
                    if (parts.length >= 2) {
                        lipsticks.push({
                            id: Date.now() + i,
                            brand: parts[0]?.trim() || '', name: parts[1]?.trim() || '',
                            colorNum: parts[2]?.trim() || '', personalColor: parts[3]?.trim() || '잘 모름',
                            colorCode: parts[4]?.trim() || '#000000',
                            texture: parts[5]?.trim() || '',
                            date: new Date().toISOString()
                        });
                        addedCount++;
                    }
                }
                saveData(); render(); updateAnalysis(); updateScatterChart();
                alert(`${addedCount}개 가져오기 완료!`);
                e.target.value = '';
            };
            reader.readAsText(file);
        });
    }

    // 🛍️ "사고 싶어" 탭 - 이미지 업로드
    const checkImageInput = document.getElementById('checkImageInput');
    if (checkImageInput) {
        const checkImagePreview = document.getElementById('checkImagePreview');
        checkImageInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function (event) {
                if (checkImagePreview) {
                    checkImagePreview.src = event.target.result;
                    checkImagePreview.classList.remove('hidden');
                }
                const img = new Image();
                img.src = event.target.result;
                img.onload = function () {
                    try {
                        const color = colorThief.getColor(img);
                        const hex = rgbToHex(color[0], color[1], color[2]);
                        const checkColorInput = document.getElementById('checkColorInput');
                        if (checkColorInput) checkColorInput.value = hex;
                        findSimilarItems(hex);
                    } catch (err) { console.error(err); }
                };
            };
            reader.readAsDataURL(file);
        });
    }

    // 🛍️ "사고 싶어" 탭 - 색상 체크 버튼
    const checkColorBtn = document.getElementById('checkColorBtn');
    if (checkColorBtn) {
        checkColorBtn.addEventListener('click', () => {
            const checkColorInput = document.getElementById('checkColorInput');
            if (checkColorInput) {
                findSimilarItems(checkColorInput.value);
            }
        });
    }
});

// --- 헬퍼 함수들 ---
function loadData() {
    const saved = localStorage.getItem('lipstickCollection_v3');
    if (saved) lipsticks = JSON.parse(saved);
    render();
    updateAnalysis();
    updateScatterChart();
}

function saveData() { localStorage.setItem('lipstickCollection_v3', JSON.stringify(lipsticks)); updateHeaderCount(); }
function updateHeaderCount() { const el = document.getElementById('headerTotalCount'); if (el) el.textContent = lipsticks.length; }
function rgbToHex(r, g, b) { return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); }

// 🤖 AI 분석
function suggestTone(r, g, b) {
    let rabs = r / 255, gabs = g / 255, babs = b / 255;
    let max = Math.max(rabs, gabs, babs), min = Math.min(rabs, gabs, babs);
    let v = max, s = max == 0 ? 0 : (max - min) / max;
    const isCool = b > r * 0.8 || (r > g && b > g * 0.9);

    if (!isCool) { // 웜톤
        if (v > 0.7 && s < 0.6) return '봄 웜 라이트';
        if (v > 0.6 && s >= 0.6) return '봄 웜 브라이트';
        if (v <= 0.6 && s < 0.6) return '가을 웜 뮤트';
        if (v <= 0.3) return '가을 웜 다크';
        return '가을 웜 딥';
    } else { // 쿨톤
        if (v > 0.7) return s >= 0.5 ? '여름 쿨 브라이트' : '여름 쿨 라이트';
        if (v > 0.5 && s < 0.7) return '여름 쿨 뮤트';
        if (v <= 0.3) return '겨울 쿨 다크';
        return s >= 0.7 ? '겨울 쿨 브라이트' : '겨울 쿨 딥';
    }
}

// 📊 막대 그래프
function updateAnalysis() {
    const section = document.getElementById('analysisSection');
    if (!section) return;
    const validData = lipsticks.filter(l => l.personalColor !== '잘 모름');
    if (validData.length === 0) { section.classList.add('hidden'); return; }
    section.classList.remove('hidden');

    const counts = {
        '봄 웜 라이트': 0, '봄 웜 브라이트': 0,
        '여름 쿨 라이트': 0, '여름 쿨 브라이트': 0, '여름 쿨 뮤트': 0,
        '가을 웜 뮤트': 0, '가을 웜 딥': 0, '가을 웜 다크': 0,
        '겨울 쿨 브라이트': 0, '겨울 쿨 딥': 0, '겨울 쿨 다크': 0
    };
    validData.forEach(lip => { if (counts[lip.personalColor] !== undefined) counts[lip.personalColor]++; });

    const canvas = document.getElementById('personalColorChart');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (myChart) myChart.destroy();
        const toneColors = [
            '#e56b68', '#fa361c', '#f0a9b1', '#e55c9d', '#c0595a', '#c96f6f', '#b65e61', '#4d313d', '#D31C43', '#852438', '#4c1d30'
        ];
        myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['봄라', '봄브', '여라', '여브', '여뮤', '갈뮤', '갈딥', '갈닼', '겨브', '겨딥', '겨닼'],
                datasets: [{ data: Object.values(counts), backgroundColor: toneColors, borderRadius: 50, barThickness: 10 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 9 } } }, y: { display: false, grid: { display: false } } } }
        });
    }

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = sorted[0];
    let text = `<div class="flex flex-col items-center justify-center text-center"><span class="text-sm text-gray-400 mb-1">최다 보유 톤</span><div class="text-xl text-rose-600 font-bold flex items-center gap-2">✨ ${max[0]} <span class="bg-rose-100 text-rose-600 text-xs px-2 py-1 rounded-full">${max[1]}개</span></div></div>`;
    const analysisText = document.getElementById('analysisText');
    if (analysisText) analysisText.innerHTML = text;
}

// ⚠️ 중복 색상 경고 로직 (CIELAB Delta E)
function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function rgbToLab(r, g, b) {
    let r1 = r / 255, g1 = g / 255, b1 = b / 255;
    r1 = (r1 > 0.04045) ? Math.pow((r1 + 0.055) / 1.055, 2.4) : r1 / 12.92;
    g1 = (g1 > 0.04045) ? Math.pow((g1 + 0.055) / 1.055, 2.4) : g1 / 12.92;
    b1 = (b1 > 0.04045) ? Math.pow((b1 + 0.055) / 1.055, 2.4) : b1 / 12.92;

    let x = (r1 * 0.4124 + g1 * 0.3576 + b1 * 0.1805) / 0.95047;
    let y = (r1 * 0.2126 + g1 * 0.7152 + b1 * 0.0722) / 1.00000;
    let z = (r1 * 0.0193 + g1 * 0.1192 + b1 * 0.9505) / 1.08883;

    x = (x > 0.008856) ? Math.pow(x, 1 / 3) : (7.787 * x) + 16 / 116;
    y = (y > 0.008856) ? Math.pow(y, 1 / 3) : (7.787 * y) + 16 / 116;
    z = (z > 0.008856) ? Math.pow(z, 1 / 3) : (7.787 * z) + 16 / 116;

    return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
}

function calculateDeltaE(hex1, hex2) {
    const rgb1 = hexToRgb(hex1); const rgb2 = hexToRgb(hex2);
    const lab1 = rgbToLab(rgb1[0], rgb1[1], rgb1[2]);
    const lab2 = rgbToLab(rgb2[0], rgb2[1], rgb2[2]);

    const deltaL = lab1[0] - lab2[0];
    const deltaA = lab1[1] - lab2[1];
    const deltaB = lab1[2] - lab2[2];

    return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}

function checkDuplicateColor(targetHex) {
    if (!lipsticks || lipsticks.length === 0) return;

    let mostSimilar = null;
    let minDeltaE = Infinity;

    lipsticks.forEach(item => {
        const deltaE = calculateDeltaE(targetHex, item.colorCode);
        if (deltaE < minDeltaE) {
            minDeltaE = deltaE;
            mostSimilar = item;
        }
    });

    // Similarity > 90% logic: DeltaE < 10 (approx)
    const threshold = 10;
    const warningEl = document.getElementById('duplicateWarning');
    if (!warningEl) return;

    if (minDeltaE < threshold && mostSimilar) {
        const percent = Math.max(0, Math.min(100, Math.round(100 - (minDeltaE * 2)))); // Rudimentary % calc
        warningEl.innerHTML = `
            <div class="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 animate-bounce">
                <i data-lucide="alert-triangle" class="w-6 h-6 text-red-500 flex-none"></i>
                <div class="flex-1">
                    <h4 class="font-bold text-red-600 text-sm mb-1">잠깐! ✋ 이미 비슷한 색이 있어요.</h4>
                    <p class="text-xs text-red-500">
                        파우치에 있는 <strong>[${mostSimilar.brand} ${mostSimilar.name}]</strong> 제품과<br>
                        색상이 약 <strong>${percent}%</strong> 일치해요! 돈 낭비는 놉! 💸
                    </p>
                </div>
            </div>
        `;
        warningEl.classList.remove('hidden');
        lucide.createIcons();
    } else {
        warningEl.classList.add('hidden');
    }
}

// 🛍️ 사고 싶은 립스틱과 비슷한 제품 찾기
function findSimilarItems(targetHex) {
    const resultsDiv = document.getElementById('similarityResults');
    const noSimilarDiv = document.getElementById('noSimilarMessage');
    const itemsList = document.getElementById('similarItemsList');

    if (!resultsDiv || !noSimilarDiv || !itemsList) return;
    if (!lipsticks || lipsticks.length === 0) {
        resultsDiv.classList.add('hidden');
        noSimilarDiv.classList.remove('hidden');
        return;
    }

    // 모든 제품의 유사도 계산
    const similarities = lipsticks.map(item => {
        const deltaE = calculateDeltaE(targetHex, item.colorCode);
        const percent = Math.max(0, Math.min(100, Math.round(100 - (deltaE * 2))));
        return { item, deltaE, percent };
    });

    // 유사도 순으로 정렬 (높은 순)
    similarities.sort((a, b) => b.percent - a.percent);

    // 90% 이상만 표시
    const threshold = 10; // DeltaE < 10
    const similar = similarities.filter(s => s.deltaE < threshold);

    if (similar.length === 0) {
        resultsDiv.classList.add('hidden');
        noSimilarDiv.classList.remove('hidden');
    } else {
        noSimilarDiv.classList.add('hidden');
        resultsDiv.classList.remove('hidden');

        itemsList.innerHTML = '';
        similar.forEach(s => {
            const html = `
                <div class="flex items-center gap-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                    <div class="w-12 h-12 rounded-full flex-none shadow-inner border-2 border-white" style="background-color: ${s.item.colorCode}"></div>
                    <div class="flex-1">
                        <p class="font-bold text-stone-700">${s.item.brand} - ${s.item.name}</p>
                        <p class="text-xs text-stone-500">${s.item.colorNum || ''} · ${s.item.personalColor}</p>
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold text-orange-600">${s.percent}%</div>
                        <p class="text-[10px] text-orange-500 font-medium">유사도</p>
                    </div>
                </div>
            `;
            itemsList.insertAdjacentHTML('beforeend', html);
        });
        lucide.createIcons();
    }
}

// 🎯 사분면 차트 (안전장치 추가됨)
function updateScatterChart() {
    const canvas = document.getElementById('scatterChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (scatterChart) scatterChart.destroy();

    const mapToneToCoords = (tone) => {
        const jitter = () => (Math.random() - 0.5) * 1.5;
        switch (tone) {
            case '봄 웜 라이트': return { x: -4 + jitter(), y: 6 + jitter() };
            case '봄 웜 브라이트': return { x: -2 + jitter(), y: 3 + jitter() };
            case '여름 쿨 라이트': return { x: 4 + jitter(), y: 6 + jitter() };
            case '여름 쿨 브라이트': return { x: 2 + jitter(), y: 3 + jitter() };
            case '여름 쿨 뮤트': return { x: 1 + jitter(), y: 0 + jitter() };
            case '가을 웜 뮤트': return { x: -1 + jitter(), y: 0 + jitter() };
            case '가을 웜 딥': return { x: -4 + jitter(), y: -4 + jitter() };
            case '가을 웜 다크': return { x: -6 + jitter(), y: -7 + jitter() };
            case '겨울 쿨 브라이트': return { x: 2 + jitter(), y: -2 + jitter() };
            case '겨울 쿨 딥': return { x: 4 + jitter(), y: -5 + jitter() };
            case '겨울 쿨 다크': return { x: 6 + jitter(), y: -7 + jitter() };
            default: return null; // 🚨 알 수 없는 톤이면 null 반환
        }
    };

    // 🚨 여기서 null 체크를 해서 오류 방지
    const scatterData = lipsticks
        .filter(l => l.personalColor !== '잘 모름')
        .map(l => {
            const coords = mapToneToCoords(l.personalColor);
            if (!coords) return null; // 좌표가 없으면 건너뜀
            return { x: coords.x, y: coords.y, brand: l.brand, name: l.name, colorCode: l.colorCode, texture: l.texture };
        })
        .filter(item => item !== null); // null 값 제거

    // 제형별 포인트 스타일 매핑 함수
    // 제형별 포인트 스타일 매핑 함수
    const getPointStyle = (texture) => {
        switch (texture) {
            case '글로우': return 'circle';
            case '촉촉': return 'circle'; // Legacy support
            case '매트': return 'triangle';
            case '글리터': return 'star';
            default: return 'circle';
        }
    };

    scatterChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                data: scatterData,
                pointBackgroundColor: (ctx) => ctx.raw?.colorCode || '#000',
                pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 8, pointHoverRadius: 10,
                pointStyle: (ctx) => getPointStyle(ctx.raw?.texture)
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.raw.brand} ${ctx.raw.name}` } } },
            scales: { x: { min: -10, max: 10, display: false }, y: { min: -10, max: 10, display: false } }
        }
    });
}

function render(filter = 'all', searchQuery = '') {
    const grid = document.getElementById('lipstickGrid');
    if (!grid) return;
    grid.innerHTML = '';

    // 퍼스널 컬러 필터 + 검색어 필터
    let filtered = lipsticks.filter(lip => filter === 'all' || lip.personalColor.includes(filter));

    // 검색어가 있으면 추가 필터링
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(lip =>
            (lip.brand && lip.brand.toLowerCase().includes(q)) ||
            (lip.name && lip.name.toLowerCase().includes(q)) ||
            (lip.colorNum && lip.colorNum.toLowerCase().includes(q))
        );
    }

    if (filtered.length === 0) { grid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-400">등록된 립스틱이 없어요 😢</div>'; return; }

    filtered.forEach(lip => {
        const html = `
        <div class="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex gap-3 items-center relative fade-in group">
            <div class="w-10 h-10 rounded-full color-swatch flex-none shadow-inner" style="background-color: ${lip.colorCode}"></div>
            <div class="flex-1 min-w-0">
                <div class="text-[10px] text-stone-400 font-bold mb-0.5">${lip.brand}</div>
                <div class="font-bold text-stone-700 text-sm truncate">${lip.name}</div>
                <div class="text-xs text-rose-500 font-medium truncate mt-0.5">${lip.colorNum || '-'}</div>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-[10px] bg-stone-100 px-1.5 py-0.5 rounded text-stone-500 truncate">${lip.personalColor}</span>
                    ${lip.texture ? `<span class="text-[10px] bg-rose-100 px-1.5 py-0.5 rounded text-rose-600 truncate font-medium">${lip.texture}</span>` : ''}
                </div>
            </div>
            <button onclick="deleteItem(${lip.id})" class="text-stone-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>`;
        grid.insertAdjacentHTML('beforeend', html);
    });
    lucide.createIcons();
}

// 🔍 상세 분석 리포트 업데이트
/** @description 상세 분석 탭의 차트와 통계를 업데이트합니다. */
function updateDetailedAnalysis() {
    const view = document.getElementById('view-analysis');
    if (!view || view.classList.contains('hidden-tab')) return;

    // 1. 데이터 집계
    const total = lipsticks.length;
    if (total === 0) return;

    // (1) 톤 집계
    const toneCounts = {};
    lipsticks.forEach(l => { if (l.personalColor) toneCounts[l.personalColor] = (toneCounts[l.personalColor] || 0) + 1; });
    const topTone = Object.entries(toneCounts).sort((a, b) => b[1] - a[1])[0];

    // (2) 브랜드 집계
    const brandCounts = {};
    lipsticks.forEach(l => {
        const b = l.brand ? l.brand.trim() : 'Unknown';
        brandCounts[b] = (brandCounts[b] || 0) + 1;
    });
    const sortedBrands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]);
    const topBrand = sortedBrands[0];

    // (3) 제형 분석 (texture 필드 기반)
    let glowCount = 0;
    let matteCount = 0;
    let glitterCount = 0;

    lipsticks.forEach(l => {
        const tex = l.texture || '';
        if (tex === '글로우' || tex === '촉촉') glowCount++;
        else if (tex === '매트') matteCount++;
        else if (tex === '글리터') glitterCount++;
    });

    // UI 업데이트 (카드)
    if (topTone) {
        document.getElementById('stat-tone-val').textContent = topTone[0];
        document.getElementById('stat-tone-desc').textContent = `${topTone[1]}개 보유 중`;
    }
    if (topBrand) {
        document.getElementById('stat-brand-val').textContent = topBrand[0];
        document.getElementById('stat-brand-desc').textContent = `${topBrand[1]}개 보유 중`;
    }

    const totalTexture = glowCount + matteCount + glitterCount;
    if (totalTexture > 0) {
        // 가장 많은 제형 찾기
        const textureCounts = { '글로우': glowCount, '매트': matteCount, '글리터': glitterCount };
        const topTexture = Object.entries(textureCounts).sort((a, b) => b[1] - a[1])[0];
        const emoji = topTexture[0] === '글로우' ? '💧' : (topTexture[0] === '매트' ? '☁️' : '✨');
        document.getElementById('stat-texture-val').textContent = `${emoji} ${topTexture[0]} 파`;
        document.getElementById('stat-texture-desc').textContent = `글로우 ${glowCount} / 매트 ${matteCount} / 글리터 ${glitterCount}`;
    }

    // 📊 차트 그리기
    // (1) 브랜드 Top 5 차트
    const brandCanvas = document.getElementById('brandChart');
    if (brandCanvas) {
        const ctxB = brandCanvas.getContext('2d');
        if (brandChart) brandChart.destroy();
        const top5Brands = sortedBrands.slice(0, 5);
        brandChart = new Chart(ctxB, {
            type: 'bar',
            data: {
                labels: top5Brands.map(b => b[0]),
                datasets: [{
                    label: '보유 수',
                    data: top5Brands.map(b => b[1]),
                    backgroundColor: ['#FFB5B5', '#FFD1DC', '#E7BCD2', '#E2F0CB', '#B5EAD7'],
                    borderRadius: 8
                }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    // (2) 제형 파이 차트
    const textureCanvas = document.getElementById('textureChart');
    if (textureCanvas) {
        const ctxT = textureCanvas.getContext('2d');
        if (textureChart) textureChart.destroy();
        textureChart = new Chart(ctxT, {
            type: 'doughnut',
            data: {
                labels: ['글로우', '매트', '기타'],
                datasets: [{
                    data: [glowCount, matteCount, total - glowCount - matteCount],
                    backgroundColor: ['#FF9AA2', '#C7CEEA', '#E0E0E0'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
        });
    }
}

window.deleteItem = function (id) { if (confirm('삭제하시겠습니까?')) { lipsticks = lipsticks.filter(l => l.id !== id); saveData(); render(); updateAnalysis(); updateScatterChart(); } }
window.filterBy = function (cat) {
    document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
    const map = { 'all': 'filter-all', '봄': 'filter-spring', '여름': 'filter-summer', '가을': 'filter-autumn', '겨울': 'filter-winter' };
    document.getElementById(map[cat])?.classList.add('active');
    // 검색창 값도 함께 전달
    const searchInput = document.getElementById('searchInput');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    render(cat, query);
}

// 🎲 오늘의 립 추천
function recommendLip() {
    if (!lipsticks || lipsticks.length === 0) {
        alert('등록된 립스틱이 없어요! 먼저 립스틱을 등록해주세요.');
        return;
    }

    const btn = document.querySelector('button[onclick="recommendLip()"]');
    if (btn) btn.disabled = true;

    const display = document.getElementById('recommendDisplay');
    const colorBox = document.getElementById('recommendColor');
    const brandText = document.getElementById('recommendBrand');
    const nameText = document.getElementById('recommendName');
    const colorNameText = document.getElementById('recommendColorName');

    let count = 0;
    const maxCount = 20; // 20번 바뀜
    const interval = setInterval(() => {
        const randomLip = lipsticks[Math.floor(Math.random() * lipsticks.length)];

        // 애니메이션 중 업데이트
        if (colorBox) colorBox.style.backgroundColor = randomLip.colorCode;
        if (brandText) brandText.innerText = randomLip.brand;
        if (nameText) nameText.innerText = randomLip.name;
        if (colorNameText) colorNameText.innerText = randomLip.colorNum || '';

        count++;
        if (count >= maxCount) {
            clearInterval(interval);
            if (btn) btn.disabled = false;

            // 최종 결과 강조 효과
            if (display) {
                display.style.transform = "scale(1.1)";
                setTimeout(() => display.style.transform = "scale(1)", 200);
            }
        }
    }, 100);
}

// 🖥️ 차트 전체화면 토글
function toggleChartFullScreen() {
    const card = document.getElementById('scatterChart')?.closest('.rounded-3xl');
    if (!card) return;

    card.classList.toggle('fixed');
    card.classList.toggle('inset-0');
    card.classList.toggle('z-50');
    card.classList.toggle('h-full');

    // 차트 크기 재조정 트리거
    setTimeout(() => {
        if (typeof updateScatterChart === 'function') updateScatterChart();
    }, 100);
}

// ==========================================
// 💄 가상 립 체험 (PLAY Tab) 기능
// ==========================================

let webcamStream = null;
let isDetecting = false;
let selectedLipColor = '#E74C3C';
let lipOpacity = 0.6;
let faceApiLoaded = false;

// 📷 카메라 시작
async function startCamera() {
    const video = document.getElementById('webcamVideo');
    const loading = document.getElementById('cameraLoading');
    const startBtn = document.getElementById('startCameraBtn');
    const stopBtn = document.getElementById('stopCameraBtn');

    if (!video) return;

    try {
        // face-api.js 모델 로드 (최초 1회)
        if (!faceApiLoaded && typeof faceapi !== 'undefined') {
            loading.innerHTML = '<p class="text-sm text-white">🔄 AI 모델 로딩 중...</p>';
            const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            faceApiLoaded = true;
            console.log('Face-API 모델 로드 완료!');
        }

        // 웹캠 스트림 요청
        loading.innerHTML = '<p class="text-sm text-white">📷 카메라 연결 중...</p>';
        webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: 'user' }
        });
        video.srcObject = webcamStream;

        // 비디오 준비 대기
        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play();
                resolve();
            };
        });

        // UI 업데이트
        loading.classList.add('hidden');
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');

        // 립 컬러 그리드 업데이트
        updateLipColorGrid();

        // 얼굴 감지 루프 시작
        isDetecting = true;
        detectAndDrawLips();

    } catch (err) {
        console.error('카메라 오류:', err);
        loading.innerHTML = `<p class="text-sm text-red-400">오류: ${err.message}</p>`;
    }
}

// 📷 카메라 끄기
function stopCamera() {
    const video = document.getElementById('webcamVideo');
    const loading = document.getElementById('cameraLoading');
    const startBtn = document.getElementById('startCameraBtn');
    const stopBtn = document.getElementById('stopCameraBtn');
    const canvas = document.getElementById('lipOverlayCanvas');

    isDetecting = false;

    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = null;
    }

    if (video) video.srcObject = null;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // UI 복원
    loading.classList.remove('hidden');
    loading.innerHTML = `
        <i data-lucide="camera-off" class="w-16 h-16 mb-4 opacity-50"></i>
        <p class="text-sm opacity-70">카메라를 시작하려면 아래 버튼을 눌러주세요</p>
    `;
    lucide.createIcons();
    startBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
}

// 👄 얼굴 감지 및 립 오버레이 그리기
async function detectAndDrawLips() {
    if (!isDetecting) return;

    const video = document.getElementById('webcamVideo');
    const canvas = document.getElementById('lipOverlayCanvas');

    if (!video || !canvas || typeof faceapi === 'undefined' || !faceApiLoaded) {
        requestAnimationFrame(detectAndDrawLips);
        return;
    }

    // 비디오 준비 확인
    if (video.readyState < 2) {
        requestAnimationFrame(detectAndDrawLips);
        return;
    }

    // 캔버스 크기 맞춤
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    canvas.width = displaySize.width;
    canvas.height = displaySize.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
        const detection = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
            .withFaceLandmarks();

        if (detection) {
            const landmarks = detection.landmarks;
            const mouth = landmarks.getMouth(); // 20개 포인트

            // 입술 전체 그리기
            ctx.beginPath();
            ctx.moveTo(mouth[0].x, mouth[0].y);
            for (let i = 1; i < mouth.length; i++) {
                ctx.lineTo(mouth[i].x, mouth[i].y);
            }
            ctx.closePath();

            // 색상 적용 (투명도 포함)
            const hex = selectedLipColor;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${lipOpacity})`;
            ctx.fill();
        }
    } catch (e) {
        console.error('Detection error:', e);
    }

    // 다음 프레임
    setTimeout(() => {
        requestAnimationFrame(detectAndDrawLips);
    }, 50); // 약 20fps로 제한하여 성능 개선
}

// 🎨 립 컬러 그리드 업데이트
function updateLipColorGrid() {
    const grid = document.getElementById('lipColorGrid');
    const noMsg = document.getElementById('noLipMessage');
    if (!grid) return;

    grid.innerHTML = '';

    if (!lipsticks || lipsticks.length === 0) {
        if (noMsg) noMsg.classList.remove('hidden');
        return;
    }

    if (noMsg) noMsg.classList.add('hidden');

    lipsticks.forEach(lip => {
        const btn = document.createElement('button');
        btn.className = 'w-10 h-10 rounded-full border-2 border-white shadow-md hover:scale-110 transition cursor-pointer ring-offset-2 focus:ring-2 focus:ring-rose-400';
        btn.style.backgroundColor = lip.colorCode;
        btn.title = `${lip.brand} - ${lip.name}`;
        btn.onclick = () => selectLipColor(lip.colorCode, btn);
        grid.appendChild(btn);
    });

    // 첫 번째 색상 기본 선택
    if (lipsticks.length > 0) {
        selectedLipColor = lipsticks[0].colorCode;
    }
}

// 🎨 립 컬러 선택
function selectLipColor(hex, btnElement) {
    selectedLipColor = hex;

    // 선택 효과
    document.querySelectorAll('#lipColorGrid button').forEach(b => {
        b.classList.remove('ring-2', 'ring-rose-500');
    });
    if (btnElement) {
        btnElement.classList.add('ring-2', 'ring-rose-500');
    }
}

// 🎚️ 투명도 슬라이더 이벤트
document.addEventListener('DOMContentLoaded', () => {
    const slider = document.getElementById('lipOpacitySlider');
    const valueLabel = document.getElementById('lipOpacityValue');

    if (slider && valueLabel) {
        slider.addEventListener('input', (e) => {
            lipOpacity = parseInt(e.target.value, 10) / 100;
            valueLabel.textContent = `${e.target.value}%`;
        });
    }
});

