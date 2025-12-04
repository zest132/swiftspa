/**
 * DOM/템플릿 유틸리티 (공용) - fetch 템플릿/스타일 로딩 등
 * @author 박주병
 */
export async function fetchText(url, baseUrl) {
    // baseUrl가 주어지면 이를 기준으로 상대경로를 절대경로로 변환
    const finalUrl = new URL(url, baseUrl ?? window.location.href).toString();
    const res = await fetch(finalUrl, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`Failed to load: ${finalUrl} (${res.status})`);
    return res.text();
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
export async function loadTemplateToShadow(el, templateUrl, styleUrl, baseUrl, onReady) {
    const shadow = el.shadowRoot ?? el.attachShadow({ mode: "open" });

    // 전역 CSS (최초 1회만 fetch 후 캐시)
    if (!window.__commonCssPromise) {
        window.__commonCssPromise = Promise.all([
            fetchText("../styles/reset.css",import.meta.url),
            // fetchText("/styles/form.css"),
            // fetchText("/styles/checkbox.css"),
            // fetchText("/styles/radio.css"),
            // fetchText("/styles/theme.css"),
            // fetchText("/styles/animation.css"),
        ]);
    }

    const cssList = Array.isArray(styleUrl) ? styleUrl : (styleUrl ? [styleUrl] : []);
    const [html, ...cssFilesAndGlobal] = await Promise.all([
        fetchText(templateUrl, baseUrl),
        ...cssList.map(url => fetchText(url, baseUrl)),
        window.__commonCssPromise
    ]);

    // 마지막 요소가 전역 CSS 배열임
    const commonCssArr = cssFilesAndGlobal.pop();
    const globalCss = Array.isArray(commonCssArr) ? commonCssArr.join("\n") : commonCssArr;
    const cssListText = cssFilesAndGlobal.join("\n");

    while (shadow.firstChild) shadow.removeChild(shadow.firstChild);

    const wrap = document.createElement("template");


    wrap.innerHTML = `
        <style>${globalCss}</style>
        ${cssListText ? `<style>${cssListText}</style>` : ""}
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