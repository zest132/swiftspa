export function waitForImages(scope) {
    const imgs = Array.from(scope.querySelectorAll('img'));
    if (imgs.length === 0) return Promise.resolve();

    return Promise.all(
        imgs.map(img =>
            new Promise(resolve => {
                const done = () => requestAnimationFrame(() => requestAnimationFrame(resolve));
                if (img.complete) done();
                else img.onload = done;
            })
        )
    );
}