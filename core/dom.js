/**
 * DOM/template utility (shared)
 */
export async function fetchText(url, baseUrl) {
    const finalBase = baseUrl
        ? new URL(baseUrl, window.location.origin).toString()
        : window.location.href;

    const finalUrl = new URL(url, finalBase).toString();

    const res = await fetch(finalUrl, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`Failed to load: ${finalUrl} (${res.status})`);
    return res.text();
}

function resolveUrl(url, baseUrl) {
    const finalBase = baseUrl
        ? new URL(baseUrl, window.location.origin).toString()
        : window.location.href;

    return new URL(url, finalBase).toString();
}

/**
 * Collect CSS links from document that should also be applied to Shadow DOM.
 * <link rel="stylesheet" data-shadow>
 */
function collectLayoutShadowCssUrls() {
    return Array.from(
        document.querySelectorAll('link[rel="stylesheet"][data-shadow]')
    ).map(link => link.href);
}

function resolveRelativePaths(html, baseUrl) {
    const absoluteBase = new URL(baseUrl, window.location.origin).href;
    const baseDir = absoluteBase.replace(/\/[^/]*$/, "/");

    return html.replace(/(src|href)=["'](.+?)["']/g, (match, attr, url) => {
        if (url.startsWith("http") || url.startsWith("/") || url.startsWith("#")) {
            return match;
        }

        const absoluteUrl = new URL(url, baseDir).href;
        return `${attr}="${absoluteUrl}"`;
    });
}

/**
 * Load template(html) + style(css) into Shadow DOM.
 * - Keeps legacy signature: loadTemplateToShadow(el, tplUrl, styleUrl, baseUrl, onReady)
 * - Preserves relative path resolution for template resources.
 * - CSS is injected via <link> to avoid Vite dev CSS-to-JS transform issues.
 */
export async function loadTemplateToShadow(
    el,
    templateUrl,
    styleUrl,
    baseUrl,
    onReady,
    {
        useLayoutStyles = true
    } = {}
) {
    const shadow = el.shadowRoot ?? el.attachShadow({ mode: "open" });

    const layoutCssUrls = useLayoutStyles
        ? collectLayoutShadowCssUrls()
        : [];

    const componentCssUrls = Array.isArray(styleUrl)
        ? styleUrl
        : (styleUrl ? [styleUrl] : []);

    let html = await fetchText(templateUrl, baseUrl);
    html = resolveRelativePaths(html, baseUrl);

    const finalCssUrls = [
        ...layoutCssUrls.map(url => resolveUrl(url)),
        ...componentCssUrls.map(url => resolveUrl(url, baseUrl)),
    ].filter((url, idx, arr) => arr.indexOf(url) === idx);

    while (shadow.firstChild) shadow.removeChild(shadow.firstChild);

    const linkLoaders = finalCssUrls.map((href) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        shadow.appendChild(link);

        return new Promise((resolve) => {
            link.addEventListener("load", resolve, { once: true });
            link.addEventListener(
                "error",
                () => {
                    console.warn(`[SwiftSPA] Failed to load shadow CSS: ${href}`);
                    resolve();
                },
                { once: true }
            );
        });
    });

    const wrap = document.createElement("template");
    wrap.innerHTML = html;
    shadow.appendChild(wrap.content.cloneNode(true));

    await Promise.all(linkLoaders);
    onReady?.(shadow);

    return shadow;
}

/**
 * DOM-data binding utility.
 * - Connects DOM Element <-> data object via WeakMap.
 */
const __bindingMap = new WeakMap();

export function bindData(el, data) {
    if (!(el instanceof HTMLElement)) {
        throw new Error("bindData: HTMLElement is required");
    }
    __bindingMap.set(el, data);
}

export function getBoundData(el) {
    return __bindingMap.get(el) ?? null;
}

export function unbindData(el) {
    __bindingMap.delete(el);
}

/**
 * Query selector across document + nested shadow roots.
 */
export function queryAllDeep(selector) {
    const elements = [];
    const search = (root) => {
        root.querySelectorAll(selector).forEach(el => elements.push(el));
        root.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) search(el.shadowRoot);
        });
    };
    search(document);
    return elements;
}

