/**
 * This has nothing to do with Havelock. It's just a cross between a literate
 * typescript compiler and a repl. To see it in use: run grunt in the /routing
 * example folder. Then insert a console log somewhere in the file, followed by //$
 * on the same line and save it.
 * .e.g.
 *
 *    console.log(`yo`); //$
 *
 * hit save and wait... then suddenly
 *
 *    console.log(`yo`); //$
 *    // $> yo
 *
 * the //$ bits get removed before the markdown is emitted.
 */

/// <reference path="node_modules/typescript/bin/typescript.d.ts" />
/// <reference path="typings/node/node.d.ts" />

import { readFileSync, writeFileSync } from 'fs';
import * as ts from 'typescript';
import * as exec from 'child_process';

const delimiterPrefix = ":::literateTsCapture:::";
const noOutputLine = "// ... no output";

function wrapLoggingLine(line: string, n: number): string {
  return `console.log('${delimiterPrefix + n}');\n` + line +
         `\nconsole.log('${delimiterPrefix + n}')`;
}

function injectLogCapturing(source: string): string {
  let lines = source.split("\n");
  let n = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/.+\/\/\$$/)) {
      lines[i] = wrapLoggingLine(lines[i], n++);
    }
  }
  return lines.join("\n")
}

function gatherCapturedLogs(output: string): Object {
  let result = {};

  let lines = output.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf(delimiterPrefix) === 0) {
      let id = lines[i].slice(delimiterPrefix.length);
      if (typeof result[id] === 'number') {
        let output = lines.slice(result[id], i).join("\n");
        result[id] = output;
      } else {
        result[id] = i + 1;
      }
    }
  }

  return result;
}

function commentLog(log: string): string {
  return log.split("\n")
            .map(s => '// $> ' + s)
            .join("\n");
}

function injectCaputredLogs(source: string, logs: Object): string {
  const lines = source.split("\n");
  const result = [];
  let n = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/.+\/\/\$$/)) {
      result.push(lines[i]);
      let log = logs[n++];
      if (log !== '') {
        result.push(commentLog(log));
      } else {
        result.push('// ... no output')
      }
    } else if (!(lines[i].match(/^\/\/ \$> .*/) ||
                 lines[i] === noOutputLine)){
      // don't include old logs
      result.push(lines[i]);
    }
  }
  return result.join("\n");
}

function toMarkdown(source: string) {
  let result = "";
  const commentsAsHeaders = source.split("/***");
  for (let commentAsHeader of commentsAsHeaders.slice(1)) {
    let blah = commentAsHeader.split("***/");
    let comment = blah[0];
    let code = blah[1];
    result += "\n\n" + comment.trim() + "\n";
    if (code && code.trim()) {
      result += "\n```typescript";
      result += "\n" + code.trim();
      result += "\n```\n";
    }
  }
  return result.split("\n")
               .map(s => {
                 if (s.match(/.+\/\/\$$/)) {
                   return s.slice(0, -3);
                 } else {
                   return s;
                 }
               })
               .join("\n");
}

export function processFile(filename: string, outputJS: string, outputMD: string) {
  const source = readFileSync(filename).toString();
  const sourceCapturing = injectLogCapturing(source);
  const compiled = ts.transpile(source, { module: ts.ModuleKind.CommonJS });
  const injectedCompiled = ts.transpile(sourceCapturing, { module: ts.ModuleKind.CommonJS });

  writeFileSync(outputJS, compiled);

  const output = exec.execSync("node", {input: injectedCompiled}).toString();
  const logs = gatherCapturedLogs(output);
  const injected = injectCaputredLogs(source, logs);

  writeFileSync(filename, injected);

  const markdown = toMarkdown(injected);

  writeFileSync(outputMD, markdown);
}
