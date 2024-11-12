import { Settings } from '../types/settings_interface';

export const InitDefaultSettings = (): Settings => {
    const settings: Settings = {
        theme: 'system',
        ignored_sites: ['(.*).hetzner.(.*)'],
    };
    browser.storage.local.set({ firerss_settings: settings });
    return settings;
};
