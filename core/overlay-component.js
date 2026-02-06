import { mount } from './overlay-manager.js';

export default class OverlayComponent extends SwiftSPA.BaseComponent {

    /* =====================
     * OPEN
     * ===================== */

    open(options) {
        return this._openInternal(options);
    }

    _openInternal(openOptions = {}) {
        const overlayEl = this.cloneNode(true);

        //  mount 이전 훅 (동기/비동기 허용)
        Promise.resolve(
            overlayEl.onBeforeOpen?.(openOptions)
        ).then(() => {

            //  DOM mount
            mount(overlayEl);

            //  첫 layout 이후 훅
            requestAnimationFrame(() => {
                overlayEl.collectRefs?.();
                overlayEl.onReady?.(overlayEl.shadowRoot);
                overlayEl.onAfterOpen?.(openOptions);
            });
        });

        return overlayEl;
    }

    /**
     * mount 이전 호출
     * - 데이터 준비
     * - 상태 계산
     * - CSS 조작 ❌
     */
    onBeforeOpen(options) {
        // override 대상
    }

    /**
     * mount + 첫 layout 이후 호출
     * - CSS transition 시작 지점
     */
    onAfterOpen(options) {
        // override 대상
    }

    /* =====================
     * CLOSE
     * ===================== */

    close(reason) {
        this._closeInternal(reason);
    }

    _closeInternal(reason) {
        // 1️⃣ DOM 제거 이전 훅 (애니메이션 Promise 허용)
        Promise.resolve(
            this.onBeforeClose?.(reason)
        ).then(() => {

            // 2️⃣ 실제 overlay 제거
            this.__overlayContext?.close(reason);

            // 3️⃣ 제거 이후 훅
            this.onAfterClose?.(reason);
        });
    }

    /**
     * DOM 제거 이전 호출
     * - 닫힘 애니메이션
     * - Promise 반환 가능
     */
    onBeforeClose(reason) {
        // override 대상
    }

    /**
     * overlay 제거 직후 호출
     * - 상태 정리
     * - 로그 / 후처리
     */
    onAfterClose(reason) {
        // override 대상
    }
}
