export interface Settings {
    theme: 'dark' | 'light' | 'system';
    ignored_sites: (string | RegExp)[];
}
