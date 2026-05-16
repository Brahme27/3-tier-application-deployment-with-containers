# MySQL Folder — Explained

This folder builds the **database container** for the application. It uses the official MySQL image as a base and pre-loads our schema/users on first startup.

This is the "data tier" of the 3-tier setup:

```
Frontend (Nginx + React)  →  Backend (Node.js)  →  MySQL  ← this folder
```

---

## 1. Files in this folder

| File | What it does |
|------|--------------|
| `Dockerfile` | Builds the custom MySQL image. Explained below. |
| `scripts/` | SQL files that MySQL runs automatically the very first time the container starts. See [scripts/explanation.md](scripts/explanation.md). |

---

## 2. Dockerfile — line by line

```dockerfile
FROM mysql:8.0
```
- Starts from the official MySQL 8.0 image. This image already knows how to run a database server, manage users, persist data to `/var/lib/mysql`, and execute init scripts.

```dockerfile
ENV MYSQL_ROOT_PASSWORD=ExpenseApp@1
```
- Sets the root password for the MySQL instance via an environment variable.
- The official MySQL image looks for `MYSQL_ROOT_PASSWORD` on first boot and uses it to initialize the root user.
- **Note:** For real production use, you should pass this in as a secret (e.g. via `--env-file`, Docker secrets, or AWS SSM) instead of baking it into the image.

```dockerfile
RUN echo "Hello World"
```
- A demo / debug line. It just prints `Hello World` during the image build. It has no effect on the running container and could be removed.

```dockerfile
COPY scripts/*.sql /docker-entrypoint-initdb.d
```
- Copies every `.sql` file from `scripts/` into the image's `/docker-entrypoint-initdb.d` directory.
- **This directory is special:** the official MySQL image automatically runs every `.sql`, `.sh`, or `.sql.gz` file inside it the **first time** the container starts (i.e. when there is no existing database in the data volume). On subsequent starts the data is already there, so the scripts are skipped.
- This is how our `transactions` database, `transactions` table, and `expense` user get created automatically.

---

## 3. Where does the data live?

The MySQL image stores its files in `/var/lib/mysql` inside the container. In `docker-compose.yaml` we mount a **named volume** called `mysql` to that path:

```yaml
volumes:
- mysql:/var/lib/mysql
```

This means:
- If you `docker compose down` and bring it back up, your data **survives** because it lives in the volume, not in the container.
- If you want a clean slate, run `docker volume rm mysql`. Then on next start, the init scripts will run again.

---

## 4. How it connects to the rest of the app

- The container is named `mysql` and joined to the `expense` network in `docker-compose.yaml`.
- The backend connects to it using the host name `mysql` (set via the `DB_HOST` env var in the backend Dockerfile). Docker's internal DNS turns `mysql` into the container's IP automatically.
- The user `expense` (created by the init script) is the account the backend uses — **not** root.
