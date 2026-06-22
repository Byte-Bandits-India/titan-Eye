# Deployment & Secrets Setup Guide

This guide provides clear, step-by-step instructions for configuring the production environment variables and GitHub Action secrets to secure and successfully deploy the **Titan Eye** application.

---

## 🔑 Summary of Required Secrets

You need to configure **5 secrets** in your GitHub repository settings. These secrets prevent sensitive keys and private credentials from being leaked into your version control system:

| Secret Name | Description | Example / How to Generate |
| :--- | :--- | :--- |
| **`SERVER_IP`** | The public IP or DNS hostname of your production EC2 server. | `titaneye.duckdns.org` or `54.210.xx.xx` |
| **`SSH_PRIVATE_KEY`** | The private SSH key used to connect to your server. | The complete content of your `.pem` file or `~/.ssh/id_rsa`. |
| **`SSH_HOST_KEY`** | The public host key fingerprint of the remote server. | Obtained using `ssh-keyscan` (see Step 1 below). |
| **`JWT_SECRET`** | A strong random string used to sign and verify JSON Web Tokens. | Generated using `openssl rand -hex 32` (see Step 2 below). |
| **`WEBHOOK_SECRET`** | A secure secret string used to sign and verify incoming webhook requests. | Generated using `openssl rand -hex 32`. |

---

## 🏃‍♂️ Step-by-Step Setup Instructions

### Step 1: Retrieve the Server's Public SSH Host Key (`SSH_HOST_KEY`)

To prevent Man-in-the-Middle (MITM) attacks during deployment, the GitHub runner checks the remote server's public key against a trusted fingerprint. To retrieve this fingerprint:

1. Open your terminal on your local machine.
2. Run the `ssh-keyscan` command with your production IP or domain:
   ```bash
   ssh-keyscan titaneye.duckdns.org
   ```
3. The command will output several lines that look like this:
   ```text
   # titaneye.duckdns.org:22 SSH-2.0-OpenSSH_8.7
   titaneye.duckdns.org ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC6dG...
   titaneye.duckdns.org ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABB...
   ```
4. Copy the **entire line** starting with the hostname and key type (usually the `ssh-rsa` or `ecdsa-sha2-nistp256` key line).
   - *Example string to copy:*
     `titaneye.duckdns.org ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC6dG...`

---

### Step 2: Generate Secure Random Secrets (`JWT_SECRET` & `WEBHOOK_SECRET`)

To ensure standard cryptographic strength in production, you must generate secure random hashes:

1. Open your terminal.
2. Generate a secure secret for **`JWT_SECRET`**:
   ```bash
   openssl rand -hex 32
   ```
   *Copy the output string (e.g., `4e29f8a3c89b21d50c76...`).*
3. Generate another secure secret for **`WEBHOOK_SECRET`**:
   ```bash
   openssl rand -hex 32
   ```
   *Copy the output string.*

---

### Step 3: Add the Secrets to GitHub

Now, you will store these secrets securely in GitHub so that the Action runner can access them during deployment.

1. Open your web browser and navigate to your project repository on GitHub.
2. Click on the **Settings** tab (located in the top menu bar of your repository).
3. In the left-hand sidebar, scroll down to the **Security** section and click on **Secrets and variables** to expand it.
4. Click on **Actions**.
5. Click the green **New repository secret** button in the top right corner.
6. For each secret, fill in the **Name** and **Value**:
   - **Secret 1:**
     - **Name:** `SERVER_IP`
     - **Value:** `titaneye.duckdns.org` (or your raw EC2 IP address)
   - **Secret 2:**
     - **Name:** `SSH_PRIVATE_KEY`
     - **Value:** Paste your complete SSH Private Key (include the `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` header and footer lines).
   - **Secret 3:**
     - **Name:** `SSH_HOST_KEY`
     - **Value:** Paste the exact line copied from `ssh-keyscan` in Step 1.
   - **Secret 4:**
     - **Name:** `JWT_SECRET`
     - **Value:** Paste the generated random string from Step 2.
   - **Secret 5:**
     - **Name:** `WEBHOOK_SECRET`
     - **Value:** Paste the second generated random string from Step 2.
7. Click the green **Add secret** button after typing each one to save it.

---

### Step 4: Verify the Configuration

Once the secrets are set:
1. Make a git commit and push it to your `main` branch.
2. Go to the **Actions** tab on your GitHub repository.
3. Select your deployment workflow (**🚀 Build & Deploy Titan React App**) and ensure all steps (Checkout, Inject Env, Configure SSH Key, Upload, and Deploy) complete successfully.
