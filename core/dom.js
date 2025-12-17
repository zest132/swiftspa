/**
 * DOM/템플릿 유틸리티 (공용) - fetch 템플릿/스타일 로딩 등
 * @author 박주병
 */
export async function fetchText(url, baseUrl) {
    // baseUrl이 "/components/menu-mobile/" 같은 path일 경우,
    // window.location.origin을 기준으로 절대 URL로 변환
    const finalBase = baseUrl
        ? new URL(baseUrl, window.location.origin).toString()
        : window.location.href;

    const finalUrl = new URL(url, finalBase).toString();

    const res = await fetch(finalUrl, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`Failed to load: ${finalUrl} (${res.status})`);
    return res.text();
}

/**
 * layout.html에 선언된 Shadow 전달용 CSS 링크 수집
 * <link rel="stylesheet" data-shadow>
 */
function collectLayoutShadowCssUrls() {
    return Array.from(
        document.querySelectorAll('link[rel="stylesheet"][data-shadow]')
    ).map(link => link.href);
}



function resolveRelativePaths(html, baseUrl) {
    // baseUrl → 절대경로로 변환 (도메인 포함)
    const absoluteBase = new URL(baseUrl, window.location.origin).href;

    // 마지막 파일명 제거 → 디렉토리 경로만 남김
    const baseDir = absoluteBase.replace(/\/[^/]*$/, "/");

    return html.replace(/(src|href)=["'](.+?)["']/g, (match, attr, url) => {

        // 절대경로는 그대로
        if (url.startsWith("http") || url.startsWith("/") || url.startsWith("#")) {
            return match;
        }

        // 상대경로 → 절대경로 변환
        const absoluteUrl = new URL(url, baseDir).href;

        return `${attr}="${absoluteUrl}"`;
    });
}


/**
 * Shadow DOM에 template(html)과 style(css)들을 로드하여 주입한다.
 * - 기존 시그니처 유지: loadTemplateToShadow(el, tplUrl, styleUrl, baseUrl, onReady)
 * - 상대경로 안전 처리 (baseUrl 기준)
 * - 중복 attachShadow 방지
 * @param {HTMLElement} el
 * @param {string} templateUrl - html 템플릿 경로(상대/절대)
 * @param {string} [styleUrl]  - css 경로(상대/절대, 없으면 무시)
 * @param {string|URL} [baseUrl] - 상대경로 해석 기준(보통 import.meta.url)
 * @param {(shadow: ShadowRoot)=>void} [onReady] - 로드 완료 후 콜백
 * @returns {Promise<ShadowRoot>}
 * @author 박주병
 */
export async function loadTemplateToShadow(
    el,
    templateUrl,
    styleUrl,
    baseUrl,
    onReady,
    {
        useLayoutStyles = true
    } = {}
) {
    const shadow = el.shadowRoot ?? el.attachShadow({ mode: "open" });


    // 1. layout.html에서 data-shadow CSS 수집
    const layoutCssUrls = useLayoutStyles
        ? collectLayoutShadowCssUrls()
        : [];

    console.log(layoutCssUrls);
    // 2. 컴포넌트 전용 CSS
    const componentCssUrls = Array.isArray(styleUrl)
        ? styleUrl
        : (styleUrl ? [styleUrl] : []);

    // 3. CSS 캐시 초기화
    if (!window.__shadowCssCache) {
        window.__shadowCssCache = {};
    }

    // 4. CSS fetch (layout / component 분리 처리)
    const cssTexts = await Promise.all([
        // ─────────────────────────────
        // layout CSS (절대경로)
        // ─────────────────────────────
        ...layoutCssUrls.map(url => {
            if (!window.__shadowCssCache[url]) {
                window.__shadowCssCache[url] = fetchText(url);
            }
            return window.__shadowCssCache[url];
        }),

        // ─────────────────────────────
        // component CSS (상대경로 + baseDir 기준)
        // ─────────────────────────────
        ...componentCssUrls.map(url => {
            // baseUrl + url 조합으로 캐시 키 생성
            const cacheKey = `${baseUrl}::${url}`;

            if (!window.__shadowCssCache[cacheKey]) {
                window.__shadowCssCache[cacheKey] = fetchText(url, baseUrl);
            }
            return window.__shadowCssCache[cacheKey];
        })
    ]);

    // 5. HTML fetch
    let html = await fetchText(templateUrl, baseUrl);
    html = resolveRelativePaths(html, baseUrl);

    // 6. Shadow 초기화
    while (shadow.firstChild) shadow.removeChild(shadow.firstChild);

    const wrap = document.createElement("template");
    wrap.innerHTML = `
        <style>${cssTexts.join("\n")}</style>
        ${html}
    `;

    shadow.appendChild(wrap.content.cloneNode(true));
    onReady?.(shadow);

    return shadow;
}






/**
 * DOM ↔ 데이터 바인딩 유틸리티
 * - WeakMap을 통해 DOM Element와 데이터 객체를 연결한다.
 * - DOM이 제거되면 GC에 의해 자동 해제된다.
 * @example
 *   bindData(el, bookingItem);
 *   const item = getBoundData(el);
 * @author 박주병
 */
const __bindingMap = new WeakMap();

/**
 * 특정 DOM 요소에 데이터 객체를 바인딩한다.
 * @param {HTMLElement} el - 바인딩할 DOM 요소
 * @param {Object} data - 연결할 데이터 객체
 */
export function bindData(el, data) {
    if (!(el instanceof HTMLElement)) {
        throw new Error("bindData: HTMLElement가 필요합니다.");
    }
    __bindingMap.set(el, data);
}

/**
 * 특정 DOM 요소에 바인딩된 데이터를 반환한다.
 * @param {HTMLElement} el - 조회할 요소
 * @returns {Object|null} - 연결된 데이터 객체(없으면 null)
 */
export function getBoundData(el) {
    return __bindingMap.get(el) ?? null;
}

/**
 * 특정 DOM 요소에 바인딩된 데이터를 해제한다.
 * @param {HTMLElement} el - 해제할 요소
 */
export function unbindData(el) {
    __bindingMap.delete(el);
}


/**
 * 전역 + Shadow DOM 포함해서 특정 셀렉터 찾기
 */
export function queryAllDeep(selector) {
    const elements = [];
    const search = (root) => {
        root.querySelectorAll(selector).forEach(el => elements.push(el));
        root.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) search(el.shadowRoot);
        });
    };
    search(document);
    return elements;
}