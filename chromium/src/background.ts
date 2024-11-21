import { InitDefaultSettings } from './lib/init_default_settings';

enum Status {
    LOADING = 'Loading',
    NO_FEEDS = 'No feeds found',
    SITE_IGNORED = 'Site ignored',
    BROWSER_PAGE = 'Browser page',
}

const popup_url = chrome.runtime.getURL('/html/popup.html');

const disableIcon = (tab_id?: number, status?: Status) => {
    chrome.action.disable(tab_id ?? undefined);
    chrome.action.setIcon({ path: '/img/firerss_32_gray.png', tabId: tab_id ?? undefined });

    switch (status) {
        case Status.LOADING:
            chrome.action.setBadgeText({ text: '...', tabId: tab_id ?? undefined });
            chrome.action.setBadgeBackgroundColor({ color: '#FF6600', tabId: tab_id ?? undefined });
            break;
        case Status.NO_FEEDS:
            chrome.action.setBadgeText({ text: '0', tabId: tab_id ?? undefined });
            chrome.action.setBadgeBackgroundColor({ color: '#FF6600', tabId: tab_id ?? undefined });
            break;
        case Status.SITE_IGNORED:
            chrome.action.setBadgeText({ text: 'X', tabId: tab_id ?? undefined });
            chrome.action.setBadgeBackgroundColor({ color: '#FFFF00', tabId: tab_id ?? undefined });
            break;
        case Status.BROWSER_PAGE:
            chrome.action.setBadgeText({ text: 'B', tabId: tab_id ?? undefined });
            chrome.action.setBadgeBackgroundColor({ color: '#FFFF00', tabId: tab_id ?? undefined });
            break;
        default:
            status = undefined;
            break;
    }
    chrome.action.setTitle({
        title: 'FireRSS' + (status ? ` (${status})` : ''),
        tabId: tab_id ?? undefined,
    });
};

const enableIcon = (tab_id: number, feed_urls?: string[]) => {
    chrome.action.enable(tab_id);
    chrome.action.setIcon({ path: '/img/firerss_32.png', tabId: tab_id });
    if (feed_urls && feed_urls.length > 0) {
        chrome.action.setBadgeText({ text: feed_urls.length.toString(), tabId: tab_id });
        chrome.action.setBadgeBackgroundColor({ color: '#FF6600', tabId: tab_id });
        chrome.action.setTitle({ title: 'FireRSS (Found ' + feed_urls.length + ' feeds)', tabId: tab_id });
    } else {
        chrome.action.setTitle({ title: 'FireRSS', tabId: tab_id });
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
    chrome.action.setPopup({ popup: popup.toString(), tabId: tab_id });
};

const getTabFromId = (tab_id: number): Promise<chrome.tabs.Tab> => {
    return new Promise((resolve) => {
        chrome.tabs.get(tab_id, (tab) => {
            resolve(tab);
        });
    });
};

const findAllFeeds = async (): Promise<string[]> => {
    const settings =
        (await chrome.storage.local.get('firerss_settings')).firerss_settings ?? (await InitDefaultSettings());
    const feed_urls: string[] = [];
    const youtube_user_pattern = /(?<=(https:\/\/(www\.)?youtube.com\/))@\w+/gi;
    let doc: Document;

    if (window.location.origin.includes('youtube.com') && window.location.href.match(youtube_user_pattern)) {
        doc = new DOMParser().parseFromString(
            await (await fetch(window.location.href + '/about', { mode: 'cors' })).text(),
            'text/html'
        );
    } else {
        doc = document;
    }

    const collected_feeds = doc.querySelectorAll(
        'link[type="application/rss+xml"], link[type="application/atom+xml"], a[href*="rss"], a[href*="atom"], a[href*="feed"]'
    );

    for (let i = 0; i < collected_feeds.length; i++) {
        const feed = collected_feeds[i];
        if (feed instanceof HTMLLinkElement) {
            if (feed.href.includes('youtube.com') && !feed.baseURI.match(youtube_user_pattern)) continue;
            feed_urls.push(feed.href);
        }
    }

    if (settings.extended_feed_scan === 0) {
        return feed_urls;
    } else if (settings.extended_feed_scan === 1) {
        if (feed_urls.length > 0) return feed_urls;
    }
    const possible_feed_files = [
        '.atom',
        '.feed',
        '.rss',
        '.xml',
        '/atom.xml',
        '/atom',
        '/feed.xml',
        '/feed',
        '/index.xml',
        '/rss.xml',
        '/rss',
    ];
    for (const file of possible_feed_files) {
        let feed;
        if (window.location.pathname === '/') {
            if (file.startsWith('.')) continue;
            feed = window.location.href + file.slice(1);
        } else {
            if (file.startsWith('.')) {
                feed = window.location.href.slice(0, window.location.href.lastIndexOf('/')) + file;
            } else {
                feed = window.location.origin + file;
            }
        }
        const response = await fetch(feed);
        if (response.ok && response.headers.get('Content-Type')?.includes('xml') && !feed_urls.includes(feed)) {
            feed_urls.push('_' + feed);
        }
        await new Promise((resolve) => setTimeout(resolve, 700));
    }

    return feed_urls;
};

const injectScript = (tab_id: number) => {
    chrome.storage.local.get('firerss_settings', async (setting) => {
        const settings = setting.firerss_settings ?? (await InitDefaultSettings());
        const tab_info = await getTabFromId(tab_id);

        if (!tab_info) return;
        if (tab_info.url === popup_url || tab_info.url === undefined) {
            disableIcon(tab_id, Status.BROWSER_PAGE);
            return;
        }

        const url = new URL(tab_info.url);
        for (const site of settings.ignored_sites) {
            if (url.host.match(new RegExp(site, 'gi'))) {
                disableIcon(tab_id, Status.SITE_IGNORED);
                return;
            }
        }

        chrome.storage.session.get(`firerss_feeds:${tab_info.url.replace(/\W/gi, '')}`, async (cached_feeds) => {
            const manually_finded_feeds: string[] = cached_feeds[`firerss_feeds:${tab_info.url.replace(/\W/gi, '')}`];
            if (manually_finded_feeds && manually_finded_feeds.length > 0) {
                updatePopupState(tab_id, manually_finded_feeds);
                return;
            } else {
                const injection = await chrome.scripting.executeScript({
                    target: { tabId: tab_id },
                    func: findAllFeeds,
                });

                if (!chrome.runtime.lastError) {
                    const feed_urls: string[] = [];
                    for (const result of injection) {
                        feed_urls.push(...result.result);
                    }

                    if (feed_urls.length > 0) {
                        chrome.storage.session.set({
                            [`firerss_feeds:${tab_info.url.replace(/\W/gi, '')}`]: feed_urls,
                        });
                        updatePopupState(tab_id, feed_urls);
                    } else {
                        chrome.storage.session.set({ [`firerss_feeds:${tab_info.url.replace(/\W/gi, '')}`]: [] });
                        disableIcon(tab_id, Status.NO_FEEDS);
                    }
                } else {
                    console.error(`Error: FireRSS: ${chrome.runtime.lastError.message}`);
                }
            }
        });
    });
};

chrome.tabs.onUpdated.addListener((tab_id, status) => {
    if (status.status !== 'complete') return;
    disableIcon(tab_id, Status.LOADING);
    injectScript(tab_id);
});

chrome.tabs.onActivated.addListener((active_info) => {
    disableIcon(active_info.tabId);
    injectScript(active_info.tabId);
});

chrome.runtime.onInstalled.addListener(() => {
    disableIcon();
});
