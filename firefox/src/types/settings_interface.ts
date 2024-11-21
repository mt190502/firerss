import { Theme } from './theme';

export interface Settings {
    color_scheme: 'dark' | 'light' | 'system';
    theme: {
        name: string;
        url: string;
        colors: Theme['colors'];
    };
    ignored_sites: (string | RegExp)[];
    extended_feed_scan: 0 | 1 | 2;
}
