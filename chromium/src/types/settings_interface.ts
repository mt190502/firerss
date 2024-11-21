export interface Settings {
    theme: 'dark' | 'light' | 'system';
    ignored_sites: (string | RegExp)[];
    extended_feed_scan: 0 | 1 | 2;
}
