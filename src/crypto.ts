import { webcrypto } from "crypto";

function logBuffer(prefix: string, buffer: ArrayBuffer) {
  const view = new Uint8Array(buffer);
  const shortPreview = Array.from(view.slice(0, 20))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
  console.log(`${prefix} (${view.byteLength} bytes): ${shortPreview}...`);
}

// #############
// ### Utils ###
// #############

// Function to convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

// Function to convert Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  var buff = Buffer.from(base64, "base64");
  return buff.buffer.slice(buff.byteOffset, buff.byteOffset + buff.byteLength);
}

// ################
// ### RSA keys ###
// ################

// Generates a pair of private / public RSA keys
type GenerateRsaKeyPair = {
  publicKey: webcrypto.CryptoKey;
  privateKey: webcrypto.CryptoKey;
};
export async function generateRsaKeyPair(): Promise<GenerateRsaKeyPair> {
  const keyPair = await webcrypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}


// Export a crypto public key to a base64 string format
export async function exportPubKey(key: webcrypto.CryptoKey): Promise<string> {
  const spki = await webcrypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(spki);
}


// Export a crypto private key to a base64 string format
export async function exportPrvKey(
  key: webcrypto.CryptoKey | null
): Promise<string | null> {
  if (!key) return null;
  const pkcs8 = await webcrypto.subtle.exportKey("pkcs8", key);
  return arrayBufferToBase64(pkcs8);
}


// Import a base64 string public key to its native format
export async function importPubKey(strKey: string): Promise<webcrypto.CryptoKey> {
  const buffer = base64ToArrayBuffer(strKey);
  return await webcrypto.subtle.importKey(
    "spki",
    buffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}


// Import a base64 string private key to its native format
export async function importPrvKey(strKey: string): Promise<webcrypto.CryptoKey> {
  const buffer = base64ToArrayBuffer(strKey);
  return await webcrypto.subtle.importKey(
    "pkcs8",
    buffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
}

// Encrypt a message using an RSA public key
export async function rsaEncrypt(
  b64Data: string,
  strPublicKey: string
): Promise<string> {
  console.log(`🔑 rsaEncrypt input length: ${b64Data.length}`);
  console.log(`🔑 rsaEncrypt input preview: ${b64Data.slice(0, 20)}...`);
  
  // Convert base64 string to buffer
  const dataBuffer = base64ToArrayBuffer(b64Data);
  const pubKey = await importPubKey(strPublicKey);
  
  try {
    const encrypted = await webcrypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      pubKey,
      dataBuffer
    );
    
    const result = arrayBufferToBase64(encrypted);
    console.log(`🔑 rsaEncrypt result length: ${result.length}`);
    console.log(`🔑 rsaEncrypt result preview: ${result.slice(0, 20)}...`);
    
    return result;
  } catch (error) {
    console.error("❌ rsaEncrypt error:", error);
    throw error;
  }
}



// Decrypts a message using an RSA private key
export async function rsaDecrypt(
  data: string,
  privateKey: webcrypto.CryptoKey
): Promise<string> {
  console.log(`🔑 rsaDecrypt input length: ${data.length}`);
  console.log(`🔑 rsaDecrypt input preview: ${data.slice(0, 20)}...`);
  
  const buffer = base64ToArrayBuffer(data);
  
  try {
    const decrypted = await webcrypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      buffer
    );
    
    const result = arrayBufferToBase64(decrypted);
    console.log(`🔑 rsaDecrypt result length: ${result.length}`);
    console.log(`🔑 rsaDecrypt result preview: ${result.slice(0, 20)}...`);
    
    return result;
  } catch (error) {
    console.error("❌ rsaDecrypt error:", error);
    throw error;
  }
}

// ######################
// ### Symmetric keys ###
// ######################

// Generates a random symmetric key
export async function createRandomSymmetricKey(): Promise<webcrypto.CryptoKey> {
  return await webcrypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}


// Export a crypto symmetric key to a base64 string format
export async function exportSymKey(key: webcrypto.CryptoKey): Promise<string> {
  const raw = await webcrypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(raw);
}


// Import a base64 string format to its crypto native format
export async function importSymKey(strKey: string): Promise<webcrypto.CryptoKey> {
  const buffer = base64ToArrayBuffer(strKey);
  return await webcrypto.subtle.importKey(
    "raw",
    buffer,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"]
  );
}


// Encrypt a message using a symmetric key
export async function symEncrypt(
  key: webcrypto.CryptoKey,
  data: string
): Promise<string> {
  console.log(`🔑 symEncrypt input length: ${data.length}`);
  console.log(`🔑 symEncrypt input preview: ${data.slice(0, 20)}...`);
  
  const iv = webcrypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const encoded = new TextEncoder().encode(data);
  
  logBuffer("🔑 symEncrypt encoded", encoded);
  
  const encrypted = await webcrypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  
  // Prepend IV to encrypted data
  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.byteLength);
  
  const result = arrayBufferToBase64(combined.buffer);
  console.log(`🔑 symEncrypt result length: ${result.length}`);
  console.log(`🔑 symEncrypt result preview: ${result.slice(0, 20)}...`);
  
  return result;
}


// Decrypt a message using a symmetric key
export async function symDecrypt(
  strKey: string,
  encryptedData: string
): Promise<string> {
  console.log(`🔑 symDecrypt key length: ${strKey.length}`);
  console.log(`🔑 symDecrypt key preview: ${strKey.slice(0, 20)}...`);
  console.log(`🔑 symDecrypt data length: ${encryptedData.length}`);
  console.log(`🔑 symDecrypt data preview: ${encryptedData.slice(0, 20)}...`);
  
  try {
    const combined = new Uint8Array(base64ToArrayBuffer(encryptedData));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    logBuffer("🔑 symDecrypt iv", iv);
    logBuffer("🔑 symDecrypt data", data);
    
    const key = await importSymKey(strKey);
    const decrypted = await webcrypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );
    
    const result = new TextDecoder().decode(decrypted);
    console.log(`🔑 symDecrypt result length: ${result.length}`);
    console.log(`🔑 symDecrypt result preview: ${result.slice(0, 20)}...`);
    
    return result;
  } catch (error) {
    console.error("❌ symDecrypt error:", error);
    throw error;
  }
}


