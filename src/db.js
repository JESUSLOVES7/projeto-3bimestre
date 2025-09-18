import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

prisma
  .$connect()
  .then(() => {
    console.log("✅ Conectado ao banco de dados!");
  })
  .catch((error) => {
    console.error("❌ Erro ao conectar:", error?.message || error);
  });

// Encerrar conexão com segurança ao finalizar o processo
const gracefulShutdown = async () => {
  try {
    await prisma.$disconnect();
  } catch (_) {
    // ignore
  } finally {
    process.exit(0);
  }
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

export default prisma;