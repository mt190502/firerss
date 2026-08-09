export const findPassiveFeeds = async (
    previous_feed_urls: string[] = [],
    wait_for_navigation = false
): Promise<{ feed_urls: string[]; settled: boolean }> => {
    const ReadFeedUrls = (source: Document = document, base_url = window.location.href): string[] => {
        const feed_urls: string[] = [];
        const collected_feeds = source.querySelectorAll(
            'link[type="application/rss+xml"], link[type="application/atom+xml"]'
        );
        for (let i = 0; i < collected_feeds.length; i++) {
            const feed = collected_feeds[i];
            const href = feed.getAttribute('href');
            if (!href || !URL.canParse(href, base_url)) continue;
            const feed_url = new URL(href, base_url);
            if (['http:', 'https:'].includes(feed_url.protocol) && !feed_urls.includes(feed_url.toString())) {
                feed_urls.push(feed_url.toString());
            }
        }
        return feed_urls;
    };
    const FetchPageFeedUrls = async (): Promise<string[] | undefined> => {
        try {
            const response = await fetch(window.location.href, {
                cache: 'no-store',
                credentials: 'omit',
                redirect: 'follow',
                referrerPolicy: 'no-referrer',
                signal: AbortSignal.timeout(5_000),
            });
            if (
                !response.ok ||
                !/(?:text\/html|application\/xhtml\+xml)/i.test(response.headers.get('Content-Type') ?? '')
            ) {
                return undefined;
            }
            const parsed_page = new DOMParser().parseFromString(await response.text(), 'text/html');
            const base_href = parsed_page.querySelector('base[href]')?.getAttribute('href');
            const base_url =
                base_href && URL.canParse(base_href, response.url)
                    ? new URL(base_href, response.url).toString()
                    : response.url;
            return ReadFeedUrls(parsed_page, base_url);
        } catch {
            return undefined;
        }
    };

    if (!wait_for_navigation) return { feed_urls: ReadFeedUrls(), settled: true };

    const initial_feed_urls = ReadFeedUrls();
    return new Promise<{ feed_urls: string[]; settled: boolean }>((resolve) => {
        let settle_timeout: ReturnType<typeof setTimeout> | undefined;
        let minimum_timeout: ReturnType<typeof setTimeout> | undefined;
        const baseline_feed_urls = previous_feed_urls.length > 0 ? previous_feed_urls : initial_feed_urls;
        let observed_feed_urls = initial_feed_urls;
        let observed_change = JSON.stringify(initial_feed_urls) !== JSON.stringify(baseline_feed_urls);
        let finished = false;
        const Finish = async () => {
            if (finished) return;
            finished = true;
            const current_feed_urls = ReadFeedUrls();
            if (JSON.stringify(current_feed_urls) !== JSON.stringify(baseline_feed_urls)) {
                observed_feed_urls = current_feed_urls;
                observed_change = true;
            }
            const feed_urls = observed_change ? observed_feed_urls : current_feed_urls;
            const is_previous_feed =
                previous_feed_urls.length > 0 && JSON.stringify(feed_urls) === JSON.stringify(previous_feed_urls);
            observer.disconnect();
            clearTimeout(maximum_timeout);
            if (settle_timeout) clearTimeout(settle_timeout);
            if (minimum_timeout) clearTimeout(minimum_timeout);
            if (feed_urls.length === 0 || is_previous_feed) {
                const fetched_feed_urls = await FetchPageFeedUrls();
                if (fetched_feed_urls) {
                    resolve({ feed_urls: fetched_feed_urls, settled: true });
                    return;
                }
            }
            resolve({ feed_urls: is_previous_feed ? [] : feed_urls, settled: !is_previous_feed });
        };
        const ScheduleFinish = () => {
            if (settle_timeout) clearTimeout(settle_timeout);
            settle_timeout = setTimeout(Finish, 500);
        };
        const observer = new MutationObserver(() => {
            const feed_urls = ReadFeedUrls();
            if (JSON.stringify(feed_urls) !== JSON.stringify(baseline_feed_urls)) {
                observed_feed_urls = feed_urls;
                observed_change = true;
                ScheduleFinish();
            }
        });
        const maximum_timeout = setTimeout(Finish, 5_000);
        observer.observe(document.documentElement, {
            attributeFilter: ['href', 'type'],
            attributes: true,
            childList: true,
            subtree: true,
        });

        if (JSON.stringify(initial_feed_urls) !== JSON.stringify(baseline_feed_urls)) {
            ScheduleFinish();
        } else if (previous_feed_urls.length === 0) {
            minimum_timeout = setTimeout(ScheduleFinish, 1_500);
        }
    });
};

export const findYouTubeFeeds = async (): Promise<{ feed_urls: string[]; settled: boolean }> => {
    const page_url = new URL(window.location.href);
    if (!['youtube.com', 'www.youtube.com'].includes(page_url.hostname)) {
        return { feed_urls: [], settled: true };
    }

    const path_channel_id = page_url.pathname.match(/^\/channel\/(UC[\w-]+)/i)?.[1];
    if (path_channel_id) {
        return {
            feed_urls: [`https://www.youtube.com/feeds/videos.xml?channel_id=${path_channel_id}`],
            settled: true,
        };
    }

    const current_channel_route = page_url.pathname.match(/^\/(?:@[^/]+|c\/[^/]+|user\/[^/]+)/i)?.[0].toLowerCase();
    if (!current_channel_route) return { feed_urls: [], settled: true };

    const NormalizeChannelRoute = (value: unknown): string | undefined => {
        if (typeof value !== 'string' || !URL.canParse(value, page_url.origin)) return undefined;
        return new URL(value, page_url.origin).pathname
            .match(/^\/(?:@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)/i)?.[0]
            .toLowerCase();
    };
    const ExtractChannel = (value: unknown): { channel_id: string; routes: string[] } | undefined => {
        const pending = [value];
        const visited = new Set<object>();
        for (let depth = 0; pending.length > 0 && depth < 8; depth++) {
            const current = pending.shift();
            if (typeof current !== 'object' || current === null || visited.has(current)) continue;
            visited.add(current);
            const data = current as Record<string, unknown>;
            const metadata = data.metadata as Record<string, unknown> | undefined;
            const renderer = metadata?.channelMetadataRenderer as Record<string, unknown> | undefined;
            if (typeof renderer?.externalId === 'string' && /^UC[\w-]+$/.test(renderer.externalId)) {
                const routes = [renderer.channelUrl, renderer.vanityChannelUrl]
                    .map(NormalizeChannelRoute)
                    .filter((route): route is string => typeof route === 'string');
                return { channel_id: renderer.externalId, routes };
            }
            pending.push(data.response, data.data);
        }
        return undefined;
    };
    const ReadChannel = (): { channel_id: string; routes: string[] } | undefined => {
        const app = document.querySelector('ytd-app') as (HTMLElement & { data?: unknown }) | null;
        const initial_data = (window as typeof window & { ytInitialData?: unknown }).ytInitialData;
        return ExtractChannel(app?.data) ?? ExtractChannel(initial_data);
    };
    const IsCurrentChannel = (
        channel: { channel_id: string; routes: string[] } | undefined
    ): channel is { channel_id: string; routes: string[] } => {
        return !!channel && channel.routes.includes(current_channel_route);
    };
    const ToResult = (channel_id: string): { feed_urls: string[]; settled: boolean } => ({
        feed_urls: [`https://www.youtube.com/feeds/videos.xml?channel_id=${channel_id}`],
        settled: true,
    });
    const initial_channel = ReadChannel();
    if (IsCurrentChannel(initial_channel)) {
        return ToResult(initial_channel.channel_id);
    }

    return new Promise((resolve) => {
        let fallback_timeout: ReturnType<typeof setTimeout> | undefined;
        const Finish = (channel_id?: string) => {
            clearInterval(interval);
            clearTimeout(timeout);
            if (fallback_timeout) clearTimeout(fallback_timeout);
            document.removeEventListener('yt-navigate-finish', OnNavigateFinish);
            resolve(channel_id ? ToResult(channel_id) : { feed_urls: [], settled: false });
        };
        const ReadUpdatedChannel = () => {
            const channel = ReadChannel();
            if (IsCurrentChannel(channel)) Finish(channel.channel_id);
        };
        const OnNavigateFinish = (event: Event) => {
            const event_channel = ExtractChannel((event as CustomEvent<unknown>).detail);
            if (IsCurrentChannel(event_channel)) {
                Finish(event_channel.channel_id);
            } else {
                fallback_timeout = setTimeout(ReadUpdatedChannel, 100);
            }
        };
        document.addEventListener('yt-navigate-finish', OnNavigateFinish);
        const interval = setInterval(ReadUpdatedChannel, 100);
        const timeout = setTimeout(() => {
            const channel = ReadChannel();
            Finish(IsCurrentChannel(channel) ? channel.channel_id : undefined);
        }, 5_000);
    });
};
