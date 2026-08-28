# Social Media — Bloods Guild

Cartella per contenuti social (YouTube, TikTok, Instagram).

## Struttura

```
social-media/
├── README.md              ← questo file
├── raw/                   ← file grezzi mandati dall'utente (da analizzare)
├── youtube/               ← video finali pronti per YouTube
│   ├── thumbnails/        ← copertine video (1280x720px)
│   ├── shorts/            ← YouTube Shorts (verticali)
│   └── videos/            ← video orizzontali
├── tiktok/                ← video finali pronti per TikTok
│   └── clips/             ← clip verticali 15-60s
├── instagram/             ← contenuti Instagram (future)
│   ├── reels/             ← Reels (verticali)
│   ├── posts/             ← Post (1080x1080px)
│   └── stories/           ← Stories (1080x1920px)
├── graphics/              ← grafiche riutilizzabili
│   ├── logo/              ← logo Bloods
│   ├── banners/           ← banner canale/copertine
│   └── templates/         ← template thumbnail/overlay
└── scripts/               ← copioni e idee video
```

## Convenzioni

- **File raw**: mettere tutto in `raw/`, poi analizzare e spostare nelle cartelle appropriate
- **Nomi file**: `YYYY-MM-DD_titolo-breve.ext` (es. `2026-08-28_raid-kill.mp4`)
- **Thumbnail**: 1280x720px, formato JPG o PNG
- **TikTok/Shorts**: formato verticale 1080x1920px, max 60s
- **Video YouTube**: formato 1920x1080px, max 10min per vlog, max 30min per raid recap

## Stato contenuti

- [ ] Nessun contenuto disponibile — in attesa di file dall'utente
