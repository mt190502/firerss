import { findAllFeeds } from './content';
import { InitDefaultSettings } from './lib/init_default_settings';
import { Settings } from './types/settings_interface';

enum Status {
    LOADING = 'Loading',
    NO_FEEDS = 'No feeds found',
    SITE_IGNORED = 'Site ignored',
    BROWSER_PAGE = 'Browser page',
}

const popup_url = browser.runtime.getURL('/html/popup.html');

const disableIcon = (tab_id?: number, status?: Status) => {
    browser.action.disable(tab_id ?? undefined);
    browser.action.setIcon({ path: '/img/firerss_32_gray.png', tabId: tab_id ?? undefined });

    switch (status) {
        case Status.LOADING:
            browser.action.setBadgeText({ text: '...', tabId: tab_id ?? undefined });
            browser.action.setBadgeBackgroundColor({ color: '#FF6600', tabId: tab_id ?? undefined });
            break;
        case Status.NO_FEEDS:
            browser.action.setBadgeText({ text: '0', tabId: tab_id ?? undefined });
            browser.action.setBadgeBackgroundColor({ color: '#FF6600', tabId: tab_id ?? undefined });
            break;
        case Status.SITE_IGNORED:
            browser.action.setBadgeText({ text: 'X', tabId: tab_id ?? undefined });
            browser.action.setBadgeBackgroundColor({ color: '#FFFF00', tabId: tab_id ?? undefined });
            break;
        case Status.BROWSER_PAGE:
            browser.action.setBadgeText({ text: 'B', tabId: tab_id ?? undefined });
            browser.action.setBadgeBackgroundColor({ color: '#FFFF00', tabId: tab_id ?? undefined });
            break;
        default:
            status = undefined;
            break;
    }
    browser.action.setTitle({
        title: 'FireRSS' + (status ? ` (${status})` : ''),
        tabId: tab_id ?? undefined,
    });
};

const enableIcon = (tab_id: number, feed_urls?: string[]) => {
    browser.action.enable(tab_id);
    browser.action.setIcon({ path: '/img/firerss_32.png', tabId: tab_id });
    if (feed_urls && feed_urls.length > 0) {
        browser.action.setBadgeText({ text: feed_urls.length.toString(), tabId: tab_id });
        browser.action.setBadgeBackgroundColor({ color: '#FF6600', tabId: tab_id });
        browser.action.setTitle({ title: 'FireRSS (Found ' + feed_urls.length + ' feeds)', tabId: tab_id });
    } else {
        browser.action.setTitle({ title: 'FireRSS', tabId: tab_id });
    }
};

const updatePopupState = (tab_id: number, feed_urls: string[]) => {
    if (feed_urls.length == 0) {
        disableIcon(tab_id);
        return;
    }
    enableIcon(tab_id, feed_urls);

    const popup = new URL(popup_url);
    popup.searchParams.set('feedlinks', JSON.stringify(feed_urls));
    browser.action.setPopup({ popup: popup.toString(), tabId: tab_id });
};

const injectScript = async (tab_id: number, tab_info?: browser.tabs.Tab) => {
    const settings: Settings =
        (await browser.storage.local.get('firerss_settings')).firerss_settings ?? (await InitDefaultSettings());
    if (!tab_info) {
        while (tab_info === undefined) {
            tab_info = await browser.tabs.get(tab_id);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        if (
            tab_info.url === popup_url ||
            tab_info.url === undefined ||
            ['chrome://', 'about:', 'file://'].includes(new URL(tab_info.url).protocol)
        ) {
            disableIcon(tab_id, Status.BROWSER_PAGE);
            return;
        }
    }

    for (const site of settings.ignored_sites) {
        if (tab_info.url.match(new RegExp(site, 'gi'))) {
            disableIcon(tab_id, Status.SITE_IGNORED);
            return;
        }
    }

    const cached_feeds = sessionStorage.getItem(`firerss_feeds:${tab_info.url.replace(/\W/gi, '')}`);
    if (cached_feeds) {
        if (JSON.parse(cached_feeds).length > 0) {
            enableIcon(tab_id, JSON.parse(cached_feeds));
            updatePopupState(tab_id, JSON.parse(cached_feeds));
        } else {
            disableIcon(tab_id, Status.NO_FEEDS);
        }
        return;
    }

    const injection = await browser.scripting.executeScript({
        target: { tabId: tab_id },
        func: findAllFeeds,
    });

    if (!browser.runtime.lastError) {
        const feed_urls: string[] = [];
        for (const result of injection) {
            const value = (result as any).result;
            if (Array.isArray(value)) {
                feed_urls.push(...value.filter((x): x is string => typeof x === 'string' && x.trim() !== ''));
            } else if (typeof value === 'string' && value.trim() !== '') {
                feed_urls.push(value);
            }
        }

        const unique_feeds = [...new Set(feed_urls)];

        if (unique_feeds.length > 0) {
            sessionStorage.setItem(`firerss_feeds:${tab_info.url.replace(/\W/gi, '')}`, JSON.stringify(unique_feeds));
            updatePopupState(tab_id, unique_feeds);
        } else {
            sessionStorage.setItem(`firerss_feeds:${tab_info.url.replace(/\W/gi, '')}`, JSON.stringify([]));
            disableIcon(tab_id, Status.NO_FEEDS);
        }
    } else {
        console.error(`Error: FireRSS: ${browser.runtime.lastError.message}`);
    }
};

browser.tabs.onUpdated.addListener((tab_id, status, tab_info) => {
    if (status.status !== 'complete') return;
    if (!tab_info) return;
    if (
        tab_info.url === popup_url ||
        tab_info.url === undefined ||
        ['chrome://', 'about:', 'file://'].includes(new URL(tab_info.url).protocol)
    ) {
        disableIcon(tab_id, Status.BROWSER_PAGE);
        return;
    }
    disableIcon(tab_id, Status.LOADING);
    injectScript(tab_id);
});

browser.tabs.onActivated.addListener((active_info) => {
    disableIcon(active_info.tabId);
    injectScript(active_info.tabId);
});

browser.runtime.onInstalled.addListener(() => {
    disableIcon();
});

browser.runtime.onMessage.addListener((message) => {
    switch (message.type) {
        case 'exclude_site': {
            const feedKey = `firerss_feeds:${message.url.replace(/\W/gi, '')}`;
            sessionStorage.removeItem(feedKey);
            if (typeof message.tabId === 'number') {
                disableIcon(message.tabId, Status.SITE_IGNORED);
            }
            break;
        }
        case 'clear_feed_cache': {
            for (let i = sessionStorage.length - 1; i >= 0; i--) {
                const key = sessionStorage.key(i);
                if (key && key.startsWith('firerss_feeds:')) {
                    sessionStorage.removeItem(key);
                }
            }
            break;
        }
    }
});
