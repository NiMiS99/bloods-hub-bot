import './globals.css';

export const metadata = {
  title: 'Bloods — WoW Guild | Pozzo dell\'Eternità EU',
  description: 'Sito ufficiale della gilda Bloods — World of Warcraft. Raid, mitiche+, eventi, classifiche BP/DKP e community Discord.',
  keywords: ['Bloods', 'WoW', 'World of Warcraft', 'gilda italiana', 'Pozzo dell\'Eternità', 'raid', 'DKP', 'Bloods Points', 'Discord'],
  authors: [{ name: 'Bloods Guild', url: 'https://bloodswow.it' }],
  creator: 'Bloods Guild',
  publisher: 'Bloods Guild',
  contact: { email: 'info@bloodswow.it' },
  metadataBase: new URL('https://bloodswow.it'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Bloods — WoW Guild | Pozzo dell\'Eternità EU',
    description: 'Gilda italiana di World of Warcraft: raid, mitiche+, PvP e community attiva su Discord.',
    url: 'https://bloodswow.it',
    siteName: 'Bloods',
    locale: 'it_IT',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Bloods — WoW Guild' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bloods — WoW Guild',
    description: 'Gilda italiana di World of Warcraft su Pozzo dell\'Eternità EU.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Bloods',
          url: 'https://bloodswow.it',
          logo: 'https://bloodswow.it/logo.png',
          description: 'Gilda italiana di World of Warcraft: raid, mitiche+, PvP e community attiva su Discord.',
          email: 'info@bloodswow.it',
          sameAs: ['https://discord.gg/DrGMeEMxF6'],
          foundingLocation: {
            '@type': 'Place',
            name: 'Pozzo dell\'Eternità EU',
          },
        })}} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Bloods — WoW Guild',
          url: 'https://bloodswow.it',
          inLanguage: 'it-IT',
          potentialAction: {
            '@type': 'SearchAction',
            target: 'https://bloodswow.it/classifiche?q={search_term_string}',
            'query-input': 'required name=search_term_string',
          },
        })}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
