/**
 * SwiftSPA ComponentRegistry
 * - Web Component define 책임 단일화
 * - HTML 스캔 / JS 동적 호출 통합
 * - define race condition 완전 차단
 *
 * 규칙:
 *  - /components/{tag-name}/index.js
 *  - default export = CustomElement class
 *
 * @author 박주병
 */

const defining = new Set(); // define 중인 태그
const defined = new Set();  // define 완료된 태그

/**
 * 실제 define 로직 (단 하나의 진실)
 */
async function defineComponent(tagName) {
    if (!tagName.includes('-')) return;

    // 이미 완료
    if (defined.has(tagName)) return;

    // 이미 진행 중
    if (defining.has(tagName)) return;

    defining.add(tagName);

    try {
        // 이미 브라우저에 등록돼 있으면 동기화만
        if (customElements.get(tagName)) {
            defined.add(tagName);
            return;
        }

        const baseDir = `/components/${tagName}/`;
        const jsPath = `${baseDir}index.js`;

        const mod = await import(jsPath);
        const Ctor = mod?.default;

        if (typeof Ctor !== 'function') {
            console.warn(
                `[SwiftSPA] ${jsPath} default export는 class여야 합니다`
            );
            return;
        }

        customElements.define(tagName, Ctor);

        // 메타 정보 (선택)
        Ctor.__swiftspa_baseDir = baseDir;

        defined.add(tagName);

    } catch (err) {
        console.warn(
            `[SwiftSPA] 컴포넌트 define 실패: <${tagName}>`,
            err
        );
    } finally {
        defining.delete(tagName);
    }
}

/**
 * 공개 API
 */
export const ComponentRegistry = {

    /**
     * 이미 define 되었는지 확인
     */
    isDefined(tagName) {
        return defined.has(tagName) || !!customElements.get(tagName);
    },

    /**
     * HTML 스캔 중 태그 발견 시 호출
     * (비동기 fire-and-forget)
     */
    discover(tagName) {
        if (!tagName.includes('-')) return;
        defineComponent(tagName);
    },

    /**
     * JS에서 명시적으로 define 보장하고 싶을 때
     * await 보장
     */
    async ensure(tagName) {
        if (!tagName.includes('-')) return;
        await defineComponent(tagName);
    }
};
