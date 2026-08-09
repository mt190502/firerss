import { findPassiveFeeds, findYouTubeFeeds } from './content';
import { ResolveFeedTemplates } from './lib/feed_templates';
import { InitDefaultSettings } from './lib/init_default_settings';
import { NormalizeSettings, RegisterSettingsSync } from './lib/settings_storage';
import { UrlRule } from './types/settings_interface';

enum Status {
    LOADING = 'Loading',
    NO_FEEDS = 'No feed candidates found',
    SITE_IGNORED = 'Site ignored',
    BROWSER_PAGE = 'Browser page',
}

const popup_url = browser.runtime.getURL('/html/popup.html');
const tab_feed_state_prefix = 'firerss_tab_feed_state:';
const scan_versions = new Map<number, number>();
const passive_feeds = new Map<number, string[]>();
const spa_navigations = new Set<number>();
const loading_tabs = new Set<number>();

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

const enableIcon = (tab_id: number, feed_urls: string[]) => {
    browser.action.enable(tab_id);
    browser.action.setIcon({ path: '/img/firerss_32.png', tabId: tab_id });
    browser.action.setBadgeText({ text: feed_urls.length.toString(), tabId: tab_id });
    browser.action.setBadgeBackgroundColor({ color: '#FF6600', tabId: tab_id });
    browser.action.setTitle({
        title: `FireRSS (Found ${feed_urls.length} feed candidate${feed_urls.length === 1 ? '' : 's'})`,
        tabId: tab_id,
    });
};

const updatePopupState = (tab_id: number, feed_urls: string[]) => {
    enableIcon(tab_id, feed_urls);

    const popup = new URL(popup_url);
    popup.searchParams.set('feedlinks', JSON.stringify(feed_urls));
    browser.action.setPopup({ popup: popup.toString(), tabId: tab_id });
};

const extended_feed_paths = ['/atom.xml', '/atom', '/feed.xml', '/feed', '/index.xml', '/rss.xml', '/rss'];
const extended_cache_prefix = 'firerss_extended:v2:';
const positive_cache_ttl = 24 * 60 * 60 * 1000;
const negative_cache_ttl = 15 * 60 * 1000;
const pending_extended_scans = new Map<string, Promise<string[]>>();

interface ExtendedFeedCache {
    expires_at: number;
    feed_urls: string[];
}

interface PassiveFeedResult {
    feed_urls: string[];
    settled: boolean;
}

interface TabFeedState {
    passive_feed_urls: string[];
}

const IsPassiveFeedResult = (value: unknown): value is PassiveFeedResult => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const result = value as Record<string, unknown>;
    return (
        Array.isArray(result.feed_urls) &&
        result.feed_urls.every((feed_url) => typeof feed_url === 'string') &&
        typeof result.settled === 'boolean'
    );
};

const IsTabFeedState = (value: unknown): value is TabFeedState => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const state = value as Record<string, unknown>;
    return (
        Array.isArray(state.passive_feed_urls) &&
        state.passive_feed_urls.every((feed_url) => typeof feed_url === 'string')
    );
};

const GetYouTubeChannelRoute = (value: string): string | undefined => {
    const url = new URL(value);
    if (!['youtube.com', 'www.youtube.com'].includes(url.hostname)) return undefined;
    return url.pathname.match(/^\/(?:@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)/i)?.[0].toLowerCase();
};

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
        const cached = (await browser.storage.session.get(cache_key))[cache_key];
        if (IsExtendedFeedCache(cached) && cached.expires_at > Date.now()) return [...cached.feed_urls];

        const feed_urls: string[] = [];
        for (const path of extended_feed_paths) {
            const feed_url = new URL(path, origin).toString();
            try {
                const response = await fetch(feed_url, {
                    cache: 'no-store',
                    credentials: 'omit',
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
        await browser.storage.session.set({ [cache_key]: cache });
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

const injectScript = async (
    tab_id: number,
    scan_version: number,
    wait_for_navigation: boolean,
    tab_info?: browser.tabs.Tab
) => {
    const settings = await InitDefaultSettings();
    tab_info ??= await browser.tabs.get(tab_id);
    if (scan_versions.get(tab_id) !== scan_version) return;
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

    if (!passive_feeds.has(tab_id)) {
        const state_key = tab_feed_state_prefix + tab_id;
        const stored_state = (await browser.storage.session.get(state_key))[state_key];
        if (scan_versions.get(tab_id) !== scan_version) return;
        if (IsTabFeedState(stored_state)) passive_feeds.set(tab_id, stored_state.passive_feed_urls);
    }
    const previous_passive_feeds = wait_for_navigation ? (passive_feeds.get(tab_id) ?? []) : [];
    const youtube_channel_route = GetYouTubeChannelRoute(tab_url);
    const InjectPassiveFeeds = async () => {
        if (wait_for_navigation && youtube_channel_route) {
            return browser.scripting.executeScript({
                target: { tabId: tab_id },
                world: 'MAIN',
                func: findYouTubeFeeds as unknown as () => void,
            });
        }
        return browser.scripting.executeScript({
            target: { tabId: tab_id },
            func: findPassiveFeeds as unknown as (previous_feed_urls: string[], wait_for_navigation: boolean) => void,
            args: [previous_passive_feeds, wait_for_navigation],
        });
    };
    const injection = await InjectPassiveFeeds();
    const detected_passive_feeds: string[] = [];
    let passive_feeds_settled = true;
    let has_passive_result = false;
    for (const result of injection) {
        const value: unknown = result.result;
        if (!IsPassiveFeedResult(value)) continue;
        has_passive_result = true;
        passive_feeds_settled &&= value.settled;
        for (const feed_url of value.feed_urls) {
            if (feed_url.trim() !== '') {
                AddFeedUrl(feed_urls, feed_url);
                if (!detected_passive_feeds.includes(feed_url)) detected_passive_feeds.push(feed_url);
            }
        }
    }
    if (!has_passive_result) throw new Error('The page did not return a valid passive feed scan result.');
    if (scan_versions.get(tab_id) !== scan_version) return;

    const should_probe =
        !is_extended_scan_excluded &&
        (settings.extended_feed_scan === 2 || (settings.extended_feed_scan === 1 && feed_urls.length === 0));
    if (should_probe) {
        for (const feed_url of await ProbeExtendedFeeds(url.origin)) {
            AddFeedUrl(feed_urls, feed_url, '_');
        }
    }

    if (scan_versions.get(tab_id) !== scan_version) return;
    if (passive_feeds_settled) {
        passive_feeds.set(tab_id, detected_passive_feeds);
        spa_navigations.delete(tab_id);
        await browser.storage.session.set({
            [tab_feed_state_prefix + tab_id]: {
                passive_feed_urls: detected_passive_feeds,
            } satisfies TabFeedState,
        });
        if (scan_versions.get(tab_id) !== scan_version) return;
    }
    if (feed_urls.length > 0) {
        updatePopupState(tab_id, feed_urls);
    } else {
        disableIcon(tab_id, Status.NO_FEEDS);
    }
};

const RunInjectScript = (
    tab_id: number,
    scan_version: number,
    wait_for_navigation: boolean,
    tab_info?: browser.tabs.Tab
) => {
    void injectScript(tab_id, scan_version, wait_for_navigation, tab_info).catch((error: unknown) => {
        if (scan_versions.get(tab_id) !== scan_version) return;
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

const InvalidateScan = (tab_id: number): number => {
    const scan_version = (scan_versions.get(tab_id) ?? 0) + 1;
    scan_versions.set(tab_id, scan_version);
    disableIcon(tab_id, Status.LOADING);
    browser.action.setPopup({ popup: popup_url, tabId: tab_id });
    return scan_version;
};

const ScheduleScan = (
    tab_id: number,
    tab_info?: browser.tabs.Tab,
    wait_for_navigation = spa_navigations.has(tab_id)
) => {
    RunInjectScript(tab_id, InvalidateScan(tab_id), wait_for_navigation, tab_info);
};

browser.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId !== 0) return;
    loading_tabs.add(details.tabId);
    spa_navigations.delete(details.tabId);
    InvalidateScan(details.tabId);
});

browser.webNavigation.onCompleted.addListener((details) => {
    if (details.frameId !== 0) return;
    void browser.tabs
        .get(details.tabId)
        .then((tab) => {
            if (tab.url !== details.url || spa_navigations.has(details.tabId)) return;
            loading_tabs.delete(details.tabId);
            ScheduleScan(details.tabId, undefined, false);
        })
        .catch(() => undefined);
});

browser.webNavigation.onHistoryStateUpdated.addListener((details) => {
    if (details.frameId !== 0) return;
    loading_tabs.delete(details.tabId);
    spa_navigations.add(details.tabId);
    ScheduleScan(details.tabId, undefined, true);
});

browser.webNavigation.onReferenceFragmentUpdated.addListener((details) => {
    if (details.frameId !== 0) return;
    loading_tabs.delete(details.tabId);
    spa_navigations.delete(details.tabId);
    ScheduleScan(details.tabId, undefined, false);
});

browser.webNavigation.onErrorOccurred.addListener((details) => {
    if (details.frameId !== 0) return;
    void browser.tabs
        .get(details.tabId)
        .then((tab) => {
            if (tab.url !== details.url) return;
            loading_tabs.delete(details.tabId);
            spa_navigations.delete(details.tabId);
            InvalidateScan(details.tabId);
            disableIcon(details.tabId, Status.BROWSER_PAGE);
        })
        .catch(() => undefined);
});

browser.tabs.onActivated.addListener((active_info) => {
    if (loading_tabs.has(active_info.tabId)) {
        InvalidateScan(active_info.tabId);
        return;
    }
    ScheduleScan(active_info.tabId);
});

browser.tabs.onRemoved.addListener((tab_id) => {
    scan_versions.delete(tab_id);
    passive_feeds.delete(tab_id);
    spa_navigations.delete(tab_id);
    loading_tabs.delete(tab_id);
    void browser.storage.session.remove(tab_feed_state_prefix + tab_id);
});

browser.runtime.onInstalled.addListener((details) => {
    disableIcon();
    const previous_major = Number(details.previousVersion?.split('.')[0]);
    if (details.reason === 'update' && previous_major < 3) {
        void InitDefaultSettings()
            .then(() => browser.runtime.openOptionsPage())
            .catch((error: unknown) => console.error('Error: FireRSS: Failed to prepare v3 migration', error));
    }
});

const ClearFeedCache = async () => {
    const items = await browser.storage.session.get(null);
    const feed_keys = Object.keys(items).filter((key) => key.startsWith(extended_cache_prefix));
    if (feed_keys.length > 0) await browser.storage.session.remove(feed_keys);
};

RegisterSettingsSync();
browser.storage.onChanged.addListener((changes, area_name) => {
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

browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'exclude_site' && typeof message.tabId === 'number') {
        disableIcon(message.tabId, Status.SITE_IGNORED);
    }
});
