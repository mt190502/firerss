const browser_api: [string, typeof chrome | typeof browser] =
    typeof browser !== 'undefined' ? ['firefox', browser] : ['chrome', chrome];
const popup_url = browser_api[1].runtime.getURL('/html/popup.html');

const disableIcon = (tab_id?: number, custom_msg?: string) => {
    browser_api[1].action.disable(tab_id ?? undefined);
    browser_api[1].action.setIcon({ path: '/img/firerss_32_gray.png', tabId: tab_id ?? undefined });
    browser_api[1].action.setTitle({
        title: 'FireRSS' + (custom_msg ? ` (${custom_msg})` : ''),
        tabId: tab_id ?? undefined,
    });
};

const enableIcon = (tab_id: number, feed_urls?: string[]) => {
    browser_api[1].action.enable(tab_id);
    browser_api[1].action.setIcon({ path: '/img/firerss_32.png', tabId: tab_id });
    if (feed_urls.length > 0) {
        browser_api[1].action.setBadgeText({ text: feed_urls.length.toString(), tabId: tab_id });
        browser_api[1].action.setTitle({ title: 'FireRSS (Found ' + feed_urls.length + ' feeds)', tabId: tab_id });
    } else {
        browser_api[1].action.setTitle({ title: 'FireRSS', tabId: tab_id });
    }
};

const updatePopupState = (tab_id: number, feed_urls: string[]) => {
    if (feed_urls.length == 0) {
        disableIcon(tab_id);
        return;
    }
    enableIcon(tab_id, feed_urls);

    const popup_url = new URL(browser_api[1].runtime.getURL('html/popup.html'));
    popup_url.searchParams.set('feedlinks', JSON.stringify(feed_urls));
    browser_api[1].action.setPopup({ popup: popup_url.toString(), tabId: tab_id });
};

const injectionResolver = (tab_id: number, injection: any) => {
    if (!browser_api[1].runtime.lastError) {
        const feed_urls: string[] = [];
        if (browser_api[0] === 'chrome') {
            feed_urls.push(...injection.feeds);
        } else if (browser_api[0] === 'firefox') {
            for (const feed of injection) {
                feed_urls.push(...feed.result);
            }
        }

        if (feed_urls.length > 0) {
            updatePopupState(tab_id, feed_urls);
        } else {
            disableIcon(tab_id, 'No feeds found');
        }
    } else {
        console.error(`Error: FireRSS: ${browser_api[1].runtime.lastError.message}`);
    }
};

const injectScript = (tab_id: number) => {
    if (browser_api[0] === 'firefox') {
        browser_api[1].scripting.executeScript({ target: { tabId: tab_id }, func: findAllFeeds }, (res) =>
            injectionResolver(tab_id, res)
        );
    } else if (browser_api[0] === 'chrome') {
        browser_api[1].tabs.sendMessage(tab_id, { action: 'iWantToKnowFeeds' }, (res) => {
            injectionResolver(tab_id, res);
        });
    }
};

browser_api[1].tabs.onUpdated.addListener((tab_id, status, tab_info) => {
    if (status.status !== 'complete') return;
    if (tab_info.url === popup_url || tab_info.url === undefined) return;
    if (['chrome://', 'about:', 'file://'].includes(new URL(tab_info.url).protocol)) return;
    disableIcon(tab_id, 'Loading');
    injectScript(tab_id);
});

browser_api[1].tabs.onActivated.addListener((active_info) => {
    disableIcon(active_info.tabId);
    injectScript(active_info.tabId);
});

browser_api[1].runtime.onInstalled.addListener((a) => {
    disableIcon();
});
