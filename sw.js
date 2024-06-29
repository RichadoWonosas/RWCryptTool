const RW_SW_VERSION = "RW_CRYPT_SW_v2";

const addResourcesToCache = async (resources) => {
    const cache = await caches.open(RW_SW_VERSION);
    await cache.addAll(resources);
};

const putInCache = async (request, response) => {
    const cache = await caches.open(RW_SW_VERSION);
    await cache.put(request, response);
};

const deleteCache = async (key) => {
    await caches.delete(key);
}

const deleteOldCaches = async () => {
    const cacheKeepList = [RW_SW_VERSION];
    const keyList = await caches.keys();
    const cachesToDelete = keyList.filter(key => !cacheKeepList.includes(key));
    await Promise.all(cachesToDelete.map(deleteCache));
}

const cacheFirst = async ({request}) => {
    // fetch from cache
    const responseFromCache = await caches.match(request);
    if (responseFromCache)
        return responseFromCache;

    // try fetch from network
    try {
        const responseFromNetwork = await fetch(request);
        if (/^(\.{0,2}\/|https:\/\/)/.test(responseFromNetwork.url))
            await putInCache(request, responseFromNetwork.clone());
        return responseFromNetwork;
    } catch (err) {
        // respond with network error
        return new Response("Network error", {
            status: 408,
            headers: {"Content-Type": "text/plain"},
        });
    }
};

self.addEventListener("activate", (ev) => {
    ev.waitUntil(deleteOldCaches());
});

self.addEventListener("fetch", (ev) => {
    ev.respondWith(cacheFirst({
        request: ev.request,
    }));
});

self.addEventListener("install", event => {
    event.waitUntil(
        addResourcesToCache([
            // global
            "../css/base.css",
            "../css/drawer.css",
            "../fonts/RWYohaneSans.otf",
            "../img/base/moon-texture.svg",
            "../resources/langlist.json",
            "../resources/global-localized-strings.json",
            "../scripts/helper.js",
            "../img/base/Riomon.svg",
            "../img/base/bg-slider.svg",
            // icons
            "../img/icons/dark/article.svg",
            "../img/icons/dark/brief.svg",
            "../img/icons/dark/content.svg",
            "../img/icons/dark/download.svg",
            "../img/icons/dark/expand.svg",
            "../img/icons/dark/export.svg",
            "../img/icons/dark/goto.svg",
            "../img/icons/dark/lang.svg",
            "../img/icons/dark/size.svg",
            "../img/icons/dark/theme.svg",
            "../img/icons/dark/upload.svg",
            "../img/icons/dark/yoha.svg",
            "../img/icons/light/article.svg",
            "../img/icons/light/brief.svg",
            "../img/icons/light/content.svg",
            "../img/icons/light/download.svg",
            "../img/icons/light/expand.svg",
            "../img/icons/light/export.svg",
            "../img/icons/light/goto.svg",
            "../img/icons/light/lang.svg",
            "../img/icons/light/size.svg",
            "../img/icons/light/theme.svg",
            "../img/icons/light/upload.svg",
            "../img/icons/light/yoha.svg",
            // crypt tool
            "./index.html",
            "./manifest.json",
            "./css/styles.css",
            "./img/app-icon.svg",
            "./resources/localized-strings.json",
            "./scripts/main.js",
            "./scripts/RWCryptToolWorker.js",
            "./scripts/RWCF.js",
            "./scripts/RWSE2Token.js",
            "./scripts/RWSE4WASM.js",
            "./scripts/RWSE4WASM.wasm",
            "./scripts/RWSH.js",
            "./scripts/Base64.js",
            "./scripts/Errors.js",
            "./scripts/UTF8Coding.js",
            "./scripts/legacy/RWSE2.js",
            "./scripts/legacy/RWSE2Mode.js",
            "./scripts/legacy/RWSE2Token.js",
        ]),
    );
});