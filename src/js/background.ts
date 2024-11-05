const browser_api = typeof browser !== 'undefined' ? browser : chrome;
const popup_url = browser_api.runtime.getURL('html/popup.html');

const disableIcon = (tab_id?: number, custom_msg?: string) => {
    browser_api.action.disable(tab_id ?? undefined);
    browser_api.action.setIcon({ path: '/img/firerss_32_gray.png', tabId: tab_id ?? undefined });
    browser_api.action.setTitle({
        title: 'FireRSS' + (custom_msg ? ` (${custom_msg})` : ''),
        tabId: tab_id ?? undefined,
    });
};

const enableIcon = (tab_id: number, feed_urls?: string[]) => {
    browser_api.action.enable(tab_id);
    browser_api.action.setIcon({ path: '/img/firerss_32.png', tabId: tab_id });
    if (feed_urls.length > 0) { 
        browser_api.action.setBadgeText({ text: feed_urls.length.toString(), tabId: tab_id });
        browser_api.action.setTitle({ title: 'FireRSS (Found ' + feed_urls.length + ' feeds)', tabId: tab_id });
    } else {
        browser_api.action.setTitle({ title: 'FireRSS', tabId: tab_id });
    }
};

const updatePopupState = (tab_id: number, feed_urls: string[]) => {
    if (feed_urls.length == 0) {
        disableIcon(tab_id);
        return;
    }
    enableIcon(tab_id, feed_urls);

    const popup_url = new URL(browser_api.runtime.getURL('html/popup.html'));
    popup_url.searchParams.set('feedlinks', JSON.stringify(feed_urls));
    browser_api.action.setPopup({ popup: popup_url.toString(), tabId: tab_id });
};

const injectScript = (tab_id: number) => {
    browser_api.scripting.executeScript(
        {
            target: { tabId: tab_id },
            func: findAllFeeds,
        },
        (InjectionResults) => {
            if (!browser_api.runtime.lastError) {
                for (const feed_urls of InjectionResults) {
                    if (feed_urls) {
                        updatePopupState(tab_id, feed_urls.result);
                    } else {
                        disableIcon(tab_id, 'No feeds found');
                    }
                }
            } else {
                console.error(`[ERR] FireRSS: ${browser_api.runtime.lastError.message}`);
            }
        }
    );
};

browser_api.tabs.onUpdated.addListener((tab_id) => {
    disableIcon(tab_id);
    injectScript(tab_id);
});

browser_api.tabs.onActivated.addListener((active_info) => {
    disableIcon(active_info.tabId);
    injectScript(active_info.tabId);
});

browser_api.runtime.onInstalled.addListener(() => {
    disableIcon();
});
