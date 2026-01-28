/**
 * Overlay Manager
 * - overlay stack(LIFO) 관리
 * - overlay-coordinator를 유일하게 사용하는 상위 관리자
 * - UI 타입(modal / bottom-sheet / drawer)을 전혀 모른다
 *
 * 책임:
 *  - mount / unmount
 *  - ESC / back → 항상 top overlay만 닫기
 *  - history depth ↔ overlay depth 1:1 보장
 *  - scroll lock / overlay root 관리
 *
 * @author 박주병
 */

import { registerBackHandler } from './overlay-coordinator.js';



const BASE_Z = 20000;
const DIM_Z = BASE_Z;
const OVERLAY_BASE_Z = BASE_Z + 1;


const stack = [];

let dimEl = null;

/** overlay root (portal 컨테이너) */
let overlayRoot = null;

/** ESC key handler (전역 단 1개) */
function onKeyDown(e) {
    if (e.key === 'Escape') {
        closeTop('esc');
    }
}

/* --------------------------------------------------
 * public API
 * -------------------------------------------------- */

/**
 * overlay mount
 * @param {HTMLElement} el
 * @param {Object} [options]
 *   - lockScroll (default: true)
 */
export function mount(el, options = {}) {



    if (!(el instanceof HTMLElement)) {
        throw new Error('OverlayManager.mount: HTMLElement required');
    }

    attachOverlayContext(el);
    ensureOverlayRoot();

    if (stack.length === 0) {
        dimEl.style.display = 'block';
        overlayRoot.style.pointerEvents = 'auto';
    }

    const {
        lockScroll = true
    } = options;

    // overlay stack item
    const item = {
        el,
        lockScroll,
        backUnregister: null,
        mode: 'mount'
    };

    // back-handler 등록 (항상 top만 소비)
    item.backUnregister = registerBackHandler(() => {
        closeTop('back');
        return true; // back 소비
    });

    stack.push(item);

     const depth = stack.length; // 1부터 시작
     el.__overlayContext.zIndex = OVERLAY_BASE_Z + depth;
     el.style.zIndex = el.__overlayContext.zIndex;

    overlayRoot.appendChild(el);
    repositionDim();
    if (lockScroll) {
        lockBodyScroll();
    }
    // 첫 overlay 진입 시 ESC 리스너 활성화
    if (stack.length === 1) {
        document.addEventListener('keydown', onKeyDown);
    }
}

/**
 * overlay unmount (명시적 제거)
 * @param {HTMLElement} el
 */
export function unmount(el) {

    console.log('overlay stack:', stack);
    const idx = stack.findIndex(item => item.el === el);
    if (idx === -1) return;



    // top 이 아닌 overlay 제거는 허용하지 않는다
    if (idx !== stack.length - 1) {
        throw new Error('OverlayManager.unmount: only top overlay can be removed');
    }

    removeTop('unmount');


}


function requestCloseTop(reason) {
    const item = stack[stack.length - 1];
    if (!item) return;

    // mount(modal)는 애니메이션을 위해 컴포넌트 close 경로를 먼저 탄다
    if (item.mode === 'mount' && typeof item.el.close === 'function') {
        // manager가 시작한 close임을 표시 (재귀/루프 방지)
        item.el.__overlayCloseRequestedByManager = true;
        item.el.close(reason);
        return;
    }

    // attach(bottom-sheet 등)는 즉시 제거
    removeTop(reason);
}


/**
 * top overlay 닫기
 * @param {'back'|'esc'|'api'|'unmount'} reason
 */
export function closeTop(reason = 'api') {
    if (stack.length === 0) return;
    requestCloseTop(reason);
}

/* --------------------------------------------------
 * internal
 * -------------------------------------------------- */
function removeTop(reason) {
    const item = stack.pop();
    repositionDim();
    if (!item) return;


    // attach: UI에만 종료 통지
    if (item.mode === 'attach') {
        item.el.onOverlayClose?.(reason);
    }

    detachOverlayContext(item.el);
    item.backUnregister?.();

    // mount: portal DOM 제거
    if (item.mode === 'mount') {
        if (item.el.parentNode === overlayRoot) {
            overlayRoot.removeChild(item.el);
        }
    }

    // dim / esc 리스너 정리
    if (stack.length === 0) {
        dimEl.style.display = 'none';
        document.removeEventListener('keydown', onKeyDown);
        overlayRoot.style.pointerEvents = 'none';
    }

    // scroll 복구
    if (stack.length === 0) {
        unlockBodyScroll();
    }
}

function repositionDim() {
    if (!dimEl) return;

    const depth = stack.length;

    if (depth === 0) {
        dimEl.style.display = 'none';
        return;
    }

    dimEl.style.display = 'block';

    if (depth === 1) {
        // 1뎁스: dim은 overlayRoot의 최하단
        dimEl.style.zIndex = BASE_Z;
        overlayRoot.insertBefore(dimEl, overlayRoot.firstChild);
        return;
    }

    // 2뎁스 이상: top 바로 아래
    const dimZ = OVERLAY_BASE_Z + depth - 1;
    dimEl.style.zIndex = dimZ;

    const topEl = stack[depth - 1].el;
    overlayRoot.insertBefore(dimEl, topEl);
}

/**
 * overlay portal root 확보
 */
function ensureOverlayRoot() {
    if (overlayRoot) return;

    overlayRoot = document.getElementById('swiftspa-overlay-root');
    if (!overlayRoot) {
        overlayRoot = document.createElement('div');
        overlayRoot.id = 'swiftspa-overlay-root';
        overlayRoot.style.position = 'fixed';
        overlayRoot.style.inset = '0';
        overlayRoot.style.zIndex = '20000';
        document.body.appendChild(overlayRoot);
    }

    if (!dimEl) {
        dimEl = document.createElement('div');
        dimEl.className = 'overlay-dim';
        dimEl.style.zIndex = DIM_Z;
        overlayRoot.appendChild(dimEl);

        dimEl.addEventListener('click', () => {
            closeTop('dim');
        });
    }

    overlayRoot.style.pointerEvents = 'auto';
}

/* --------------------------------------------------
 * scroll lock
 * -------------------------------------------------- */

let scrollLockCount = 0;

function lockBodyScroll() {
    scrollLockCount++;
    if (scrollLockCount === 1) {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
    }
}

function unlockBodyScroll() {
        scrollLockCount = 0;
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
}

/* --------------------------------------------------
 * debug (선택)
 * -------------------------------------------------- */
export function __debugStack() {
    return stack.map(i => i.el);
}


function attachOverlayContext(el) {
    el.__overlayContext = {
        zIndex: null,
        close(reason = 'ui') {
            // manager가 요청한 close 흐름의 최종 단계인 경우: 실제 제거 수행
            if (el.__overlayCloseRequestedByManager) {
                delete el.__overlayCloseRequestedByManager;
                // 현재 top이 이 el인 경우만 제거
                const top = stack[stack.length - 1];
                if (top && top.el === el) {
                    removeTop(reason);
                }
                return;
            }

            // 일반적인 닫기 요청(버튼 클릭 등): top이면 제거
            const top = stack[stack.length - 1];
            if (top && top.el === el) {
                removeTop(reason);
            }
        }
    };
}

function detachOverlayContext(el) {
    delete el.__overlayContext;
}


/**
 * overlay attach
 * - 기존 DOM을 유지한 채 overlay 정책만 적용
 * @param {HTMLElement} el
 * @param {Object} [options]
 *   - lockScroll (default: true)
 */
export function attach(el, options = {}) {
    if (!(el instanceof HTMLElement)) {
        throw new Error('OverlayManager.attach: HTMLElement required');
    }

    ensureOverlayRoot();
    attachOverlayContext(el);

    if (stack.length === 0) {
        dimEl.style.display = 'block';
        overlayRoot.style.pointerEvents = 'auto';
    }

    const { lockScroll = true } = options;

    const item = {
        el,
        lockScroll,
        backUnregister: null,
        mode: 'attach'
    };

    item.backUnregister = registerBackHandler(() => {
        closeTop('back');
        return true;
    });

    stack.push(item);

       const depth = stack.length;
    el.__overlayContext.zIndex = OVERLAY_BASE_Z + depth;
    el.style.zIndex = el.__overlayContext.zIndex;

    if (lockScroll) {
        lockBodyScroll();
    }

    if (stack.length === 1) {
        document.addEventListener('keydown', onKeyDown);
    }
}


/**
 * overlay detach
 * - attach된 overlay 정책 제거
 */
export function detach(el, reason = 'api') {
    const idx = stack.findIndex(item => item.el === el);
    if (idx === -1) return;

    if (idx !== stack.length - 1) {
        throw new Error('OverlayManager.detach: only top overlay can be detached');
    }

    removeTop(reason);
}