# Ikarvo integrations audit v11 (20 Oct 2026)

**Method.** (1) Every `app/api/**/route.ts` was called on a local server (`PREVIEW_MODE=1`, mock AI on :4556, mock Meta Graph on :4557, no provider keys) and the HTTP status and body were recorded (raw results: `shots-v11/api-sweep.json`). (2) The dynamic publishers (`/api/publish/social/[channel]`, `/api/publish/cms/[target]`) were called for each channel/target. (3) For the new UGC providers, each real endpoint was called with a deliberately invalid key, to confirm the URL, method and auth header are what the provider expects (answer 401/400 auth error, not 404/405). (4) Code paths were re-read against the provider docs (contracts in v7 `INTEGRATIONS-AUDIT.md` still hold; new ones below).

**Not done:** no request was made with real credentials, so nothing was tested against a successful provider response. "Working" means it ran end to end here without any credential (public APIs, or our own code). "Needs-key" means it returns **503 naming the exact env vars**, and its request shape is verified against the provider docs.

Legend: **WORKING** · **NEEDS-KEY** (503 names the var) · **FIXED in v11** · **LIMIT** (provider-side limit, stated in UI) · **STUB** (labelled in UI)

| Area | Integration | Status | Evidence / notes |
|---|---|---|---|
| Core | AI (OpenAI-compatible, `AI_API_KEY`) | NEEDS-KEY / WORKING with mock | `/api/generate` single & multi-file, `/api/creative`, `/api/ad/adcopy`, `/api/cmo/chat` → 200 against the mock. A stale mock prompt match (old brand name) made `cmo/chat` 502 at first; the app was fine and the mock was updated. |
| Core | Supabase auth/data | NEEDS-KEY | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; preview-only flows (team invite, account delete, staged uploads) answer 400 with an explanation. |
| Core | Credits ledger | WORKING | `/api/credits` 200. When the allowance ran out it correctly refused with "Not enough credits: 8 left, this needs 12", shown in the Build UI. |
| Ship | GitHub OAuth + push + SEO PR + publish | NEEDS-KEY | 503 `GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SESSION_SECRET`. |
| Ship | Vercel deploy | NEEDS-KEY | 503 `VERCEL_CLIENT_ID, VERCEL_CLIENT_SECRET, VERCEL_INTEGRATION_SLUG` (or `VERCEL_TOKEN`). |
| Billing | Stripe checkout / portal / webhook | NEEDS-KEY | 503 `STRIPE_SECRET_KEY, STRIPE_PRICE_ID`; webhook 503 `STRIPE_WEBHOOK_SECRET`. |
| Google | Search Console / GA4 / YouTube | NEEDS-KEY | 503 `GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET`. |
| Growth | Hacker News search | WORKING | `growth/community` returned real HN threads (Algolia, no key). |
| Growth | Reddit search | LIMIT | Anonymous fallback; `REDDIT_CLIENT_ID/SECRET` for OAuth. |
| Growth | PageSpeed Insights | LIMIT / NEEDS-KEY | The keyless daily quota was exhausted (Google 429), and the route returned 503 naming `PAGESPEED_API_KEY`. |
| Growth | Backlinks (Brave/Serper) | NEEDS-KEY | 503 `BRAVE_SEARCH_API_KEY or SERPER_API_KEY`. |
| Growth | Influencers (YouTube / X) | NEEDS-KEY | 503 `YOUTUBE_API_KEY, X_BEARER_TOKEN`. |
| Growth | Visibility (grounded AI) | NEEDS-KEY | `PERPLEXITY_API_KEY` or OpenRouter `AI_API_KEY`. |
| CMO | Skills from URL | WORKING | Fetched a real public GitHub README → 200. |
| CMO | MCP servers (Streamable HTTP) | WORKING | `initialize` + `tools/list` against public `https://mcp.deepwiki.com/mcp` → server "DeepWiki 2.14.3" + tools. Tool *calls* from agents are not wired; the UI says so (STUB, labelled). |
| Publish | X, LinkedIn, Threads, Bluesky, Facebook, Instagram, TikTok | NEEDS-KEY | Each 503 names its vars (e.g. `BLUESKY_HANDLE, BLUESKY_APP_PASSWORD`). |
| Publish | WordPress, Ghost, Webflow, Sanity, HubSpot, Wix, Medium | NEEDS-KEY | Each 503 names its vars. Medium: LIMIT (no new tokens issued). |
| Publish | Framer | STUB (labelled) | No public CMS write API. `/api/publish/cms/framer` → 404 "Unknown publishing target"; the UI offers CSV export instead. |
| Notify | Telegram / WhatsApp | NEEDS-KEY | 503 `TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID` / WhatsApp vars. |
| Meta Ads | OAuth + account/targeting/audiences/estimate/videos/campaigns/insights/recommend | NEEDS-KEY (token) / WORKING with mock Graph | With app keys set and no token: every route returns 503 "No Meta access token… Connect Meta Ads or set META_ADS_TOKEN". The full flow against the mock Graph server is captured in the `marketing-meta-MOCK` screenshots. |
| Media | Replicate / fal images & clips | NEEDS-KEY; **FIXED** | 503 `REPLICATE_API_TOKEN or FAL_KEY`. Fixed: a malformed job id returned 502; it now returns 400. |
| UGC | ElevenLabs TTS (word timestamps) | NEEDS-KEY | 503 `ELEVENLABS_API_KEY`. |
| UGC | OpenAI TTS | NEEDS-KEY | 503 `OPENAI_API_KEY`; captions estimated (labelled). |
| UGC | HeyGen v3 / Synthesia v2 / Creatify | NEEDS-KEY | 503 `HEYGEN_API_KEY` / `SYNTHESIA_API_KEY` / `CREATIFY_API_ID, CREATIFY_API_KEY`. |
| UGC | **D-ID** `POST/GET api.d-id.com/talks`, `Authorization: Basic` | NEW · NEEDS-KEY | `DID_API_KEY` (+ optional `DID_SOURCE_URL`, `DID_VOICE_ID`). The live endpoint answers 401 to a bad key. Needs a public https portrait URL. |
| UGC | **OmniHuman** `fal-ai/bytedance/omnihuman` (image_url + audio_url → video.url) | NEW · NEEDS-KEY | `FAL_KEY`. The queue endpoint answers 401 to a bad key. Our voiceover and portrait are sent as data URIs (fal accepts them), so the avatar speaks in *our* voice. Audio must be under 30 s. |
| UGC | **LatentSync** `fal-ai/latentsync` (video_url + audio_url) | NEW · NEEDS-KEY | `FAL_KEY`. Re-lip-syncs an uploaded presenter clip (3 MB or less) to the voiceover. |
| UGC | **SadTalker** `fal-ai/sadtalker` (source_image_url + driven_audio_url) | NEW · NEEDS-KEY | `FAL_KEY`. |
| UGC | Avatar job polling `/api/ad/avatar/[id]` | **FIXED** | It called the provider with an empty key and surfaced "fal error (405)". It now returns 503 naming the missing var, and 400 for an unknown provider. |
| UGC | **Higgsfield Soul** portraits `POST api.higgsfield.ai/higgsfield-ai/soul/v2/standard`, `Authorization: Key id:secret`, poll `/requests/{id}/status` | NEW · NEEDS-KEY | `HF_API_KEY_ID, HF_API_KEY_SECRET`. The live endpoint answers 401 `Invalid credentials` to a bad key. Generates the presenter portrait that OmniHuman/SadTalker animate. Higgsfield's lip-sync/UGC video models are not wired, because their per-model JSON schemas were not verified. |
| UGC | **Whisper captions** `POST /v1/audio/transcriptions` (whisper-1, verbose_json, word granularity) | NEW · NEEDS-KEY | `OPENAI_API_KEY`. Exact word timings. |
| UGC | **Wizper** `fal-ai/wizper` (Whisper v3 large) | NEW · NEEDS-KEY | `FAL_KEY`. Segment timings, with words spread inside each segment; marked "estimated". |
| UGC | **ElevenLabs Music** `POST /v1/music` | NEW · NEEDS-KEY | `ELEVENLABS_API_KEY`. The live endpoint answers 400 `invalid_api_key_prefix` to a bad key. |
| UGC | **Stable Audio** `fal-ai/stable-audio` | NEW · NEEDS-KEY | `FAL_KEY`, 5–47 s. |
| UGC | Render / export | WORKING (on device) | WebCodecs MP4/WebM, ffmpeg.wasm fallback (already shipped). Remotion was **not** added: its license requires a paid company license for teams with 4 or more people, and server rendering needs Lambda/Chromium. |
| UGC | Media proxy `/api/ad/proxy` | WORKING | Rejects non-https URLs (400) and uses the SSRF guard. |

Not covered: HeyGen/Synthesia "voice clone" flows are not wired.
