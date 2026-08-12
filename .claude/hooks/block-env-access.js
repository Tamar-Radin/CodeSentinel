// PreToolUse hook: blocks Read/Edit/Bash access to .env-style secret files.
// Safe template files (.env.example, .env.sample, .env.template, .env.dist) are allowed.

const SAFE_SUFFIXES = new Set(["example", "sample", "template", "dist"]);

function isBlockedEnvPath(p) {
  if (!p) return false;
  const base = String(p).split(/[\\/]/).pop();
  if (base === ".env") return true;
  const m = base.match(/^\.env\.(.+)$/i);
  if (m && !SAFE_SUFFIXES.has(m[1].toLowerCase())) return true;
  return false;
}

function findBlockedEnvRef(command) {
  const re = /\.env(\.[a-zA-Z0-9_-]+)?\b/gi;
  let match;
  while ((match = re.exec(String(command || "")))) {
    const suffix = match[1] ? match[1].slice(1).toLowerCase() : null;
    if (!suffix || !SAFE_SUFFIXES.has(suffix)) return match[0];
  }
  return null;
}

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const toolName = payload.tool_name;
  const toolInput = payload.tool_input || {};
  let blockedTarget = null;

  if (toolName === "Read" || toolName === "Edit") {
    if (isBlockedEnvPath(toolInput.file_path)) {
      blockedTarget = toolInput.file_path;
    }
  } else if (toolName === "Bash") {
    blockedTarget = findBlockedEnvRef(toolInput.command);
  }

  if (blockedTarget) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: `Blocked: access to "${blockedTarget}" is denied by the block-env-access hook. .env files may contain secrets.`,
        },
      })
    );
  }
  process.exit(0);
});
