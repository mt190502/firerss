import { Settings } from '../types/settings_interface';

export const ApplyTheme = (theme?: Settings['theme']) => {
    if (theme.name === 'default') {
        document.documentElement.removeAttribute('style');
    } else {
        document.documentElement.removeAttribute('style');
        for (const key in theme.colors) {
            document.documentElement.style.setProperty(`--bg-${key}`, theme.colors[key].background);
            document.documentElement.style.setProperty(`--fg-${key}`, theme.colors[key].foreground);
            document.documentElement.style.setProperty(`--active-${key}`, theme.colors[key].active);
            document.documentElement.style.setProperty(`--inactive-${key}`, theme.colors[key].inactive);
            document.documentElement.style.setProperty(`--select-${key}`, theme.colors[key].selection);
            document.documentElement.style.setProperty(`--comment-${key}`, theme.colors[key].comment);
            document.documentElement.style.setProperty(`--cyan-${key}`, theme.colors[key].cyan);
            document.documentElement.style.setProperty(`--green-${key}`, theme.colors[key].green);
            document.documentElement.style.setProperty(`--orange-${key}`, theme.colors[key].orange);
            document.documentElement.style.setProperty(`--pink-${key}`, theme.colors[key].pink);
            document.documentElement.style.setProperty(`--purple-${key}`, theme.colors[key].purple);
            document.documentElement.style.setProperty(`--red-${key}`, theme.colors[key].red);
            document.documentElement.style.setProperty(`--yellow-${key}`, theme.colors[key].yellow);
        }
    }
};

browser.storage.local.onChanged.addListener((changes) => {
    if (changes.firerss_settings) {
        ApplyTheme(changes.firerss_settings.newValue.theme);
    }
});
