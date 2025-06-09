import express from "express";
import { Octokit } from "@octokit/core";

const app = express();
app.use(express.json());

app.post("/", async (req, res) => {
  try {
    // Get GitHub token from header
    const token = req.get("X-GitHub-Token");
    if (!token) {
      return res.status(401).json({ error: "Missing GitHub token in headers" });
    }

    const octokit = new Octokit({ auth: token });

    // Get authenticated user info (github handle)
    const user = await octokit.request("GET /user");
    const githubHandle = user.data.login;

    // Get repo full name and optional title from body
    const { repositoryFullName, title } = req.body;
    if (!repositoryFullName) {
      return res.status(400).json({ error: "repositoryFullName is required in request body" });
    }

    const [owner, repo] = repositoryFullName.split("/");
    if (!owner || !repo) {
      return res.status(400).json({ error: "Invalid repositoryFullName format, expected owner/repo" });
    }

    const issueTitle = title && title.trim() !== "" ? title.trim() : "Default Issue Title from Copilot";

    // Prepare payload to create issue, assign to the authenticated user
    const issuePayload = {
      owner,
      repo,
      title: issueTitle,
      assignees: [githubHandle],
    };

    // Create the issue
    const createdIssue = await octokit.request("POST /repos/{owner}/{repo}/issues", issuePayload);

    // Respond with the issue URL
    return res.status(201).json({
      message: "Issue created successfully",
      issue_url: createdIssue.data.html_url,
    });
  } catch (err) {
    console.error("Error creating issue:", err?.response?.data || err.message);
    return res.status(500).json({
      error: "Issue creation failed",
      details: err?.response?.data || err.message,
    });
  }
});

// Simple GET for health check
app.get("/", (req, res) => {
  res.send("🧭 GitHub Copilot Issue Creator is live.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🟢 Server running on port ${PORT}`);
});
