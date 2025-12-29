/**
 * SwiftSPA ComponentRegistry
 * - Web Component define 책임을 단일화
 * - define race condition 방지
 *
 * @author 박주병
 */

const defining = new Set();
const defined = new Set();

async function defineComponent(tagName) {
    if (defined.has(tagName)) return;
    if (defining.has(tagName)) return;

    defining.add(tagName);

    try {
        // 이미 registry에 있으면 skip
        if (customElements.get(tagName)) {
            defined.add(tagName);
            return;
        }

        const baseDir = `/components/${tagName}/`;
        const jsPath = `${baseDir}index.js`;

        const mod = await import(jsPath);
        const Ctor = mod.default;

        if (typeof Ctor !== 'function') {
            console.warn(`[SwiftSPA] ${jsPath} default export class 없음`);
            return;
        }

        customElements.define(tagName, Ctor);
        Ctor.__swiftspa_baseDir = baseDir;

        defined.add(tagName);

    } catch (err) {
        console.warn(`[SwiftSPA] 컴포넌트 define 실패: ${tagName}`, err);
    } finally {
        defining.delete(tagName);
    }
}

export const ComponentRegistry = {

    /**
     * 태그가 이미 define 되었는지
     */
    isDefined(tagName) {
        return defined.has(tagName) || customElements.get(tagName);
    },

    /**
     * 태그 발견 시 호출 (define 트리거 아님)
     */
    discover(tagName) {
        if (!tagName.includes('-')) return;
        this.ensureDefined(tagName);
    },

    /**
     * define 보장 (race-safe)
     */
    async ensureDefined(tagName) {
        await defineComponent(tagName);
    }
};
