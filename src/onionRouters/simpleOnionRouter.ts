import bodyParser from "body-parser";
import express from "express";
import axios from "axios";
import { BASE_ONION_ROUTER_PORT, REGISTRY_PORT } from "../config";
import { generateRsaKeyPair, exportPubKey, importPrvKey, rsaDecrypt, symDecrypt, } from "../crypto";

let lastEncryptedMessage = "";
let lastDecryptedMessage = "";
let lastDestination = "";


export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());

  // 🔐 Generate RSA key pair
  const { publicKey, privateKey } = await generateRsaKeyPair();
  const exportedPubKey = await exportPubKey(publicKey);

  // 🌐 Register with the central registry
  try {
    await axios.post(`http://localhost:${REGISTRY_PORT}/registerNode`, {
      nodeId,
      pubKey: exportedPubKey,
    });
    console.log(`🧅 Node ${nodeId} registered with registry`);
  } catch (err) {
    console.error(`❌ Node ${nodeId} failed to register:`, err);
  }

  // ✅ Status route
  onionRouter.get("/status", (req, res) => {
    res.send("Live");
  });

  onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.json({ result: lastEncryptedMessage });
  });
  
  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.json({ result: lastDecryptedMessage });
  });
  
  onionRouter.get("/getLastMessageDestination", (req, res) => {
    res.json({ result: lastDestination });
  });
  

  onionRouter.post("/receive", async (req, res) => {
    try {
      const { encryptedSymKey, data, destination } = req.body;
  
      lastEncryptedMessage = data;
      console.log(`🧅 Node ${nodeId} received message, attempting to unwrap`);
  
      // Step 1: Decrypt the symmetric key using our private RSA key
      const symKeyBase64 = await rsaDecrypt(encryptedSymKey, privateKey);
      console.log(`🔓 Successfully decrypted symmetric key`);
  
      // Step 2: Decrypt the payload with symmetric key
      const decryptedJson = await symDecrypt(symKeyBase64, data);
      const decrypted = JSON.parse(decryptedJson);
  
      lastDecryptedMessage = decryptedJson;
      lastDestination = decrypted.destination;
      console.log(`🔄 Forwarding to: ${decrypted.destination}`);
  
      // Step 3: Forward the inner payload to the next destination
      await axios.post(decrypted.destination, decrypted);
      console.log(`✅ Successfully forwarded message`);
  
      res.json({ success: true });
    } catch (err) {
      console.error(`❌ Error in router ${nodeId} /receive:`, err);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(
      `Onion router ${nodeId} is listening on port ${
        BASE_ONION_ROUTER_PORT + nodeId
      }`
    );
  });

  return server;
}
