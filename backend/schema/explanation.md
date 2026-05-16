# Backend Schema Folder — Explained

This folder holds the **SQL schema** for the application's database. It is kept inside the backend folder for reference / version control.

> Note: in this project the **same SQL file** is also placed in [`mysql/scripts/`](../../mysql/scripts/explanation.md). The MySQL container is the one that actually runs the script on first boot. The copy here is documentation for backend developers so they can see the database shape that the API expects.

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

### Line by line

| Statement | What it does |
|-----------|--------------|
| `CREATE DATABASE IF NOT EXISTS transactions;` | Creates a database called `transactions`. `IF NOT EXISTS` makes the script safe to re-run — no error if it already exists. |
| `USE transactions;` | Switches the session to use this database for all following statements. |
| `CREATE TABLE IF NOT EXISTS transactions (...)` | Creates the only table the app uses. Each row is one expense. |
| `id INT AUTO_INCREMENT PRIMARY KEY` | A unique numeric id, automatically assigned for each new row. |
| `amount INT` | The expense amount as a whole number. |
| `description VARCHAR(255)` | A short text label for the expense (max 255 characters). |
| `CREATE USER IF NOT EXISTS 'expense'@'%' IDENTIFIED BY 'ExpenseApp@1';` | Creates a database user named `expense` with the given password. `'%'` means the user can connect from **any** host (needed because the backend container is on a different IP than the MySQL container). |
| `GRANT ALL ON transactions.* TO 'expense'@'%';` | Gives that user full permissions on every table inside the `transactions` database. |
| `FLUSH PRIVILEGES;` | Tells MySQL to reload its in-memory user/permission tables so the new grants take effect immediately. |

---

## Why have this file at all?

- The backend's `DbConfig.js` expects a user `expense` with password `ExpenseApp@1` and a database named `transactions`. The schema file is what creates that exact setup.
- Keeping the schema in the repo means a new developer can reproduce the database from scratch in one step.
