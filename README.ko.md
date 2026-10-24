# vibe-home

[English](README.md) | **한국어**

`yeonhyuk.me` 첫 화면. 김연혁(Yeonhyuk Kim)과 만든 프로젝트들을 소개하고, 개인정보처리방침과 연락처를 둔다. 애드센스 등록과 `ads.txt`도 이 루트 도메인에 있다.

## 구조

- `src/`: 페이지 원본. `index.html`(벤토 카드), `now.html`(요즘 하는 일), `privacy.html`(개인정보처리방침), `style.css`, `img/avatar.jpg`.
- `scripts/build.mjs`: `dist/`를 만든다. 박물관의 전시 목록(`https://vibe-museum.yeonhyuk.me/data/exhibits.js`)을 읽어 운영 중인 프로젝트 카드를 채우고, 읽지 못하면 지난번 사본 `data/exhibits.json`을 쓴다.
- `deploy/site.json`: 인프라에 바라는 값. `subdomain: "@"`는 `yeonhyuk.me` 자체를 뜻한다(vibe-infra `sites/home`).

## 명령

```bash
npm test
npm run build
```

의존성은 없다(Node 22).

## 검색 노출과 광고

빌드가 페이지마다 제목·설명·canonical·OG 태그를, 첫 화면에 JSON-LD(`Person`)를 넣고 `robots.txt`, `sitemap.xml`을 만든다. 아래 환경 변수(GitHub Variables)가 있으면 해당 태그·파일이 들어간다.

| 변수 | 들어가는 것 |
|---|---|
| `GOOGLE_SITE_VERIFICATION`, `NAVER_SITE_VERIFICATION` | 검색엔진 소유 확인 메타 태그 |
| `ADSENSE_CLIENT` (`ca-pub-…`) | 애드센스 소유 확인 메타 태그와 `ads.txt`. 광고 코드는 불러오지 않는다 |

## 배포

`v*` 태그를 push하면 GitHub Actions가 테스트·빌드 후 S3에 올리고 CloudFront를 비운다. 구조는 루트 저장소의 `docs/deploy.md`를 따른다. 프로젝트 목록은 빌드할 때 읽으므로, 박물관에 새 전시가 생기면 다시 배포해야 반영된다.
