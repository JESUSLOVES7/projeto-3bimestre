# AV2 – API Marketplace Enxuto (Node.js + Express + Prisma + MySQL)

Este backend implementa:
- 1-1: `User` → `Store`
- 1-N: `Store` → `Product`
- CRUD completo de `User`, `Store` e `Product`
- Consultas com `include` conforme guia da AV2

A pasta `public/` do seu repositório não é alterada.

## Requisitos

- Node.js 18+
- Banco MySQL no AlwaysData
- Variável `DATABASE_URL` no `.env`

## Configuração

1) Copie `.env.example` para `.env` e preencha `DATABASE_URL`.

Exemplo (NÃO comite credenciais):
```
DATABASE_URL="mysql://USUARIO:SENHA@mysql-USUARIO.alwaysdata.net/NOME_DO_BANCO"
```

2) Instalar dependências:
```
npm install
```

3) Gerar cliente Prisma:
```
npx prisma generate
```

4) Aplicar schema no banco remoto (AlwaysData):
```
npx prisma db push
```

Atenção: `prisma migrate dev` não funciona no AlwaysData.

## Rodar local

```
npm run start
# ou em dev (auto-reload no Node 18+):
npm run dev
```

API em: `http://localhost:3000`

## Rotas

- Health: `GET /health`

### Users
- Criar: `POST /users`  body: `{ "email": "ana@ex.com", "name": "Ana" }`
- Listar: `GET /users`
- Detalhar: `GET /users/:id` (inclui `store` e `products` dela)
- Atualizar: `PUT /users/:id`  body: `{ "email": "novo@ex.com", "name": "Novo Nome" }`
- Remover: `DELETE /users/:id` (cascade via relações)

### Stores
- Criar: `POST /stores`
  - body: `{ "name": "Minha Loja", "userId": 1 }`
- Detalhar: `GET /stores/:id` (inclui `user` + `products`)
- Atualizar: `PUT /stores/:id`
  - body: `{ "name": "Novo Nome" }`
- Remover: `DELETE /stores/:id` (cascade nos produtos)

### Products
- Criar: `POST /products`
  - body: `{ "name": "Camiseta", "price": 99.90, "storeId": 1 }`
- Listar: `GET /products` (inclui `store` + `user`)
- Detalhar (opcional): `GET /products/:id` (inclui `store` + `user`)
- Atualizar: `PUT /products/:id`
  - body: `{ "name": "Camiseta Premium", "price": 129.90 }`
- Remover: `DELETE /products/:id`

## Exemplos (curl)

Criar store:
```
curl -X POST http://localhost:3000/stores \
  -H "Content-Type: application/json" \
  -d '{"name":"Loja do João","userId":1}'
```

Criar product:
```
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Camiseta","price":59.90,"storeId":1}'
```

Listar products:
```
curl http://localhost:3000/products
```

## Observações

- `userId` em `Store` é `@unique`: um usuário só pode ter uma loja.
- `onDelete: Cascade` em `Store` → `Product`: ao deletar a loja, os produtos são removidos.
- Trate suas credenciais: mantenha `.env` fora do Git.

## Scripts úteis

- `npm run prisma:generate` → `prisma generate`
- `npm run prisma:push` → `prisma db push`