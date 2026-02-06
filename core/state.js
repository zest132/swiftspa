// swiftspa/core/state.js

export const spaState = { data: {} };

/**
 * 상태 설정
 */
export function setSpaState(key, value) {
    spaState.data[key] = value;

    window.dispatchEvent(
        new CustomEvent("state:changed", {
            detail: { key, value }
        })
    );
}

/**
 * 상태 구독
 *
 * @param {string} key
 * @param {(value:any)=>void} callback
 * @returns {()=>void} unsubscribe 함수
 */
export function subscribeState(key, callback) {

    // 1️ 현재 상태 즉시 전달
    if (spaState.data[key] !== undefined) {
        callback(spaState.data[key]);
    }

    // 2️ 변경 이벤트 핸들러
    const handler = (e) => {
        if (e.detail.key === key) {
            callback(e.detail.value);
        }
    };

    window.addEventListener("state:changed", handler);

    // 3️ unsubscribe 제공
    return () => {
        window.removeEventListener("state:changed", handler);
    };
}
