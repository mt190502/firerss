import { findPassiveFeeds } from './content';
import { InitDefaultSettings } from './lib/init_default_settings';
import { ResolveFeedTemplates } from './lib/feed_templates';
import { NormalizeSettings, RegisterSettingsSync } from './lib/settings_storage';
import { UrlRule } from './types/settings_interface';

enum Status {
    LOADING = 'Loading',
    NO_FEEDS = 'No feed candidates found',
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

const enableIcon = (tab_id: number, feed_urls: string[]) => {
    chrome.action.enable(tab_id);
    chrome.action.setIcon({ path: '/img/firerss_32.png', tabId: tab_id });
    chrome.action.setBadgeText({ text: feed_urls.length.toString(), tabId: tab_id });
    chrome.action.setBadgeBackgroundColor({ color: '#FF6600', tabId: tab_id });
    chrome.action.setTitle({
        title: `FireRSS (Found ${feed_urls.length} feed candidate${feed_urls.length === 1 ? '' : 's'})`,
        tabId: tab_id,
    });
};

const updatePopupState = (tab_id: number, feed_urls: string[]) => {
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

const extended_feed_paths = ['/atom.xml', '/atom', '/feed.xml', '/feed', '/index.xml', '/rss.xml', '/rss'];
const extended_cache_prefix = 'firerss_extended:v1:';
const positive_cache_ttl = 24 * 60 * 60 * 1000;
const negative_cache_ttl = 15 * 60 * 1000;
const pending_extended_scans = new Map<string, Promise<string[]>>();

interface ExtendedFeedCache {
    expires_at: number;
    feed_urls: string[];
}

const MatchesUrlRule = (url: URL, rule: UrlRule): boolean => {
    switch (rule.match_type) {
        case 'contains':
            return url.href.includes(rule.pattern);
        case 'domain':
            return url.hostname === rule.pattern || url.hostname.endsWith('.' + rule.pattern);
        case 'subdomain':
            return url.hostname === rule.pattern;
    }
};

const IsExtendedFeedCache = (value: unknown): value is ExtendedFeedCache => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const cache = value as Record<string, unknown>;
    return (
        typeof cache.expires_at === 'number' &&
        Array.isArray(cache.feed_urls) &&
        cache.feed_urls.every((feed_url) => typeof feed_url === 'string')
    );
};

const ProbeExtendedFeeds = async (origin: string): Promise<string[]> => {
    const pending = pending_extended_scans.get(origin);
    if (pending) return pending;

    const scan = (async () => {
        const cache_key = extended_cache_prefix + encodeURIComponent(origin);
        const cached = (await chrome.storage.session.get(cache_key))[cache_key];
        if (IsExtendedFeedCache(cached) && cached.expires_at > Date.now()) return [...cached.feed_urls];

        const feed_urls: string[] = [];
        for (const path of extended_feed_paths) {
            const feed_url = new URL(path, origin).toString();
            try {
                const response = await fetch(feed_url, {
                    cache: 'no-store',
                    credentials: 'omit',
                    headers: { Accept: 'application/atom+xml, application/rss+xml, application/xml, text/xml;q=0.9' },
                    redirect: 'error',
                    referrerPolicy: 'no-referrer',
                    signal: AbortSignal.timeout(5_000),
                });
                const content_type = response.headers.get('Content-Type') ?? '';
                if (response.ok && /(?:atom|rss|xml)/i.test(content_type)) feed_urls.push(feed_url);
                await response.body?.cancel();
            } catch {
                // A failed candidate is not a feed and should not stop the remaining root checks.
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
        }

        const cache: ExtendedFeedCache = {
            expires_at: Date.now() + (feed_urls.length > 0 ? positive_cache_ttl : negative_cache_ttl),
            feed_urls,
        };
        await chrome.storage.session.set({ [cache_key]: cache });
        return feed_urls;
    })();
    pending_extended_scans.set(origin, scan);
    try {
        return await scan;
    } finally {
        pending_extended_scans.delete(origin);
    }
};

const AddFeedUrl = (feed_urls: string[], feed_url: string, marker = '') => {
    const getRawUrl = (value: string) => value.replace(/^__template__:/, '').replace(/^_/, '');
    if (!feed_urls.some((existing) => getRawUrl(existing) === feed_url)) feed_urls.push(marker + feed_url);
};

const injectScript = async (tab_id: number) => {
    const settings = await InitDefaultSettings();
    const tab_info = await getTabFromId(tab_id);
    const tab_url = tab_info.url;

    if (!tab_url || tab_url === popup_url) {
        disableIcon(tab_id, Status.BROWSER_PAGE);
        return;
    }

    const url = new URL(tab_url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        disableIcon(tab_id, Status.BROWSER_PAGE);
        return;
    }
    if (settings.ignored_sites.some((rule) => MatchesUrlRule(url, rule))) {
        disableIcon(tab_id, Status.SITE_IGNORED);
        return;
    }

    const is_extended_scan_excluded = settings.extended_scan_exclusions.some((rule) => MatchesUrlRule(url, rule));
    const feed_urls: string[] = [];
    for (const feed_url of ResolveFeedTemplates(tab_url, settings.feed_templates)) {
        AddFeedUrl(feed_urls, feed_url, '__template__:');
    }

    const injection = await chrome.scripting.executeScript({
        target: { tabId: tab_id },
        func: findPassiveFeeds,
    });
    for (const result of injection) {
        const value = result.result;
        if (Array.isArray(value)) {
            for (const feed_url of value) {
                if (typeof feed_url === 'string' && feed_url.trim() !== '') AddFeedUrl(feed_urls, feed_url);
            }
        }
    }

    const should_probe =
        !is_extended_scan_excluded &&
        (settings.extended_feed_scan === 2 || (settings.extended_feed_scan === 1 && feed_urls.length === 0));
    if (should_probe) {
        for (const feed_url of await ProbeExtendedFeeds(url.origin)) {
            AddFeedUrl(feed_urls, feed_url, '_');
        }
    }

    if (feed_urls.length > 0) {
        updatePopupState(tab_id, feed_urls);
    } else {
        disableIcon(tab_id, Status.NO_FEEDS);
    }
};

const RunInjectScript = (tab_id: number) => {
    void injectScript(tab_id).catch((error: unknown) => {
        const is_expected_error =
            error instanceof Error &&
            /showing error page|cannot access contents of url|no frame with id|invalid tab id|tab was closed/i.test(
                error.message
            );
        if (!is_expected_error) {
            console.error('Error: FireRSS: Feed scan failed', error);
        }
        disableIcon(tab_id, Status.BROWSER_PAGE);
    });
};

chrome.tabs.onUpdated.addListener((tab_id, status) => {
    if (status.status !== 'complete') return;
    disableIcon(tab_id, Status.LOADING);
    RunInjectScript(tab_id);
});

chrome.tabs.onActivated.addListener((active_info) => {
    disableIcon(active_info.tabId);
    RunInjectScript(active_info.tabId);
});

chrome.runtime.onInstalled.addListener((details) => {
    disableIcon();
    const previous_major = Number(details.previousVersion?.split('.')[0]);
    if (details.reason === 'update' && previous_major < 3) {
        void InitDefaultSettings()
            .then(() => chrome.runtime.openOptionsPage())
            .catch((error: unknown) => console.error('Error: FireRSS: Failed to prepare v3 migration', error));
    }
});

const ClearFeedCache = async () => {
    const items = await chrome.storage.session.get(null);
    const feed_keys = Object.keys(items).filter((key) => key.startsWith(extended_cache_prefix));
    if (feed_keys.length > 0) {
        await chrome.storage.session.remove(feed_keys);
    }
};

RegisterSettingsSync();
chrome.storage.onChanged.addListener((changes, area_name) => {
    const change = changes.firerss_settings;
    if (area_name !== 'local' || !change) return;
    const old_settings = NormalizeSettings(change.oldValue);
    const new_settings = NormalizeSettings(change.newValue);
    if (
        old_settings.extended_feed_scan !== new_settings.extended_feed_scan ||
        JSON.stringify(old_settings.ignored_sites) !== JSON.stringify(new_settings.ignored_sites) ||
        JSON.stringify(old_settings.extended_scan_exclusions) !==
            JSON.stringify(new_settings.extended_scan_exclusions) ||
        JSON.stringify(old_settings.feed_templates) !== JSON.stringify(new_settings.feed_templates)
    ) {
        void ClearFeedCache();
    }
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'exclude_site') disableIcon(message.tabId, Status.SITE_IGNORED);
});
