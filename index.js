// server.js
import express from "express";
import { Octokit } from "@octokit/core";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Basic health check route
app.get("/", (req, res) => {
  console.log("GET / - Health check hit");
  res.send("✅ GitHub Copilot Issue Creator is live.");
});

// POST route to create an issue
app.post("/create-issue/:owner/:repo", async (req, res) => {
  const { owner, repo } = req.params;
  const token = req.get("X-GitHub-Token") || req.get("Authorization")?.replace("Bearer ", "");

  console.log("🔄 POST /create-issue hit");
  console.log("👉 Headers:", req.headers);
  console.log("👉 Body:", req.body);
  console.log("👉 Params:", { owner, repo });

  if (!token) {
    console.error("❌ Missing GitHub token in headers");
    return res.status(400).json({ error: "Missing required X-GitHub-Token or Authorization header" });
  }

  const { title, body } = req.body;

  if (!title) {
    console.error("❌ Missing issue title");
    return res.status(400).json({ error: "Missing issue title in request body" });
  }

  try {
    const octokit = new Octokit({ auth: token });

    const response = await octokit.request("POST /repos/{owner}/{repo}/issues", {
      owner,
      repo,
      title,
      body: body || "", // Optional body
    });

    console.log("✅ Issue created:", response.data.html_url);
    res.status(201).json({
      message: "Issue created successfully",
      issue_url: response.data.html_url,
    });
  } catch (error) {
    console.error("❌ GitHub API error:", error.message);
    if (error.response) {
      console.error("🔎 GitHub response:", error.response.data);
      res.status(error.response.status).json({
        error: error.message,
        details: error.response.data,
      });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
