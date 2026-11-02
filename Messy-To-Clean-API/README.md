# Messy to Clean: an Express API Route

The same "place an order" endpoint written two ways.

- `messy/server.js` works on a happy day, but it's full of bugs and security holes.
- `clean/` does the same job with the best practices you'd want in production.

## What was wrong, and the fix

| # | Problem in the messy version | Fix in the clean version |
|---|---|---|
| 1 | Database password and API token hard-coded in the file | Read from environment variables (`config.js`, `.env.example`) |
| 2 | SQL built by gluing strings: open to SQL injection | `?` placeholders, so input is never part of the SQL text |
| 3 | Fake auth: one shared token, and the user id comes from the request body (anyone can order as anyone) | Signed JWT checked in `auth.js`; the user id comes from the token |
| 4 | No input checks: `qty: -5` gives the user money back | `zod` schema: whole numbers, `qty` between 1 and 100 |
| 5 | Five callbacks deep and hard to follow | `async`/`await`, one small function per job |
| 6 | Balance checked, then updated later: two requests at once can both pass | Transaction plus one atomic `UPDATE … WHERE balance_cents >= ?` |
| 7 | Sends raw database errors and the full user row (password hash included), always with status 200 | Central `errorHandler`, real status codes (400, 401, 402, 404, 500), returns only the order |
| 8 | Crashes if the product doesn't exist | Returns `404 Product not found` |
| + | Money as floating point | Money stored as whole cents |
| + | No protection | `helmet` headers, a 10 kb body limit and rate limiting |

## Run the clean version

```bash
cd clean
cp .env.example .env      # then fill in real values
npm install
npm start
```

Call it with a token whose `sub` is the user id:

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"productId": 7, "qty": 2}'
```

It expects `products (id, price_cents)`, `users (id, balance_cents)` and `orders (user_id, product_id, qty, total_cents)` tables in MySQL.

## Files

```
Messy-To-Clean-API/
├── messy/
│   └── server.js
└── clean/
    ├── .env.example
    ├── package.json
    └── src/
        ├── config.js   secrets from the environment
        ├── db.js       connection pool
        ├── errors.js   HttpError + one error handler
        ├── auth.js     JWT check
        ├── orders.js   validation + the order transaction
        ├── app.js      middleware and routes
        └── server.js   starts the server
```
