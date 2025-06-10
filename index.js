// index.js
import express from "express";
import { Readable } from "node:stream";
import fs from "fs";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/core";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ✅ GitHub App credentials
const APP_ID = process.env.GITHUB_APP_ID || "123456"; // ← Replace with your actual App ID
const PRIVATE_KEY = fs.readFileSync("./private-key.pem", "utf8");

app.get("/", (req, res) => {
  res.send("🏴‍☠️ Ahoy! Blackbeard Pirate GitHub Copilot Extension is alive!");
});

app.post("/", async (req, res) => {
  try {
    const auth = createAppAuth({
      appId: APP_ID,
      privateKey: PRIVATE_KEY,
    });

    // 🔐 App-level auth (JWT)
    const appAuth = await auth({ type: "app" });

    const appOctokit = new Octokit({ auth: appAuth.token });

    // 🔍 Get installation ID
    const installations = await appOctokit.request("GET /app/installations");
    if (!installations.data.length) {
      throw new Error("No installations found. Install the GitHub App on a repo.");
    }

    const installationId = installations.data[0].id;

    // 🔑 Installation token
    const { token: installationToken } = await auth({
      type: "installation",
      installationId,
    });

    const octokit = new Octokit({ auth: installationToken });

    // 📁 Get repo list (under the installed org/user)
    const reposResponse = await octokit.request("GET /installation/repositories", {
      per_page: 5,
    });

    const defaultRepo = reposResponse.data.repositories[0];
    if (!defaultRepo) {
      return res.status(400).json({ error: "No accessible repositories found." });
    }

    const { name: repo, owner } = defaultRepo;
    const ownerLogin = owner.login;
    console.log(`📌 Creating issue in ${ownerLogin}/${repo}`);

    // 🐛 Create the issue
    const issue = await octokit.request("POST /repos/{owner}/{repo}/issues", {
      owner: ownerLogin,
      repo,
      title: "Test issue",
      body: "Testing via GitHub App",
      labels: ["bug"],
    });

    console.log("✅ Issue created at:", issue.data.html_url);

    // 🤖 Copilot Response
    const payload = req.body;
    const messages = payload.messages || [];

    messages.unshift({
      role: "system",
      content: `Start every response with the user's name.`,
    });
    messages.unshift({
      role: "system",
      content: "You are a helpful assistant that replies like Blackbeard the Pirate.",
    });

    const copilotLLMResponse = await fetch("https://api.githubcopilot.com/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${installationToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messages,
        stream: true,
      }),
    });

    Readable.from(copilotLLMResponse.body).pipe(res);

  } catch (err) {
    console.error("🔥 Error:", err.message || err);
    res.status(500).json({ error: "Something went wrong", details: err.message });
  }
});

const port = Number(process.env.PORT || "3000");
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
