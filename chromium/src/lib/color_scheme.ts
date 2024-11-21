import { Settings } from '../types/settings_interface';

export const ApplyColorScheme = (color_scheme?: Settings['color_scheme']) => {
    switch (color_scheme) {
        case 'light':
            document.documentElement.setAttribute('color-scheme', 'light');
            break;
        case 'dark':
            document.documentElement.setAttribute('color-scheme', 'dark');
            break;
        case 'system': {
            const system_prefers_dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('color-scheme', system_prefers_dark ? 'dark' : 'light');
            break;
        }
    }
};

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    ApplyColorScheme(e.matches ? 'dark' : 'light');
});

chrome.storage.local.onChanged.addListener((changes) => {
    if (changes.firerss_settings) {
        ApplyColorScheme(changes.firerss_settings.newValue.color_scheme);
    }
});
