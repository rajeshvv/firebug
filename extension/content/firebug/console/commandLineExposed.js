/* See license.txt for terms of usage */
/*jshint esnext:true, es5:true, curly:false, evil:true, forin: false*/
/*global Firebug:true, FBTrace:true, Components:true, define:true */

define([
    "firebug/lib/wrapper",
    "firebug/lib/events",
    "firebug/lib/dom",
    "firebug/debugger/debuggerLib",
    "firebug/lib/object",
    "firebug/console/commandLineAPI",
],
function(Wrapper, Events, Dom, DebuggerLib, Obj, CommandLineAPI) {
"use strict";

// ********************************************************************************************* //
// Constants

const Cu = Components.utils;

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

var commandLineCache = new WeakMap();

// ********************************************************************************************* //
// Command Line APIs

// List of command line APIs
var commands = ["$", "$$", "$x", "$n", "cd", "clear", "inspect", "keys",
    "values", "debug", "undebug", "monitor", "unmonitor", "traceCalls", "untraceCalls",
    "traceAll", "untraceAll", "copy" /*, "memoryProfile", "memoryProfileEnd"*/];

// List of shortcuts for some console methods
var consoleShortcuts = ["dir", "dirxml", "table"];

// List of console variables.
var props = ["$0", "$1"];

// Registered commands, name -> config object.
var userCommands = Object.create(null);

// ********************************************************************************************* //
// Command Line Implementation

/**
 * Returns a command line object (bundled with passed window through closure). The object
 * provides all necessary APIs as described here:
 * http://getfirebug.com/wiki/index.php/Command_Line_API
 *
 * @param {Object} context
 * @param {Object} win
 */
function createFirebugCommandLine(context, win)
{
    var contentView = Wrapper.getContentView(win);
    if (!contentView)
    {
        if (FBTrace.DBG_COMMANDLINE || FBTrace.DBG_ERRORS)
            FBTrace.sysout("createFirebugCommandLine ERROR no contentView " + context.getName());

        return null;
    }

    var commandLine = commandLineCache.get(win.document);
    if (commandLine)
        return commandLine;

    // the debuggee global:
    var dglobal = DebuggerLib.getDebuggeeGlobal(win, context);

    // The commandLine object

    // xxxFlorent: FIXME we need to create a debuggee object to send to evalInGlobalWithBindings,
    // but that also exposes the methods of debuggee objects (pauseGrip, etc.)
    commandLine = dglobal.makeDebuggeeValue(Object.create(null));

    // Get the console Object
    var defaultReturnValue = Firebug.Console.getDefaultReturnValue(win);
    var console = Firebug.ConsoleExposed.createFirebugConsole(context, win, defaultReturnValue);

    // The command line API instance:
    var commands = CommandLineAPI.getCommandLineAPI(context, console);

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Exposed Properties

    function createCommandHandler(command)
    {
        return dglobal.makeDebuggeeValue(command);
    }

    function createVariableHandler(handler)
    {
        var object = dglobal.makeDebuggeeValue({});
        object.handle = function()
        {
            return handler(context);
        };
        return object;
    }

    function createUserCommandHandler(config, name)
    {
        return function()
        {
            try
            {
                return config.handler.call(null, context, arguments);
            }
            catch (exc)
            {
                Firebug.Console.log(exc, context, "errorMessage");

                if (FBTrace.DBG_ERRORS)
                {
                    FBTrace.sysout("commandLine.api; EXCEPTION when executing " +
                        "a command: " + name + ", " + exc, exc);
                }
            }
        };
    }

    var command;
    // Define command line methods
    for (var commandName in commands)
    {
        command = commands[commandName];
        commandLine[commandName] = createCommandHandler(command);
    }

    // Register shortcut.
    consoleShortcuts.forEach(function(name)
    {
        var command = console[name].bind(console);
        commandLine[name] = createCommandHandler(command);
    });

    // Register user commands.
    for (var name in userCommands)
    {
        var config = userCommands[name];
        command = createUserCommandHandler(config, name);
        if (userCommands[name].getter)
            commandLine[name] = createVariableHandler(command);
        else
            commandLine[name] = createCommandHandler(command);
    }

    // Register Console API (Firebug-side)
    commandLine.console = dglobal.makeDebuggeeValue(console);

    commandLineCache.set(win.document, commandLine);

    return commandLine;
}

function findLineNumberInExceptionStack(strStack)
{
    if (typeof strStack !== "string")
        return null;
    var stack = strStack.split("\n");
    var fileName = Components.stack.filename, re = /^.*@(.*):(.*)$/;
    for (var i = 0; i < stack.length; ++i)
    {
        var m = re.exec(stack[i]);
        if (m && m[1] === fileName)
            return +m[2];
    }
    return null;
}

// ********************************************************************************************* //
// User Commands

function registerCommand(name, config)
{
    if (commands[name] || consoleShortcuts[name] || props[name] || userCommands[name])
    {
        if (FBTrace.DBG_ERRORS)
        {
            FBTrace.sysout("firebug.registerCommand; ERROR This command is already " +
                "registered: " + name);
        }

        return false;
    }

    userCommands[name] = config;
    return true;
}

function unregisterCommand(name)
{
    if (!userCommands[name])
    {
        if (FBTrace.DBG_ERRORS)
        {
            FBTrace.sysout("firebug.unregisterCommand; ERROR This command is not " +
                "registered: " + name);
        }

        return false;
    }

    delete userCommands[name];
    return true;
}

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
// Helpers (not accessible from web content)

function updateVars(commandLine, dglobal, context)
{
    var htmlPanel = context.getPanel("html", true);
    var vars = htmlPanel ? htmlPanel.getInspectorVars() : null;

    for (var prop in vars)
        commandLine[prop] = dglobal.makeDebuggeeValue(vars[prop]);
}

function removeConflictingNames(commandLine, context, contentView)
{
    for (var name in commandLine)
    {
        if (contentView.hasOwnProperty(name) && name !== "console")
            delete commandLine[name];
    }
}

function evaluate(context, expr, origExpr, onSuccess, onError)
{
    var result;
    var win = context.window;
    var contentView = Wrapper.getContentView(win);
    var commandLine = createFirebugCommandLine(context, win);
    var dglobal = DebuggerLib.getDebuggeeGlobal(context.window, context);
    var resObj;

    updateVars(commandLine, dglobal, context);
    removeConflictingNames(commandLine, context, contentView);

    resObj = dglobal.evalInGlobalWithBindings(expr, commandLine);

    var unwrap = function(obj)
    {
        return DebuggerLib.unwrapDebuggeeValue(obj, contentView, dglobal);
    };

    // In case of abnormal termination, as if by the "slow script" dialog box,
    // do not print anything in the console.
    if (!resObj)
    {
        return;
    }

    if (resObj.hasOwnProperty("return"))
    {
        result = unwrap(resObj.return);
        if (resObj.return && resObj.return.handle)
        {
            resObj.return.handle();
            // Do not print anything in the console in case of getter commands.
            return;
        }
    }
    else if (resObj.hasOwnProperty("yield"))
    {
        result = unwrap(resObj.yield);
    }
    else if (resObj.hasOwnProperty("throw"))
    {
        // Change source and line number of exceptions from commandline code
        // create new error since properties of nsIXPCException are not modifiable.
        // Example of code raising nsIXPCException: `alert()` (without arguments)

        // xxxFlorent: FIXME: the lineNumber is wrong with that example: cd("foo")
        var exc = unwrap(resObj.throw);

        if (!exc || typeof exc === "string")
            return;

        var shouldModify = false, isXPCException = false;
        var fileName = exc.filename || exc.fileName;
        var lineNumber = null;
        var isFileNameMasked = (fileName === "debugger eval code");
        if (fileName.lastIndexOf("chrome:", 0) === 0 || isFileNameMasked)
        {
            if (fileName === Components.stack.filename || isFileNameMasked)
            {
                shouldModify = true;
                if (exc.filename)
                    isXPCException = true;
                lineNumber = exc.lineNumber;
            }
            else if (exc._dropFrames)
            {
                lineNumber = findLineNumberInExceptionStack(exc.stack);
                shouldModify = (lineNumber !== null);
            }
        }

        result = new Error();

        if (shouldModify)
        {
            result.stack = null;
            result.source = expr;
            result.message = exc.message;
            result.lineNumber = lineNumber + 1;

            // Lie and show the pre-transformed expression instead.
            // xxxFlorent: needs to discuss about keeping that + localize?
            // xxxFlorent: FIXME the link to the source should open a new window
            result.fileName = "data:,/* EXPRESSION EVALUATED USING THE FIREBUG COMMAND LINE: */"+
                encodeURIComponent("\n"+origExpr);

            // The error message can also contain post-transform details about the
            // source, but it's harder to lie about. Make it prettier, at least.
            if (typeof result.message === "string")
                result.message = result.message.replace(/__fb_scopedVars\(/g, "<get closure>(");

            if (!isXPCException)
                result.name = exc.name;
        }
        else
        {
            for (var prop in result)
                result[prop] = exc[prop];
        }

        onError(result);
        return result;
    }

    onSuccess(result);
    return result;
}

// ********************************************************************************************* //
// Registration

Firebug.CommandLineExposed =
{
    createFirebugCommandLine: createFirebugCommandLine,
    commands: commands,
    consoleShortcuts: consoleShortcuts,
    properties: props,
    userCommands: userCommands,
    registerCommand: registerCommand,
    unregisterCommand: unregisterCommand,
    evaluate: evaluate,
};

return Firebug.CommandLineExposed;

// ********************************************************************************************* //
});
