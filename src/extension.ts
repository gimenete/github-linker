'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import * as path from 'path';
import * as fs from 'fs';
import * as ini from 'ini';
import * as clipboardy from 'clipboardy';

const GITHUB_REGEX = /^.*?@github.com:(.*)$/gi;

function getGitHubRepoURL(url: string) {
    if (url.endsWith('.git')) {
        url = url.substring(0, url.length - '.git'.length);
    }
    if (url.startsWith('https://github.com/')) {
        return url;
    }
    const match = [...url.matchAll(GITHUB_REGEX)];
    if (!match.length) {
      return null;
    }
    return 'https://github.com/' + match[0][1];
}

function findGitFolder(fileName: string): string {
    let dir = path.dirname(fileName)
    const { root } = path.parse(dir)
    let gitDir = null;
    while (true) {
        gitDir = path.join(dir, '.git');
        const exits = fs.existsSync(gitDir);
        if (exits) {
            console.log(gitDir);
            break;
        } else if (dir === root) {
            gitDir = null;
            break;
        }
        dir = path.dirname(dir);
    }

    if (!gitDir) {
        throw new Error('No .git dir found. Is this a git repo?');
    }

    return gitDir
}

function getWorktreePath(gitPath: string) {
    if (fs.statSync(gitPath).isFile()) {
        // not a normal .git dir, could be a `git worktree`, read the file to find the real root
        const text = fs.readFileSync(gitPath).toString()

        console.log('gitPath is a file, checking to see if worktree', { text })

        const worktreePrefix = 'gitdir: ';

        if (text.startsWith(worktreePrefix)) {
            return text.slice(worktreePrefix.length).trim();
        }
    }
}

function calculateURL() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        throw new Error('No selected editor');
    }
    const {document, selection} = editor;
    const {fileName} = document;

    let gitDir = findGitFolder(fileName);

    const baseDir = path.join(gitDir, '..')

    const worktreePath = getWorktreePath(gitDir)

    if (worktreePath) {
        gitDir = path.join(worktreePath, '..', '..')
    }

    const relativePath = path.relative(baseDir, fileName);

    const head = fs.readFileSync(path.join(worktreePath || gitDir, 'HEAD'), 'utf8');
    const refPrefix = 'ref: ';
    const ref = head.split('\n').find(line => line.startsWith(refPrefix));
    if (!ref) {
        throw new Error('No ref found. Cannot calculate current commit');
    }
    const refName = ref.substring(refPrefix.length);
    const sha = fs.readFileSync(path.join(gitDir, refName), 'utf8').trim();

    const gitConfig = ini.parse(fs.readFileSync(path.join(gitDir, 'config'), 'utf8'));

    const branchInfo = Object.values(gitConfig).find(val => val['merge'] === refName);
    if (!branchInfo) {
        throw new Error('No branch info found. Cannot calculate remote');
    }
    const remote = branchInfo['remote'];
    const remoteInfo = Object.entries(gitConfig).find((entry) => entry[0] === `remote "${remote}"`);
    if (!remoteInfo) {
        throw new Error(`No remote found called "${remote}"`);
    }
    const url = remoteInfo[1]['url'];
    const repoURL = getGitHubRepoURL(url);
    if (!url) {
        throw new Error(`The remote "${remote}" does not look like to be hosted at GitHub`);
    }

    const start = selection.start.line + 1;
    const end = selection.end.line + 1;

    const relativePathURL = relativePath.split(path.sep).join('/');
    const absolutePathURL = `${repoURL}/blob/${sha}/${relativePathURL}`;

    if (start === 1 && end === document.lineCount) {
        return absolutePathURL;
    } else if (start === end) {
        return `${absolutePathURL}#L${start}`;
    }

    return `${absolutePathURL}#L${start}-L${end}`;
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('githublinker.copyLink', () => {
        try {
            const finalURL = calculateURL();
            clipboardy.writeSync(finalURL);
            vscode.window.showInformationMessage('GitHub URL copied to the clipboard!');
        } catch (err) {
            if (err instanceof Error) {
                vscode.window.showErrorMessage(err.message);
            }
            throw err;
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('githublinker.copyMarkdown', () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                throw new Error('No selected editor');
            }
            const {document, selection} = editor;

            const text = document.getText(selection);

            const finalURL = calculateURL();
            const markdown = finalURL + '\n\n```' + document.languageId + '\n' + text + '\n```';
            clipboardy.writeSync(markdown);
            vscode.window.showInformationMessage('GitHub URL and code copied to the clipboard!');
        } catch (err) {
            if (err instanceof Error) {
                vscode.window.showErrorMessage(err.message);
            }
            throw err;
        }
    }));
}

export function deactivate() {
}
