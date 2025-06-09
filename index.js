import express from "express";
import { Octokit } from "@octokit/core";

const app = express();
app.use(express.json());

// Health check route
app.get("/", (req, res) => {
  res.send("🧭 GitHub Copilot Issue Creator is live.");
});

// Issue creation endpoint
app.post("/", async (req, res) => {
  try {
    // Get GitHub token from request header
    const token = req.get("X-GitHub-Token");
    if (!token) {
      return res.status(401).json({ error: "Missing GitHub token in headers" });
    }

    const octokit = new Octokit({ auth: token });

    // Fetch authenticated user's GitHub handle
    const { data: userData } = await octokit.request("GET /user");
    const githubHandle = userData.login;

    // Extract and validate request body
    const { repositoryFullName, title } = req.body;
    if (!repositoryFullName || typeof repositoryFullName !== "string") {
      return res.status(400).json({ error: "repositoryFullName must be provided as 'owner/repo'" });
    }

    const [owner, repo] = repositoryFullName.split("/");
    if (!owner || !repo) {
      return res.status(400).json({ error: "Invalid format for repositoryFullName. Expected 'owner/repo'" });
    }

    // Use provided title or fallback to default
    const issueTitle = title?.trim() || "Default Issue Title from Copilot";

    // Create issue and assign to user
    const response = await octokit.request("POST /repos/{owner}/{repo}/issues", {
      owner,
      repo,
      title: issueTitle,
      assignees: [githubHandle],
    });

    // Respond with the created issue URL
    res.status(201).json({
      message: "Issue created successfully",
      issue_url: response.data.html_url,
    });
  } catch (err) {
    console.error("❌ Error creating issue:", err?.response?.data || err.message);
    res.status(500).json({
      error: "Issue creation failed",
      details: err?.response?.data || err.message,
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🟢 Server running on port ${PORT}`);
});
