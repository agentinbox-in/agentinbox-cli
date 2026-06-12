# AgentTemp CLI

Command-line tool for AgentTemp - Email verification from the terminal.

## Installation

```bash
npm install -g agenttemp-cli
# or
npx agenttemp-cli
```

## Setup

Set your API key as an environment variable:

```bash
export AGENTTEMP_API_KEY="at_live_..."
```

Or pass it with each command:

```bash
agenttemp --api-key at_live_... inbox create
```

## Commands

### Inbox Management

```bash
# Create a new inbox
agenttemp inbox create
agenttemp inbox create --ttl 3600 --purpose "Test signup"

# List all inboxes
agenttemp inbox list

# Get inbox details
agenttemp inbox get <inbox-id>

# Delete an inbox
agenttemp inbox delete <inbox-id>
```

### Wait Operations

```bash
# Wait for an OTP
agenttemp wait otp <inbox-id>
agenttemp wait otp <inbox-id> --timeout 120

# Wait for a magic link
agenttemp wait magic-link <inbox-id>

# Wait for a password reset link
agenttemp wait password-reset <inbox-id>

# Check wait status
agenttemp wait check <wait-id>
```

### Messages

```bash
# List messages in an inbox
agenttemp message list <inbox-id>

# Get a specific message
agenttemp message get <message-id>

# Extract data from message
agenttemp message extract <message-id>
```

### Sessions

```bash
# Create a session
agenttemp session create "Test Session"

# List sessions
agenttemp session list

# Get session with timeline
agenttemp session get <session-id> --include timeline

# Complete a session
agenttemp session complete <session-id>
```

### Workflows

```bash
# Create inbox + wait in one command
agenttemp workflow signup --wait-type otp

# Quick email receive
agenttemp workflow email
```

## Global Options

```bash
--api-key, -k      API key (or use AGENTTEMP_API_KEY env var)
--base-url, -u     Custom API base URL
--json, -j         Output raw JSON
--verbose, -v      Verbose output
```

## Examples

```bash
# Quick OTP test
export AGENTTEMP_API_KEY="at_live_..."
INBOX=$(agenttemp inbox create --json | jq -r '.id')
echo "Email: $(agenttemp inbox get $INBOX --json | jq -r '.email_address')"
# ... use email in signup form ...
OTP=$(agenttemp wait otp $INBOX --timeout 120 --json | jq -r '.result.value')
echo "OTP: $OTP"

# Full workflow
agenttemp workflow signup --wait-type otp --json | jq '.wait.result.value'
```

## Resources

- [Main App](https://github.com/kunalgawade19042002-gif/tempmail)
- [Node.js SDK](https://github.com/kunalgawade19042002-gif/agenttemp-node)
- [Python SDK](https://github.com/kunalgawade19042002-gif/agenttemp-python)
- [MCP Server](https://github.com/kunalgawade19042002-gif/agenttemp-mcp)

## License

MIT
