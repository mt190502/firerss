export const findPassiveFeeds = (): string[] => {
    const feed_urls: string[] = [];
    const page_url = new URL(window.location.href);

    if (page_url.hostname === 'youtube.com' || page_url.hostname === 'www.youtube.com') {
        const path_channel_id = page_url.pathname.match(/^\/channel\/([\w-]+)/i)?.[1];
        const page_channel_id = document.querySelector('meta[itemprop="channelId"]')?.getAttribute('content');
        const channel_id = path_channel_id ?? page_channel_id;
        if (channel_id && /^[\w-]+$/.test(channel_id)) {
            feed_urls.push(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel_id}`);
        }
    }

    const collected_feeds = document.querySelectorAll(
        'link[type="application/rss+xml"], link[type="application/atom+xml"], a[href*="rss"], a[href*="atom"], a[href*="feed"]'
    );
    for (const feed of collected_feeds) {
        if (!(feed instanceof HTMLLinkElement || feed instanceof HTMLAnchorElement)) continue;
        if (!URL.canParse(feed.href)) continue;
        const protocol = new URL(feed.href).protocol;
        if ((protocol === 'http:' || protocol === 'https:') && !feed_urls.includes(feed.href)) {
            feed_urls.push(feed.href);
        }
    }

    return feed_urls;
};
