import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import prisma from "./db.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const parseId = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
};

const sendPrismaError = (res, err) => {
  // Erros comuns do Prisma
  if (err?.code === "P2002") {
    // Unique constraint failed
    return res.status(409).json({ error: "Violação de unicidade (já existe registro com este valor)." });
  }
  if (err?.code === "P2025") {
    // Record not found
    return res.status(404).json({ error: "Registro não encontrado." });
  }
  return res.status(400).json({ error: err?.message || "Erro na requisição." });
};

// Healthcheck
app.get("/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

/**
 * USERS (dono da loja)
 */

// POST /users  body: { email, name? }
app.post("/users", async (req, res) => {
  try {
    const { email, name } = req.body || {};
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Campo obrigatório: email (string)." });
    }
    const user = await prisma.user.create({ data: { email, name } });
    res.status(201).json(user);
  } catch (e) {
    if (e?.code === "P2002") {
      return res.status(409).json({ error: "E-mail já cadastrado." });
    }
    return res.status(400).json({ error: e?.message || "Erro ao criar usuário." });
  }
});

// GET /users -> inclui a store (se existir)
app.get("/users", async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { id: "asc" },
      include: { store: true },
    });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: "Erro ao listar usuários." });
  }
});

// GET /users/:id
app.get("/users/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Parâmetro id inválido." });
    const user = await prisma.user.findUnique({
      where: { id },
      include: { store: { include: { products: true } } },
    });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: "Erro ao buscar usuário." });
  }
});

// PUT /users/:id  body: { email?, name? }
app.put("/users/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Parâmetro id inválido." });

    const data = {};
    if (typeof req.body.email === "string" && req.body.email.trim()) data.email = req.body.email.trim();
    if (typeof req.body.name === "string") data.name = req.body.name;
    if (!Object.keys(data).length) return res.status(400).json({ error: "Informe ao menos um campo (email, name)." });

    const user = await prisma.user.update({ where: { id }, data });
    res.json(user);
  } catch (e) {
    if (e?.code === "P2002") return res.status(409).json({ error: "E-mail já cadastrado." });
    if (e?.code === "P2025") return res.status(404).json({ error: "Usuário não encontrado." });
    res.status(400).json({ error: e?.message || "Erro ao atualizar usuário." });
  }
});

// DELETE /users/:id  -> cascade: remove store e products vinculados
app.delete("/users/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Parâmetro id inválido." });
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "Usuário não encontrado." });
    res.status(400).json({ error: e?.message || "Erro ao excluir usuário." });
  }
});

/**
 * STORES (1-1 com USER)
 */

// POST /stores  body: { name, userId }
app.post("/stores", async (req, res) => {
  try {
    const { name, userId } = req.body;
    const uid = parseId(userId);
    if (!name || !uid) {
      return res.status(400).json({ error: "Campos obrigatórios: name (string), userId (número > 0)." });
    }

    // Opcional: verificar se o usuário existe
    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

    const store = await prisma.store.create({
      data: { name, userId: uid },
    });
    res.status(201).json(store);
  } catch (e) {
    sendPrismaError(res, e);
  }
});

// GET /stores/:id -> retorna loja + user (dono) + products
app.get("/stores/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Parâmetro id inválido." });

    const store = await prisma.store.findUnique({
      where: { id },
      include: { user: true, products: true },
    });
    if (!store) return res.status(404).json({ error: "Loja não encontrada." });
    res.json(store);
  } catch (e) {
    sendPrismaError(res, e);
  }
});

// PUT /stores/:id  body: { name? }
app.put("/stores/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Parâmetro id inválido." });

    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Campo name é obrigatório para atualização." });

    const store = await prisma.store.update({
      where: { id },
      data: { name },
    });
    res.json(store);
  } catch (e) {
    sendPrismaError(res, e);
  }
});

// DELETE /stores/:id  -> onDelete: Cascade (deleta produtos)
app.delete("/stores/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Parâmetro id inválido." });

    await prisma.store.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    sendPrismaError(res, e);
  }
});

/**
 * PRODUCTS (1-N com STORE)
 */

// POST /products  body: { name, price, storeId }
app.post("/products", async (req, res) => {
  try {
    const { name, price, storeId } = req.body;
    const sid = parseId(storeId);
    const priceNum = Number(price);

    if (!name || !sid || !Number.isFinite(priceNum)) {
      return res.status(400).json({ error: "Campos obrigatórios: name (string), price (número), storeId (número > 0)." });
    }

    // Conferir existência da store
    const store = await prisma.store.findUnique({ where: { id: sid } });
    if (!store) return res.status(404).json({ error: "Loja não encontrada." });

    const product = await prisma.product.create({
      data: { name, price: priceNum, storeId: sid },
    });
    res.status(201).json(product);
  } catch (e) {
    sendPrismaError(res, e);
  }
});

// GET /products -> inclui a loja e o dono da loja
app.get("/products", async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: { store: { include: { user: true } } },
      orderBy: { id: "desc" },
    });
    res.json(products);
  } catch (e) {
    sendPrismaError(res, e);
  }
});

// (Opcional) GET /products/:id
app.get("/products/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Parâmetro id inválido." });

    const product = await prisma.product.findUnique({
      where: { id },
      include: { store: { include: { user: true } } },
    });
    if (!product) return res.status(404).json({ error: "Produto não encontrado." });
    res.json(product);
  } catch (e) {
    sendPrismaError(res, e);
  }
});

// PUT /products/:id  body: { name?, price? }
app.put("/products/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Parâmetro id inválido." });

    const data = {};
    if (typeof req.body.name === "string" && req.body.name.trim() !== "") data.name = req.body.name.trim();
    if (req.body.price !== undefined) {
      const priceNum = Number(req.body.price);
      if (!Number.isFinite(priceNum)) return res.status(400).json({ error: "price inválido." });
      data.price = priceNum;
    }
    if (Object.keys(data).length === 0) return res.status(400).json({ error: "Informe ao menos um campo para atualização (name, price)." });

    const product = await prisma.product.update({
      where: { id },
      data,
    });
    res.json(product);
  } catch (e) {
    sendPrismaError(res, e);
  }
});

// DELETE /products/:id
app.delete("/products/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Parâmetro id inválido." });

    await prisma.product.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    sendPrismaError(res, e);
  }
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API rodando em http://localhost:${PORT}`);
});