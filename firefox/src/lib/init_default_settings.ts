import { Settings } from '../types/settings_interface';

export const InitDefaultSettings = async (): Promise<Settings> => {
    const settings_in_storage = (await browser.storage.local.get('firerss_settings')).firerss_settings;

    const settings: Settings = {
        theme: settings_in_storage?.theme || 'light',
        ignored_sites: settings_in_storage?.ignored_sites || ['(.*).hetzner.(.*)'],
        extended_feed_scan: settings_in_storage?.extended_feed_scan || 0,
    };
    browser.storage.local.set({ firerss_settings: settings });
    return settings;
};
