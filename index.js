import { Octokit } from "@octokit/core";
import express from "express";
import { Readable } from "node:stream";

const app = express();

app.get("/", (req, res) => {
  res.send("Ahoy, matey! Welcome to the Blackbeard Pirate GitHub Copilot Extension!");
});

app.post("/", express.json(), async (req, res) => {
  const tokenForUser = req.get("X-GitHub-Token");

  if (!tokenForUser) {
    console.error("❌ GitHub token not provided!");
    return res.status(400).json({ error: "Missing GitHub token in header." });
  }

  console.log("✅ Token received (first 6 chars):", tokenForUser.slice(0, 6) + "...");
  const octokit = new Octokit({ auth: tokenForUser });

  try {
    const user = await octokit.request("GET /user");
    const username = user.data.login;
    console.log("👤 GitHub Handle:", username);

    const payload = req.body;
    console.log("📦 Payload received:", JSON.stringify(payload, null, 2));

    // Fetch user repositories
    const reposResponse = await octokit.request("GET /user/repos", {
      per_page: 5, // Limit to 5 repos for brevity
      sort: "updated",
    });

    const repoNames = reposResponse.data.map(r => r.name);
    console.log("📁 Repository Names (first 5):", repoNames);

    const defaultRepo = repoNames[0];
    if (!defaultRepo) {
      console.error("❌ No repositories found for this user.");
      return res.status(400).json({ error: "No repositories available to create an issue." });
    }

    console.log("📌 Selected Repo:", defaultRepo);

    // 👉 Post an issue to GitHub
    const issueResponse = await octokit.request(
      "POST /repos/{owner}/{repo}/issues",
      {
        owner: username,
        repo: defaultRepo,
        title: "Test issue",
        body: "Testing via Copilot Extension.",
        labels: ["bug"],
      }
    );

    console.log("✅ Issue created:", issueResponse.data.html_url);

    // 👇 Proceed with Copilot streaming response
    const messages = payload.messages || [];
    messages.unshift({
      role: "system",
      content: "You are a helpful assistant that replies to user messages as if you were the Blackbeard Pirate.",
    });
    messages.unshift({
      role: "system",
      content: `Start every response with the user's name, which is @${username}`,
    });

    const copilotLLMResponse = await fetch(
      "https://api.githubcopilot.com/chat/completions",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${tokenForUser}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          messages,
          stream: true,
        }),
      }
    );

    Readable.from(copilotLLMResponse.body).pipe(res);
  } catch (err) {
    console.error("🔥 Error occurred:", err.message || err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const port = Number(process.env.PORT || "3000");
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
