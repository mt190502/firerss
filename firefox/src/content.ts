export const findPassiveFeeds = (): string[] => {
    const feed_urls: string[] = [];

    const collected_feeds = document.querySelectorAll(
        'link[type="application/rss+xml"], link[type="application/atom+xml"]'
    );
    for (let i = 0; i < collected_feeds.length; i++) {
        const feed = collected_feeds[i];
        if (feed instanceof HTMLLinkElement) {
            feed_urls.push(feed.href);
        }
    }

    return feed_urls;
};
