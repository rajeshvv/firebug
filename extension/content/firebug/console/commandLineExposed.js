/* See license.txt for terms of usage */
/*jshint esnext:true, es5:true, curly:false, evil:true, forin: false*/
/*global Firebug:true, FBTrace:true, Components:true, define:true */

define([
    "firebug/lib/wrapper",
    "firebug/lib/events",
    "firebug/lib/dom",
    "firebug/debugger/debuggerLib",
    "firebug/lib/object",
    "firebug/lib/xpath",
    "firebug/lib/array",
    "firebug/lib/locale",
    "firebug/lib/system",
],
function(Wrapper, Events, Dom, DebuggerLib, Obj, Xpath, Arr, Locale, System) {
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
var userCommands = Object.create(null);

// ********************************************************************************************* //
// Command Line API

/**
 * These functions will be called in the extension like this:
 *
 * subHandler.apply(api, userObjects);
 *
 * Where subHandler is one of the entries below, api is this object and userObjects
 * are entries in an array we created in the web page.
 */
function getCommandLineAPI(context, console)
{
    var commands = Object.create(null);
    // returns unwrapped elements from the page
    commands.$ = function(selector, start)
    {
        if (start && start.querySelector && (
            start.nodeType === Node.ELEMENT_NODE ||
            start.nodeType === Node.DOCUMENT_NODE ||
            start.nodeType === Node.DOCUMENT_FRAGMENT_NODE))
        {
            return start.querySelector(selector);
        }

        var result = context.baseWindow.document.querySelector(selector);
        if (result === null && (selector || "")[0] !== "#")
        {
            if (context.baseWindow.document.getElementById(selector))
            {
                // This should be removed in the next minor (non-bugfix) version

                // xxxFlorent: should we still keep that now?
                var msg = Locale.$STRF("warning.dollar_change", [selector]);
                Firebug.Console.log(msg, context, "warn");
                result = null;
            }
        }

        return result;
    };

    // returns unwrapped elements from the page
    commands.$$ = function(selector, start)
    {
        var result;

        if (start && start.querySelectorAll && (
            start.nodeType === Node.ELEMENT_NODE ||
            start.nodeType === Node.DOCUMENT_NODE ||
            start.nodeType === Node.DOCUMENT_FRAGMENT_NODE))
        {
            result = start.querySelectorAll(selector);
        }
        else
        {
            result = context.baseWindow.document.querySelectorAll(selector);
        }

        return Arr.cloneArray(result);
    };

    // returns unwrapped elements from the page
    commands.$x = function(xpath, contextNode, resultType)
    {
        var XPathResultType = XPathResult.ANY_TYPE;

        switch (resultType)
        {
            case "number":
                XPathResultType = XPathResult.NUMBER_TYPE;
                break;

            case "string":
                XPathResultType = XPathResult.STRING_TYPE;
                break;

            case "bool":
                XPathResultType = XPathResult.BOOLEAN_TYPE;
                break;

            case "node":
                XPathResultType = XPathResult.FIRST_ORDERED_NODE_TYPE;
                break;

            case "nodes":
                XPathResultType = XPathResult.UNORDERED_NODE_ITERATOR_TYPE;
                break;
        }

        var doc = Wrapper.unwrapObject(context.baseWindow.document);
        return Xpath.evaluateXPath(doc, xpath, contextNode, XPathResultType);
    };

    // values from the extension space
    commands.$n = function(index)
    {
        var htmlPanel = context.getPanel("html", true);
        if (!htmlPanel)
            return null;

        if (index < 0 || index >= htmlPanel.inspectorHistory.length)
            return null;

        var node = htmlPanel.inspectorHistory[index];
        if (!node)
            return node;

        return Wrapper.unwrapObject(node);
    };

    commands.cd = function(object)
    {
        if (!(object instanceof window.Window))
            throw new Error("Object must be a window.");

        // Make sure the command line is attached into the target iframe.
        var consoleReady = Firebug.Console.isReadyElsePreparing(context, object);
        if (FBTrace.DBG_COMMANDLINE)
            FBTrace.sysout("commandLine.cd; console ready: " + consoleReady);

        // The window object parameter uses XPCSafeJSObjectWrapper, but we need XPCNativeWrapper
        // So, look within all registered consoleHandlers for
        // the same window (from tabWatcher) that uses uses XPCNativeWrapper (operator "==" works).
        var entry = Firebug.Console.injector.getConsoleHandler(context, object);
        if (entry)
            context.baseWindow = entry.win;

        var format = Locale.$STR("commandline.CurrentWindow") + " %o";
        Firebug.Console.logFormatted([format, context.baseWindow], context, "info");
        return Firebug.Console.getDefaultReturnValue(context.window);
    };

    // no web page interaction
    commands.clear = function()
    {
        Firebug.Console.clear(context);
        return Firebug.Console.getDefaultReturnValue(context.window);
    };

    // no web page interaction
    commands.inspect = function(obj, panelName)
    {
        Firebug.chrome.select(obj, panelName);
        return Firebug.Console.getDefaultReturnValue(context.window);
    };

    commands.keys = function(o)
    {
        // the object is from the page, unwrapped
        return Arr.keys(o);
    };

    commands.values = function(o)
    {
        // the object is from the page, unwrapped
        return Arr.values(o);
    };

    commands.debug = function(fn)
    {
        Firebug.Debugger.monitorFunction(fn, "debug");
        return Firebug.Console.getDefaultReturnValue(context.window);
    };

    commands.undebug = function(fn)
    {
        Firebug.Debugger.unmonitorFunction(fn, "debug");
        return Firebug.Console.getDefaultReturnValue(context.window);
    };

    commands.monitor = function(fn)
    {
        Firebug.Debugger.monitorFunction(fn, "monitor");
        return Firebug.Console.getDefaultReturnValue(context.window);
    };

    commands.unmonitor = function(fn)
    {
        Firebug.Debugger.unmonitorFunction(fn, "monitor");
        return Firebug.Console.getDefaultReturnValue(context.window);
    };

    commands.traceAll = function()
    {
        // See issue 6220
        Firebug.Console.log(Locale.$STR("commandline.MethodDisabled"));
        //Firebug.Debugger.traceAll(Firebug.currentContext);
        return Firebug.Console.getDefaultReturnValue(context.window);
    };

    commands.untraceAll = function()
    {
        // See issue 6220
        Firebug.Console.log(Locale.$STR("commandline.MethodDisabled"));
        //Firebug.Debugger.untraceAll(Firebug.currentContext);
        return Firebug.Console.getDefaultReturnValue(context.window);
    };

    commands.traceCalls = function(fn)
    {
        // See issue 6220
        Firebug.Console.log(Locale.$STR("commandline.MethodDisabled"));
        //Firebug.Debugger.traceCalls(Firebug.currentContext, fn);
        return Firebug.Console.getDefaultReturnValue(context.window);
    };

    commands.untraceCalls = function(fn)
    {
        // See issue 6220
        Firebug.Console.log(Locale.$STR("commandline.MethodDisabled"));
        //Firebug.Debugger.untraceCalls(Firebug.currentContext, fn);
        return Firebug.Console.getDefaultReturnValue(context.window);
    };

    commands.copy = function(x)
    {
        System.copyToClipboard(x);
        return Firebug.Console.getDefaultReturnValue(context.window);
    };

    // xxxHonza: removed from 1.10 (issue 5599)
    /*commands.memoryProfile = function(title)
    {
        Firebug.MemoryProfiler.start(context, title);
        return Firebug.Console.getDefaultReturnValue(context.window);
    };

    commands.memoryProfileEnd = function()
    {
        Firebug.MemoryProfiler.stop(context);
        return Firebug.Console.getDefaultReturnValue(context.window);
    };*/

    // Register shortcut.
    consoleShortcuts.forEach(function(name)
    {
        commands[name] = console[name];
    });

    return commands;
}

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

    var commandLine = Dom.getMappedData(contentView.document, "commandLine");
    if (commandLine)
        return commandLine;

    // the debuggee global:
    var dglobal = DebuggerLib.getDebuggeeGlobal(win, context);

    // The commandLine object

    // xxxFlorent: FIXME we need to create a debuggee object to send to evalInGlobalWithBindings,
    // but that also exposes the methods of debuggee objects (pauseGrip, etc.)
    commandLine = dglobal.makeDebuggeeValue(Object.create(null));

    var console = Firebug.ConsoleExposed.createFirebugConsole(context, win);
    // The command line API instance:
    var commands = getCommandLineAPI(context, console);

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
    // xxxFlorent: TODO remove that when the work is done
    try{

    var command;
    // Define command line methods
    for (var commandName in commands)
    {
        command = commands[commandName];
        commandLine[commandName] = createCommandHandler(command);
    }

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

    // xxxFlorent: experiment to solve the issue 6141 (not working yet)
    var commandLineCopy = dglobal.makeDebuggeeValue({});
    for (name in commands)
    {
        if (commandLine.hasOwnProperty(name))
            commandLineCopy[name] = commandLine[name];
    }
    commandLineCopy.__exposedProps__ = dglobal.makeDebuggeeValue({"$": "r"});
    commandLine.firebug = commandLineCopy;
    // xxxFlorent: TODO remove that once the work is finished
    FBTrace.sysout("firebug => ", commandLine.firebug);

    Dom.setMappedData(contentView.document, "commandLine", commandLine);

    return commandLine;
    } catch(ex){ alert(ex); FBTrace.sysout(ex.stack); }
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
        if (contentView.hasOwnProperty(name))
        {
            // xxxFlorent: experiment to solve issue 6141
            if (name === "firebug")
            {
                // xxxFlorent: localize it
                var message = ["%cfirebug %cis defined as a local or global variable. Firebug "+
                    "overrides it but you can still access it by typing %cwindow.firebug",
                    "font-style: italic", "font-style: normal", "font-style: italic"];
                Firebug.Console.logFormatted(message, context, "warn");
                continue;
            }

            delete commandLine[name];
        }
    }
}

function evaluate(context, expr, origExpr, onSuccess, onError)
{
    // xxxFlorent: TODO remove that try-catch as soon as the work is finished
    try{
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
            result.fileName = "data:,/* EXPRESSION EVALUATED USING THE FIREBUG COMMAND LINE: * /"+
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

        //notifyFirebug([result], "evaluateError", "firebugAppendConsole");
        onError(result);
        return result;
    }

    onSuccess(result);
    return result;
    // notifyFirebug([result], "evaluated", "firebugAppendConsole");
    } catch(ex){alert(ex.message); FBTrace.sysout(ex.stack); onError(ex, "evaluateError", "firebugAppendConsole");}
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
