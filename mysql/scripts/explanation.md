# MySQL Scripts Folder — Explained

This folder holds **initialization SQL scripts** for the MySQL container. The official MySQL image automatically runs every `.sql` file inside `/docker-entrypoint-initdb.d` the **very first time** the container starts (i.e. when the data volume is empty).

The Dockerfile in the parent folder copies everything here into that magic directory:

```dockerfile
COPY scripts/*.sql /docker-entrypoint-initdb.d
```

So whatever you put here becomes part of the database's initial state.

---

## File: `backend.sql`

```sql
CREATE DATABASE IF NOT EXISTS transactions;
USE transactions;

CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    amount INT,
    description VARCHAR(255)
);

CREATE USER IF NOT EXISTS 'expense'@'%' IDENTIFIED BY 'ExpenseApp@1';
GRANT ALL ON transactions.* TO 'expense'@'%';
FLUSH PRIVILEGES;
```

### What each statement does

| Statement | Purpose |
|-----------|---------|
| `CREATE DATABASE IF NOT EXISTS transactions;` | Creates the `transactions` database. The `IF NOT EXISTS` keeps the script safe to re-run. |
| `USE transactions;` | Switches the session into that database for the next statements. |
| `CREATE TABLE IF NOT EXISTS transactions (...)` | Creates the only table the app needs — one row per expense. |
| &nbsp;&nbsp;`id INT AUTO_INCREMENT PRIMARY KEY` | Auto-numbered unique id for each row. |
| &nbsp;&nbsp;`amount INT` | The money amount as a whole number. |
| &nbsp;&nbsp;`description VARCHAR(255)` | A short text label, max 255 characters. |
| `CREATE USER IF NOT EXISTS 'expense'@'%' IDENTIFIED BY 'ExpenseApp@1';` | Creates a non-root MySQL user. `'%'` means it can connect from any host — required because the backend container is on a different IP. |
| `GRANT ALL ON transactions.* TO 'expense'@'%';` | Gives that user full rights on every table in the `transactions` database (and only that database). |
| `FLUSH PRIVILEGES;` | Reloads MySQL's permission tables so the new user/grants take effect immediately. |

---

## When does this script run?

| Scenario | Does it run? |
|----------|--------------|
| First `docker compose up` (no data yet) | Yes — fresh database, init scripts execute. |
| Restarting an existing container | No — data already exists in the volume. |
| After `docker volume rm mysql` and a fresh up | Yes — volume is empty again, treated as first boot. |

This is exactly what you want: the database is set up automatically the first time, and your data is **not** wiped on every restart.

---

## Adding more scripts

If you ever need additional setup, just drop more `.sql` files into this folder. They run **in alphabetical order**, so prefix them with numbers if order matters:

```
01-schema.sql
02-seed-data.sql
03-extra-users.sql
```
