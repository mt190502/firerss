const initPopup = async () => {
    const url = new URL(window.location.href);
    const feed_urls: string[] = JSON.parse(url.searchParams.get('feedlinks'));
    const feed_list = document.getElementById('feed_url_list');

    for (const feed_url of feed_urls) {
        const tr = document.createElement('tr');
        const td1 = document.createElement('td');
        const td2 = document.createElement('td');
        const a = document.createElement('a');
        const copy_btn = document.createElement('button');

        td1.setAttribute('class', 'col1 feed_url');
        td2.setAttribute('class', 'col2 copy_button_area');
        a.setAttribute('class', 'feed_url_link');
        a.setAttribute('target', '_blank');
        a.setAttribute('href', feed_url);
        a.setAttribute('title', feed_url);
        a.innerText = feed_url;
        copy_btn.setAttribute('class', 'copy_button');
        copy_btn.setAttribute('title', 'Copy to clipboard');
        copy_btn.setAttribute('value', feed_url);
        copy_btn.innerText = 'Copy';

        td1.appendChild(a);
        td2.appendChild(copy_btn);
        tr.appendChild(td1);
        tr.appendChild(td2);
        feed_list.appendChild(tr); 
    }

    const copy_buttons = document.querySelectorAll('.copy_button');
    for (const button of Array.from(copy_buttons)) {
        button.addEventListener('click', async (event) => {
            const feed_url = (event.target as HTMLButtonElement).value;
            await navigator.clipboard.writeText(feed_url);
            (button as HTMLButtonElement).innerText = 'Copied!';
            setTimeout(() => {
                (button as HTMLButtonElement).innerText = 'Copy';
            }, 2000);
        });
    }
};

if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initPopup();
} else {
    document.addEventListener('DOMContentLoaded', initPopup, { once: true });
}
