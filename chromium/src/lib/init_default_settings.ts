import { Settings } from '../types/settings_interface';

export const InitDefaultSettings = async (): Promise<Settings> => {
    const settings_in_storage = (await chrome.storage.local.get('firerss_settings')).firerss_settings;

    const defaultIgnoredSites = [
        'amazon',
        'apple',
        'bing',
        'dailymotion',
        'duckduckgo',
        'facebook',
        'google',
        'hetzner',
        'icloud',
        'instagram',
        'linkedin',
        'netflix',
        'outlook',
        'reddit',
        'soundcloud',
        'spotify',
        'telegram',
        'twitter',
        'vimeo',
        'whatsapp',
        'yahoo',
        'yandex',
     ].map((pattern) => ({ pattern, match_type: 'contains' }));

    const settings: Settings = {
        color_scheme: settings_in_storage?.color_scheme || 'light',
        theme: settings_in_storage?.theme || 'default',
        ignored_sites: settings_in_storage?.ignored_sites || defaultIgnoredSites,
        extended_feed_scan: settings_in_storage?.extended_feed_scan || 0,
    };

    chrome.storage.local.set({ firerss_settings: settings });
    return settings;
};
