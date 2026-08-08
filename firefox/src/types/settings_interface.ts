import { Theme } from './theme';

export interface UrlRule {
    pattern: string;
    match_type: 'contains' | 'domain' | 'subdomain';
}

export interface Settings {
    color_scheme: 'dark' | 'light' | 'system';
    theme: {
        name: string;
        url: string;
        colors: Theme['colors'];
    };
    ignored_sites: UrlRule[];
    extended_scan_exclusions: UrlRule[];
    feed_templates: {
        page_url_template: string;
        feed_url_template: string;
    }[];
    extended_feed_scan: 0 | 1 | 2;
}
