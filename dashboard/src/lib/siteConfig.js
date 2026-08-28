// Configurazione pubblica del sito vetrina della gilda.
// Modifica questi valori per personalizzare il sito.
export const siteConfig = {
  guildName: 'Bloods',
  tagline: 'WoW Guild — Pozzo dell\'Eternità EU',
  description:
    'Bloods è una gilda italiana di World of Warcraft: raid, mitiche+, PvP e una community attiva ogni giorno su Discord.',
  // Inserisci qui il link d'invito Discord della gilda
  discordInvite: 'https://discord.gg/DrGMeEMxF6',
  realm: "Pozzo dell'Eternità",
  region: 'EU',
  faction: 'Orda',
  domain: 'bloodswow.it',
  url: 'https://bloodswow.it',
  email: 'info@bloodswow.it',
};

// Fetch helper per gli endpoint pubblici (niente redirect su 401)
export async function fetchPublic(path) {
  const res = await fetch(`/api/public${path}`, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('Errore API pubblica');
  return res.json();
}

export function formatNumber(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('it-IT').format(n);
}

export function formatEventDate(iso) {
  try {
    return new Intl.DateTimeFormat('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}
