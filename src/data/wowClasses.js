// src/data/wowClasses.js
// WoW Retail classes and specs (Italian).
const CLASSES = [
  { key: 'death_knight', name: 'Cavaliere della Morte', specs: ['Sangue', 'Gelo', 'Empietà'] },
  { key: 'demon_hunter', name: 'Cacciatore di Demoni', specs: ['Rovina', 'Vendetta'] },
  { key: 'druid', name: 'Druido', specs: ['Equilibrio', 'Aggressore', 'Guardiano', 'Rigenerazione'] },
  { key: 'evoker', name: 'Evocatore', specs: ['Devastazione', 'Preservazione', 'Potenziazione'] },
  { key: 'hunter', name: 'Cacciatore', specs: ['Affinità con le Bestie', 'Precisione', 'Sopravvivenza'] },
  { key: 'mage', name: 'Mago', specs: ['Arcano', 'Fuoco', 'Gelo'] },
  { key: 'monk', name: 'Monaco', specs: ['Mastro Birraio', 'Impeto', 'Misticismo'] },
  { key: 'paladin', name: 'Paladino', specs: ['Sacro', 'Protezione', 'Castigo'] },
  { key: 'priest', name: 'Sacerdote', specs: ['Disciplina', 'Sacro', 'Ombra'] },
  { key: 'rogue', name: 'Ladro', specs: ['Assassinio', 'Fuorilegge', 'Scaltrezza'] },
  { key: 'shaman', name: 'Sciamano', specs: ['Elementale', 'Potenziamento', 'Rigenerazione'] },
  { key: 'warlock', name: 'Stregone', specs: ['Afflizione', 'Demonologia', 'Distruzione'] },
  { key: 'warrior', name: 'Guerriero', specs: ['Armi', 'Furia', 'Protezione'] },
];

function findClassByKey(key) {
  return CLASSES.find((c) => c.key === key) ?? null;
}

module.exports = { CLASSES, findClassByKey };
