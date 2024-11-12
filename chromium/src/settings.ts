import { InitDefaultSettings } from './lib/init_default_settings';
import { applyTheme } from './lib/theme';
import { Settings } from './types/settings_interface';

let settings: Settings;
let dark_mode_theme_btn: HTMLButtonElement;
let light_mode_theme_btn: HTMLButtonElement;
let system_mode_theme_btn: HTMLButtonElement;
let ignored_urls_textarea: HTMLTextAreaElement;

const ChangeTheme = (theme: Settings['theme'], button_id: string) => {
    settings.theme = theme;
    light_mode_theme_btn.classList.remove('active');
    dark_mode_theme_btn.classList.remove('active');
    system_mode_theme_btn.classList.remove('active');
    document.getElementById(button_id).classList.add('active');
    chrome.storage.local.set({ firerss_settings: settings });
};

const SaveIgnoredSites = () => {
    settings.ignored_sites = ignored_urls_textarea.value.split('\n').filter((line) => line.trim() !== '');
    chrome.storage.local.set({ firerss_settings: settings });
};

document.addEventListener('DOMContentLoaded', () => {
    dark_mode_theme_btn = document.getElementById('theme_button_dark') as HTMLButtonElement;
    light_mode_theme_btn = document.getElementById('theme_button_light') as HTMLButtonElement;
    system_mode_theme_btn = document.getElementById('theme_button_system') as HTMLButtonElement;
    ignored_urls_textarea = document.getElementById('ignored_urls') as HTMLTextAreaElement;

    light_mode_theme_btn.addEventListener('click', () => ChangeTheme('light', 'theme_button_light'));
    dark_mode_theme_btn.addEventListener('click', () => ChangeTheme('dark', 'theme_button_dark'));
    system_mode_theme_btn.addEventListener('click', () => ChangeTheme('system', 'theme_button_system'));
    ignored_urls_textarea.addEventListener('change', () => SaveIgnoredSites());

    chrome.storage.local.get('firerss_settings', (setting) => {
        settings = setting.firerss_settings || InitDefaultSettings();
        ChangeTheme(settings.theme, `theme_button_${settings.theme}`);
        applyTheme(settings.theme);
        ignored_urls_textarea.value = settings.ignored_sites.join('\n') || '';
    });
});
