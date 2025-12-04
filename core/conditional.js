// conditional.js
import { queryAllDeep } from './dom.js';
import { spaState } from './state.js';

export function applyConditionalRendering() {
    queryAllDeep('[data-if]').forEach(el => {
        const expr = el.dataset.if;
        const state = spaState.data;

        let visible = false;

        try {
            const fn = new Function("state", `return (${expr});`);
            visible = !!fn(state);
        } catch (err) {
            console.warn("data-if 평가 오류:", expr, err);
        }

        el.style.display = visible ? '' : 'none';
    });
}

// 이벤트 연결은 이 모듈 안에서
window.addEventListener("state:changed", applyConditionalRendering);
window.addEventListener("spa:navigate", applyConditionalRendering);
document.addEventListener("DOMContentLoaded", applyConditionalRendering);
