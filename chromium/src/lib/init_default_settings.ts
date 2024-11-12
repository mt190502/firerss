import { Settings } from '../types/settings_interface';

export const InitDefaultSettings = () => {
    const settings: Settings = {
        theme: 'system',
        ignored_sites: ['(.*).hetzner.(.*)'],
    };
    chrome.storage.local.set({ firerss_settings: settings });
};
