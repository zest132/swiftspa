import { waitForImages } from "../core/utils.js";

/**
 * SwiftSPA AOS Extension
 * - spa:afterRender 시점에서 이미지 로드 후 AOS 초기화
 */
export function enableAosExtension(options = {}) {
    const {
        preserveScrollOnInitialRender = import.meta.env.DEV,
        ...aosOptions
    } = options;

    const config = {
        duration: 800,
        once: false,
        ...aosOptions
    };
    let isInitialRender = true;

    function applyAosOffsets() {
        const winWidth = window.innerWidth;

        document.querySelectorAll('[data-aos]').forEach(el => {
            let appliedOffset = 120;

            if (el.dataset.aosOffset) {
                appliedOffset = parseInt(el.dataset.aosOffset);
            }

            for (const key of Object.keys(el.dataset)) {
                if (key.startsWith("aosOffset-")) {
                    const bp = parseInt(key.replace("aosOffset-", ""));
                    if (winWidth >= bp) {
                        appliedOffset = parseInt(el.dataset[key]);
                    }
                }
            }

            el.setAttribute("data-aos-offset", appliedOffset);
        });
    }

    window.addEventListener("spa:afterRender", async () => {

        if (!window.AOS) return;

        await waitForImages(document);

        if (!(preserveScrollOnInitialRender && isInitialRender)) {
            window.scrollTo(0, 0);
        }

        applyAosOffsets();

        document.querySelectorAll("[data-aos-delay]").forEach(el => {
            const delay = el.getAttribute("data-aos-delay");
            if (delay) el.style.animationDelay = `${delay}ms`;
        });

        if (!document.querySelector(".aos-init")) {
            AOS.init(config);
        } else {
            AOS.refreshHard();
        }

        isInitialRender = false;
    });
}
