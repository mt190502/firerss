export const findAllFeeds = async (): Promise<string[]> => {
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

    if (!collected_feeds.length) {
        const possible_feed_files = ['index.xml', 'feed.xml', 'rss.xml', 'atom.xml', 'feed', 'rss', 'atom'];
        for (const file of possible_feed_files) {
            const feed = window.location.origin + '/' + file;
            const response = await fetch(feed);
            if (response.ok && response.headers.get('Content-Type')?.includes('xml')) {
                feed_urls.push(feed);
                break;
            }
        }
    }

    return feed_urls;
};
