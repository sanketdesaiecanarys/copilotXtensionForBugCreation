import express from "express";
import { Octokit } from "@octokit/core";

const app = express();
app.use(express.json());

app.post("/create-issue/:owner/:repo", async (req, res) => {
  try {
    const token = req.get("X-GitHub-Token");
    if (!token) {
      console.error("❌ Missing X-GitHub-Token header");
      return res.status(401).json({ error: "Missing X-GitHub-Token header" });
    }
    console.log("🔐 Token received (first 6 chars):", token.slice(0, 6) + "…");

    const octokit = new Octokit({ auth: token });

    // Verify token by fetching user info
    const userResponse = await octokit.request("GET /user");
    const githubHandle = userResponse?.data?.login;
    if (!githubHandle) {
      console.error("❌ Invalid token or cannot fetch user");
      return res.status(401).json({ error: "Invalid or unauthorized token" });
    }
    console.log("🙋 Authenticated GitHub user:", githubHandle);

    // Extract owner and repo from URL params
    const { owner, repo } = req.params;
    if (!owner || !repo) {
      return res.status(400).json({ error: "Owner and repo must be specified in URL" });
    }
    console.log(`📦 Creating issue in repo: ${owner}/${repo}`);

    // Extract issue details from body
    const { title, body, assignees, labels } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({ error: "Issue title is required in body" });
    }

    // Prepare payload for issue creation
    const issuePayload = {
      owner,
      repo,
      title: title.trim(),
      body: body || undefined,
      assignees: assignees && assignees.length > 0 ? assignees : [githubHandle],
      labels: labels && labels.length > 0 ? labels : undefined,
    };

    console.log("📝 Issue payload:", issuePayload);

    const createdIssue = await octokit.request("POST /repos/{owner}/{repo}/issues", issuePayload);

    if (!createdIssue?.data?.html_url) {
      console.error("❌ GitHub API response missing issue URL", createdIssue);
      return res.status(500).json({ error: "GitHub issue creation failed", details: createdIssue });
    }

    console.log("✅ Issue created:", createdIssue.data.html_url);
    return res.status(201).json({
      message: "Issue created successfully",
      issue_url: createdIssue.data.html_url,
    });
  } catch (err) {
    console.error("🔥 Error:", err?.response?.data || err.message);
    return res.status(500).json({
      error: "Issue creation failed",
      details: err?.response?.data || err.message,
    });
  }
});

app.get("/", (req, res) => {
  res.send("🧭 GitHub Copilot Issue Creator is live.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🟢 Server running on port ${PORT}`);
});
