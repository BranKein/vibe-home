# vibe-home

**English** | [한국어](README.ko.md)

The front page of [yeonhyuk.me](https://yeonhyuk.me). It introduces Yeonhyuk Kim (김연혁) and the projects built so far, and holds the privacy policy and contact details. The AdSense registration and `ads.txt` also live on this root domain.

## Layout

- `src/`: page sources. `index.html` (bento cards), `now.html` (what I'm doing now), `privacy.html` (privacy policy), `style.css`, `img/avatar.jpg`.
- `scripts/build.mjs`: builds `dist/`. It reads the museum's exhibit list (`https://vibe-museum.yeonhyuk.me/data/exhibits.js`) to fill the cards of live projects, and falls back to the last copy in `data/exhibits.json` when it can't.
- `deploy/site.json`: what this site asks of the infrastructure. `subdomain: "@"` means `yeonhyuk.me` itself (vibe-infra `sites/home`).

## Commands

```bash
npm test
npm run build
```

No dependencies (Node 22).

## Search and ads

The build adds a title, description, canonical and OG tags to every page, JSON-LD (`Person`) to the front page, and writes `robots.txt` and `sitemap.xml`. When these environment variables (GitHub Variables) are set, the matching tags and files go in.

| Variable | Adds |
|---|---|
| `GOOGLE_SITE_VERIFICATION`, `NAVER_SITE_VERIFICATION` | Search engine ownership meta tags |
| `ADSENSE_CLIENT` (`ca-pub-…`) | The AdSense ownership meta tag and `ads.txt`. No ad code is loaded |

## Deploy

Pushing a `v*` tag makes GitHub Actions test and build, upload to S3 and clear CloudFront. It follows `docs/deploy.md` in the root repository. The project list is read at build time, so a new exhibit in the museum shows up here after the next deploy.
