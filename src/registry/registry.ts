import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};

let nodesRegistry: Node[] = [];

export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  // TODO implement the status route
  _registry.get("/status", (req, res) => {
    res.send("Live");
  });

  _registry.get("/getRegistry", (req: Request, res: Response) => {
    const result: GetNodeRegistryBody = { nodes: nodesRegistry };
    res.json(result);
  });  

  _registry.post("/registerNode", (req: Request, res: Response) => {
    console.log("🔥 registerNode called");
  
    const { nodeId, pubKey } = req.body;
  
    if (typeof nodeId !== "number" || typeof pubKey !== "string") {
      return res.status(400).json({ error: "Invalid body" });
    }
  
    const alreadyExists = nodesRegistry.some((node) => node.nodeId === nodeId);
    if (!alreadyExists) {
      nodesRegistry.push({ nodeId, pubKey });
      console.log(`✅ Registered node ${nodeId}`);
    }
  
    return res.json({ success: true });
  });
  
  
  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}
