/**
 * SPA Router
 * - URL → /pages/.../index.html 규칙으로 정적 조각을 로드
 * - 루트(/)는 /pages/loading/index.html 로 매핑
 * - data-init 속성: 페이지 전용 초기화 스크립트 동적 import
 * - data-modules 속성: 필요한 Web Component 동적 import
 *
 * @author 박주병
 */
import { fetchText } from './dom.js';
import { applyConditionalRendering } from './conditional.js';
import { waitForImages } from './utils.js';


function defaultResolvePageUrl(path) {
    return `/pages${path}/index.html`;
}

let customResolver = null;

export function configureSpa(options = {}) {
    if (typeof options.resolvePageUrl === "function") {
        customResolver = options.resolvePageUrl;
    }
}



/**
 * URL path를 /pages 경로로 변환
 * @param {string} path - 예: "/public/reservations/new"
 * @returns {string}    - 예: "/pages/public/reservations/new/index.html"
 */
function resolvePageUrl(path) {
    if (customResolver) {
        return customResolver(path, defaultResolvePageUrl);
    }
    return defaultResolvePageUrl(path);
}

/**
 * CamelCase 나 대문자가 들어간 태그는 WebComponent 규칙상 소문자-케밥으로 강제됨
 * ex) <MobileMenu> → mobile-menu
 */
function normalizeTagName(tag) {
    return tag.trim().toLowerCase();
}



/**
 * 페이지 내 등장한 custom elements를 기준으로 필요한 컴포넌트만 lazy-load
 */
async function loadMissingComponents(root = document) {
    const allTags = new Set();

    // HTML 요소 스캔
    root.querySelectorAll('*').forEach(el => {
        const tag = el.tagName.toLowerCase();
        if (tag.includes('-')) {
            allTags.add(tag);
        }
    });

    // ShadowRoot 내부도 포함
    root.querySelectorAll('*').forEach(el => {
        if (el.shadowRoot) {
            el.shadowRoot.querySelectorAll('*').forEach(shEl => {
                const tag = shEl.tagName.toLowerCase();
                if (tag.includes('-')) {
                    allTags.add(tag);
                }
            });
        }
    });

    for (const tagName of allTags) {
        if (customElements.get(tagName)) continue;

        // /components/mobile-menu/mobile-menu.js 규칙
        const baseDir = `/components/${tagName}/`;
        const jsPath = `${baseDir}index.js`;

        try {
            const module = await import(jsPath);
            const Ctor = module.default;

            if (typeof Ctor !== 'function') {
                console.warn(`[SwiftSPA] ${jsPath} 에서 default export class 를 찾을 수 없습니다.`);
                continue;
            }

            // 컴포넌트 등록
            customElements.define(tagName, Ctor);

            // BaseComponent에게 baseDir 전달 (자동 템플릿 로딩용)
            Ctor.__swiftspa_baseDir = baseDir;

        } catch (err) {
            console.warn(`[SwiftSPA] 컴포넌트 로딩 실패: ${jsPath}`, err);
        }
    }
}





/**
 * path에 맞는 템플릿을 가져와서 #app-main 에 삽입
 * @param {string} path - 라우트 경로
 * @param {string|null} preloadedHtml - (옵션) 미리 받아둔 HTML 문자열
 */
export async function navigate(path, preloadedHtml = null) {
    try {
        const tplUrl = resolvePageUrl(path);                // ex: /pages/public/landing/index.html
        const html = preloadedHtml ?? await fetchText(tplUrl);

        const main = document.querySelector('#app-main');
        main.innerHTML = html;

        // -----------------------------
        // ① index.css 자동 로드
        // -----------------------------
        const cssPath = tplUrl.replace(/index\.html$/, "style.css");
        if (!document.querySelector(`link[data-page-css="${cssPath}"]`)) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = cssPath;
            link.setAttribute("data-page-css", cssPath);
            document.head.appendChild(link);
        }

        // -----------------------------
        // ② index.js 자동 로드 → init() 자동 실행
        // -----------------------------
        const jsPath = tplUrl.replace(/index\.html$/, "index.js");

        try {
            const mod = await import(jsPath);
            if (typeof mod.init === "function") {
                mod.init();
            }
        } catch (err) {
            // ★ index.js가 없는 경우는 정상 → 조용히 패스
        }

    } catch (e) {
        console.error('페이지 로드 실패:', e);
        document.querySelector('#app-main').innerHTML = `<p>페이지를 불러올 수 없습니다.</p>`;
    }
    finally {
        // SPA 네비게이션 이벤트 발생
        window.dispatchEvent(new CustomEvent('spa:navigate', { detail: { path } }));

        // 이미지 로드 완료 후(afterRender) 이벤트
        waitForImages(document).then(() => {
            window.dispatchEvent(
                new CustomEvent('spa:afterRender', { detail: { path } })
            );
        });

        // 조건부 렌더링 적용
        applyConditionalRendering();
        //페이지 내 custom elements 자동 스캔 + LazyLoading
        await loadMissingComponents(document);
    }
}


/**
 * 내부 링크 가로채기 핸들러
 */
async function handleInternalLink(e) {

    const path = e.composedPath();
    const a = path.find(el => el instanceof HTMLElement && el.matches('a[href]'));
    if (!a) return;

    // data-no-spa 속성이 있으면 일반 링크로 처리
    if (a.dataset.noSpa !== undefined) return;

    // 외부 도메인 링크는 SPA 가로채지 않음
    if (a.origin !== location.origin) return;

    // target="_blank" 같은 새 창 링크는 제외
    if (a.target && a.target !== '_self') return;

    const href = a.getAttribute('href');
    if (!href) return;

    // -------------------------------
    // ① 해시(#)로 시작하는 내부 앵커 → navigate() 하지 않음
    // -------------------------------
    if (href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
        return;
    }

    // -------------------------------
    // ② 경로 + 해시 조합 (/page#section)
    // -------------------------------
    if (href.includes('#')) {
        e.preventDefault();
        const [pathPart, hashPart] = href.split('#');
        history.pushState({}, '', href);
        await navigate(pathPart);
        const target = document.querySelector(`#${hashPart}`);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
        return;
    }

    // -------------------------------
    // ③ 일반 경로는 기본 SPA 네비게이션
    // -------------------------------
    e.preventDefault();
    history.pushState({}, '', href);
    navigate(href);
}







export function injectGlobalStyles() {

    const globalStyles = [
        '/swiftspa/styles/reset.css',
    ];

    const head = document.head;
    globalStyles.forEach(url => {
        if (!head.querySelector(`link[data-swiftspa="${url}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            link.setAttribute('data-swiftspa', url);
            head.appendChild(link);
        }
    });
}



/**
 * SPA 전체를 초기화하는 함수 (SwiftSPA 핵심)
 */
export function startSpa() {

    console.log("startSpa() called.");
    // 1) 최초 진입 페이지 로드
    navigate(location.pathname);

    // 2) 뒤로가기/앞으로가기 이벤트
    window.addEventListener('popstate', () => navigate(location.pathname));

    // 3) 내부 링크 클릭 가로채기
    document.addEventListener('click', handleInternalLink);
}