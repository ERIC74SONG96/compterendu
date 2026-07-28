import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "data", "rapports.json");
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === "production";

const app = express();
app.use(express.json({ limit: "2mb" }));

async function readRapports() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeRapports(rapports) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(rapports, null, 2), "utf8");
}

app.get("/api/rapports", async (_req, res) => {
  res.json(await readRapports());
});

app.get("/api/rapports/:id", async (req, res) => {
  const rapports = await readRapports();
  const rapport = rapports.find((r) => r.id === req.params.id);
  if (!rapport) return res.status(404).json({ error: "introuvable" });
  res.json(rapport);
});

app.post("/api/rapports", async (req, res) => {
  const data = req.body;
  if (!data?.id) return res.status(400).json({ error: "id requis" });
  const rapports = await readRapports();
  const idx = rapports.findIndex((r) => r.id === data.id);
  if (idx >= 0) rapports[idx] = data;
  else rapports.push(data);
  await writeRapports(rapports);
  res.json({ ok: true });
});

app.delete("/api/rapports/:id", async (req, res) => {
  const rapports = (await readRapports()).filter((r) => r.id !== req.params.id);
  await writeRapports(rapports);
  res.json({ ok: true });
});

if (isProd) {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("  Compte rendu — prêt !");
  console.log(`  → Sur cet ordinateur : http://localhost:${PORT}`);
  console.log(`  → Pour les autres membres (même Wi-Fi) : http://VOTRE-IP:${PORT}`);
  console.log(`  → Depuis Internet : npm run share (dans un 2e terminal)`);
  console.log("");
});
