
/**
 * 숫자 문자열을 한국 전화번호 형식으로 변환
 * - 010/011/016/017/018/019 → 3-4-4
 * - 02 지역번호 → 2-3-4 or 2-4-4
 * - 그 외는 3-3-4
 * @param {string} val 입력값
 * @returns {string} 포맷팅된 문자열
 * @author 박주병
 */
export function formatPhone(val) {
    const digits = val.replace(/\D/g, '').slice(0, 11); // 숫자만, 최대 11자리

    if (digits.startsWith('02')) {
        if (digits.length < 3) return digits;
        if (digits.length < 6) return digits.slice(0,2) + '-' + digits.slice(2);
        if (digits.length < 10) return digits.slice(0,2) + '-' + digits.slice(2,5) + '-' + digits.slice(5);
        return digits.slice(0,2) + '-' + digits.slice(2,6) + '-' + digits.slice(6,10);
    }

    if (digits.length < 4) return digits;
    if (digits.length < 7) return digits.slice(0,3) + '-' + digits.slice(3);
    if (digits.length < 11) return digits.slice(0,3) + '-' + digits.slice(3,6) + '-' + digits.slice(6);
    return digits.slice(0,3) + '-' + digits.slice(3,7) + '-' + digits.slice(7,11);
}


export function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);

    const yyyy = kst.getFullYear();
    const mm = String(kst.getMonth() + 1).padStart(2, "0");
    const dd = String(kst.getDate()).padStart(2, "0");
    const hh = String(kst.getHours()).padStart(2, "0");
    const mi = String(kst.getMinutes()).padStart(2, "0");
    const ss = String(kst.getSeconds()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}