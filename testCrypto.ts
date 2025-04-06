import {
    generateRsaKeyPair,
    exportPubKey,
    exportPrvKey,
    importPubKey,
    importPrvKey,
    rsaEncrypt,
    rsaDecrypt,
    createRandomSymmetricKey,
    symEncrypt,
    exportSymKey,
    symDecrypt,
  } from "./src/crypto";
  
  async function testRSAKeys() {
    console.log("Generating RSA key pair...");
    const { publicKey, privateKey } = await generateRsaKeyPair();
  
    console.log("Exporting keys...");
    const exportedPub = await exportPubKey(publicKey);
    const exportedPrv = await exportPrvKey(privateKey);
  
    console.log("Public Key (Base64):", exportedPub.slice(0, 100) + "...");
    console.log("Private Key (Base64):", exportedPrv?.slice(0, 100) + "...");
  
    console.log("Re-importing keys...");
    const importedPub = await importPubKey(exportedPub);
    const importedPrv = await importPrvKey(exportedPrv!);
  
    console.log("✅ Keys imported successfully!");
  
    // Bonus sanity check
    console.log("Original PublicKey type:", publicKey.type);
    console.log("Imported PublicKey type:", importedPub.type);

      // Test data encryption/decryption
    const message = "hello onion 🧅";
    const encodedMessage = Buffer.from(message).toString("base64");

    console.log("Encrypting message...");
    const encrypted = await rsaEncrypt(encodedMessage, exportedPub);
    console.log("Encrypted:", encrypted.slice(0, 80) + "...");

    console.log("Decrypting...");
    const decrypted = await rsaDecrypt(encrypted, privateKey);
    console.log("✅ Decrypted:", decrypted);

      // --- SYMMETRIC ENCRYPTION TEST ---
    console.log("\n🔐 Generating symmetric key...");
    const symKey = await createRandomSymmetricKey();

    const secretMessage = "this is a 🧅-layered secret";
    console.log("Encrypting secret:", secretMessage);

    const encryptedSym = await symEncrypt(symKey, secretMessage);
    console.log("Encrypted (base64):", encryptedSym.slice(0, 80) + "...");

    const exportedSymKey = await exportSymKey(symKey);
    const decryptedSym = await symDecrypt(exportedSymKey, encryptedSym);

    console.log("✅ Decrypted:", decryptedSym);


  }
  
  testRSAKeys().catch((err) => {
    console.error("❌ Error during test:", err);
  });
  
  