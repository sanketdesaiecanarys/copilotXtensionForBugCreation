import express from "express";
import { Octokit } from "@octokit/core";

const app = express();
app.use(express.json());

// POST route to create GitHub issue
app.post("/", async (req, res) => {
  try {
    console.log("📥 Received POST request at /");

    // Extract Authorization header
    const authHeader = req.get("authorization");
    if (!authHeader) {
      console.error("❌ Missing Authorization header");
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    console.log("🔐 Authorization header received:", authHeader);

    // Extract GitHub Bearer token
    const tokenMatch = authHeader.match(/^GitHub-Bearer (.+)$/);
    const token = tokenMatch?.[1];

    if (!token) {
      console.error("❌ Invalid Authorization format. Expected 'GitHub-Bearer <token>'");
      return res.status(401).json({ error: "Invalid Authorization header format" });
    }

    console.log("✅ GitHub token extracted");

    // Initialize Octokit
    const octokit = new Octokit({ auth: token });

    // Fetch authenticated user info
    console.log("🔍 Fetching authenticated user info...");
    const userResponse = await octokit.request("GET /user");
    const githubHandle = userResponse?.data?.login;

    if (!githubHandle) {
      console.error("❌ Unable to extract GitHub username from user data:", userResponse);
      return res.status(500).json({ error: "Could not fetch authenticated GitHub username" });
    }

    console.log("🙋 GitHub handle of authenticated user:", githubHandle);

    // Validate request body
    const { repositoryFullName, title } = req.body;
    if (!repositoryFullName) {
      console.error("❌ Missing repositoryFullName in request body");
      return res.status(400).json({ error: "repositoryFullName is required in request body" });
    }

    console.log("📦 repositoryFullName received:", repositoryFullName);

    // Split owner/repo
    const [owner, repo] = repositoryFullName.split("/");
    if (!owner || !repo) {
      console.error("❌ Invalid repositoryFullName format. Expected owner/repo");
      return res.status(400).json({ error: "Invalid repositoryFullName format. Expected owner/repo" });
    }

    const issueTitle = title && title.trim() !== "" ? title.trim() : "Default Issue Title from Copilot";

    console.log("📝 Preparing to create issue with title:", issueTitle);

    // Build issue payload
    const issuePayload = {
      owner,
      repo,
      title: issueTitle,
      assignees: [githubHandle],
    };

    console.log("🚀 Sending request to GitHub API to create issue...");

    // Create the issue
    const createdIssue = await octokit.request("POST /repos/{owner}/{repo}/issues", issuePayload);

    if (!createdIssue || !createdIssue.data?.html_url) {
      console.error("❌ GitHub API did not return expected response:", createdIssue);
      return res.status(500).json({ error: "GitHub issue creation failed", details: createdIssue });
    }

    console.log("✅ Issue successfully created:", createdIssue.data.html_url);

    // Respond to client
    return res.status(201).json({
      message: "Issue created successfully",
      issue_url: createdIssue.data.html_url,
    });
  } catch (err) {
    console.error("🔥 Unexpected error occurred:", err?.response?.data || err.message);
    return res.status(500).json({
      error: "Issue creation failed",
      details: err?.response?.data || err.message,
    });
  }
});

// Health check route
app.get("/", (req, res) => {
  console.log("🌐 GET request received at root path");
  res.send("🧭 GitHub Copilot Issue Creator is live.");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🟢 Server is running on port ${PORT}`);
});
