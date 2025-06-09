import express from "express";
import bodyParser from "body-parser";
import { Octokit } from "@octokit/core";

const app = express();
app.use(bodyParser.json());

// POST endpoint to handle GitHub Copilot chat requests
app.post("/", async (req, res) => {
  try {
    const token = req.headers["x-github-token"];
    if (!token) {
      return res.status(401).json({ error: "Missing GitHub token in headers" });
    }

    const octokit = new Octokit({ auth: token });

    const payload = req.body;
    const message = payload?.messages?.at(-1)?.content || "";
    const repoFullName = payload?.repository?.full_name;

    if (!repoFullName) {
      return res.status(400).json({ error: "Repository full name missing" });
    }

    const [owner, repo] = repoFullName.split("/");

    // Parse title and assignee from the message
    const titleMatch = message.match(/title\s*:\s*["']?(.*?)["']?(,|\s|$)/i);
    const assigneeMatch = message.match(/assignee\s*:\s*["']?@?([\w-]+)["']?(,|\s|$)/i);

    const title = titleMatch ? titleMatch[1].trim() : "Default Issue Title from Copilot";
    const assignee = assigneeMatch ? assigneeMatch[1].trim() : null;

    const issuePayload = {
      owner,
      repo,
      title,
    };

    if (assignee) {
      issuePayload.assignees = [assignee];
    }

    const created = await octokit.request("POST /repos/{owner}/{repo}/issues", issuePayload);

    return res.status(200).json({
      message: "Issue created successfully",
      issue_url: created.data.html_url,
    });
  } catch (err) {
    console.error("❌ Error creating issue:", err?.response?.data || err.message);
    return res.status(500).json({
      error: "Issue creation failed",
      details: err?.response?.data || err.message,
    });
  }
});

// Simple GET route to test the extension
app.get("/", (req, res) => {
  res.send("🧭 Ahoy! GitHub Copilot Issue Creator is live.");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🟢 Server running on port ${PORT}`);
});
