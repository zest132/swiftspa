/**
 * Overlay / Back Coordinator
 * - UI 타입을 전혀 모른다
 * - "뒤로 가기 소비자" 함수만 관리한다
 * - 히스토리 정책을 중앙에서 통제한다
 *
 * @author 박주병
 */

const handlers = [];

// 프레임워크 정책: 단일 오버레이 마커
const OVERLAY_HASH = '#overlay';

/**
 * overlay(back consumer) 등록
 * @param {() => boolean} fn  뒤로 가기 시 실행할 함수
 * @returns {() => void} unregister 함수
 */
export function registerBackHandler(fn) {
    if (handlers.length === 0) {
        //  첫 overlay 진입 시 히스토리 경계 생성
        pushOverlayHistory();
    }

    handlers.push(fn);

    // unregister 함수 반환 (React의 cleanup과 동일)
    return () => unregisterBackHandler(fn);
}

/**
 * overlay(back consumer) 해제
 */
export function unregisterBackHandler(fn) {
    const i = handlers.lastIndexOf(fn);
    if (i !== -1) {
        handlers.splice(i, 1);
    }

    //  마지막 overlay가 닫히면 히스토리 복구
    if (handlers.length === 0) {
        popOverlayHistoryIfNeeded();
    }
}

/**
 * Router에서 popstate 시 호출
 * @returns {boolean} true면 페이지 이동 차단
 */
export function handleBack() {
    const fn = handlers[handlers.length - 1];
    if (!fn) return false;

    // overlay가 back을 소비
    const consumed = fn() === true;

    return consumed;
}

/* --------------------------------------------------
 * 내부: 히스토리 정책
 * -------------------------------------------------- */

/**
 * overlay 진입 시 히스토리 마커 추가
 */
function pushOverlayHistory() {
    if (location.hash === OVERLAY_HASH) return;

    history.pushState(
        { overlay: true },
        '',
        location.pathname + location.search + OVERLAY_HASH
    );
}

/**
 * overlay 종료 시 히스토리 복구
 */
function popOverlayHistoryIfNeeded() {
    if (location.hash === OVERLAY_HASH) {
        // popstate를 유발 → Router가 받아서 navigate 차단
        history.back();
    }
}
