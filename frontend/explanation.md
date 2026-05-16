# Frontend Folder — Explained

This folder contains the **user-facing website** of the Expense application — the pages a person opens in their browser.

It is a pre-built React app served by **Nginx** (a fast, lightweight web server). Nginx also acts as a **reverse proxy**: any request the browser makes to `/api/...` is forwarded to the backend container.

---

## 1. Files in this folder

| File | What it does |
|------|--------------|
| `Dockerfile` | Recipe to build the frontend image (Nginx + the React build). Explained below. |
| `nginx.conf` | Configuration for the Nginx web server: port, logging, and the `/api/` proxy rule. |
| `code/` | The compiled React app — HTML, JS, CSS that the browser loads. See [code/explanation.md](code/explanation.md). |

---

## 2. How the frontend works (in plain English)

1. The user opens the site in a browser.
2. Nginx serves the static files from `code/` (HTML, JS, CSS).
3. The React app runs in the browser. When it needs data, it calls **`/api/transaction`** (a relative URL on the same host).
4. Nginx sees the `/api/` prefix and **proxies** the request to `http://backend:8080/` (the backend container, reachable by its docker-compose service name).
5. The backend's response flows back through Nginx to the browser.

This pattern is called a **reverse proxy**. Benefits:
- The browser only ever talks to one origin → no CORS headaches.
- The backend never has to be exposed to the public internet.

---

## 3. Dockerfile — line by line

```dockerfile
#FROM nginx
FROM nginx:stable-alpine3.20-perl
```
- The first line is a comment.
- Uses the `stable-alpine` Nginx image (small footprint based on Alpine Linux). The `-perl` variant includes the perl module, useful if you ever add advanced rewrites.

```dockerfile
RUN rm -rf /usr/share/nginx/html/index.html
RUN rm -rf /etc/nginx/nginx.conf
RUN rm -rf /etc/nginx/conf.d/default.conf
```
- Deletes the default "Welcome to Nginx" page and the default configs. We are about to replace them with our own.

```dockerfile
RUN mkdir -p /var/cache/nginx/client_temp && \
        mkdir -p /var/cache/nginx/proxy_temp && \
        mkdir -p /var/cache/nginx/fastcgi_temp && \
        mkdir -p /var/cache/nginx/uwsgi_temp && \
        mkdir -p /var/cache/nginx/scgi_temp && \
        chown -R nginx:nginx /var/cache/nginx && \
        chown -R nginx:nginx /etc/nginx/ && \
        chmod -R 755 /etc/nginx/ && \
        chown -R nginx:nginx /var/log/nginx
```
- Pre-creates the directories Nginx uses to buffer requests/responses on disk.
- `chown -R nginx:nginx ...` gives the built-in non-root `nginx` user ownership.
- `chmod 755` lets the owner read/write/execute and others read/execute.
- **Why?** We are going to run Nginx as a non-root user (security). If those folders are owned by root, Nginx would fail to start.

```dockerfile
RUN mkdir -p /etc/nginx/ssl/ && \
    chown -R nginx:nginx /etc/nginx/ssl/ && \
    chmod -R 755 /etc/nginx/ssl/
```
- Creates a folder for SSL/TLS certificates (in case you later add HTTPS), with the same ownership/permissions setup.

```dockerfile
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /run/nginx.pid
```
- Creates the PID file (where Nginx records its process id) and gives the `nginx` user permission to write to it. Without this, the non-root user can't start the server.

```dockerfile
COPY nginx.conf /etc/nginx/nginx.conf
COPY code /usr/share/nginx/html/
```
- Copies our custom Nginx config into place.
- Copies the compiled React app into Nginx's web root, so the files become reachable over HTTP.

```dockerfile
USER nginx
```
- Switches to the non-root `nginx` user. From here, everything (including the running server) operates as `nginx`, not `root`.
- The base image already has a `CMD` that starts Nginx, so we don't need to repeat it.

---

## 4. nginx.conf — what matters

Most of `nginx.conf` is the standard boilerplate. The two important pieces are:

```nginx
listen       8080 default_server;
listen       [::]:8080 default_server;
```
- Nginx listens on **port 8080** inside the container.

```nginx
location /api/ {
    proxy_pass http://backend:8080/;
}
```
- This is the **reverse-proxy rule**. Any request whose path starts with `/api/` is forwarded to the backend service. The trailing slash on `proxy_pass` strips the `/api/` prefix before passing the request along (so `/api/transaction` becomes `/transaction` on the backend).

> Note: in `docker-compose.yaml` the port is mapped as `80:80`. If you run the container exactly as configured here you may need to either adjust the mapping to `80:8080` or change `nginx.conf` to listen on 80. Keep this in mind when troubleshooting "site not loading".

---

## 5. Quick mental model

```
Browser  ── GET /            ──►  Nginx  ──►  serves index.html + JS
Browser  ── GET /api/health  ──►  Nginx  ──►  proxies to backend:8080/health
```
