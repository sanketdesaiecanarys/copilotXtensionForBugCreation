import express from "express";
import { Octokit } from "@octokit/core";

const app = express();
app.use(express.json());

// Home route
app.get("/", (req, res) => {
  res.send("🏴‍☠️ Welcome to the Copilot Issue Creator!");
});

// Create GitHub Issue
app.post("/create-issue", async (req, res) => {
  console.log("🚀 Received POST /create-issue");

  const token =
    req.get("X-GitHub-Token") || req.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    console.error("❌ Missing GitHub token.");
    return res.status(400).json({ error: "Missing GitHub token in header." });
  }

  const { title, body } = req.body;
  if (!title) {
    console.error("❌ Missing issue title.");
    return res.status(400).json({ error: "Missing 'title' in request body." });
  }

  const octokit = new Octokit({ auth: token });

  try {
    // Step 1: Get authenticated user's login
    const userResp = await octokit.request("GET /user");
    const username = userResp.data.login;
    console.log(`🧑 Authenticated as: ${username}`);

    // Step 2: Get repo list and select one (first or based on logic)
    const reposResp = await octokit.request("GET /user/repos", {
      per_page: 1, // change to get more repos if needed
    });

    if (reposResp.data.length === 0) {
      console.error("❌ No repositories found for the user.");
      return res.status(400).json({ error: "No repositories available." });
    }

    const repo = reposResp.data[0].name;
    const owner = reposResp.data[0].owner.login;
    console.log(`📦 Using repo: ${owner}/${repo}`);

    // Step 3: Create the issue
    const issueResp = await octokit.request("POST /repos/{owner}/{repo}/issues", {
      owner,
      repo,
      title,
      body,
    });

    console.log(`✅ Issue created at: ${issueResp.data.html_url}`);
    return res.status(201).json({ issueUrl: issueResp.data.html_url });
  } catch (err) {
    console.error("🔥 GitHub API Error:", err.message || err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`⚓ Server running on http://localhost:${port}`);
});
