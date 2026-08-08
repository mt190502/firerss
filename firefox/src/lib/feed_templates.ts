import { Settings } from '../types/settings_interface';

const normalizeTemplateUrl = (value: string) => {
    return value
        .trim()
        .replace(/^(https?:\/\/)www\./i, '$1')
        .replace(/[?#].*$/, '')
        .replace(/\/+$/, '');
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const ResolveFeedTemplates = (page_url: string, templates: Settings['feed_templates']): string[] => {
    const normalized_page_url = normalizeTemplateUrl(new URL(page_url).origin + new URL(page_url).pathname);
    const feed_urls: string[] = [];

    for (const template of templates) {
        const placeholder_names: string[] = [];
        const regex_source = escapeRegExp(normalizeTemplateUrl(template.page_url_template)).replace(
            /<([a-zA-Z_][a-zA-Z0-9_]*)>/g,
            (placeholder) => {
                const name = placeholder.slice(1, -1);
                placeholder_names.push(name);
                return '([^/?#]+?)';
            }
        );
        const match = normalized_page_url.match(new RegExp(`^${regex_source}(?:/.*)?$`, 'i'));
        if (!match) continue;

        let feed_url = template.feed_url_template.trim();
        for (let i = 0; i < placeholder_names.length; i++) {
            feed_url = feed_url.split(`<${placeholder_names[i]}>`).join(match[i + 1]);
        }
        if (!/<[a-zA-Z_][a-zA-Z0-9_]*>/.test(feed_url) && URL.canParse(feed_url)) {
            const protocol = new URL(feed_url).protocol;
            if (protocol === 'http:' || protocol === 'https:') feed_urls.push(feed_url);
        }
    }

    return [...new Set(feed_urls)];
};
