// state.js
export const spaState = { data: {} };

export function setSpaState(key, value) {
    spaState.data[key] = value;
    window.dispatchEvent(new CustomEvent("state:changed", {
        detail: { key, value }
    }));
}