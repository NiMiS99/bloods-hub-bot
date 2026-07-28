import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <head>
        <title>Bloods Hub — Dashboard</title>
        <meta name="description" content="Pannello di amministrazione Bloods Hub Bot" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
