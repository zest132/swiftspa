import { loadTemplateToShadow } from './dom.js';

/**
 * SwiftSPA BaseComponent
 * - 모든 Web Component의 공통 기반
 * - template.html / style.css 자동 로드
 * - Shadow DOM 자동 생성
 * - 향후 확장(AOS, 글로벌 스타일, 커스텀 훅 등)을 위한 구조 설계
 *
 * 사용 예:
 *   class MyBox extends BaseComponent {}
 *   customElements.define('my-box', MyBox);
 *
 * @author 박주병
 */
export class BaseComponent extends HTMLElement {

    /**
     * 생성자
     * @param {Object} options
     *   - template: 템플릿 경로 커스텀 (기본: "./template.html")
     *   - style: 스타일 경로 커스텀 (기본: "./style.css")
     *   - shadow: ShadowDOM 모드 ("open" | "closed" | false)
     */
    constructor(options = {}) {
        super();

        // 옵션 병합
        this.__options = Object.assign(
            {
                template: "./template.html",
                style: "./style.css",
                shadow: "open"   // shadow: false 로 설정하면 Shadow DOM 미사용
            },
            options
        );

        // Shadow DOM 적용 여부
        if (this.__options.shadow !== false) {
            this.attachShadow({ mode: this.__options.shadow });
        }

        // 템플릿/스타일 자동 로드
        const templateUrl = this.__options.template;
        const styleUrl = this.__options.style;

        // import.meta.url 자동 전달
        loadTemplateToShadow(this, templateUrl, styleUrl, import.meta.url, () => {
            this.onReady?.();
        });
    }

    /**
     * 컴포넌트 초기화 완료 후 실행되는 훅
     * - 템플릿/스타일이 로드되고 Shadow DOM이 생성된 뒤 실행
     * - 자식 클래스에서 오버라이드 가능
     */
    onReady() {
        // 사용자 컴포넌트에서 override 가능
        // console.log(`${this.tagName} ready`);
    }
}


/* ------------------------------------------------------------------
   A 방식: SwiftSPA 네임스페이스에 BaseComponent 등록
   import 없이 사용 가능하도록 전역에 안전하게 바인딩
------------------------------------------------------------------- */
window.SwiftSPA = window.SwiftSPA || {};
window.SwiftSPA.BaseComponent = BaseComponent;