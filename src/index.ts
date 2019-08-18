import chalk from 'chalk';
import path from 'path';
import eslint from 'eslint';
import execa from 'execa';
import plur from 'plur';
import pretty from 'eslint-formatter-pretty';

import { request } from '@octokit/request';
import { App } from '@octokit/app';
import Octokit from '@octokit/rest';

var APP_ID = 38817;
const PRIVATE_KEY = `
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA5jyJgi6Tx5lpGj4kBJrc72ZOUd0x0ZyAWphv3cuZ7mXLH+eo
4Gg/osi/gxfu8Nznittkc155dbHsk9a2fkIfAWPGPXwloOcBLfBea+c1lp7L63Zn
UtZuzsCKLZeNYVs6D+VKpdXQ0mPNLA2hkvsJxqaJIyRKzvNFvNPLROq72wmk1dKr
GqJ4mF2XVixeRlV5q+xbJXy/wdQzYI1/btW7Tb55FarVevuRWwYwiZ4tBb9rhgJy
QK+JYNjuMGM1l0b81NyrFf8zTO6oo3k2Rlc80ZQhC4LFvQmD6BcAg4psbxuBtJvv
7pfhPkkDr6phjFR8H2GaI00DVCqK/2DOIcPGEQIDAQABAoIBABvzNW5MYTxV72B0
MsMsWa3maZOemrGrohldcBco5GMAkIwq/2Fexnroi/dKLIOpDaLZx3QKAAy9sM6x
vi3NsR3mEubb72V9JbOB/rRyuRqz5GWNVjXEOmd3EE9AmrU68e2EFG/VaShhXUL/
1KGXQDSRewx9F2fQOKMXwxF2vZ91bU8QYt+4XQTNxdKIsqo9B59a892TG1+gMHqF
XITmautX5sGpMCXXHvUn1JN+ERr5THrTs6o158i+YRZSxHZupHmWF+CCMCUv7m+n
zG9n5XoVZFLEx3E6Mq9cUUNUksC2oSsPKWN1qxqWMi4BelqdXWlFhUiQQSpEXKrQ
paKklBECgYEA8/5u+130YzH8StyGu/NvQbLwzDeK9aSdzCwdMhUvg4Hf3v0qanqH
5aqDEiNJdPodla70R8yTN88kzGB0r+QjckoVby5j4qcPtYMsW8ROEjniIoJPAQu+
sFEE7txgis0m3UFmrjJU4xsTn9G/NgQ+EJDQbFTbxagKBe6ruyx7HisCgYEA8ZDN
jPuDlhH8kI1CGrMuwAEjGMI3hMgFnpc6JaKpLx3EBUJVXxAtf8qM2EaVcJQ+GrHa
WFc6whpzVUXVNLQygadlwUqEQVoPOi+sWhVEV/Z18F93I98wL9LSuX/ZPkLLyAw7
KbYdMuZJs4fS9h1l1QM1+LYyHlCx/naaB+mACrMCgYEA0+An46Qs6k6ntSJW5bN4
82Y98DhzNOhkFr5gA/OdtOb8zpitUpVgmTE+bGu0CB6Bvk+U1Rxy4s3AOLGx4mOL
3F00y71PA6zq2UY1KOMIoI8fLbRWgqP+TQGt9PXt59pKW2vFjJMsX6JNokTzdCau
9peqRchSqAtJ2Ojuu7TenM0CgYAr4ZMFVjcMDs5jb9WfRgdrB4nZmIY/T5p9uZjt
d0PmdDDEh808TJMHUMMPEptY7QTvEnnIbGgXFHj494uIXGeEV+VLHH8z4+k6N6jG
YHCezf2UobLhyExXk6OF4OyUu8uK1nX02MkrEtw2iajP3n0+Gaw3NtmZ2izLPb4z
S75fswKBgQCeQrQzzUcC+nSd+O8z+YLsYJjEi10o4LX0uHVlxsneUJTdZ+8s238R
rxXIyGcdFUjpY/U2tobjXousbYyz8/DqgDoLWXOMt2dNkbbNAN8L3OMVTGb6TzS2
gd8URXIGc6Nk7ueWMKEZaropIg6q1J7e9qJdlzA6j1fu6vVY3qX3tA==
-----END RSA PRIVATE KEY-----`;

const app = new App({ id: APP_ID, privateKey: PRIVATE_KEY });
const jwt = app.getSignedJsonWebToken();

const OWNER = 'hipstersmoothie';
const REPO = 'eslint-formatter-github';

function byErrorCount(
  a: eslint.CLIEngine.LintResult,
  b: eslint.CLIEngine.LintResult
) {
  if (a.errorCount === b.errorCount) {
    return b.warningCount - a.warningCount;
  }

  if (a.errorCount === 0) {
    return -1;
  }

  if (b.errorCount === 0) {
    return 1;
  }

  return b.errorCount - a.errorCount;
}

async function authenticateApp() {
  const { data } = await request('GET /repos/:owner/:repo/installation', {
    owner: OWNER,
    repo: REPO,
    headers: {
      authorization: `Bearer ${jwt}`,
      accept: 'application/vnd.github.machine-man-preview+json'
    }
  });

  const installationId = data.id;
  const token = await app.getInstallationAccessToken({
    installationId
  });

  return new Octokit({
    auth: token,
    previews: ['symmetra-preview']
  });
}

function createAnnotations(results: eslint.CLIEngine.LintResult[]) {
  const annotations: Octokit.ChecksCreateParamsOutputAnnotations[] = [];
  const levels: Octokit.ChecksCreateParamsOutputAnnotations['annotation_level'][] = [
    'notice',
    'warning',
    'failure'
  ];

  for (const result of results) {
    const { filePath, messages } = result;

    for (const msg of messages) {
      const { line, severity, ruleId, message } = msg;
      const annotationLevel = levels[severity];

      annotations.push({
        path: path.relative(process.cwd(), filePath),
        start_line: line,
        end_line: line,
        annotation_level: annotationLevel,
        message: `[${ruleId}] ${message}`
      });
    }
  }

  return annotations;
}

async function addCheck(
  results: eslint.CLIEngine.LintResult[],
  errorCount: number,
  warningCount: number
) {
  const annotations = createAnnotations(results);
  const HEAD = await execa('git', ['rev-parse', 'HEAD']);
  const octokit = await authenticateApp();
  const summary =
    (errorCount > 0 && 'Your project seems to have some errors.') ||
    (warningCount > 0 && 'Your project seems to have some warnings.') ||
    'Your project passed lint!';

  await octokit.checks.create({
    owner: OWNER,
    repo: REPO,
    name: 'Lint',
    head_sha: HEAD.stdout,
    conclusion: (errorCount > 0 && 'failure') || 'success',
    output: {
      title: 'ESLint Results',
      summary,
      annotations
    }
  });
}

const formatter: eslint.CLIEngine.Formatter = results => {
  let errorCount = 0;
  let warningCount = 0;

  results.sort(byErrorCount).forEach(result => {
    const { messages } = result;

    if (messages.length === 0) {
      return;
    }

    errorCount += result.errorCount;
    warningCount += result.warningCount;
  });

  addCheck(results, errorCount, warningCount);

  return pretty(results);
};

export = formatter;
