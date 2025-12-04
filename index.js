

import { configureSpa, startSpa , injectGlobalStyles } from './core/spa.js';


/**
 * SwiftSPA를 초기화하는 엔트리 함수
 *
 * 사용 예:
 * createSpa({
 *   resolvePageUrl: (path, def) => {
 *     if (path === "/") return "/pages/public/landing/index.html";
 *     if (path === "/admin") return "/pages/admin/index.html";
 *     return def(path); // 기본: /pages{path}/index.html
 *   }
 * });
 *
 * @param {{
 *   resolvePageUrl?: (path: string, defaultResolver: (path: string) => string) => string
 * }} options
 */
export function createSpa(options = {}) {
    injectGlobalStyles();
    configureSpa(options);
}

/**
 * SwiftSPA 실행 (라우팅 시작)
 */
export { startSpa };