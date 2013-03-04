/* See license.txt for terms of usage */
/*jshint esnext:true, es5:true, curly:false, evil:true */
/*global Firebug:true, FBTrace:true, Components:true, define:true */

define([
    "firebug/lib/wrapper",
    "firebug/lib/events",
    "firebug/lib/dom",
    "firebug/debugger/debuggerLib",
    "firebug/lib/object",
],
function(Wrapper, Events, Dom, DebuggerLib, Obj) {
"use strict";

// ********************************************************************************************* //
// Constants

const Cu = Components.utils;

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
var userCommands = {};

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

    // The commandLine object
    var commandLine = {
        __exposedProps__: {}
    };

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Exposed Properties

    function createCommandHandler(cmd) {
        return function() {
            return notifyFirebug(arguments, cmd, "firebugExecuteCommand");
        };
    }

    function createShortcutHandler(cmd) {
        return function() {
            return console[cmd].apply(console, arguments);
        };
    }

    function createVariableHandler(prop) {
        return function() {
            return notifyFirebug(arguments, prop, "firebugExecuteCommand");
        };
    }

    // Define command line methods
    for (var i=0; i<commands.length; i++)
    {
        var command = commands[i];

        // If the method is already defined, don't override it.
        if (command in contentView)
            continue;

        commandLine[command] = createCommandHandler(command);
        commandLine.__exposedProps__[command] = "rw";
    }

    var console = Firebug.ConsoleExposed.createFirebugConsole(context, win);

    // Define shortcuts for some console methods
    for (var i=0; i<consoleShortcuts.length; i++)
    {
        var command = consoleShortcuts[i];

        // If the method is already defined, don't override it.
        if (command in contentView)
            continue;

        commandLine[command] = createShortcutHandler(command);
        commandLine.__exposedProps__[command] = "r";
    }

    // Define console variables.
    for (var i=0; i<props.length; i++)
    {
        var prop = props[i];
        if (prop in contentView)
            continue;

        Object.defineProperty(commandLine, prop, {
            get: createVariableHandler(prop),
            enumerable: true,
        });
        commandLine.__exposedProps__[prop] = "r";
    }

    // Define user registered commands.
    for (var name in userCommands)
    {
        // If the method is already defined, don't override it.
        if (name in contentView)
            continue;

        var config = userCommands[name];

        if (config.getter)
        {
            Object.defineProperty(commandLine, name, {
                get: createVariableHandler(name),
                enumerable: true,
            });
            commandLine.__exposedProps__[name] = "r";
        }
        else
        {
            commandLine[name] = createCommandHandler(name);
            commandLine.__exposedProps__[name] = "r";
        }
    }

    attachCommandLine();

    // xxxHonza: TODO make this private.
    commandLine["detachCommandLine"] = detachCommandLine;
    commandLine.__exposedProps__["detachCommandLine"] = "r";

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Helpers (not accessible from web content)

    function attachCommandLine()
    {
        if (FBTrace.DBG_COMMANDLINE)
            FBTrace.sysout("commandLine.Exposed.attachCommandLine; " + window.location);

        if (!contentView.console)
            contentView.console = console;

        Events.addEventListener(contentView.document, "firebugCommandLine",
            firebugEvalEvent, true);
    }

    function detachCommandLine()
    {
        Events.removeEventListener(contentView.document, "firebugCommandLine",
            firebugEvalEvent, true);

        // suicide!
        delete contentView._FirebugCommandLine;

        if (FBTrace.DBG_COMMANDLINE)
            FBTrace.sysout("commandLine.Exposed.detachCommandLine; " + window.location);
    }

    function firebugEvalEvent(event)
    {
        if (FBTrace.DBG_COMMANDLINE)
            FBTrace.sysout("commandLine.Exposed.firebugEvalEvent " + window.location);

        // see commandLine.js
        var expr = Dom.getMappedData(contentView.document, "firebug-expr");
        var origExpr = Dom.getMappedData(contentView.document, "firebug-expr-orig");
        evaluate(expr, origExpr);

        if (FBTrace.DBG_COMMANDLINE)
            FBTrace.sysout("commandLine.Exposed; did evaluate on " + expr);
    }

    function evaluate(expr, origExpr)
    {
        try{
        var result;
        var resObj;
        var dbgCL;
        var dglobal = DebuggerLib.getDebuggeeGlobal(win, context);
        dbgCL = dglobal.makeDebuggeeValue({});

        for (var i in commandLine)
        {
            if (commandLine.hasOwnProperty(i) && !win.wrappedJSObject.hasOwnProperty(i))
            {
                if (i === "__exposedProps__")
                    continue;

                var descriptor = Object.getOwnPropertyDescriptor(commandLine, i);
                if (descriptor.get && props.indexOf(i) === -1)
                {
                    // We cannot add getters in the binding object, so we add an `action` method
                    // that is triggered when the object representing the command is returned.
                    // It is not exposed to the content view (so it should be left unwrapped).
                    dbgCL[i] = dglobal.makeDebuggeeValue({});
                    // xxxFlorent: [ES6-LET]
                    dbgCL[i].action = (function(command)
                    {
                        return commandLine[command];
                    }).bind(null, i);
                }
                else
                    dbgCL[i] = dglobal.makeDebuggeeValue(commandLine[i]);
            }
        }

        resObj = dglobal.evalInGlobalWithBindings(expr, dbgCL);
        var unwrap = DebuggerLib.unwrapDebuggeeObject.bind(null, win.wrappedJSObject, dglobal);

        // In case of abnormal termination, as if by the "slow script" dialog box,
        // do not print anything in the console.
        if (!resObj)
        {
            return;
        }

        if (resObj.hasOwnProperty("return"))
        {
            result = unwrap(resObj.return);
            if (resObj.return.action)
            {
                resObj.return.action();
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
            // Change source and line number of exeptions from commandline code
            // create new error since properties of nsIXPCException are not modifiable.
            var exc = unwrap(resObj.throw);

            var errMessage;
            if (typeof exc.message === "string")
                errMessage = exc.message.replace(/__fb_scopedVars\(/g, "<get closure>(");

            var errFileName = "data:,/* EXPRESSION EVALUATED USING THE FIREBUG COMMAND LINE: * /"+
                encodeURIComponent("\n"+origExpr);

            var result = Obj.extend(exc, {
                fileName: errFileName,
                lineNumber: exc.lineNumber+1,
                message: errMessage
            });

            // xxxFlorent: I admit that I don't know how clean it is...
            result.__proto__ = Error.prototype;

            notifyFirebug([result], "evaluateError", "firebugAppendConsole");
            return;
        }

        notifyFirebug([result], "evaluated", "firebugAppendConsole");
        } catch(ex){alert(ex.message); FBTrace.sysout(ex.stack); notifyFirebug([ex], "evaluateError", "firebugAppendConsole");}
    }

    function notifyFirebug(objs, methodName, eventID)
    {
        var event = contentView.document.createEvent("Events");
        event.initEvent(eventID, true, false);

        commandLine.userObjects = [];
        for (var i=0; i<objs.length; i++)
            commandLine.userObjects.push(objs[i]);

        var length = commandLine.userObjects.length;
        Dom.setMappedData(contentView.document, "firebug-methodName", methodName);

        contentView.document.dispatchEvent(event);

        if (FBTrace.DBG_COMMANDLINE)
        {
            FBTrace.sysout("commandLine.Exposed; dispatched event " + methodName + " via " +
                eventID + " with " + objs.length + " user objects", commandLine.userObjects);
        }

        var result = undefined;
        if (Dom.getMappedData(contentView.document, "firebug-retValueType") === "array")
            result = [];

        if (!result && commandLine.userObjects.length === length + 1)
            return commandLine.userObjects[length];

        for (var i=length; i<commandLine.userObjects.length && result; i++)
            result.push(commandLine.userObjects[i]);

        return result;
    }

    return commandLine;
}

/* see Issue 5221
// chrome: urls are filtered out by debugger, so we create script with a data url
// to get eval sequences in location list and 0 error ofsets
const evalFileSrc = "data:text/javascript,FirebugEvaluate=function(t,w)w.eval(t)";
var script = document.createElementNS("http://www.w3.org/1999/xhtml", "script")
script.src = evalFileSrc;
document.documentElement.appendChild(script);
*/

function findLineNumberInExceptionStack(strStack) {
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
};

return Firebug.CommandLineExposed;

// ********************************************************************************************* //
});
