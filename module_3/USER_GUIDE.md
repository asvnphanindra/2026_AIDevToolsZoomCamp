# Module 3 user guide

This guide walks through **every step** to run and deploy Agent Relay on your machine.

- Commands are for **Windows PowerShell**.
- Unless a step says otherwise, run commands from:

  `E:\repos\2026_AIDevToolsZoomCamp\module_3\agent-relay`

- Screenshot placeholders look like this: they mark where a real image will go later. **No screenshots are taken yet.**

> **Screenshot placeholder format**
>
> `![short-name](_docs/images/NN-short-name.png)`
>
> *To capture later:* one sentence describing exactly what the image should show.

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

Open PowerShell and run:

```powershell
uv --version
docker version
kind version
kubectl version --client
act --version
```

**What “good” looks like:** each command prints a version number (not “not recognized”).

If `docker version` fails, open **Docker Desktop**, wait until it says it is running, then run `docker version` again.

If `kind` or `kubectl` is not found, they may be under:

- `%LOCALAPPDATA%\kind\kind.exe`
- `%LOCALAPPDATA%\kubectl\kubectl.exe`

Add those folders to your user PATH, then open a **new** PowerShell window.

> **Screenshot placeholder**
>
> `![00-tool-versions](_docs/images/00-tool-versions.png)`
>
> *To capture later:* PowerShell window showing the five version commands succeeding.

---

## Step 1 — Run the app locally (no Docker)

### 1.1 Go to the project folder

```powershell
cd E:\repos\2026_AIDevToolsZoomCamp\module_3\agent-relay
```

### 1.2 Install Python dependencies

```powershell
uv sync
```

**What “good” looks like:** the command finishes without an error. A `.venv` folder exists in the project.

### 1.3 Start the API server

```powershell
uv run uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**What “good” looks like:** you see a line like `Uvicorn running on http://127.0.0.1:8000`.

Leave this terminal open. Do not close it while you work on Steps 2–4.

> **Screenshot placeholder**
>
> `![01-local-uvicorn-running](_docs/images/01-local-uvicorn-running.png)`
>
> *To capture later:* terminal showing uvicorn started successfully on port 8000.

### 1.4 Open the empty dashboard

In your browser, go to:

http://127.0.0.1:8000/

**What “good” looks like:** you see the Agent Relay page with a token box (you have not logged in yet).

Also check:

- http://127.0.0.1:8000/health → should show something like `{"status":"ok"}`  
- http://127.0.0.1:8000/ready → should show something like `{"status":"ready"}`

> **Screenshot placeholder**
>
> `![01-local-dashboard-empty](_docs/images/01-local-dashboard-empty.png)`
>
> *To capture later:* browser on http://127.0.0.1:8000/ before any agent token is entered.

> **Screenshot placeholder**
>
> `![01-local-health-ready](_docs/images/01-local-health-ready.png)`
>
> *To capture later:* browser (or terminal) showing `/health` and `/ready` both OK.

---

## Step 2 — Register two agents and complete one task

Keep the server from Step 1 running. Open a **second** PowerShell window.

### 2.1 Go to the project folder again (second window)

```powershell
cd E:\repos\2026_AIDevToolsZoomCamp\module_3\agent-relay
```

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
**Save Alice’s token** — you will paste it into the dashboard next.

> **Screenshot placeholder**
>
> `![02-register-agents-output](_docs/images/02-register-agents-output.png)`
>
> *To capture later:* PowerShell printing both agent IDs and tokens (you may blur tokens in the final image).

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

### 2.4 Bob claims the task

```powershell
$claim = Invoke-RestMethod -Method POST -Uri "$base/api/v1/tasks/claim" `
  -Headers $hBob `
  -Body '{"worker_id":"worker-1","wait_seconds":0}'

Write-Host "Claimed task:" $claim.task_id
```

**What “good” looks like:** you get a `claim_token` and the same `task_id`.

### 2.5 Bob completes the task

```powershell
$complete = Invoke-RestMethod -Method POST `
  -Uri "$base/api/v1/tasks/$($task.task_id)/complete" `
  -Headers $hBob `
  -Body (@{ claim_token = $claim.claim_token; output = "HELLO RELAY" } | ConvertTo-Json)

Write-Host "Complete status:" $complete.status
```

**What “good” looks like:** status is `completed`.

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

> **Screenshot placeholder**
>
> `![02-task-completed-in-terminal](_docs/images/02-task-completed-in-terminal.png)`
>
> *To capture later:* PowerShell showing sender status `completed` and output `HELLO RELAY`.

---

## Step 3 — See the same result in the dashboard

### 3.1 Open the dashboard

Browser: http://127.0.0.1:8000/

### 3.2 Paste Alice’s token

1. Paste Alice’s token into the **Agent token** box.  
2. Click **Use token**.  
3. Click **Refresh** if needed.

**What “good” looks like:**

- Agents list shows `alice` and `uppercase`  
- Tasks list shows the task with status `completed` and output `HELLO RELAY`

> **Screenshot placeholder**
>
> `![03-dashboard-after-task](_docs/images/03-dashboard-after-task.png)`
>
> *To capture later:* dashboard after login with Alice’s token, showing agents and a completed task.

---

## Step 4 — Run automated tests

Keep using the **second** PowerShell window. You can leave the server running; tests use a separate scratch database.

### 4.1 Run all tests

```powershell
cd E:\repos\2026_AIDevToolsZoomCamp\module_3\agent-relay
uv run pytest -q
```

**What “good” looks like:** all tests pass (for example `5 passed`).

Files involved:

- `test_agent_relay.py` — starter protocol tests  
- `test_integration_task_flow.py` — “two agents exchange a task” flow  

> **Screenshot placeholder**
>
> `![04-pytest-all-passed](_docs/images/04-pytest-all-passed.png)`
>
> *To capture later:* PowerShell showing pytest finished with all tests passed.

### 4.2 Stop the local server before Docker steps

Go to the uvicorn terminal and press `Ctrl+C`.

**Why:** the next Docker steps also want port `8000`.

---

## Step 5 — Run the app in one Docker container

### 5.1 Make sure Docker Desktop is running

```powershell
docker info
```

**What “good” looks like:** lots of info about the Docker engine (not an error).

### 5.2 Build the image

```powershell
cd E:\repos\2026_AIDevToolsZoomCamp\module_3\agent-relay
docker build -t agent-relay:local .
```

**What “good” looks like:** the build ends with a success line and the image name `agent-relay:local`.

> **Screenshot placeholder**
>
> `![05-docker-build-success](_docs/images/05-docker-build-success.png)`
>
> *To capture later:* terminal at the end of a successful `docker build -t agent-relay:local .`

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

### 5.4 Check the containerized dashboard

Browser: http://127.0.0.1:8000/

Repeat the task flow from Step 2 (register, send, claim, complete) if you want to confirm it works inside Docker.

> **Screenshot placeholder**
>
> `![05-docker-dashboard](_docs/images/05-docker-dashboard.png)`
>
> *To capture later:* browser dashboard while the single Docker container is serving port 8000.

> **Screenshot placeholder**
>
> `![05-docker-ps](_docs/images/05-docker-ps.png)`
>
> *To capture later:* `docker ps` showing container `agent-relay-local` with `0.0.0.0:8000->8000/tcp`.

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

### 6.1 Start the stack

```powershell
cd E:\repos\2026_AIDevToolsZoomCamp\module_3\agent-relay
docker compose up --build -d
```

### 6.2 Check both services are up

```powershell
docker compose ps
```

**What “good” looks like:**

- `app` is Up  
- `postgres` is Up (healthy)

> **Screenshot placeholder**
>
> `![06-compose-ps](_docs/images/06-compose-ps.png)`
>
> *To capture later:* `docker compose ps` showing app and postgres healthy/up.

### 6.3 Open the dashboard again

Browser: http://127.0.0.1:8000/

Repeat Step 2’s task flow once more (new agents are fine).

> **Screenshot placeholder**
>
> `![06-compose-dashboard](_docs/images/06-compose-dashboard.png)`
>
> *To capture later:* dashboard after completing a task against the Compose stack.

### 6.4 Prove the data is in PostgreSQL

```powershell
docker compose exec -T postgres psql -U relay -d relay -c "SELECT name FROM agents; SELECT status, output FROM tasks;"
```

**What “good” looks like:** you see agent names and a task with status `completed`.

> **Screenshot placeholder**
>
> `![06-postgres-query](_docs/images/06-postgres-query.png)`
>
> *To capture later:* `psql` output listing agents and a completed task row.

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

### 7.1 Create the kind cluster (once)

```powershell
kind create cluster --name agent-relay
```

**What “good” looks like:** message that the cluster was created and kubectl context is set.

> **Screenshot placeholder**
>
> `![07-kind-create](_docs/images/07-kind-create.png)`
>
> *To capture later:* terminal after `kind create cluster --name agent-relay` succeeds.

### 7.2 Build the image and load it into kind

kind cannot download `agent-relay:local` from the internet. You must load it from your Docker Desktop images.

```powershell
cd E:\repos\2026_AIDevToolsZoomCamp\module_3\agent-relay
docker build -t agent-relay:local .
kind load docker-image agent-relay:local --name agent-relay
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

### 7.4 Wait until pods are ready

```powershell
kubectl -n agent-relay rollout status deployment/postgres --timeout=180s
kubectl -n agent-relay rollout status deployment/agent-relay --timeout=180s
kubectl -n agent-relay get pods,svc
```

**What “good” looks like:** both pods show `1/1` Ready and `Running`.

> **Screenshot placeholder**
>
> `![07-k8s-pods-ready](_docs/images/07-k8s-pods-ready.png)`
>
> *To capture later:* `kubectl get pods,svc` with agent-relay and postgres Running 1/1.

---

## Step 8 — Open the app from Kubernetes

### 8.1 Start port-forward

```powershell
kubectl -n agent-relay port-forward svc/agent-relay 8000:8000
```

Leave this terminal open.

### 8.2 Open the dashboard

Browser: http://127.0.0.1:8000/

Repeat the task flow from Step 2 to confirm Kubernetes is serving the app.

> **Screenshot placeholder**
>
> `![08-k8s-port-forward-terminal](_docs/images/08-k8s-port-forward-terminal.png)`
>
> *To capture later:* terminal running `kubectl port-forward` without errors.

> **Screenshot placeholder**
>
> `![08-k8s-dashboard](_docs/images/08-k8s-dashboard.png)`
>
> *To capture later:* browser dashboard reached via kind port-forward, after a completed task.

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
cd E:\repos\2026_AIDevToolsZoomCamp\module_3\agent-relay
act -j test
```

**What “good” looks like:** act finishes with the test job succeeded and pytest all passed.

> **Screenshot placeholder**
>
> `![09-act-test-success](_docs/images/09-act-test-success.png)`
>
> *To capture later:* end of `act -j test` output showing Job succeeded / tests passed.

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

### 10.2 Build a unique image tag and load it into kind

```powershell
cd E:\repos\2026_AIDevToolsZoomCamp\module_3\agent-relay
$tag = "v2-$(Get-Date -Format yyyyMMddHHmmss)"
docker build -t "agent-relay:$tag" -t agent-relay:local .
kind load docker-image "agent-relay:$tag" --name agent-relay
```

### 10.3 Roll out the new image

```powershell
kubectl -n agent-relay set image deployment/agent-relay "agent-relay=agent-relay:$tag"
kubectl -n agent-relay rollout status deployment/agent-relay --timeout=180s
```

### 10.4 Port-forward and check the heading

```powershell
kubectl -n agent-relay port-forward svc/agent-relay 8000:8000
```

Browser: http://127.0.0.1:8000/

**What “good” looks like:** the page title/heading shows **Agent Relay v2**.

> **Screenshot placeholder**
>
> `![10-dashboard-v2](_docs/images/10-dashboard-v2.png)`
>
> *To capture later:* browser dashboard clearly showing the heading “Agent Relay v2”.

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

| File | What to show |
| --- | --- |
| `00-tool-versions.png` | Tool version commands succeeding |
| `01-local-uvicorn-running.png` | Local uvicorn started |
| `01-local-dashboard-empty.png` | Empty local dashboard |
| `01-local-health-ready.png` | `/health` and `/ready` OK |
| `02-register-agents-output.png` | Agent registration output |
| `02-task-completed-in-terminal.png` | Sender sees `completed` |
| `03-dashboard-after-task.png` | Dashboard with completed task |
| `04-pytest-all-passed.png` | Pytest all passed |
| `05-docker-build-success.png` | Docker build success |
| `05-docker-dashboard.png` | Dashboard via single container |
| `05-docker-ps.png` | `docker ps` with port publish |
| `06-compose-ps.png` | Compose services up |
| `06-compose-dashboard.png` | Dashboard via Compose |
| `06-postgres-query.png` | Postgres rows for agents/tasks |
| `07-kind-create.png` | kind cluster created |
| `07-k8s-pods-ready.png` | Pods Running 1/1 |
| `08-k8s-port-forward-terminal.png` | Port-forward running |
| `08-k8s-dashboard.png` | Dashboard via kind |
| `09-act-test-success.png` | act test job succeeded |
| `10-dashboard-v2.png` | Heading “Agent Relay v2” |
