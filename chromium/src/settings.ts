import { ApplyColorScheme } from './lib/color_scheme';
import { InitDefaultSettings } from './lib/init_default_settings';
import { ApplyTheme } from './lib/theme';
import { Settings } from './types/settings_interface';

let settings: Settings;
let theme_selector: HTMLSelectElement;
let color_scheme_buttons: HTMLButtonElement[];
let ignored_urls_textarea: HTMLTextAreaElement;
let extended_feed_scan_buttons: HTMLButtonElement[];

const SaveColorScheme = (color_scheme: Settings['color_scheme']) => {
    settings.color_scheme = color_scheme;
    for (const button of color_scheme_buttons) {
        button.classList.remove('active');
        if (button.value === color_scheme) button.classList.add('active');
    }
    chrome.storage.local.set({ firerss_settings: settings });
};

const SaveTheme = async (theme: string) => {
    if (theme === 'default') {
        settings.theme = { name: 'default', url: 'default', colors: {} };
        chrome.storage.local.set({ firerss_settings: settings });
    } else {
        const theme_data = await (await fetch(theme)).json();
        settings.theme = { name: theme_data.theme, url: theme, colors: theme_data.colors };
        chrome.storage.local.set({ firerss_settings: settings });
    }
};

const SaveIgnoredSites = () => {
    settings.ignored_sites = ignored_urls_textarea.value.split('\n').filter((line) => line.trim() !== '');
    chrome.storage.local.set({ firerss_settings: settings });
    chrome.runtime.sendMessage({ type: 'clear_feed_cache' });
};

const ToggleExtendedFeedScan = (opt: 0 | 1 | 2) => {
    // 0: disabled, 1: if no feed found, 2: always
    settings.extended_feed_scan = opt;
    for (const button of extended_feed_scan_buttons) {
        button.classList.remove('active');
        if (button.value === opt.toString()) button.classList.add('active');
    }
    chrome.storage.local.set({ firerss_settings: settings });
    chrome.runtime.sendMessage({ type: 'clear_feed_cache' });
};

document.addEventListener('DOMContentLoaded', async () => {
    color_scheme_buttons = Array.from(document.querySelectorAll('.color_scheme_button')) as HTMLButtonElement[];
    theme_selector = document.getElementById('theme_selector') as HTMLSelectElement;
    ignored_urls_textarea = document.getElementById('ignored_urls') as HTMLTextAreaElement;
    extended_feed_scan_buttons = Array.from(
        document.querySelectorAll('.extended_feed_scan_button')
    ) as HTMLButtonElement[];

    const remote_theme_list = await fetch('https://api.github.com/repos/mt190502/firerss/contents/themes');
    const themes = (await remote_theme_list.json()) as { name: string; download_url: string }[];
    for (const theme of themes) {
        const option = document.createElement('option');
        option.value = theme.download_url;
        option.innerText = theme.name.charAt(0).toUpperCase() + theme.name.slice(1).replace('.json', '');
        theme_selector.appendChild(option);
    }

    for (const button of color_scheme_buttons) {
        button.addEventListener('click', () => SaveColorScheme(button.value as Settings['color_scheme']));
    }
    for (const button of extended_feed_scan_buttons) {
        button.addEventListener('click', () => ToggleExtendedFeedScan(Number(button.value) as 0 | 1 | 2));
    }
    theme_selector.addEventListener('change', () => SaveTheme(theme_selector.value));
    ignored_urls_textarea.addEventListener('change', () => SaveIgnoredSites());

    chrome.storage.local.get('firerss_settings', async (setting) => {
        settings = setting.firerss_settings;
        const default_settings: Settings = await InitDefaultSettings();

        for (const key of Object.keys(default_settings) as (keyof Settings)[]) {
            if (settings[key] === undefined) {
                (settings[key] as unknown) = default_settings[key];
            }
        }

        SaveColorScheme(settings.color_scheme);
        ApplyColorScheme(settings.color_scheme);

        SaveTheme(settings.theme.url);
        ApplyTheme(settings.theme);

        ToggleExtendedFeedScan(settings?.extended_feed_scan);
        theme_selector.value = settings?.theme?.url || 'default';
        ignored_urls_textarea.value = settings?.ignored_sites.join('\n') || '';
    });
    const iconButtons = document.querySelectorAll('.icon-button[data-href]');
    for (const btn of Array.from(iconButtons)) {
        btn.addEventListener('click', (event) => {
            const href = (event.currentTarget as HTMLElement).getAttribute('data-href');
            if (href) window.open(href, '_blank');
        });
    }
});
