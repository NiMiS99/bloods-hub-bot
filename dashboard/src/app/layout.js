import './globals.css';

export const metadata = {
  title: 'Bloods Community — Gilda WoW IT | Pozzo dell\'Eternità EU · Midnight',
  description: 'Bloods Community: multigioco italiano con base WoW su Pozzo dell\'Eternità EU (Orda). Midnight Season 2, raid Mer+Gio, M+, PvP, DayZ, Metin2, LoL. 150 membri, 80+ attivi. Famiglia + progress.',
  keywords: ['Bloods', 'Bloods Community', 'WoW', 'World of Warcraft', 'Midnight', 'Midnight Season 2', 'Ulatek', 'gilda italiana', 'Pozzo dell\'Eternità', 'raid', 'mythic plus', 'M+', 'PvP', 'Orda', 'EU', 'Bloods Points', 'DKP', 'Discord', 'DayZ', 'Metin2', 'LoL', 'multigioco', 'soft progress', 'family guild', 'WoW Italia', 'MMORPG', 'gilda WoW'],
  authors: [{ name: 'Bloods Community', url: 'https://bloodswow.it' }],
  creator: 'Bloods Community',
  publisher: 'Bloods Community',
  contact: { email: 'info@bloodswow.it' },
  metadataBase: new URL('https://bloodswow.it'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Bloods Community — Gilda WoW IT | Pozzo dell\'Eternità EU · Midnight',
    description: 'Multigioco italiano con base WoW: raid Mer+Gio, M+, PvP, DayZ, Metin2, LoL. 150 membri, 80+ attivi. Famiglia + progress.',
    url: 'https://bloodswow.it',
    siteName: 'Bloods Community',
    locale: 'it_IT',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Bloods Community — Gilda WoW IT | Pozzo dell\'Eternità EU' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bloods Community — Gilda WoW IT',
    description: 'Multigioco italiano con base WoW su Pozzo dell\'Eternità EU. Midnight, raid Mer+Gio, M+, PvP, DayZ, Metin2, LoL.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="google-site-verification" content="uKaFpxr_A9na-HiJk0LepBDFRBui1wJ_6evVYG6q4ro" />
        <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16.png" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#8b0000" />
        <link rel="canonical" href="https://bloodswow.it" />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function(){});
            });
          }
        `}} />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} />
            <script dangerouslySetInnerHTML={{ __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
                page_path: window.location.pathname,
              });
            `}} />
          </>
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Bloods Community',
          alternateName: 'Bloods',
          url: 'https://bloodswow.it',
          logo: 'https://bloodswow.it/logo.png',
          description: 'Community multigioco italiana con base WoW su Pozzo dell\'Eternità EU (Orda). Midnight Season 2, raid Mer+Gio, M+, PvP, DayZ, Metin2, LoL. 150 membri, 80+ attivi.',
          email: 'info@bloodswow.it',
          foundingDate: '2025-09-20',
          sameAs: [
            'https://discord.gg/DrGMeEMxF6',
            'https://www.youtube.com/@bloods',
            'https://www.tiktok.com/@bloodswow',
            'https://guildsofwow.com/bloods',
          ],
          foundingLocation: {
            '@type': 'Place',
            name: 'Pozzo dell\'Eternità EU',
          },
        })}} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Bloods Community — Gilda WoW IT',
          url: 'https://bloodswow.it',
          inLanguage: 'it-IT',
          potentialAction: {
            '@type': 'SearchAction',
            target: 'https://bloodswow.it/classifiche?q={search_term_string}',
            'query-input': 'required name=search_term_string',
          },
        })}} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'VideoGame',
          name: 'World of Warcraft',
          gamePlatform: 'PC',
          operatingSystem: 'Windows, macOS',
          applicationCategory: 'Game',
          genre: ['MMORPG', 'Raid', 'PvP', 'PvE'],
          publisher: { '@type': 'Organization', name: 'Blizzard Entertainment' },
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR', description: 'Free to play fino al livello 20' },
        })}} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bloodswow.it/' },
            { '@type': 'ListItem', position: 2, name: 'Raid', item: 'https://bloodswow.it/raid/' },
            { '@type': 'ListItem', position: 3, name: 'Classifiche', item: 'https://bloodswow.it/classifiche/' },
            { '@type': 'ListItem', position: 4, name: 'Unisciti', item: 'https://bloodswow.it/unisciti/' },
          ],
        })}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
