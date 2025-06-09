import express from "express";
import { Octokit } from "@octokit/core";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Ahoy! Ye be talkin’ to Blackbeard’s GitHub Issue Creator. Type @mygitappforcopilot and I’ll raise an issue from the depths! 🏴‍☠️");
});

app.post("/", async (req, res) => {
  try {
    const token = req.get("X-GitHub-Token");
    if (!token) {
      return res.status(401).json({ error: "Arrr! GitHub token be missin’ from yer headers!" });
    }

    const octokit = new Octokit({ auth: token });
    const user = await octokit.request("GET /user");
    const login = user.data.login;

    const payload = req.body;
    const message = payload.messages?.at(-1)?.content?.toLowerCase() || "";

    if (!payload.repository || !payload.repository.full_name) {
      return res.status(400).json({ error: "Blimey! No repository info in the payload!" });
    }

    const [owner, repo] = payload.repository.full_name.split("/");

    // Extract optional title and assignee
    const titleMatch = message.match(/with title\s+"([^"]+)"/);
    const assigneeMatch = message.match(/assign it to\s+"([^"]+)"/);

    const issueTitle = titleMatch ? titleMatch[1] : `Default issue opened by @${login}`;
    const assignee = assigneeMatch ? assigneeMatch[1] : null;

    const issueData = {
      owner,
      repo,
      title: issueTitle,
    };

    if (assignee) {
      issueData.assignees = [assignee];
    }

    const createdIssue = await octokit.request("POST /repos/{owner}/{repo}/issues", issueData);

    res.json({
      message: `@${login} Aye! Issue "${issueTitle}" be created ${assignee ? `and assigned to ${assignee}` : "with no crew assigned"}! 🦜`,
      issue_url: createdIssue.data.html_url,
    });

  } catch (err) {
    console.error("☠️ Error creatin' issue:", err);
    res.status(500).json({
      error: "Arrr! Me cannon misfired while creatin’ the issue!",
      details: err.message,
    });
  }
});

const port = 3000;
app.listen(port, () => {
  console.log(`🏴‍☠️ Server be runnin’ on port ${port}. Ready to raise some issues!`);
});
