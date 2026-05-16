# Backend Folder — Explained

This folder contains the **API server** of the Expense application. It is a Node.js (Express) app that talks to the MySQL database and exposes HTTP endpoints that the frontend calls.

Think of it as the "brain" of the app:
- The **frontend** shows the UI to the user.
- The **backend** (this folder) handles requests, runs the business logic, and reads/writes data from the database.
- The **mysql** container stores the data.

---

## 1. Files in this folder

| File | What it does |
|------|--------------|
| `index.js` | The entry point of the API. Defines all the HTTP routes (`/health`, `/transaction`, etc.) using Express. |
| `TransactionService.js` | All database operations live here — add, get, delete transactions. Keeps `index.js` clean. |
| `DbConfig.js` | Default database credentials (host, user, password, db name). Used as a fallback if environment variables are not set. |
| `package.json` | Lists Node.js dependencies (`express`, `mysql2`, `cors`, `body-parser`, `moment`, `node-fetch`). |
| `Dockerfile` | The recipe Docker uses to build the backend image. Explained line by line below. |
| `schema/` | Contains the SQL script that creates the database tables. See [schema/explanation.md](schema/explanation.md). |

---

## 2. How the backend works (in plain English)

1. The app starts on **port 8080** (`app.listen(port)` at the bottom of `index.js`).
2. It connects to MySQL using the credentials from `DbConfig.js`. The `DB_HOST` value is overridden to `"mysql"` (the docker-compose service name) by an `ENV` line in the Dockerfile.
3. When a request like `POST /transaction` comes in, Express routes it to the matching handler.
4. The handler calls a function in `TransactionService.js`, which runs an SQL query against MySQL.
5. The result is sent back to the caller as JSON.

### Available API routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check — used to confirm the service is alive. |
| POST | `/transaction` | Add a new expense (`amount`, `desc`). |
| GET | `/transaction` | List all transactions. |
| DELETE | `/transaction` | Delete all transactions. |
| GET | `/transaction/id` | Get a single transaction by id. |
| DELETE | `/transaction/id` | Delete a single transaction by id. |

---

## 3. Dockerfile — line by line

The Dockerfile uses a **multi-stage build**. Stage 1 installs dependencies; Stage 2 produces a smaller, more secure final image.

```dockerfile
#FROM node:20
FROM node:20.18.3-alpine3.21 AS builder
```
- The first line is a comment (the `#` makes it inactive).
- `FROM node:20.18.3-alpine3.21 AS builder` — start from a tiny Node.js 20 image based on Alpine Linux. `AS builder` names this stage so we can copy from it later.
- **Why Alpine?** It is ~5 MB instead of ~300 MB for the regular image. Smaller image = faster pulls and less attack surface.
- **Why pin a specific version (20.18.3-alpine3.21)?** So your build is reproducible — `node:20` could change tomorrow, but `node:20.18.3-alpine3.21` will not.

```dockerfile
WORKDIR /opt/backend
```
- Sets the current directory inside the container to `/opt/backend`. All following commands run from here. Equivalent to `cd /opt/backend`.

```dockerfile
COPY package.json ./
COPY *.js ./
```
- Copies `package.json` and all `.js` files from your local backend folder into `/opt/backend` inside the image.

```dockerfile
RUN npm install
```
- Runs `npm install` to download all the dependencies listed in `package.json` into `node_modules`. This creates a `node_modules` folder inside the builder stage.

```dockerfile
FROM node:20.18.3-alpine3.21
```
- Starts a **new, fresh stage** from the same base image. This is the final image that will actually be shipped — it does **not** include npm cache or build tools, only what we copy in.

```dockerfile
RUN addgroup -S expense && adduser -S expense -G expense && \
    mkdir /opt/backend && \
    chown -R expense:expense /opt/backend
```
- Creates a system group `expense` and a system user `expense` inside it.
- Creates `/opt/backend` and gives ownership to that user.
- **Why?** Running as a non-root user is a security best practice. If the app is ever exploited, the attacker only has the limited rights of `expense`, not `root`.

```dockerfile
ENV DB_HOST="mysql"
```
- Sets an environment variable `DB_HOST=mysql`. The Node app reads this in `TransactionService.js` (`process.env.DB_HOST`). The value `mysql` matches the **service name** in `docker-compose.yaml` — Docker's internal DNS resolves `mysql` to the database container.

```dockerfile
WORKDIR /opt/backend
USER expense
```
- Sets the working directory again (each stage is independent).
- Switches to the `expense` user — every command after this runs as that user, not root.

```dockerfile
COPY --from=builder /opt/backend /opt/backend
```
- Copies the prepared app (with `node_modules`) from the **builder stage** into the final image. This is the magic of multi-stage builds: we get a small, clean final image that only contains what is needed to run.

```dockerfile
CMD ["node", "index.js"]
```
- The default command when a container starts: run `node index.js`.
- `CMD` (vs. `RUN`) executes when the container **starts**, not when the image is built.
- In `docker-compose.yaml` this is overridden with `sh -c "sleep 10 && node /opt/backend/index.js"` so the backend waits 10 seconds for MySQL to be ready before connecting.

---

## 4. Quick mental model

```
+-----------+      HTTP       +-----------+     SQL     +---------+
|  Browser  | -------------->  |  Backend  | ----------> |  MySQL  |
| (frontend)|                  | (Node.js) |             |   DB    |
+-----------+                  +-----------+             +---------+
                                   ^
                                   |  This folder
```
