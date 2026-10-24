// Builds dist/ from src/: puts the head tags (search, share card, site and AdSense verification) into each page,
// fills the project cards from the museum's exhibit list, and writes robots.txt, sitemap.xml and ads.txt.
//
// Environment (all optional): SITE_URL, MUSEUM_URL, GOOGLE_SITE_VERIFICATION, NAVER_SITE_VERIFICATION,
// ADSENSE_CLIENT (ca-pub-…). Without a value, the matching tag or file is left out.

import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(HERE, 'src');
const DIST = join(HERE, 'dist');
const SNAPSHOT = join(HERE, 'data', 'exhibits.json');

export const NAME = { ko: '김연혁', en: 'Yeonhyuk Kim' };
export const EMAIL = 'yeonhyuk.public@gmail.com';

/** Each page's title and description, Korean first and English after, so both languages find it. */
export const PAGES = [
  {
    file: 'index.html', path: '/',
    title: '김연혁 · Yeonhyuk Kim',
    description: '백엔드부터 인프라까지, 만들고 띄우는 일을 좋아하는 개발자 김연혁입니다. 바이브 코딩으로 만든 게임과 박물관을 소개합니다. ' +
      'Yeonhyuk Kim, a developer who likes building things and running them, from the backend to the infrastructure.',
  },
  {
    file: 'now.html', path: '/now.html',
    title: '요즘 하는 일 · Now — 김연혁 Yeonhyuk Kim',
    description: '김연혁이 요즘 만들고 있는 것과 다음 후보. What Yeonhyuk Kim is building now and what comes next.',
  },
  {
    file: 'privacy.html', path: '/privacy.html',
    title: '개인정보처리방침 · Privacy — 김연혁 Yeonhyuk Kim',
    description: 'yeonhyuk.me와 하위 도메인 사이트의 개인정보처리방침. The privacy policy for yeonhyuk.me and the sites on its subdomains.',
  },
];

export function esc(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** "ca-pub-123" or "pub-123" → "pub-123"; anything else → ''. */
export function publisherId(client) {
  const match = /^(?:ca-)?(pub-\d+)$/.exec((client || '').trim());
  return match ? match[1] : '';
}

/** The tags one page gets before </head>. */
export function pageHead(page, { siteUrl, env = {}, person = false }) {
  const url = siteUrl + page.path;
  const image = siteUrl + '/img/avatar.jpg';
  const tags = [
    `<meta name="description" content="${esc(page.description)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    '<meta name="theme-color" content="#e9b4d0">',
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${esc(NAME.ko + ' · ' + NAME.en)}">`,
    `<meta property="og:title" content="${esc(page.title)}">`,
    `<meta property="og:description" content="${esc(page.description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    '<meta property="og:locale" content="ko_KR">',
    '<meta property="og:locale:alternate" content="en_US">',
    '<meta name="twitter:card" content="summary">',
    '<link rel="icon" href="img/avatar.jpg">',
    ...verificationTags(env),
  ];
  if (person) tags.push(jsonLd(siteUrl));
  const client = publisherId(env.ADSENSE_CLIENT);
  if (client) {
    // Proves the domain to AdSense without loading any ad code; this page has no ad slots.
    tags.push(`<meta name="google-adsense-account" content="ca-${client}">`);
  }
  return tags.join('\n');
}

export function verificationTags(env = {}) {
  const tags = [];
  if (env.GOOGLE_SITE_VERIFICATION) tags.push(`<meta name="google-site-verification" content="${esc(env.GOOGLE_SITE_VERIFICATION)}">`);
  if (env.NAVER_SITE_VERIFICATION) tags.push(`<meta name="naver-site-verification" content="${esc(env.NAVER_SITE_VERIFICATION)}">`);
  return tags;
}

export function jsonLd(siteUrl) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: NAME.ko,
    alternateName: NAME.en,
    url: siteUrl + '/',
    image: siteUrl + '/img/avatar.jpg',
    email: 'mailto:' + EMAIL,
    jobTitle: 'Developer',
    sameAs: ['https://github.com/BranKein'],
  };
  return '<script type="application/ld+json">' + JSON.stringify(data).replace(/</g, '\\u003c') + '</script>';
}

/** Big cards for the live exhibits, linking to each site, with the museum's thumbnail. */
export function projectCards(exhibits, museumUrl) {
  return exhibits.filter((e) => e.status === 'live').map((e) => {
    const thumb = e.thumb ? `<img src="${esc(museumUrl + '/' + e.thumb)}" alt="" loading="lazy">` : '';
    return `  <a class="card proj" href="${esc(e.url)}">${thumb}<div class="label"><b>${esc(e.title.ko)} · ${esc(e.title.en)}</b>` +
      `<span>${esc(e.blurb.ko)}</span></div></a>`;
  }).join('\n');
}

/** The small museum card's line: how many ideas are still to come. */
export function museumNote(exhibits) {
  const upcoming = exhibits.filter((e) => e.status === 'upcoming').length;
  return upcoming ? `준비 중 ${upcoming}개 · ${upcoming} coming` : '전체 보기 · All works';
}

export function robotsTxt(siteUrl) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
}

export function sitemapXml(siteUrl, date) {
  const urls = PAGES.map((p) => `  <url><loc>${siteUrl}${p.path}</loc><lastmod>${date}</lastmod></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** ads.txt says who may sell ads on this domain (and its subdomains). Empty without a publisher ID. */
export function adsTxt(client) {
  const id = publisherId(client);
  return id ? `google.com, ${id}, DIRECT, f08c47fec0942fa0\n` : '';
}

/** The museum's exhibit list (window.VM_EXHIBITS), or the last saved copy if the museum cannot be reached. */
export async function loadExhibits(museumUrl) {
  try {
    const res = await fetch(museumUrl + '/data/exhibits.js', { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const window = {};
    new Function('window', await res.text())(window);
    const list = window.VM_EXHIBITS;
    if (!Array.isArray(list)) throw new Error('no VM_EXHIBITS');
    await mkdir(dirname(SNAPSHOT), { recursive: true });
    await writeFile(SNAPSHOT, JSON.stringify(list, null, 2) + '\n');
    return list;
  } catch (error) {
    if (!existsSync(SNAPSHOT)) throw new Error('Cannot read the museum exhibits and there is no data/exhibits.json: ' + error.message);
    console.warn('Using data/exhibits.json; the museum could not be read:', error.message);
    return JSON.parse(await readFile(SNAPSHOT, 'utf8'));
  }
}

export async function build({ env = process.env, exhibits } = {}) {
  const siteUrl = (env.SITE_URL || 'https://yeonhyuk.me').replace(/\/+$/, '');
  const museumUrl = (env.MUSEUM_URL || 'https://vibe-museum.yeonhyuk.me').replace(/\/+$/, '');
  const list = exhibits || await loadExhibits(museumUrl);

  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  await cp(join(SRC, 'img'), join(DIST, 'img'), { recursive: true });
  await cp(join(SRC, 'style.css'), join(DIST, 'style.css'));

  for (const page of PAGES) {
    let html = await readFile(join(SRC, page.file), 'utf8');
    html = html.replace('{{PROJECTS}}', projectCards(list, museumUrl)).replace('{{MUSEUM_NOTE}}', museumNote(list));
    html = html.replace('</head>', pageHead(page, { siteUrl, env, person: page.file === 'index.html' }) + '\n</head>');
    await writeFile(join(DIST, page.file), html);
  }
  await writeFile(join(DIST, 'robots.txt'), robotsTxt(siteUrl));
  await writeFile(join(DIST, 'sitemap.xml'), sitemapXml(siteUrl, new Date().toISOString().slice(0, 10)));
  const ads = adsTxt(env.ADSENSE_CLIENT);
  if (ads) await writeFile(join(DIST, 'ads.txt'), ads);
  return { pages: PAGES.length, projects: list.filter((e) => e.status === 'live').length, ads: Boolean(ads) };
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const result = await build();
  console.log('dist/ ready:', result);
}
