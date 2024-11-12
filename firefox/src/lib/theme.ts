import { Settings } from '../types/settings_interface';

export const applyTheme = (theme?: Settings['theme']) => {
    switch (theme) {
        case 'light':
            document.documentElement.setAttribute('data-theme', 'light');
            break;
        case 'dark':
            document.documentElement.setAttribute('data-theme', 'dark');
            break;
        case 'system': {
            const system_prefers_dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', system_prefers_dark ? 'dark' : 'light');
            break;
        }
    }
};

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    applyTheme(e.matches ? 'dark' : 'light');
});

browser.storage.local.onChanged.addListener((changes) => {
    if (changes.firerss_settings) {
        applyTheme(changes.firerss_settings.newValue.theme);
    }
});
