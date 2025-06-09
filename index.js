import express from "express";
import { Readable } from "node:stream";
import { Octokit } from "@octokit/core";

const app = express();
app.use(express.json());

// In-memory user config store: { githubUsername: { token, org, project } }
const userConfigs = {};

app.get("/", (req, res) => {
  res.send("🚀 BugBot Copilot Extension is running!");
});

app.post("/", async (req, res) => {
  try {
    const githubToken = req.get("X-GitHub-Token");
    if (!githubToken) {
      return res.status(400).json({ error: "Missing GitHub token" });
    }

    const octokit = new Octokit({ auth: githubToken });
    const user = await octokit.request("GET /user");
    const githubUsername = user.data.login;

    const payload = req.body;
    const userMessage = payload.messages.find(msg => msg.role === "user")?.content || "";

    // Handle @BugBot config
    const configMatch = userMessage.match(/@bugbot\s+config\s+\[token:(.*?)\]\s+\[org:(.*?)\]\s+\[project:(.*?)\]/i);
    if (configMatch) {
      const [, token, org, project] = configMatch;
      userConfigs[githubUsername] = { token, org, project };

      return res.json({
        message: `✅ Configuration saved for @${githubUsername}. You can now create bugs using @BugBot!`
      });
    }

    // Handle @BugBot bug creation
    if (userMessage.toLowerCase().startsWith("@bugbot")) {
      const config = userConfigs[githubUsername];
      if (!config) {
        return res.json({
          message: `⚠️ @${githubUsername}, please configure your Azure DevOps credentials first:\n@BugBot config [token:...] [org:...] [project:...]`
        });
      }

      const bugTitle = userMessage.replace(/@bugbot/i, "").trim();

      const createWorkItemUrl = `https://dev.azure.com/${config.org}/${config.project}/_apis/wit/workitems/$Bug?api-version=7.1-preview.3`;

      const adoBody = [
        { op: "add", path: "/fields/System.Title", value: bugTitle },
        { op: "add", path: "/fields/System.Description", value: `Reported by @${githubUsername}` }
      ];

      const adoResponse = await fetch(createWorkItemUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json-patch+json",
          Authorization: `Basic ${Buffer.from(":" + config.token).toString("base64")}`
        },
        body: JSON.stringify(adoBody)
      });

      if (!adoResponse.ok) {
        const errorText = await adoResponse.text();
        return res.status(adoResponse.status).json({ error: "Azure DevOps error", details: errorText });
      }

      const result = await adoResponse.json();
      return res.json({
        message: `✅ Bug created: [#${result.id}](${result._links.html.href})`
      });
    }

    // Default Copilot Chat fallback
    const messages = payload.messages;
    messages.unshift({
      role: "system",
      content: `You are a helpful assistant. Start every response with @${githubUsername}`,
    });

    const copilotLLMResponse = await fetch("https://api.githubcopilot.com/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${githubToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ messages, stream: true }),
    });

    Readable.from(copilotLLMResponse.body).pipe(res);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Something went wrong", details: err.message });
  }
});

const port = Number(process.env.PORT || "3000");
app.listen(port, () => {
  console.log(`🚀 BugBot server listening on port ${port}`);
});
