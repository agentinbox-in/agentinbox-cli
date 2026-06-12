#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const program = new Command();

const BASE_URL = process.env.AGENTTEMP_BASE_URL || 'https://tempmailai.vercel.app/api/v1';

function getApiKey(cmdOptions) {
  const key = cmdOptions.apiKey || process.env.AGENTTEMP_API_KEY;
  if (!key) {
    console.error(chalk.red('Error: API key required. Use --api-key or set AGENTTEMP_API_KEY env var.'));
    process.exit(1);
  }
  return key;
}

async function apiRequest(method, path, body, apiKey) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) {
    console.error(chalk.red(`Error: ${data.error?.message || 'Unknown error'}`));
    process.exit(1);
  }
  return data;
}

function output(data, cmdOptions) {
  if (cmdOptions.json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

program
  .name('agenttemp')
  .description('CLI for AgentTemp email verification')
  .version('0.1.0')
  .option('-k, --api-key <key>', 'API key (or use AGENTTEMP_API_KEY env var)')
  .option('-u, --base-url <url>', 'Custom API base URL')
  .option('-j, --json', 'Output raw JSON')
  .option('-v, --verbose', 'Verbose output');

// Inbox commands
const inbox = program.command('inbox').description('Inbox management');

inbox.command('create')
  .description('Create a new inbox')
  .option('--ttl <seconds>', 'TTL in seconds', '3600')
  .option('--purpose <text>', 'Purpose description')
  .option('--session-id <id>', 'Session ID')
  .action(async (cmdOptions, command) => {
    const apiKey = getApiKey(command.parent.parent.opts());
    const spinner = ora('Creating inbox...').start();
    try {
      const data = await apiRequest('POST', '/inboxes', {
        ttlSeconds: parseInt(cmdOptions.ttl),
        purpose: cmdOptions.purpose,
        sessionId: cmdOptions.sessionId,
      }, apiKey);
      spinner.succeed('Inbox created!');
      if (command.parent.parent.opts().json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log(chalk.green(`Email: ${data.email_address}`));
        console.log(chalk.gray(`ID: ${data.id}`));
        console.log(chalk.gray(`Expires: ${data.expires_at}`));
      }
    } catch (e) {
      spinner.fail(e.message);
    }
  });

inbox.command('list')
  .description('List all inboxes')
  .option('--limit <n>', 'Limit', '50')
  .action(async (cmdOptions, command) => {
    const apiKey = getApiKey(command.parent.parent.opts());
    const spinner = ora('Loading inboxes...').start();
    try {
      const data = await apiRequest('GET', `/inboxes?limit=${cmdOptions.limit}`, null, apiKey);
      spinner.stop();
      if (command.parent.parent.opts().json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        data.data.forEach(inbox => {
          const status = inbox.status === 'active' ? chalk.green('●') : chalk.gray('●');
          console.log(`${status} ${inbox.email_address} ${chalk.gray(inbox.id)}`);
        });
      }
    } catch (e) {
      spinner.fail(e.message);
    }
  });

inbox.command('get <id>')
  .description('Get inbox details')
  .action(async (id, cmdOptions, command) => {
    const apiKey = getApiKey(command.parent.parent.opts());
    const data = await apiRequest('GET', `/inboxes/${id}`, null, apiKey);
    output(data, command.parent.parent.opts());
  });

inbox.command('delete <id>')
  .description('Delete an inbox')
  .action(async (id, cmdOptions, command) => {
    const apiKey = getApiKey(command.parent.parent.opts());
    const spinner = ora('Deleting...').start();
    await apiRequest('DELETE', `/inboxes/${id}`, null, apiKey);
    spinner.succeed('Inbox deleted');
  });

// Wait commands
const wait = program.command('wait').description('Wait operations');

wait.command('otp <inbox-id>')
  .description('Wait for OTP')
  .option('--timeout <seconds>', 'Timeout', '60')
  .action(async (inboxId, cmdOptions, command) => {
    const apiKey = getApiKey(command.parent.parent.opts());
    const spinner = ora(`Waiting for OTP (timeout: ${cmdOptions.timeout}s)...`).start();
    try {
      const data = await apiRequest('POST', '/waits', {
        inboxId,
        type: 'otp',
        timeoutSeconds: parseInt(cmdOptions.timeout),
      }, apiKey);
      if (data.status === 'completed') {
        spinner.succeed('OTP received!');
        console.log(chalk.green(`OTP: ${data.result?.value || 'N/A'}`));
      } else {
        spinner.fail('Timeout - no OTP received');
      }
      output(data, command.parent.parent.opts());
    } catch (e) {
      spinner.fail(e.message);
    }
  });

wait.command('magic-link <inbox-id>')
  .description('Wait for magic link')
  .option('--timeout <seconds>', 'Timeout', '60')
  .action(async (inboxId, cmdOptions, command) => {
    const apiKey = getApiKey(command.parent.parent.opts());
    const spinner = ora('Waiting for magic link...').start();
    try {
      const data = await apiRequest('POST', '/waits', {
        inboxId,
        type: 'magic_link',
        timeoutSeconds: parseInt(cmdOptions.timeout),
      }, apiKey);
      if (data.status === 'completed') {
        spinner.succeed('Magic link received!');
        console.log(chalk.green(`URL: ${data.result?.url || 'N/A'}`));
      } else {
        spinner.fail('Timeout');
      }
      output(data, command.parent.parent.opts());
    } catch (e) {
      spinner.fail(e.message);
    }
  });

wait.command('password-reset <inbox-id>')
  .description('Wait for password reset link')
  .option('--timeout <seconds>', 'Timeout', '60')
  .action(async (inboxId, cmdOptions, command) => {
    const apiKey = getApiKey(command.parent.parent.opts());
    const spinner = ora('Waiting for password reset link...').start();
    try {
      const data = await apiRequest('POST', '/waits', {
        inboxId,
        type: 'password_reset',
        timeoutSeconds: parseInt(cmdOptions.timeout),
      }, apiKey);
      if (data.status === 'completed') {
        spinner.succeed('Password reset link received!');
        console.log(chalk.green(`URL: ${data.result?.url || 'N/A'}`));
      } else {
        spinner.fail('Timeout');
      }
      output(data, command.parent.parent.opts());
    } catch (e) {
      spinner.fail(e.message);
    }
  });

wait.command('check <wait-id>')
  .description('Check wait status')
  .action(async (waitId, cmdOptions, command) => {
    const apiKey = getApiKey(command.parent.parent.opts());
    const data = await apiRequest('GET', `/waits/${waitId}`, null, apiKey);
    output(data, command.parent.parent.opts());
  });

// Message commands
const message = program.command('message').description('Message operations');

message.command('list <inbox-id>')
  .description('List messages in inbox')
  .action(async (inboxId, cmdOptions, command) => {
    const apiKey = getApiKey(command.parent.parent.opts());
    const data = await apiRequest('GET', `/inboxes/${inboxId}/messages`, null, apiKey);
    output(data, command.parent.parent.opts());
  });

message.command('get <id>')
  .description('Get message')
  .action(async (id, cmdOptions, command) => {
    const apiKey = getApiKey(command.parent.parent.opts());
    const data = await apiRequest('GET', `/messages/${id}`, null, apiKey);
    output(data, command.parent.parent.opts());
  });

message.command('extract <id>')
  .description('Extract data from message')
  .action(async (id, cmdOptions, command) => {
    const apiKey = getApiKey(command.parent.parent.opts());
    const data = await apiRequest('GET', `/messages/${id}/extract`, null, apiKey);
    output(data, command.parent.parent.opts());
  });

// Session commands
const session = program.command('session').description('Session operations');

session.command('create <name>')
  .description('Create a session')
  .option('--ttl <seconds>', 'TTL', '3600')
  .action(async (name, cmdOptions, command) => {
    const apiKey = getApiKey(command.parent.parent.opts());
    const data = await apiRequest('POST', '/sessions', {
      name,
      ttlSeconds: parseInt(cmdOptions.ttl),
    }, apiKey);
    output(data, command.parent.parent.opts());
  });

session.command('list')
  .description('List sessions')
  .action(async (cmdOptions, command) => {
    const apiKey = getApiKey(command.parent.parent.opts());
    const data = await apiRequest('GET', '/sessions', null, apiKey);
    output(data, command.parent.parent.opts());
  });

session.command('get <id>')
  .description('Get session')
  .option('--include <items>', 'Include related data (timeline,inboxes,waits)')
  .action(async (id, cmdOptions, command) => {
    const apiKey = getApiKey(command.parent.parent.opts());
    let url = `/sessions/${id}`;
    if (cmdOptions.include) url += `?include=${cmdOptions.include}`;
    const data = await apiRequest('GET', url, null, apiKey);
    output(data, command.parent.parent.opts());
  });

session.command('complete <id>')
  .description('Complete a session')
  .action(async (id, cmdOptions, command) => {
    const apiKey = getApiKey(command.parent.parent.opts());
    const data = await apiRequest('POST', `/sessions/${id}`, null, apiKey);
    output(data, command.parent.parent.opts());
  });

// Workflow commands
const workflow = program.command('workflow').description('Workflow operations');

workflow.command('create-inbox-and-wait')
  .description('Create inbox and wait for extraction')
  .option('--wait-type <type>', 'Wait type', 'otp')
  .option('--timeout <seconds>', 'Timeout', '60')
  .action(async (cmdOptions, command) => {
    const apiKey = getApiKey(command.parent.parent.opts());
    const spinner = ora('Creating workflow...').start();
    try {
      const data = await apiRequest('POST', '/workflow/create-inbox-and-wait', {
        waitType: cmdOptions.waitType,
        timeoutSeconds: parseInt(cmdOptions.timeout),
      }, apiKey);
      spinner.succeed('Workflow created!');
      if (!command.parent.parent.opts().json) {
        console.log(chalk.green(`Email: ${data.inbox.email_address}`));
        console.log(chalk.gray(`Inbox ID: ${data.inbox.id}`));
        console.log(chalk.gray(`Wait ID: ${data.wait.id}`));
      }
      output(data, command.parent.parent.opts());
    } catch (e) {
      spinner.fail(e.message);
    }
  });

workflow.command('signup')
  .description('Signup workflow with wait')
  .option('--wait-type <type>', 'Wait type', 'otp')
  .option('--timeout <seconds>', 'Timeout', '120')
  .action(async (cmdOptions, command) => {
    const apiKey = getApiKey(command.parent.parent.opts());
    const spinner = ora('Running signup workflow...').start();
    try {
      const data = await apiRequest('POST', '/workflow/signup', {
        waitType: cmdOptions.waitType,
        timeoutSeconds: parseInt(cmdOptions.timeout),
      }, apiKey);
      spinner.succeed('Signup workflow ready!');
      if (!command.parent.parent.opts().json) {
        console.log(chalk.green(`Email: ${data.inbox.email_address}`));
        console.log(chalk.gray(`Inbox ID: ${data.inbox.id}`));
      }
      output(data, command.parent.parent.opts());
    } catch (e) {
      spinner.fail(e.message);
    }
  });

program.parse();
