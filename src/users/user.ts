import bodyParser from "body-parser";
import express from "express";
import axios from "axios";
import { BASE_USER_PORT, BASE_ONION_ROUTER_PORT } from "../config";
import {
  rsaEncrypt,
  createRandomSymmetricKey,
  exportSymKey,
  symEncrypt,
  exportPubKey,
  importPubKey,
} from "../crypto";
import { REGISTRY_PORT } from "../config";

let lastReceivedMessage = "";

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  // TODO implement the status route
  _user.get("/status", (req, res) => {
    res.send("Live");
  });

  _user.post("/sendMessage", async (req, res) => {
    const { message, destinationUserId } = req.body;
  
    try {
      // Step 1: Fetch node registry
      const registryRes = await axios.get(`http://localhost:${REGISTRY_PORT}/getRegistry`);
      const nodes = (registryRes.data as { nodes: { nodeId: number; pubKey: string }[] }).nodes;
  
      // Step 2: Pick 3 random nodes
      const pathLength = 3;
      const selectedNodes = [...nodes].sort(() => 0.5 - Math.random()).slice(0, pathLength);
      console.log(`🧅 Selected nodes for path: ${selectedNodes.map(n => n.nodeId).join(', ')}`);
  
      // Step 3: Create payload for final recipient (destination user)
      let payload: { destination: string; data: string; encryptedSymKey?: string } = {
        destination: `http://localhost:${BASE_USER_PORT + destinationUserId}/receiveMessage`,
        data: Buffer.from(message).toString("base64"),
      };
  
      // Step 4: Wrap the onion (from innermost to outermost)
      for (let i = selectedNodes.length - 1; i >= 0; i--) {
        const node = selectedNodes[i];
        console.log(`🔒 Wrapping layer for node ${node.nodeId}`);
  
        // Create a symmetric key for this layer
        const symKey = await createRandomSymmetricKey();
        
        // Encrypt the current payload with this symmetric key
        const encryptedPayload = await symEncrypt(symKey, JSON.stringify(payload));
        
        // Export the symmetric key to base64
        const exportedSymKey = await exportSymKey(symKey); 
        console.log(`🔑 Exported sym key for node ${node.nodeId}, length: ${exportedSymKey.length}`);
        
        // Encrypt the symmetric key with the node's public key
        const encryptedSymKey = await rsaEncrypt(exportedSymKey, node.pubKey);
  
        // Determine the next hop
        const nextHop = i === selectedNodes.length - 1
          ? payload.destination
          : `http://localhost:${BASE_ONION_ROUTER_PORT + selectedNodes[i + 1].nodeId}/receive`;
  
        // Create new payload for this layer  
        payload = {
          destination: nextHop,
          encryptedSymKey,
          data: encryptedPayload,
        };
      }
  
      // Step 5: Send to entry node
      const entryNode = selectedNodes[0];
      const entryUrl = `http://localhost:${BASE_ONION_ROUTER_PORT + entryNode.nodeId}/receive`;
  
      await axios.post(entryUrl, payload);
      console.log(`📨 Sent message to entry node ${entryNode.nodeId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("❌ Failed to send message:", error?.response?.data || error.message || error);
      res.status(500).json({ error: "Message failed to send" });
    }
  });
  

  _user.post("/receiveMessage", (req, res) => {
    try {
      const { data } = req.body;
      const decoded = Buffer.from(data, "base64").toString("utf-8");
  
      console.log(`📥 User ${userId} received message:`, decoded);
      lastReceivedMessage = decoded;
  
      res.json({ success: true });
    } catch (error) {
      console.error("❌ Error receiving message:", error);
      res.status(500).json({ error: "Failed to receive message" });
    }
    
  });

  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: lastReceivedMessage });
  });
  

  const server = _user.listen(BASE_USER_PORT + userId, () => {  
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}
