const findAllFeeds = async (): Promise<string[]> => {
    const feed_urls: string[] = [];
    let feeds_on_page = document.querySelectorAll(
        'link[type="application/rss+xml"], link[type="application/atom+xml"], a[href*="rss"], a[href*="atom"], a[href*="feed"]'
    );
    feeds_on_page.forEach((feed) => {
        if (feed instanceof HTMLLinkElement) {
            feed_urls.push(feed.href);
        }
    });
    if (!feeds_on_page.length) {
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

if (typeof browser === 'undefined' && chrome) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        (async () => {
            const feed_urls = await findAllFeeds();
            switch (message.action) {
                case 'iWantToKnowFeeds':
                    sendResponse({ feeds: feed_urls });
                    break;
                case 'ping':
                    sendResponse({ status: 'pong' });
                    break;
                default:
                    sendResponse({ status: 'Unknown Action' });
                    break;
            }
        })();
        return true;
    });
}
