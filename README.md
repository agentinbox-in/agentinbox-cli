# AgentInbox CLI

Command-line tool for AgentInbox - Email verification from the terminal.

## Installation

```bash
npm install -g agentinbox-cli
# or
npx agentinbox-cli
```

## Setup

Set your API key as an environment variable:

```bash
export AGENTINBOX_API_KEY="at_live_..."
```

Or pass it with each command:

```bash
agentinbox --api-key at_live_... inbox create
```

## Commands

### Inbox Management

```bash
# Create a new inbox
agentinbox inbox create
agentinbox inbox create --ttl 3600 --purpose "Test signup"

# List all inboxes
agentinbox inbox list

# Get inbox details
agentinbox inbox get <inbox-id>

# Delete an inbox
agentinbox inbox delete <inbox-id>
```

### Wait Operations

```bash
# Wait for an OTP
agentinbox wait otp <inbox-id>
agentinbox wait otp <inbox-id> --timeout 120

# Wait for a magic link
agentinbox wait magic-link <inbox-id>

# Wait for a password reset link
agentinbox wait password-reset <inbox-id>

# Check wait status
agentinbox wait check <wait-id>
```

### Messages

```bash
# List messages in an inbox
agentinbox message list <inbox-id>

# Get a specific message
agentinbox message get <message-id>

# Extract data from message
agentinbox message extract <message-id>
```

### Sessions

```bash
# Create a session
agentinbox session create "Test Session"

# List sessions
agentinbox session list

# Get session with timeline
agentinbox session get <session-id> --include timeline

# Complete a session
agentinbox session complete <session-id>
```

### Workflows

```bash
# Create inbox + wait in one command
agentinbox workflow signup --wait-type otp

# Quick email receive
agentinbox workflow email
```

## Global Options

```bash
--api-key, -k      API key (or use AGENTINBOX_API_KEY env var)
--base-url, -u     Custom API base URL
--json, -j         Output raw JSON
--verbose, -v      Verbose output
```

## Examples

```bash
# Quick OTP test
export AGENTINBOX_API_KEY="at_live_..."
INBOX=$(agentinbox inbox create --json | jq -r '.id')
echo "Email: $(agentinbox inbox get $INBOX --json | jq -r '.email_address')"
# ... use email in signup form ...
OTP=$(agentinbox wait otp $INBOX --timeout 120 --json | jq -r '.result.value')
echo "OTP: $OTP"

# Full workflow
agentinbox workflow signup --wait-type otp --json | jq '.wait.result.value'
```

## Resources

- [Node.js SDK](https://github.com/agentinbox-in/agentinbox-node)
- [Python SDK](https://github.com/agentinbox-in/agentinbox-python)
- [MCP Server](https://github.com/agentinbox-in/agentinbox-mcp)

## License

MIT
