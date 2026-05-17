import sodium from 'libsodium-wrappers';

let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await sodium.ready;
    initialized = true;
  }
}

// ── Key Generation ────────────────────────────────────────

export async function generateKeypair() {
  await ensureInit();
  const keypair = sodium.crypto_box_keypair();
  return {
    publicKey: sodium.to_base64(keypair.publicKey),
    privateKey: sodium.to_base64(keypair.privateKey), // NEVER sent to server
  };
}

// ── Encryption ────────────────────────────────────────────

export async function encryptMessage(plaintext, myPrivateKeyB64, theirPublicKeyB64) {
  await ensureInit();
  const myPrivateKey   = sodium.from_base64(myPrivateKeyB64);
  const theirPublicKey = sodium.from_base64(theirPublicKeyB64);
  const nonce          = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
  const messageBytes   = sodium.from_string(plaintext);
  const ciphertext     = sodium.crypto_box_easy(messageBytes, nonce, theirPublicKey, myPrivateKey);
  return {
    ciphertext: sodium.to_base64(ciphertext),
    nonce: sodium.to_base64(nonce),
  };
}

// ── Decryption ────────────────────────────────────────────

export async function decryptMessage(ciphertextB64, nonceB64, myPrivateKeyB64, theirPublicKeyB64) {
  await ensureInit();
  const myPrivateKey   = sodium.from_base64(myPrivateKeyB64);
  const theirPublicKey = sodium.from_base64(theirPublicKeyB64);
  const ciphertext     = sodium.from_base64(ciphertextB64);
  const nonce          = sodium.from_base64(nonceB64);
  const decrypted      = sodium.crypto_box_open_easy(ciphertext, nonce, theirPublicKey, myPrivateKey);
  return sodium.to_string(decrypted);
}

// ── Key Storage (IndexedDB) ───────────────────────────────

const DB_NAME = 'chatflow-e2ee';
const STORE   = 'keys';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function storePrivateKey(userId, encryptedPrivateKey) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(encryptedPrivateKey, `pk-${userId}`);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadPrivateKey(userId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(`pk-${userId}`);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Password-based Key Protection (PBKDF2) ───────────────

export async function encryptPrivateKeyWithPassword(privateKeyB64, password) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derivedKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    encoder.encode(privateKeyB64)
  );
  // Combine salt + iv + ciphertext → base64
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptPrivateKeyWithPassword(encryptedB64, password) {
  const encoder = new TextEncoder();
  const combined = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0));
  const salt = combined.slice(0, 16);
  const iv   = combined.slice(16, 28);
  const data = combined.slice(28);

  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  const derivedKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, derivedKey, data);
  return new TextDecoder().decode(decrypted);
}
