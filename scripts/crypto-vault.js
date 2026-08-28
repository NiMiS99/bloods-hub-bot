// scripts/crypto-vault.js
// AES-256-GCM encrypted credentials vault for the Bloods Hub Bot project.
// Usage:
//   node scripts/crypto-vault.js init     — create empty vault (prompts for password)
//   node scripts/crypto-vault.js set      — set/add a credential (prompts for password + key + value)
//   node scripts/crypto-vault.js get      — read a credential (prompts for password + key)
//   node scripts/crypto-vault.js list     — list all keys (prompts for password)
//   node scripts/crypto-vault.js dump     — dump all credentials (prompts for password)
//   node scripts/crypto-vault.js delete   — delete a key (prompts for password + key)
//
// The vault file is saved as .vault.enc (gitignored). Never commit this file.
// The encryption key is derived from a master password using PBKDF2 (100k iterations, 32 bytes).

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const VAULT_PATH = path.join(__dirname, '..', '.vault.enc');
const SALT_PATH = path.join(__dirname, '..', '.vault.salt');
const ITERATIONS = 100_000;
const KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;

function prompt(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (hidden) {
      const stdin = process.openStdin();
      const onData = (char) => {
        const c = char.toString();
        if (c === '\r' || c === '\n') {
          stdin.removeListener('data', onData);
          stdin.pause();
        } else {
          process.stdout.write('\r\x1b[2K> ');
        }
      };
      stdin.on('data', onData);
    }
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, 'sha256');
}

function encrypt(data, key) {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const json = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

function decrypt(blob, key) {
  const iv = blob.subarray(0, IV_LEN);
  const tag = blob.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = blob.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

function loadVault(key) {
  if (!fs.existsSync(VAULT_PATH)) return {};
  const blob = fs.readFileSync(VAULT_PATH);
  return decrypt(blob, key);
}

function saveVault(data, key) {
  const blob = encrypt(data, key);
  fs.writeFileSync(VAULT_PATH, blob);
}

function getOrCreateSalt() {
  if (fs.existsSync(SALT_PATH)) return fs.readFileSync(SALT_PATH);
  const salt = crypto.randomBytes(16);
  fs.writeFileSync(SALT_PATH, salt);
  return salt;
}

async function main() {
  const cmd = process.argv[2] || 'help';
  const commands = ['init', 'set', 'get', 'list', 'dump', 'delete', 'help'];

  if (!commands.includes(cmd)) {
    console.error(`Unknown command: ${cmd}. Use: ${commands.join(', ')}`);
    process.exit(1);
  }

  if (cmd === 'help') {
    console.log(`
Bloods Hub Bot — Encrypted Credentials Vault

Commands:
  init    Create a new empty vault (prompts for master password)
  set     Add or update a credential (key-value pair)
  get     Read a single credential by key
  list    List all credential keys (no values)
  dump    Show all credentials (key + value)
  delete  Remove a credential by key

Files:
  .vault.enc   — encrypted vault (gitignored, never commit)
  .vault.salt  — salt for key derivation (gitignored, never commit)

Security:
  AES-256-GCM encryption
  PBKDF2 key derivation (100k iterations, SHA-256)
  Master password is NOT stored anywhere
  If you forget the password, all data is lost forever
`);
    return;
  }

  const password = await prompt('Master password: ', true);
  if (!password || password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const salt = getOrCreateSalt();
  const key = deriveKey(password, salt);

  if (cmd === 'init') {
    saveVault({}, key);
    console.log('Vault initialized at .vault.enc');
    return;
  }

  let vault;
  try {
    vault = loadVault(key);
  } catch (err) {
    console.error('Failed to decrypt vault. Wrong password or corrupted file.');
    process.exit(1);
  }

  if (cmd === 'set') {
    const k = await prompt('Key name: ');
    const v = await prompt('Value: ', true);
    vault[k] = v;
    saveVault(vault, key);
    console.log(`Saved: ${k}`);
  } else if (cmd === 'get') {
    const k = await prompt('Key name: ');
    if (k in vault) {
      console.log(vault[k]);
    } else {
      console.error(`Key not found: ${k}`);
      process.exit(1);
    }
  } else if (cmd === 'list') {
    const keys = Object.keys(vault);
    if (keys.length === 0) {
      console.log('Vault is empty.');
    } else {
      for (const k of keys) console.log(k);
    }
  } else if (cmd === 'dump') {
    const keys = Object.keys(vault);
    if (keys.length === 0) {
      console.log('Vault is empty.');
    } else {
      for (const [k, v] of Object.entries(vault)) {
        console.log(`${k}=${v}`);
      }
    }
  } else if (cmd === 'delete') {
    const k = await prompt('Key name: ');
    if (k in vault) {
      delete vault[k];
      saveVault(vault, key);
      console.log(`Deleted: ${k}`);
    } else {
      console.error(`Key not found: ${k}`);
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
