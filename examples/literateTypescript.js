var fs_1 = require('fs');
var ts = require('typescript');
var exec = require('child_process');
var delimiterPrefix = ":::literateTsCapture:::";
var noOutputLine = "// ... no output";
function wrapLoggingLine(line, n) {
    return ("console.log('" + (delimiterPrefix + n) + "');\n") + line +
        ("\nconsole.log('" + (delimiterPrefix + n) + "')");
}
function injectLogCapturing(source) {
    var lines = source.split("\n");
    var n = 0;
    for (var i = 0; i < lines.length; i++) {
        if (lines[i].match(/.+\/\/\$$/)) {
            lines[i] = wrapLoggingLine(lines[i], n++);
        }
    }
    return lines.join("\n");
}
function gatherCapturedLogs(output) {
    var result = {};
    var lines = output.split("\n");
    for (var i = 0; i < lines.length; i++) {
        if (lines[i].indexOf(delimiterPrefix) === 0) {
            var id = lines[i].slice(delimiterPrefix.length);
            if (typeof result[id] === 'number') {
                var output_1 = lines.slice(result[id], i).join("\n");
                result[id] = output_1;
            }
            else {
                result[id] = i + 1;
            }
        }
    }
    return result;
}
function commentLog(log) {
    return log.split("\n")
        .map(function (s) { return '// $> ' + s; })
        .join("\n");
}
function injectCaputredLogs(source, logs) {
    var lines = source.split("\n");
    var result = [];
    var n = 0;
    for (var i = 0; i < lines.length; i++) {
        if (lines[i].match(/.+\/\/\$$/)) {
            result.push(lines[i]);
            var log = logs[n++];
            if (log !== '') {
                result.push(commentLog(log));
            }
            else {
                result.push('// ... no output');
            }
        }
        else if (!(lines[i].match(/^\/\/ \$> .*/) ||
            lines[i] === noOutputLine)) {
            result.push(lines[i]);
        }
    }
    return result.join("\n");
}
function toMarkdown(source) {
    var result = "";
    var commentsAsHeaders = source.split("/***");
    for (var _i = 0, _a = commentsAsHeaders.slice(1); _i < _a.length; _i++) {
        var commentAsHeader = _a[_i];
        var blah = commentAsHeader.split("***/");
        var comment = blah[0];
        var code = blah[1];
        result += "\n\n" + comment.trim() + "\n";
        if (code && code.trim()) {
            result += "\n```typescript";
            result += "\n" + code.trim();
            result += "\n```\n";
        }
    }
    return result.split("\n")
        .map(function (s) {
        if (s.match(/.+\/\/\$$/)) {
            return s.slice(0, -3);
        }
        else {
            return s;
        }
    })
        .join("\n");
}
function processFile(filename, outputJS, outputMD) {
    var source = fs_1.readFileSync(filename).toString();
    var sourceCapturing = injectLogCapturing(source);
    var compiled = ts.transpile(source, { module: 1 });
    var injectedCompiled = ts.transpile(sourceCapturing, { module: 1 });
    fs_1.writeFileSync(outputJS, compiled);
    var output, logs;
    try {
        output = exec.execSync("node", { input: injectedCompiled }).toString();
        logs = gatherCapturedLogs(output);
    }
    catch (e) {
        output = e.stdout.toString();
        logs = gatherCapturedLogs(output);
        var n = Object.keys(logs).length;
        logs[n] = e.stderr.toString();
    }
    var injected = injectCaputredLogs(source, logs);
    fs_1.writeFileSync(filename, injected);
    var markdown = toMarkdown(injected);
    fs_1.writeFileSync(outputMD, markdown);
}
exports.processFile = processFile;
