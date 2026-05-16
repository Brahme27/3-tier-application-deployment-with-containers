# Expense — A Dockerized 3-Tier Application

A simple **expense tracker** packaged as a classic 3-tier application using **Docker** and **Docker Compose**. It is built to demonstrate how a real web app is split into independent containers (frontend, backend, database) and how they talk to each other on a private network.

---

## Architecture

```text
            ┌───────────────────────────────────────────────────────┐
            │                    Docker Network: expense            │
            │                                                       │
   user ──► │  ┌──────────┐    ┌──────────┐    ┌──────────────┐    │
  (port 80) │  │ frontend │ ─► │ backend  │ ─► │    mysql     │    │
            │  │  Nginx   │    │ Node.js  │    │  MySQL 8.0   │    │
            │  │  + React │    │ Express  │    │  (volume:    │    │
            │  └──────────┘    └──────────┘    │   mysql)     │    │
            │                                  └──────────────┘    │
            └───────────────────────────────────────────────────────┘
```

| Tier | Folder | Image | Tech |
|------|--------|-------|------|
| Web / UI | [`frontend/`](frontend/explanation.md) | `joindevops/frontend:1.0.0` | Nginx + pre-built React |
| API | [`backend/`](backend/explanation.md) | `joindevops/backend:1.0.0` | Node.js + Express + mysql2 |
| Database | [`mysql/`](mysql/explanation.md) | `joindevops/mysql:1.0.0` | MySQL 8.0 with init script |

All three are wired together by [`docker-compose.yaml`](docker-compose.yaml) on a private docker network (`expense`) plus a named volume (`mysql`) for persistent data.

---

## Repository layout

```text
expense-docker/
├── README.MD                ← you are here
├── docker-compose.yaml      ← orchestrates all 3 containers
│
├── backend/                 ← Node.js API (see explanation.md)
│   ├── Dockerfile
│   ├── DbConfig.js
│   ├── TransactionService.js
│   ├── index.js
│   ├── package.json
│   ├── explanation.md
│   └── schema/
│       ├── backend.sql
│       └── explanation.md
│
├── frontend/                ← Nginx + React build (see explanation.md)
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── explanation.md
│   └── code/
│       ├── index.html
│       ├── asset-manifest.json
│       ├── robots.txt
│       ├── static/
│       └── explanation.md
│
└── mysql/                   ← Custom MySQL image (see explanation.md)
    ├── Dockerfile
    ├── explanation.md
    └── scripts/
        ├── backend.sql
        └── explanation.md
```

> Each folder contains an **`explanation.md`** that walks through the files and the Dockerfile line-by-line in beginner-friendly language. Start with [`backend/explanation.md`](backend/explanation.md) → [`frontend/explanation.md`](frontend/explanation.md) → [`mysql/explanation.md`](mysql/explanation.md).

---

## Prerequisites

You only need:

- **Docker Engine** 20.10+ ([install guide](https://docs.docker.com/engine/install/))
- **Docker Compose** v2 (bundled with modern Docker Desktop / `docker-ce`)
- **git** to clone the repository

That's it. No Node.js or MySQL on the host — everything runs inside containers.

---

## How to run

### Option A — Use the pre-built images (fastest)

`docker-compose.yaml` already references the public images `joindevops/backend:1.0.0`, `joindevops/frontend:1.0.0`, `joindevops/mysql:1.0.0`. Just bring everything up:

```bash
git clone <this-repo-url> expense-docker
cd expense-docker
docker compose up -d
```

Open <http://localhost> in your browser.

Stop & clean up:

```bash
docker compose down            # stop containers, keep data
docker compose down -v         # stop containers AND wipe the mysql volume
```

### Option B — Build the images yourself from this source

If you want to modify the code or push your own images to a registry:

```bash
# from the repo root
docker build -t <yourname>/backend:1.0.0  ./backend
docker build -t <yourname>/frontend:1.0.0 ./frontend
docker build -t <yourname>/mysql:1.0.0    ./mysql
```

Then either:
- update the image names in `docker-compose.yaml` to your tags, or
- push them to a registry (Docker Hub, ECR, GHCR) and pull from there on your server.

---

## Deployment flow (this project)

The intended deployment is:

```text
 Local machine                 GitHub                    AWS Server
 ─────────────                 ──────                    ──────────
   git push  ──────────────►   repo  ──── git pull ──►   docker compose up -d
```

1. **Infrastructure** (VPC, EC2/instance, security groups, etc.) is already provisioned in AWS via **Terraform** in a separate repository.
2. The application code (this repo) is pushed to **GitHub**.
3. On the AWS server, the repo is **cloned/pulled**, and the app is started with a single `docker compose up -d`.

To deploy a new version:

```bash
# on the server
git pull
docker compose pull           # if using prebuilt images, fetch the new tag
docker compose up -d          # recreate any container whose image changed
```

> Make sure inbound port **80** is allowed in the AWS security group attached to the instance.

---

## Verifying it works

```bash
# all three containers should be Up
docker compose ps

# backend health check (from the host or another container)
curl http://localhost/api/health

# tail logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mysql
```

Open the site:

- UI: <http://localhost>
- API (proxied through Nginx): <http://localhost/api/transaction>

---

## Useful commands cheat-sheet

| Goal | Command |
| ---- | ------- |
| Start everything in the background | `docker compose up -d` |
| Stop everything | `docker compose down` |
| Stop and remove the database volume | `docker compose down -v` |
| Rebuild after a code change | `docker compose up -d --build` |
| Show running containers | `docker compose ps` |
| Tail logs for a service | `docker compose logs -f backend` |
| Open a shell inside a container | `docker compose exec backend sh` |
| Connect to MySQL | `docker compose exec mysql mysql -uexpense -pExpenseApp@1 transactions` |

---

## Learning path

If you are new to Docker and reading this repo to learn, follow this order:

1. **`docker-compose.yaml`** — see how three containers are described in one file.
2. **[`backend/explanation.md`](backend/explanation.md)** — multi-stage Node.js Dockerfile, non-root user, env vars.
3. **[`mysql/explanation.md`](mysql/explanation.md)** — official base image + init scripts pattern.
4. **[`frontend/explanation.md`](frontend/explanation.md)** — Nginx serving static files and acting as a reverse proxy.
5. **[`backend/schema/`](backend/schema/explanation.md)** and **[`mysql/scripts/`](mysql/scripts/explanation.md)** — how the database schema is defined and auto-loaded.

By the end, you should be able to recognize the same patterns in any 3-tier dockerized project.
