'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as clipboardy from 'clipboardy';

const gitExtension = vscode.extensions.getExtension('vscode.git').exports;
const git = gitExtension.getAPI(1);

function getGitHubRepoURL(url: string) {
    if (url.endsWith('.git')) {
        url = url.substring(0, url.length - '.git'.length);
    }
    if (url.startsWith('https://github.com/')) {
        return url;
    }
    if (url.startsWith('git@github.com:')) {
        return 'https://github.com/' + url.substring('git@github.com:'.length);
    }
    return null;
}

function findGitFolder(fileName: string): string {
    let dir = path.dirname(fileName)
    let gitDir = null;
    while (true) {
        gitDir = path.join(dir, '.git');
        const exits = fs.existsSync(gitDir);
        if (exits) {
            console.log(gitDir);
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

async function calculateURL() {
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

    let repo = git.repositories[0];
    let head = repo.state.HEAD;
    let refName = head.name
    let sha = head.commit;
    let repoBranch = await repo.getBranch(refName);

    console.log("Head:", head);
    console.log('Ref Name', refName);
    console.log('gitDir', gitDir);
    console.log('sha: ', sha);
    console.log('repoBranch: ', repoBranch);

    let url = repo.state.remotes[0].pushUrl;
    console.log('Push url:', url);
    let repoURL = getGitHubRepoURL(url);

    const start = selection.start.line + 1;
    const end = selection.end.line + 1;
    const relativePathURL = relativePath.split(path.sep).join('/');
    return `${repoURL}/blob/${sha}/${relativePathURL}#L${start}-L${end}`;
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('githublinker.copyLink', async () => {
        try {
            const finalURL = await calculateURL();
            clipboardy.writeSync(finalURL);
            vscode.window.showInformationMessage('GitHub URL copied to the clipboard!');
        } catch (err) {
            vscode.window.showErrorMessage(err.message);
            throw err;
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('githublinker.copyMarkdown', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                throw new Error('No selected editor');
            }
            const {document, selection} = editor;

            const text = document.getText(selection);

            const finalURL = await calculateURL();
            const markdown = finalURL + '\n\n```' + document.languageId + '\n' + text + '\n```';
            clipboardy.writeSync(markdown);
            vscode.window.showInformationMessage('GitHub URL and code copied to the clipboard!');
        } catch (err) {
            vscode.window.showErrorMessage(err.message);
            throw err;
        }
    }));
}

export function deactivate() {
}
