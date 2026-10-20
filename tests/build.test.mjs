import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGES, adsTxt, build, museumNote, pageHead, projectCards, publisherId, robotsTxt, sitemapXml } from '../scripts/build.mjs';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const SITE = 'https://yeonhyuk.me';
const EXHIBITS = [
  { id: 'game', status: 'live', title: { ko: '게임', en: 'Game' }, blurb: { ko: '설명 <b>', en: 'About' }, url: 'https://game.yeonhyuk.me', thumb: 'img/exhibits/game.jpg' },
  { id: 'idea', status: 'upcoming', title: { ko: '아이디어', en: 'Idea' }, blurb: { ko: '곧', en: 'Soon' } },
];

test('publisher ID accepts ca-pub and pub, and nothing else', () => {
  assert.equal(publisherId('ca-pub-123'), 'pub-123');
  assert.equal(publisherId('pub-123'), 'pub-123');
  assert.equal(publisherId(''), '');
  assert.equal(publisherId('pub-abc'), '');
});

test('ads.txt only with a publisher ID', () => {
  assert.equal(adsTxt('ca-pub-123'), 'google.com, pub-123, DIRECT, f08c47fec0942fa0\n');
  assert.equal(adsTxt(undefined), '');
});

test('head has description, canonical and share tags; optional tags only when set', () => {
  const bare = pageHead(PAGES[0], { siteUrl: SITE, env: {}, person: true });
  assert.match(bare, /<meta name="description" content="[^"]*백엔드[^"]*backend/);
  assert.match(bare, /<link rel="canonical" href="https:\/\/yeonhyuk\.me\/">/);
  assert.match(bare, /og:image" content="https:\/\/yeonhyuk\.me\/img\/avatar\.jpg"/);
  assert.match(bare, /"@type":"Person"/);
  assert.doesNotMatch(bare, /site-verification|google-adsense-account/);

  const full = pageHead(PAGES[1], { siteUrl: SITE, env: { GOOGLE_SITE_VERIFICATION: 'g1', NAVER_SITE_VERIFICATION: 'n1', ADSENSE_CLIENT: 'ca-pub-9' } });
  assert.match(full, /google-site-verification" content="g1"/);
  assert.match(full, /naver-site-verification" content="n1"/);
  assert.match(full, /<meta name="google-adsense-account" content="ca-pub-9">/);
  assert.doesNotMatch(full, /adsbygoogle/);
  assert.match(full, /canonical" href="https:\/\/yeonhyuk\.me\/now\.html"/);
});

test('project cards show live exhibits only, escaped, with the museum thumbnail', () => {
  const html = projectCards(EXHIBITS, 'https://museum.example');
  assert.match(html, /href="https:\/\/game\.yeonhyuk\.me"/);
  assert.match(html, /src="https:\/\/museum\.example\/img\/exhibits\/game\.jpg"/);
  assert.match(html, /설명 &lt;b&gt;/);
  assert.doesNotMatch(html, /아이디어/);
  assert.equal(museumNote(EXHIBITS), '준비 중 1개 · 1 coming');
});

test('robots and sitemap point at the site', () => {
  assert.match(robotsTxt(SITE), /Sitemap: https:\/\/yeonhyuk\.me\/sitemap\.xml/);
  const xml = sitemapXml(SITE, '2026-10-20');
  for (const page of PAGES) assert.ok(xml.includes(`<loc>${SITE}${page.path}</loc>`));
});

test('build writes every page with no placeholders left', async () => {
  const result = await build({ env: { ADSENSE_CLIENT: 'ca-pub-1' }, exhibits: EXHIBITS });
  assert.deepEqual(result, { pages: 3, projects: 1, ads: true });
  for (const page of PAGES) {
    const html = await readFile(join(DIST, page.file), 'utf8');
    assert.doesNotMatch(html, /\{\{/);
    assert.match(html, /rel="canonical"/);
  }
  assert.ok(existsSync(join(DIST, 'ads.txt')));
  assert.ok(existsSync(join(DIST, 'img', 'avatar.jpg')));
});
