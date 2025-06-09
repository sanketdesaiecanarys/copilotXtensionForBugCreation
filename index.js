import express from "express";
import { Octokit } from "@octokit/core";

const app = express();
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("⚓ GitHub Copilot Issue Creator is running.");
});

app.post("/", async (req, res) => {
  try {
    // Extract GitHub Copilot Bearer token from Authorization header
    const authHeader = req.get("Authorization");
    const tokenMatch = authHeader?.match(/^GitHub-Bearer (.+)$/);
    const token = tokenMatch?.[1];

    if (!token) {
      return res.status(401).json({ error: "Missing or invalid GitHub Bearer token in Authorization header." });
    }

    const octokit = new Octokit({ auth: token });

    // Fetch authenticated GitHub user's login
    const { data: user } = await octokit.request("GET /user");
    const githubHandle = user.login;

    // Parse body: expect `repositoryFullName` (e.g., "owner/repo") and optional `title`
    const { repositoryFullName, title } = req.body;

    if (!repositoryFullName || !repositoryFullName.includes("/")) {
      return res.status(400).json({ error: "repositoryFullName must be provided in 'owner/repo' format." });
    }

    const [owner, repo] = repositoryFullName.split("/");
    const issueTitle = title?.trim() || "Default Issue Title from Copilot";

    // Create a new issue
    const createdIssue = await octokit.request("POST /repos/{owner}/{repo}/issues", {
      owner,
      repo,
      title: issueTitle,
      assignees: [githubHandle],
    });

    // Respond with success and issue URL
    res.status(201).json({
      message: "Issue created successfully",
      issue_url: createdIssue.data.html_url,
    });

  } catch (err) {
    console.error("❌ Error creating issue:", err?.response?.data || err.message);
    res.status(500).json({
      error: "Issue creation failed",
      details: err?.response?.data || err.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🟢 Server is listening on port ${PORT}`);
});
