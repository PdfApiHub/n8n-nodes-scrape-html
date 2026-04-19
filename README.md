# n8n-nodes-scrape-html

[![NPM Version](https://img.shields.io/npm/v/n8n-nodes-scrape-html.svg)](https://www.npmjs.com/package/n8n-nodes-scrape-html)
[![License](https://img.shields.io/npm/l/n8n-nodes-scrape-html.svg)](LICENSE.md)

> Fetch the fully-rendered HTML of any webpage using a headless browser — perfect for SPAs and JavaScript-heavy sites.

This is an [n8n](https://n8n.io/) community node powered by **[PDF API Hub](https://pdfapihub.com)**.

---

## 🚀 Install

1. Go to **Settings → Community Nodes** in n8n
2. Enter `n8n-nodes-scrape-html`
3. Click **Install**

## 🔑 Setup

Sign up at [pdfapihub.com](https://pdfapihub.com) → copy your API key → add to n8n credentials.

---

## ✨ Features

| Parameter | Description |
|-----------|-------------|
| **URL** | Any public webpage |
| **Wait Until** | Fully Loaded, DOM Ready, Network Quiet, or First Response |
| **Wait for Element** | CSS selector to wait for before capturing (e.g. `#main-content`) |
| **Extra Delay** | Additional milliseconds for lazy content |
| **Viewport** | Desktop, Laptop, Mobile, Tablet, or Custom |

### Advanced Options

| Option | Description |
|--------|-------------|
| **Navigation Timeout** | Max milliseconds to wait for page load |
| **User Agent** | Custom user-agent string for mobile/bot versions |
| **Extra HTTP Headers** | Additional headers sent with every request |

---

## 💡 Use Cases

- **Web scraping** — get rendered HTML from React/Vue/Angular SPAs
- **Content monitoring** — track changes on dynamic websites
- **SEO analysis** — fetch rendered HTML for SEO auditing
- **Data extraction** — scrape JS-rendered content that simple HTTP can't reach

## License

[MIT](LICENSE.md)
