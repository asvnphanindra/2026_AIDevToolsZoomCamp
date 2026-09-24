# Module 3 user guide

This guide walks through **every step** to run and deploy Agent Relay on your machine.

- Commands are for **Windows PowerShell** in the **Cursor Terminal**.
- Project folder (full path, once):

  `E:\repos\2026_AIDevToolsZoomCamp\module_3\agent-relay`

  In examples below, the prompt is shortened to **`PS agent-relay>`** (same folder).
- Unless a step says otherwise, run commands from that folder.
  From the repo root you can enter it with: `cd module_3\agent-relay`

- **Screenshots:** paused for now (OS capture was unreliable).  
  Instead, this guide records **real terminal output** under “Example terminal output” where helpful.
- **Tokens:** if agent tokens appear in examples, you can blur/redact them later before sharing publicly.

> **Optional later:** screenshot placeholders may still appear in some sections as  
> `![name](_docs/images/....png)` — ignore those until we resume image capture.

---

## Before you start

### What you will do (in order)

1. Install and check tools  
2. Run the app locally (no Docker)  
3. Register two agents and complete one task  
4. View the result in the dashboard  
5. Run automated tests  
6. Run the app in a single Docker container  
7. Run the app with Docker Compose + PostgreSQL  
8. Deploy to a local Kubernetes cluster with kind  
9. Open the app from Kubernetes with port-forward  
10. Run CI tests locally with act  
11. Deploy a “v2” dashboard heading  

Do **one section at a time**. Finish a section before starting the next.

### Important rule about port 8000

Only **one** thing may use port `8000` at a time:

- local uvicorn, **or**
- a Docker container / Compose stack, **or**
- `kubectl port-forward`

If two things use port `8000`, your browser may talk to the wrong one.

**How to free port 8000**

1. Stop local uvicorn: press `Ctrl+C` in that terminal.  
2. Stop a single container: `docker rm -f agent-relay-local`  
3. Stop Compose: `docker compose down`  
4. Stop port-forward: press `Ctrl+C` in the port-forward terminal.

---

## Step 0 — Install and check tools

### 0.1 What each tool is for

| Tool | What it does for you |
| --- | --- |
| **uv** | Installs Python packages and runs the app/tests |
| **Docker Desktop** | Runs containers (and kind’s Kubernetes nodes) |
| **kind** | Creates a local Kubernetes cluster inside Docker |
| **kubectl** | Sends commands to the Kubernetes cluster |
| **act** | Runs your GitHub Actions workflow on your PC |

### 0.2 Check that tools are installed

Open the **Terminal** panel in Cursor (`Ctrl+`` or **View → Terminal**).  
Make sure you are in the `agent-relay` folder, then run:

```powershell
uv --version
docker --version
kind version
kubectl version --client
act --version
```

**What “good” looks like:** each command prints a version number (not “not recognized”).  
After each command you should see a new prompt (shown here as `PS agent-relay>`) before the next command.

If `docker --version` fails, open **Docker Desktop**, wait until it says it is running, then try again.

If `kind` or `kubectl` is not found, they may be under:

- `%LOCALAPPDATA%\kind\kind.exe`
- `%LOCALAPPDATA%\kubectl\kubectl.exe`

Add those folders to your user PATH, then open a **new** Terminal tab in Cursor.

**Example terminal output** (from Cursor Terminal on this machine):

```text
PS agent-relay> uv --version
uv 0.9.7 (0adb44480 2025-10-30)

PS agent-relay> docker --version
Docker version 29.8.0, build 88096ef

PS agent-relay> kind version
kind v0.27.0 go1.23.6 windows/amd64

PS agent-relay> kubectl version --client
Client Version: v1.36.1
Kustomize Version: v5.8.1

PS agent-relay> act --version
act version 0.2.89

PS agent-relay>
```

Your version numbers may differ slightly; that is fine as long as each command works.

---

## Step 1 — Run the app locally (no Docker)

### 1.1 Go to the project folder

From the repo root:

```powershell
cd module_3\agent-relay
```

### 1.2 Install Python dependencies

```powershell
uv sync
```

**What “good” looks like:** the command finishes without an error. A `.venv` folder exists in the project.

**Example terminal output:**

```text
PS agent-relay> uv sync
Resolved 35 packages in 33ms
Audited 33 packages in 215ms

PS agent-relay>
```

### 1.3 Start the API server

```powershell
uv run uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**What “good” looks like:** you see a line like `Uvicorn running on http://127.0.0.1:8000`.

Leave this terminal open. Do not close it while you work on Steps 2–4.

**Example terminal output:**

```text
PS agent-relay> uv run uvicorn main:app --reload --host 127.0.0.1 --port 8000
INFO:     Will watch for changes in these directories: ['...\module_3\agent-relay']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [...] using WatchFiles
INFO:     Started server process [...]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### 1.4 Open the empty dashboard

In your browser, go to:

http://127.0.0.1:8000/

**What “good” looks like:** you see the Agent Relay page with a token box (you have not logged in yet).

Also check (second terminal, while the server keeps running):

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8000/ready
```

**Example terminal output:**

```text
PS agent-relay> Invoke-RestMethod http://127.0.0.1:8000/health
{"status":"ok"}

PS agent-relay> Invoke-RestMethod http://127.0.0.1:8000/ready
{"status":"ready"}

PS agent-relay>
```

---

## Step 2 — Register two agents and complete one task

Keep the server from Step 1 running. Open a **second** Cursor Terminal tab (`+` in the Terminal panel).

### 2.1 Go to the project folder again (second terminal)

From the repo root:

```powershell
cd module_3\agent-relay
```

You do **not** put these API lines in a project file. Paste them into this second terminal and press Enter.

### 2.2 Register Alice and Bob

```powershell
$base = "http://127.0.0.1:8000"

$alice = Invoke-RestMethod -Method POST -Uri "$base/api/v1/agents" `
  -ContentType "application/json" -Body '{"name":"alice"}'

$bob = Invoke-RestMethod -Method POST -Uri "$base/api/v1/agents" `
  -ContentType "application/json" -Body '{"name":"uppercase"}'

Write-Host "Alice id:" $alice.agent_id
Write-Host "Alice token:" $alice.token
Write-Host "Bob id:" $bob.agent_id
Write-Host "Bob token:" $bob.token
```

**What “good” looks like:** both agents get an `agent_id` and a secret `token`.  
**Save Alice’s token** — you will paste it into the dashboard in Step 3.

**Example terminal output:**

```text
PS agent-relay> # (after running the register commands)
Alice id: agent_7475ee59330a48cea2ec168604ed2c2d
Alice token: agt_BsQzF2nW5btBpYaZi3-YNhE48eU3CDYfXpf4f2H-YyI

Bob id: agent_f67cd64e3e5e46648532b46bdfd9c933
Bob token: agt_t-8YVINhBArxNpLTl7YM9F9FAxJ236V6pYXhht4g7zU
```

> **Hint (do later):** blur/redact tokens before sharing this guide publicly.

### 2.3 Alice sends a task to Bob

```powershell
$hAlice = @{
  Authorization = "Bearer $($alice.token)"
  "Content-Type" = "application/json"
  "Idempotency-Key" = "guide-demo-1"
}
$hBob = @{
  Authorization = "Bearer $($bob.token)"
  "Content-Type" = "application/json"
}

$task = Invoke-RestMethod -Method POST -Uri "$base/api/v1/tasks" `
  -Headers $hAlice `
  -Body (@{ to = $bob.agent_id; input = "hello relay" } | ConvertTo-Json)

Write-Host "Task id:" $task.task_id "status:" $task.status
```

**What “good” looks like:** status is `queued`.

**Example terminal output:**

```text
PS agent-relay> # (after send)
Task id: task_6588fb60535940f7bbc1530fc894c8aa status: queued
```

### 2.4 Bob claims the task

```powershell
$claim = Invoke-RestMethod -Method POST -Uri "$base/api/v1/tasks/claim" `
  -Headers $hBob `
  -Body '{"worker_id":"worker-1","wait_seconds":0}'

Write-Host "Claimed task:" $claim.task_id
```

**What “good” looks like:** you get a `claim_token` and the same `task_id`.

**Example terminal output:**

```text
PS agent-relay> # (after claim)
Claimed task: task_6588fb60535940f7bbc1530fc894c8aa
```

### 2.5 Bob completes the task

```powershell
$complete = Invoke-RestMethod -Method POST `
  -Uri "$base/api/v1/tasks/$($task.task_id)/complete" `
  -Headers $hBob `
  -Body (@{ claim_token = $claim.claim_token; output = "HELLO RELAY" } | ConvertTo-Json)

Write-Host "Complete status:" $complete.status
```

**What “good” looks like:** status is `completed`.

**Example terminal output:**

```text
PS agent-relay> # (after complete)
Complete status: completed
```

### 2.6 Alice reads the result

```powershell
$senderView = Invoke-RestMethod -Method GET `
  -Uri "$base/api/v1/tasks/$($task.task_id)" `
  -Headers @{ Authorization = "Bearer $($alice.token)" }

Write-Host "Sender sees status:" $senderView.status
Write-Host "Sender sees output:" $senderView.output
```

**What “good” looks like:**

- status = `completed`  
- output = `HELLO RELAY`

**Example terminal output:**

```text
PS agent-relay> # (after Alice reads the task)
Sender sees status: completed
Sender sees output: HELLO RELAY
```

---

## Step 3 — See the same result in the dashboard

### 3.1 Open the dashboard

Browser: http://127.0.0.1:8000/

You should see the heading **Agent Relay v2** and an empty Agents / My tasks area until you enter a token.

### 3.2 Paste Alice’s token

1. Paste Alice’s token into the **Agent token** box.  
   (Use the token printed in Step 2.2 from your run.)  
2. Click **Use token**.  
3. Click **Refresh** if needed.

**What “good” looks like:**

- Status line shows something like `Updated …`  
- Agents list includes `alice` and `uppercase`  
- My tasks shows the task with status `completed` and output `HELLO RELAY`

**Example check from the API** (same data the dashboard loads):

```text
PS agent-relay> # agents (names)
alice
uppercase
...

PS agent-relay> # Alice's sent tasks
task_6588fb60535940f7bbc1530fc894c8aa status=completed out=HELLO RELAY
```

You can also confirm in a second terminal:

```powershell
$token = "<paste-alice-token-here>"
$h = @{ Authorization = "Bearer $token" }
(Invoke-RestMethod "http://127.0.0.1:8000/api/v1/agents?limit=100" -Headers $h).items | ForEach-Object { $_.name }
(Invoke-RestMethod "http://127.0.0.1:8000/api/v1/tasks?direction=sent&limit=100" -Headers $h).items |
  ForEach-Object { "$($_.task_id) status=$($_.status) out=$($_.output)" }
```

---

## Step 4 — Run automated tests

Keep using the **second** Cursor Terminal tab. You can leave the server running; tests use a separate scratch database (they will not wipe `./agent-relay.db` used by uvicorn).

### 4.1 Run all tests

```powershell
cd module_3\agent-relay
uv run pytest -q
```

**What “good” looks like:** all tests pass (for example `5 passed`).

Files involved:

- `test_agent_relay.py` — starter protocol tests  
- `test_integration_task_flow.py` — “two agents exchange a task” flow  

**Example terminal output:**

```text
PS agent-relay> uv run pytest -q

.....                                                                    [100%]
============================== warnings summary ===============================
.venv\Lib\site-packages\fastapi\testclient.py:1
  ... StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated ...
5 passed, 1 warning in 1.33s

PS agent-relay>
```

(A deprecation warning is OK. What matters is **5 passed**.)

### 4.2 Stop the local server before Docker steps

Go to the uvicorn terminal and press `Ctrl+C`.

**Why:** the next Docker steps also want port `8000`.

---

## Step 5 — Run the app in one Docker container

### 5.1 Make sure Docker Desktop is running

```powershell
docker version
```

**What “good” looks like:** Client and Server version numbers print (not an error).

**Example terminal output:**

```text
PS agent-relay> docker version --format "Client: {{.Client.Version}}  Server: {{.Server.Version}}"
Client: 29.8.0  Server: 29.8.0

PS agent-relay>
```

### 5.2 Build the image

```powershell
cd module_3\agent-relay
docker build -t agent-relay:local .
```

**What “good” looks like:** the build ends naming `agent-relay:local` (often `naming to docker.io/library/agent-relay:local done`).

**Example terminal output (end of build):**

```text
PS agent-relay> docker build -t agent-relay:local .
...
#13 naming to docker.io/library/agent-relay:local done
#13 unpacking to docker.io/library/agent-relay:local ... done
#13 DONE ...

PS agent-relay>
```

### 5.3 Run the container and publish port 8000

```powershell
docker run --rm -d --name agent-relay-local `
  -p 8000:8000 `
  -e RELAY_DATABASE_URL=sqlite:////data/agent-relay.db `
  -v agent-relay-data:/data `
  agent-relay:local
```

Meaning of the important flags:

- `-p 8000:8000` → map container port 8000 to your PC’s port 8000  
- `-e RELAY_DATABASE_URL=...` → where the app stores data inside the container  
- `-v agent-relay-data:/data` → keep the SQLite file when the container restarts  

**Example terminal output:**

```text
PS agent-relay> docker run --rm -d --name agent-relay-local -p 8000:8000 ...
7f09bd3e91807e75757c0ac4b961e89ec697ab71629cb25a1e3312af8f9e6838

PS agent-relay>
```

### 5.4 Check the containerized app

```powershell
docker ps --filter name=agent-relay-local
Invoke-RestMethod http://127.0.0.1:8000/ready
```

Browser: http://127.0.0.1:8000/

Optionally repeat the Step 2 task flow against this container.

**Example terminal output:**

```text
PS agent-relay> docker ps --filter name=agent-relay-local
NAMES               IMAGE               STATUS         PORTS
agent-relay-local   agent-relay:local   Up ...         0.0.0.0:8000->8000/tcp, [::]:8000->8000/tcp

PS agent-relay> Invoke-RestMethod http://127.0.0.1:8000/ready
{"status":"ready"}

PS agent-relay> # (after Step 2 flow against the container)
Docker task flow: status=completed output=HELLO DOCKER
```

### 5.5 Stop the single container before Compose

```powershell
docker rm -f agent-relay-local
```

---

## Step 6 — Run with Docker Compose + PostgreSQL

Compose starts **two** services:

1. `app` — Agent Relay  
2. `postgres` — the database  

Inside the Compose network, the app connects to the database using hostname **`postgres`** (that is the service name).

Stop the single container first if it is still running:

```powershell
docker rm -f agent-relay-local
```

### 6.1 Start the stack

```powershell
cd module_3\agent-relay
docker compose up --build -d
```

### 6.2 Check both services are up

```powershell
docker compose ps
Invoke-RestMethod http://127.0.0.1:8000/ready
```

**What “good” looks like:**

- `app` is Up  
- `postgres` is Up (healthy)  
- `/ready` returns `{"status":"ready"}`

**Example terminal output:**

```text
PS agent-relay> docker compose up --build -d
...
Container agent-relay-postgres-1 Healthy
Container agent-relay-app-1 Started

PS agent-relay> docker compose ps
NAME                     IMAGE                SERVICE    STATUS                   PORTS
agent-relay-app-1        agent-relay:local    app        Up ...                   0.0.0.0:8000->8000/tcp
agent-relay-postgres-1   postgres:16-alpine   postgres   Up ... (healthy)         0.0.0.0:5432->5432/tcp

PS agent-relay> Invoke-RestMethod http://127.0.0.1:8000/ready
{"status":"ready"}
```

### 6.3 Open the dashboard again

Browser: http://127.0.0.1:8000/

Repeat Step 2’s task flow once more (new agents are fine).

**Example result:**

```text
Compose task flow: status=completed output=HELLO POSTGRES
```

### 6.4 Prove the data is in PostgreSQL

```powershell
docker compose exec -T postgres psql -U relay -d relay -c "SELECT name FROM agents; SELECT status, output FROM tasks;"
```

**What “good” looks like:** you see agent names and a task with status `completed`.

**Example terminal output:**

```text
PS agent-relay> docker compose exec -T postgres psql -U relay -d relay -c "SELECT name FROM agents; SELECT status, output FROM tasks;"
   name
-----------
 uppercase
 alice
(2 rows)

  status   |     output
-----------+----------------
 completed | HELLO POSTGRES
(1 row)
```

### 6.5 (Optional) Run tests against a separate Postgres database

Do **not** point pytest at the same DB the running app uses. Pytest deletes tables.

```powershell
docker compose exec -T postgres psql -U relay -d relay -c "CREATE DATABASE relay_test;"
$env:RELAY_DATABASE_URL = "postgresql+psycopg://relay:relay@localhost:5432/relay_test"
uv run pytest -q
Remove-Item Env:RELAY_DATABASE_URL
```

### 6.6 Stop Compose before Kubernetes

```powershell
docker compose down
```

To also delete stored Postgres data:

```powershell
docker compose down -v
```

---

## Step 7 — Deploy to local Kubernetes with kind

Stop Compose first if it is still running:

```powershell
docker compose down
```

### 7.1 Create the kind cluster (once)

```powershell
kind create cluster --name agent-relay
```

**What “good” looks like:** message that the cluster was created and kubectl context is set.  
If the cluster already exists, `kind get clusters` will list `agent-relay` — you can skip create.

**Example terminal output:**

```text
PS agent-relay> docker compose down
...

PS agent-relay> kind get clusters
agent-relay
(cluster agent-relay already exists)
```

### 7.2 Build the image and load it into kind

kind cannot download `agent-relay:local` from the internet. You must load it from your Docker Desktop images.

```powershell
cd module_3\agent-relay
docker build -t agent-relay:local .
kind load docker-image agent-relay:local --name agent-relay
```

**Example terminal output:**

```text
PS agent-relay> docker build -t agent-relay:local .
... naming to docker.io/library/agent-relay:local done

PS agent-relay> kind load docker-image agent-relay:local --name agent-relay
Image: "agent-relay:local" ... loading...
```

### 7.3 Apply the Kubernetes manifests

```powershell
kubectl apply -f k8s/all.yaml
```

This creates (among other things):

- namespace `agent-relay`  
- PostgreSQL Deployment + Service + disk claim  
- Agent Relay Deployment + Service  
- readiness checks  

**Example terminal output:**

```text
PS agent-relay> kubectl apply -f k8s/all.yaml
namespace/agent-relay unchanged
secret/postgres-credentials configured
...
deployment.apps/agent-relay configured
service/agent-relay unchanged
```

### 7.4 Wait until pods are ready

```powershell
kubectl -n agent-relay rollout status deployment/postgres --timeout=180s
kubectl -n agent-relay rollout status deployment/agent-relay --timeout=180s
kubectl -n agent-relay get pods,svc
```

**What “good” looks like:** both pods show `1/1` Ready and `Running`.

**Example terminal output:**

```text
PS agent-relay> kubectl -n agent-relay rollout status deployment/postgres --timeout=180s
deployment "postgres" successfully rolled out

PS agent-relay> kubectl -n agent-relay rollout status deployment/agent-relay --timeout=180s
deployment "agent-relay" successfully rolled out

PS agent-relay> kubectl -n agent-relay get pods,svc
NAME                           READY   STATUS    RESTARTS   AGE
pod/agent-relay-...            1/1     Running   0          ...
pod/postgres-...               1/1     Running   0          ...

NAME                  TYPE        CLUSTER-IP     PORT(S)
service/agent-relay   ClusterIP   10.96....      8000/TCP
service/postgres      ClusterIP   10.96....      5432/TCP
```

---

## Step 8 — Open the app from Kubernetes

### 8.1 Start port-forward

In a terminal you can leave open:

```powershell
kubectl -n agent-relay port-forward svc/agent-relay 8000:8000
```

**What “good” looks like:** a line like `Forwarding from 127.0.0.1:8000 -> 8000` (and/or `[::1]:8000`).

**Example terminal output:**

```text
PS agent-relay> kubectl -n agent-relay port-forward svc/agent-relay 8000:8000
Forwarding from 127.0.0.1:8000 -> 8000
Forwarding from [::1]:8000 -> 8000
```

Leave this terminal open while you use the app.

### 8.2 Open the dashboard and verify the task flow

Browser: http://127.0.0.1:8000/

In a **second** terminal, check ready and optionally repeat Step 2’s task flow:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/ready
```

**Example terminal output:**

```text
PS agent-relay> Invoke-RestMethod http://127.0.0.1:8000/ready
{"status":"ready"}

PS agent-relay> # (after Step 2 flow via port-forward)
k8s task flow: status=completed output=HELLO K8S
```

### 8.3 Stop port-forward when finished

Press `Ctrl+C` in the port-forward terminal.

---

## Step 9 — Run CI tests with act

The workflow file is:

`.github/workflows/ci.yml`

It has two jobs:

1. **test** — run pytest against PostgreSQL  
2. **build-and-deploy** — build image and deploy to kind **only if tests pass**

If tests fail, deployment must **not** replace the running version.

### 9.1 Run the test job locally

```powershell
cd module_3\agent-relay
act -j test
```

**What “good” looks like:** act finishes with the test job succeeded and pytest all passed.

**Example terminal output (abbreviated):**

```text
PS agent-relay> act -j test
[ci/test] ⭐ Run Set up job
[ci/test]   ✅  Success - Set up job
[ci/test] ⭐ Run Main actions/checkout@v4
[ci/test]   ✅  Success - Main actions/checkout@v4
[ci/test] ⭐ Run Main Install uv
[ci/test]   ✅  Success - Main Install uv
[ci/test] ⭐ Run Main Sync dependencies
[ci/test]   ✅  Success - Main Sync dependencies
[ci/test] ⭐ Run Main Run starter and integration tests against PostgreSQL
[ci/test]   | .....                                                                    [100%]
[ci/test]   | 5 passed, 1 warning in ...s
[ci/test]   ✅  Success - Main Run starter and integration tests against PostgreSQL
[ci/test] 🏁  Job succeeded
```

### 9.2 About the deploy job on Windows

On this Windows setup, run the deploy half on the host (Step 7 / Step 10): build → `kind load` → `kubectl set image`.  
Use `act -j test` to prove the CI tests work.

---

## Step 10 — Ship a dashboard heading change (Agent Relay v2)

This matches the homework “change the heading and redeploy” check.

### 10.1 Confirm the heading in the file

In `dashboard.html`, the main heading should be:

`Agent Relay v2`

(If it still says only `Agent Relay`, change it to `Agent Relay v2` before building.)

**Example check:**

```text
PS agent-relay> Select-String -Path dashboard.html -Pattern '<h1>'
dashboard.html:18:  <h1>Agent Relay v2</h1>
```

### 10.2 Build a unique image tag and load it into kind

```powershell
cd module_3\agent-relay
$tag = "v2-$(Get-Date -Format yyyyMMddHHmmss)"
docker build -t "agent-relay:$tag" -t agent-relay:local .
kind load docker-image "agent-relay:$tag" --name agent-relay
```

**Example terminal output:**

```text
PS agent-relay> $tag = "v2-20260924094908"
PS agent-relay> docker build -t "agent-relay:$tag" -t agent-relay:local .
... naming to docker.io/library/agent-relay:v2-20260924094908 done

PS agent-relay> kind load docker-image "agent-relay:$tag" --name agent-relay
Image: "agent-relay:v2-20260924094908" ... loading...
```

### 10.3 Roll out the new image

```powershell
kubectl -n agent-relay set image deployment/agent-relay "agent-relay=agent-relay:$tag"
kubectl -n agent-relay rollout status deployment/agent-relay --timeout=180s
```

**Example terminal output:**

```text
PS agent-relay> kubectl -n agent-relay set image deployment/agent-relay "agent-relay=agent-relay:$tag"
deployment.apps/agent-relay image updated

PS agent-relay> kubectl -n agent-relay rollout status deployment/agent-relay --timeout=180s
deployment "agent-relay" successfully rolled out
```

### 10.4 Port-forward and check the heading

```powershell
kubectl -n agent-relay port-forward svc/agent-relay 8000:8000
```

In a second terminal:

```powershell
(Invoke-WebRequest http://127.0.0.1:8000/ -UseBasicParsing).Content -match 'Agent Relay v2'
```

Browser: http://127.0.0.1:8000/

**What “good” looks like:** the page heading shows **Agent Relay v2**.

**Example terminal output:**

```text
PS agent-relay> # after port-forward
HEADING_OK: Agent Relay v2
{"status":"ready"}
```

---

## Step 11 — Clean up (when you are done for the day)

### 11.1 Stop Kubernetes resources (optional)

```powershell
kubectl delete -f k8s/all.yaml
```

### 11.2 Delete the kind cluster (optional)

```powershell
kind delete cluster --name agent-relay
```

### 11.3 Stop Compose if it is still running

```powershell
docker compose down
```

---

## Quick reference

### Environment variables

| Variable | Meaning |
| --- | --- |
| `RELAY_DATABASE_URL` | Database URL (SQLite or Postgres) |
| `RELAY_LEASE_SECONDS` | How long a claim lasts (default 60) |
| `RELAY_MAX_ATTEMPTS` | Max delivery attempts (default 5) |
| `RELAY_ENROLLMENT_SECRET` | If set, required when registering agents |

### Important paths

| Path | What it is |
| --- | --- |
| `SPEC.md` | How the API is supposed to behave |
| `main.py` | HTTP API |
| `Dockerfile` | How to build the container image |
| `compose.yaml` | App + Postgres together |
| `k8s/all.yaml` | Kubernetes manifests for kind |
| `.github/workflows/ci.yml` | CI workflow |
| `test_integration_task_flow.py` | Integration test for the task flow |

### Homework answers (verified)

| Question | Answer |
| --- | --- |
| Architecture | Agents claim tasks from a DB through an HTTP API |
| Status after result | `completed` |
| Publish container port | `-p` |
| Compose DB hostname | `postgres` |
| Keeps replicas / updates | `Deployment` |
| If a test fails | Keep existing version; do not deploy the new one |

More detail: [`_docs/plan.md`](_docs/plan.md)

---

## Screenshot checklist (for later)

When you are ready to capture images, save them under `module_3/_docs/images/` using these names:

| File | What to show | Status |
| --- | --- | --- |
| `00-tool-versions.png` | Tool version commands succeeding | captured |
| `01-local-uvicorn-running.png` | Local uvicorn started | pending |
| `01-local-dashboard-empty.png` | Empty local dashboard | pending |
| `01-local-health-ready.png` | `/health` and `/ready` OK | pending |
| `02-register-agents-output.png` | Agent registration output | pending |
| `02-task-completed-in-terminal.png` | Sender sees `completed` | pending |
| `03-dashboard-after-task.png` | Dashboard with completed task | pending |
| `04-pytest-all-passed.png` | Pytest all passed | pending |
| `05-docker-build-success.png` | Docker build success | pending |
| `05-docker-dashboard.png` | Dashboard via single container | pending |
| `05-docker-ps.png` | `docker ps` with port publish | pending |
| `06-compose-ps.png` | Compose services up | pending |
| `06-compose-dashboard.png` | Dashboard via Compose | pending |
| `06-postgres-query.png` | Postgres rows for agents/tasks | pending |
| `07-kind-create.png` | kind cluster created | pending |
| `07-k8s-pods-ready.png` | Pods Running 1/1 | pending |
| `08-k8s-port-forward-terminal.png` | Port-forward running | pending |
| `08-k8s-dashboard.png` | Dashboard via kind | pending |
| `09-act-test-success.png` | act test job succeeded | pending |
| `10-dashboard-v2.png` | Heading “Agent Relay v2” | pending |
