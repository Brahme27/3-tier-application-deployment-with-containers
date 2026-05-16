# FYI — Read Before You Start

Do **not** start with `docker compose up -d`. Learn how the pieces work together first, one container at a time. Use compose only at the end.

---

## 1. Push this code to GitHub, clone it on the AWS server

```bash
git clone <repo-url>
cd 3-tier-application-deployment-with-containers
```

## 2. Create a Docker network FIRST

Without this, containers cannot reach each other by name.

```bash
docker network create expense
```

## 3. Do mysql → backend → frontend, in that order

For each folder: build the image, run the container, log in, check it works, debug if not. Then move on.

### mysql

```bash
cd mysql
docker build -t mysql:0.0.0 .
docker run -d --name mysql --network expense mysql:0.0.0
docker logs mysql
docker exec -it mysql sh
# inside: mysql -uexpense -pExpenseApp@1 transactions  → SHOW TABLES;
```

### backend

```bash
cd ../backend
docker build -t backend:0.0.0 .
docker run -d --name backend --network expense backend:0.0.0
docker logs backend       # expect "App Started on Port 8080"
docker exec -it backend sh
# inside: wget -qO- http://localhost:8080/health
```

### frontend

```bash
cd ../frontend
docker build -t frontend:0.0.0 .
docker run -d --name frontend --network expense -p 80:80 frontend:0.0.0
docker logs frontend
curl http://localhost
curl http://<EC2-public-ip>
```

## 4. Push images to Docker Hub once they all work

```bash
docker login
docker tag mysql:0.0.0    <user>/mysql:1.0.0    && docker push <user>/mysql:1.0.0
docker tag backend:0.0.0  <user>/backend:1.0.0  && docker push <user>/backend:1.0.0
docker tag frontend:0.0.0 <user>/frontend:1.0.0 && docker push <user>/frontend:1.0.0
```

## 5. Update `docker-compose.yaml` to use the Docker Hub images

Change each `image:` line to `<user>/<service>:1.0.0`. Commit and push.

## 6. Now run with compose

```bash
docker stop frontend backend mysql && docker rm frontend backend mysql
git pull
docker compose pull
docker compose up -d
docker compose ps
```
