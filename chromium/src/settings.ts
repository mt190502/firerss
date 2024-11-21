import { InitDefaultSettings } from './lib/init_default_settings';
import { applyTheme } from './lib/theme';
import { Settings } from './types/settings_interface';

let settings: Settings;
let theme_buttons: HTMLButtonElement[];
let ignored_urls_textarea: HTMLTextAreaElement;
let extended_feed_scan_buttons: HTMLButtonElement[];

const ChangeTheme = (theme: Settings['theme']) => {
    settings.theme = theme;
    for (const button of theme_buttons) {
        button.classList.remove('active');
        if (button.value === theme) button.classList.add('active');
    }
    chrome.storage.local.set({ firerss_settings: settings });
};

const SaveIgnoredSites = () => {
    settings.ignored_sites = ignored_urls_textarea.value.split('\n').filter((line) => line.trim() !== '');
    chrome.storage.local.set({ firerss_settings: settings });
};

const ToggleExtendedFeedScan = (opt: 0 | 1 | 2) => {
    // 0: disabled, 1: if no feeds found, 2: always
    settings.extended_feed_scan = opt;
    for (const button of extended_feed_scan_buttons) {
        button.classList.remove('active');
        if (button.value === opt.toString()) button.classList.add('active');
    }
    chrome.storage.local.set({ firerss_settings: settings });
};

document.addEventListener('DOMContentLoaded', () => {
    theme_buttons = Array.from(document.querySelectorAll('.theme_button')) as HTMLButtonElement[];
    ignored_urls_textarea = document.getElementById('ignored_urls') as HTMLTextAreaElement;
    extended_feed_scan_buttons = Array.from(
        document.querySelectorAll('.extended_feed_scan_button')
    ) as HTMLButtonElement[];

    for (const button of theme_buttons) {
        button.addEventListener('click', () => ChangeTheme(button.value as Settings['theme']));
    }
    for (const button of extended_feed_scan_buttons) {
        button.addEventListener('click', () => ToggleExtendedFeedScan(Number(button.value) as 0 | 1 | 2));
    }
    ignored_urls_textarea.addEventListener('change', () => SaveIgnoredSites());

    chrome.storage.local.get('firerss_settings', (setting) => {
        settings = setting.firerss_settings || InitDefaultSettings();
        ChangeTheme(settings.theme);
        ToggleExtendedFeedScan(settings.extended_feed_scan);
        applyTheme(settings.theme);
        ignored_urls_textarea.value = settings.ignored_sites.join('\n') || '';
    });
});
