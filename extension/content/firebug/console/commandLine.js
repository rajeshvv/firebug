/* See license.txt for terms of usage */
/*jshint forin:false, noempty:false, esnext:true, es5:true, curly:false */
/*global FBTrace:true, Components:true, define:true, KeyEvent:true */

define([
    "firebug/lib/object",
    "firebug/firebug",
    "firebug/chrome/reps",
    "firebug/lib/locale",
    "firebug/lib/events",
    "firebug/lib/wrapper",
    "firebug/lib/url",
    "firebug/lib/css",
    "firebug/lib/dom",
    "firebug/chrome/firefox",
    "firebug/chrome/window",
    "firebug/lib/system",
    "firebug/lib/string",
    "firebug/lib/xml",
    "firebug/lib/array",
    "firebug/lib/persist",
    "firebug/lib/keywords",
    "firebug/console/console",
    "firebug/console/commandLineHelp",
    "firebug/console/commandLineInclude",
    "firebug/console/commandLineExposed",
    "firebug/console/closureInspector",
    "firebug/console/autoCompleter",
    "firebug/console/commandHistory"
],
function(Obj, Firebug, FirebugReps, Locale, Events, Wrapper, Url, Css, Dom, Firefox, Win, System,
    Str, Xml, Arr, Persist, Keywords, Console, CommandLineHelp, CommandLineInclude,
    CommandLineExposed, ClosureInspector) {
"use strict";

// ********************************************************************************************* //
// Constants

const Cc = Components.classes;

const commandPrefix = ">>>";

// ********************************************************************************************* //
// Command Line

Firebug.CommandLine = Obj.extend(Firebug.Module,
{
    dispatchName: "commandLine",

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    // targetWindow was needed by evaluateInSandbox, let's leave it for a while in case
    // we rethink this yet again
    initializeCommandLineIfNeeded: function (context, win)
    {
        if (!context || !win)
            return;

        // The command-line requires that the console has been initialized first,
        // so make sure that's so.  This call should have no effect if the console
        // is already initialized.
        var consoleIsReady = Firebug.Console.isReadyElsePreparing(context, win);

        // Make sure the command-line is initialized.  This call should have no
        // effect if the command-line is already initialized.
        var commandLineIsReady = true; //Firebug.CommandLine.isReadyElsePreparing(context, win);

        if (FBTrace.DBG_COMMANDLINE)
        {
            FBTrace.sysout("commandLine.initializeCommandLineIfNeeded console ready: " +
                consoleIsReady + " commandLine ready: " + commandLineIsReady);
        }
    },

    evaluate: function(expr, context, thisValue, targetWindow, successConsoleFunction,
        exceptionFunction, noStateChange)
    {
        if (!context)
            return;

        targetWindow = targetWindow || context.getCurrentGlobal();

        var debuggerState, result = null;
        try
        {
            debuggerState = Firebug.Debugger.beginInternalOperation();

            var newExpr = ClosureInspector.extendLanguageSyntax(expr, targetWindow, context);

            if (this.isSandbox(context))
            {
                this.evaluateInSandbox(newExpr, context, thisValue, targetWindow,
                    successConsoleFunction, exceptionFunction, expr);
            }
            else if (Firebug.Debugger.hasValidStack(context))
            {
                this.evaluateInDebugFrame(newExpr, context, thisValue, targetWindow,
                    successConsoleFunction, exceptionFunction, expr);
            }
            else
            {
                this.evaluateInGlobal(newExpr, context, thisValue, targetWindow,
                    successConsoleFunction, exceptionFunction, expr);
            }

            if (!noStateChange)
                context.invalidatePanels("dom", "html");
        }
        catch (exc)
        {
            // XXX jjb, I don't expect this to be taken, the try here is for the finally
            if (FBTrace.DBG_ERRORS && FBTrace.DBG_COMMANDLINE)
            {
                FBTrace.sysout("commandLine.evaluate with context.stopped:" + context.stopped +
                    " EXCEPTION " + exc, exc);
            }
        }
        finally
        {
            Firebug.Debugger.endInternalOperation(debuggerState);
        }
    },

    evaluateInGlobal: function(expr, context, thisValue, targetWindow,
        successConsoleFunction, exceptionFunction, origExpr)
    {
        var win = targetWindow || context.getCurrentGlobal();

        if (!win)
        {
            if (FBTrace.DBG_ERRORS && FBTrace.DBG_COMMANDLINE)
                FBTrace.sysout("commandLine.evaluateInGlobal: no targetWindow!");
            return;
        }

        // xxxFlorent: I commented the part that disables the Console when on an XML file 
        //  intentionnally. Why was it actually disabled?

        //xxxHonza: do not detach the command line here. In case where Firebug is 
        // halted in the debugger and debugging a function executed in the command line
        // the command line handler needs to be yet used to display the return value.

        // Inject commandLine APIs again.
        /*this.initializeCommandLineIfNeeded(context, win);

        // Make sure the command line script is attached.
        if (!Firebug.CommandLine.isAttached(context, win))
        {
            FBTrace.sysout("commandLine: document does not have command line attached " +
                "it's too early for command line "+Win.getWindowId(win)+" location:"+
                Win.safeGetWindowLocation(win), document);

            if (Xml.isXMLPrettyPrint(context, win))
            {
                var msg = Locale.$STR("commandline.disabledForXMLDocs");
                var row = Firebug.Console.logFormatted([msg], context, "warn", true);
                var objectBox = row.querySelector(".objectBox");

                // Log a message with a clickable link that can be used to enable
                // the command line - but the page will switch into HTML. The listener
                // passed into the function is called when the user clicks the link.
                FirebugReps.Description.render(msg, objectBox, Obj.bind(function()
                {
                    // Reset the flag that protect script injection into the page.
                    context.isXMLPrettyPrint = false;

                    // Now inject the command line.
                    Firebug.CommandLine.initializeCommandLineIfNeeded(context, win);
                }, this));
            }
            else
            {
                Firebug.Console.logFormatted(["Firebug cannot find firebug-CommandLineAttached " +
                    "through Dom.getMappedData, it is too early for command line",
                     win], context, "error", true);
            }
            return;
        }

        var event = document.createEvent("Events");
        event.initEvent("firebugCommandLine", true, false);
        Dom.setMappedData(win.document, "firebug-methodName", "evaluate");

        origExpr = origExpr || expr;
        Dom.setMappedData(win.document, "firebug-expr-orig", origExpr);
        Dom.setMappedData(win.document, "firebug-expr", expr);

        var consoleHandler = Firebug.Console.injector.getConsoleHandler(context, win);

        if (!consoleHandler)
        {
            FBTrace.sysout("commandLine evaluateByEventPassing no consoleHandler "+
                Win.safeGetWindowLocation(win));
            return;
        }

        if (successConsoleFunction)
        {
            consoleHandler.setEvaluatedCallback(function useConsoleFunction(result)
            {
                var ignoreReturnValue = Console.getDefaultReturnValue(win);
                if (result === ignoreReturnValue)
                    return;

                successConsoleFunction(result, context);
            });
        }

        if (exceptionFunction)
        {
            consoleHandler.setEvaluateErrorCallback(function useExceptionFunction(result)
            {
                exceptionFunction(result, context, "errorMessage");
            });
        }
        else
        {
            consoleHandler.setEvaluateErrorCallback(function useErrorFunction(result)
            {
                Firebug.Console.logFormatted([result], context, "error", true);
            });
        }

        if (FBTrace.DBG_COMMANDLINE)
        {
            FBTrace.sysout("commandLine.evaluateByEventPassing '" + expr +
                "' using consoleHandler:", consoleHandler);
        }

        try
        {
            win.document.dispatchEvent(event);
        }
        catch(exc)
        {
            if (FBTrace.DBG_COMMANDLINE || FBTrace.DBG_ERRORS)
                FBTrace.sysout("commandLine.evaluateByEventPassing dispatchEvent FAILS " + exc,
                    {exc:exc, event:event});
        }*/

        context.baseWindow = context.baseWindow || context.window;
        var onSuccess, onError;

        if (successConsoleFunction)
        {
            onSuccess = function(result)
            {
                var ignoreReturnValue = Console.getDefaultReturnValue(win);
                if (result === ignoreReturnValue)
                    return;

                successConsoleFunction(result, context);
            }
        }

        if (exceptionFunction)
        {
            onError = function(result)
            {
                exceptionFunction(result, context, "errorMessage");
            };
        }
        else
        {
            onError = function(result)
            {
                Firebug.Console.logFormatted([result], context, "error", true);
            };
        }

        origExpr = origExpr || expr;
        var ret = CommandLineExposed.evaluate(context, expr, origExpr, onSuccess, onError);

        if (FBTrace.DBG_COMMANDLINE)
        {
            FBTrace.sysout("commandLine.evaluateInGlobal returned: "+ ret);
        }
    },

    evaluateInDebugFrame: function(expr, context, thisValue, targetWindow,
        successConsoleFunction, exceptionFunction)
    {
        var result = null;

        if (!context.commandLineAPI)
            context.commandLineAPI = new FirebugCommandLineAPI(context);

        var htmlPanel = context.getPanel("html", true);
        var scope = {
            api       : context.commandLineAPI,
            vars      : htmlPanel ? htmlPanel.getInspectorVars() : null,
            thisValue : thisValue
        };

        try
        {
            result = Firebug.Debugger.evaluate(expr, context, scope);

            successConsoleFunction(result, context);
        }
        catch (e)
        {
            exceptionFunction(e, context);
        }

        return result;
    },

    evaluateByPostMessage: function(expr, context, thisValue, targetWindow,
        successConsoleFunction, exceptionFunction)
    {
        var win = targetWindow || context.getCurrentGlobal();

        if (!win)
        {
            if (FBTrace.DBG_ERRORS && FBTrace.DBG_COMMANDLINE)
                FBTrace.sysout("commandLine.evaluateByPostMessage: no targetWindow!");
            return;
        }

        // We're going to use some command-line facilities, but it may not have initialized yet.
        this.initializeCommandLineIfNeeded(context, win);

        expr = expr.toString();

        var consoleHandler = Firebug.Console.injector.getConsoleHandler(context, win);

        if (!consoleHandler)
        {
            FBTrace.sysout("commandLine evaluateByPostMessage no consoleHandler "+
                Win.safeGetWindowLocation(win));
            return;
        }

        if (successConsoleFunction)
        {
            consoleHandler.setEvaluatedCallback( function useConsoleFunction(result)
            {
                var ignoreReturnValue = Console.getDefaultReturnValue(win);
                if (result === ignoreReturnValue)
                    return;

                successConsoleFunction(result, context);
            });
        }

        if (exceptionFunction)
        {
            consoleHandler.evaluateError = function useExceptionFunction(result)
            {
                exceptionFunction(result, context, "errorMessage");
            };
        }
        else
        {
            consoleHandler.evaluateError = function useErrorFunction(result)
            {
                Firebug.Console.logFormatted([result], context, "error", true);
            };
        }

        return win.postMessage(expr, "*");
    },

    evaluateInWebPage: function(expr, context, targetWindow)
    {
        var win = targetWindow || context.getCurrentGlobal();

        var element = Dom.addScript(win.document, "_firebugInWebPage", expr);
        if (!element)
            return;

        setTimeout(function delayRemoveScriptTag()
        {
            // we don't need the script element, result is in DOM object
            if (element.parentNode)
                element.parentNode.removeChild(element);
        });

        return "true";
    },

    // isSandbox(context) true, => context.global is a Sandbox
    evaluateInSandbox: function(expr, context, thisValue, targetWindow, successConsoleFunction,
        exceptionFunction)
    {
        var result,
            scriptToEval = expr;

        try
        {
            result = Components.utils.evalInSandbox(scriptToEval, context.global);

            if (FBTrace.DBG_COMMANDLINE)
                FBTrace.sysout("commandLine.evaluateInSandbox success for sandbox ", scriptToEval);

            successConsoleFunction(result, context);
        }
        catch (e)
        {
            if (FBTrace.DBG_ERRORS && FBTrace.DBG_COMMANDLINE)
                FBTrace.sysout("commandLine.evaluateInSandbox FAILED in "+context.getName()+
                    " because "+e, e);

            exceptionFunction(e, context);

            result = new FirebugReps.ErrorMessageObj("commandLine.evaluateInSandbox FAILED: " + e,
                Url.getDataURLForContent(scriptToEval, "FirebugCommandLineEvaluate"),
                e.lineNumber, 0, "js", context, null);
        }

        return result;
    },

    isSandbox: function (context)
    {
        return (context.global && context.global+"" === "[object Sandbox]");
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    enter: function(context, command)
    {
        var expr = command ? command : this.getExpression(context);
        if (expr === "")
            return;

        var mozJSEnabled = Firebug.Options.getPref("javascript", "enabled");
        if (!mozJSEnabled)
        {
            Firebug.Console.log(Locale.$STR("console.JSDisabledInFirefoxPrefs"), context, "info");
            return;
        }

        if (!Firebug.commandEditor || context.panelName !== "console")
        {
            this.clear(context);
            Firebug.Console.log(commandPrefix + " " + expr, context, "command", FirebugReps.Text);
        }
        else
        {
            var shortExpr = Str.cropString(Str.stripNewLines(expr), 100);
            Firebug.Console.log(commandPrefix + " " + shortExpr, context, "command",
                FirebugReps.Text);
        }

        this.commandHistory.appendToHistory(expr);

        var noscript = getNoScript(), noScriptURI;
        if (noscript)
        {
            var currentURI = Firefox.getCurrentURI();
            noScriptURI = currentURI ? noscript.getSite(currentURI.spec) : null;
            if (noScriptURI)
                noScriptURI = (noscript.jsEnabled || noscript.isJSEnabled(noScriptURI)) ?
                    null : noScriptURI;
        }

        if (noscript && noScriptURI)
            noscript.setJSEnabled(noScriptURI, true);

        var goodOrBad = Obj.bind(Firebug.Console.log, Firebug.Console);
        this.evaluate(expr, context, null, null, goodOrBad, goodOrBad);

        if (noscript && noScriptURI)
            noscript.setJSEnabled(noScriptURI, false);

        var consolePanel = Firebug.currentContext.panelMap.console;
        if (consolePanel)
            Dom.scrollToBottom(consolePanel.panelNode);
    },

    enterInspect: function(context)
    {
        var expr = this.getCommandLine(context).value;
        if (expr === "")
            return;

        this.clear(context);
        this.commandHistory.appendToHistory(expr);

        this.evaluate(expr, context, null, null, function(result)
        {
            if (typeof result !== "undefined")
                Firebug.chrome.select(result);
        });
    },

    reenter: function(context)
    {
        var command = this.commandHistory.getLastCommand();
        this.enter(context, command);
    },

    copyBookmarklet: function(context)
    {
        // XXXsilin: This needs escaping, and stripNewLines is exactly the
        // wrong thing to do when it comes to JavaScript.
        var commandLine = this.getCommandLine(context);
        var expr = "javascript: " + Str.stripNewLines(commandLine.value);
        System.copyToClipboard(expr);
    },

    focus: function(context)
    {
        if (Firebug.isDetached())
            Firebug.chrome.focus();
        else
            Firebug.toggleBar(true);

        var commandLine = this.getCommandLine(context);

        if (!context.panelName)
        {
            Firebug.chrome.selectPanel("console");
        }
        else if (context.panelName !== "console")
        {
            this.Popup.toggle(Firebug.currentContext);
            setTimeout(function() { commandLine.select(); });
        }
        else
        {
            // We are already on the console, if the command line has also
            // the focus, toggle back. But only if the UI has been already
            // opened.
            if (commandLine.getAttribute("focused") !== "true")
                setTimeout(function() { commandLine.select(); });
        }
    },

    clear: function(context)
    {
        var commandLine = this.getCommandLine(context);

        if (commandLine.value)
        {
            commandLine.value = "";
            this.autoCompleter.hide();
            this.update(context);
            return true;
        }

        return false;
    },

    cancel: function(context)
    {
        return this.clear(context);
    },

    update: function(context)
    {
        var commandLine = this.getCommandLine(context);
        context.commandLineText = commandLine.value;
    },

    // xxxsz: setMultiLine should just be called when switching between Command Line
    // and Command Editor
    // xxxHonza: it is called for me when switching between the Command Line and
    // Command Editor 
    setMultiLine: function(multiLine, chrome, saveMultiLine)
    {
        var context = Firebug.currentContext;

        if (FBTrace.DBG_COMMANDLINE)
        {
            FBTrace.sysout("commandLine.setMultiline; multiLine: " + multiLine + " for: " +
                (context ? context.getName() : "no contet"));
        }

        if (context && context.panelName !== "console")
            return;

        Dom.collapse(chrome.$("fbCommandBox"), multiLine);
        Dom.collapse(chrome.$("fbPanelSplitter"), !multiLine);
        Dom.collapse(chrome.$("fbSidePanelDeck"), !multiLine);

        if (multiLine)
            chrome.$("fbSidePanelDeck").selectedPanel = chrome.$("fbCommandEditorBox");

        var commandLine = this.getSingleRowCommandLine();
        var commandEditor = this.getCommandEditor();

        // we are just closing the view
        if (saveMultiLine)
        {
            commandLine.value = commandEditor.value;
            return;
        }

        if (context)
        {
            var text = context.commandLineText || "";
            context.commandLineText = text;

            if (multiLine)
                commandEditor.value = Str.cleanIndentation(text);
            else
                commandLine.value = Str.stripNewLines(text);
        }
        // else we may be hiding a panel while turning Firebug off
    },

    toggleMultiLine: function(forceCommandEditor)
    {
        var showCommandEditor = !!forceCommandEditor || !Firebug.commandEditor;
        if (showCommandEditor != Firebug.commandEditor)
            Firebug.Options.set("commandEditor", showCommandEditor);
    },

    checkOverflow: function(context)
    {
        if (!context)
            return;

        var commandLine = this.getCommandLine(context);
        if (commandLine.value.indexOf("\n") >= 0)
        {
            setTimeout(Obj.bindFixed(function()
            {
                Firebug.Options.set("commandEditor", true);

                // Switch to the Console panel, where the multiline command line
                // is actually displayed. This should be improved see issue 5146
                Firebug.chrome.selectPanel("console");
            }, this));
        }
    },

    onCommandLineOverflow: function(event)
    {
        this.checkOverflow(Firebug.currentContext);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // extends Module

    initialize: function()
    {
        Firebug.Module.initialize.apply(this, arguments);

        this.setAutoCompleter();
        this.commandHistory = new Firebug.CommandHistory();

        if (Firebug.commandEditor)
            this.setMultiLine(true, Firebug.chrome);
    },

    // (Re)create the auto-completer for the small command line.
    setAutoCompleter: function()
    {
        if (this.autoCompleter)
            this.autoCompleter.shutdown();

        var commandLine = this.getSingleRowCommandLine();
        var completionBox = this.getCompletionBox();

        var options = {
            showCompletionPopup: Firebug.Options.get("commandLineShowCompleterPopup"),
            completionPopup: Firebug.chrome.$("fbCommandLineCompletionList"),
            popupMeasurer: Firebug.chrome.$("fbCommandLineMeasurer"),
            tabWarnings: true,
            includeCurrentScope: true
        };

        this.autoCompleter = new Firebug.JSAutoCompleter(commandLine, completionBox, options);
    },

    initializeUI: function()
    {
        this.onCommandLineInput = Obj.bind(this.onCommandLineInput, this);
        this.onCommandLineOverflow = Obj.bind(this.onCommandLineOverflow, this);
        this.onCommandLineKeyUp = Obj.bind(this.onCommandLineKeyUp, this);
        this.onCommandLineKeyDown = Obj.bind(this.onCommandLineKeyDown, this);
        this.onCommandLineKeyPress = Obj.bind(this.onCommandLineKeyPress, this);
        this.attachListeners();
    },

    attachListeners: function()
    {
        var commandLine = this.getSingleRowCommandLine();

        Events.addEventListener(commandLine, "input", this.onCommandLineInput, true);
        Events.addEventListener(commandLine, "overflow", this.onCommandLineOverflow, true);
        Events.addEventListener(commandLine, "keyup", this.onCommandLineKeyUp, true);
        Events.addEventListener(commandLine, "keydown", this.onCommandLineKeyDown, true);
        Events.addEventListener(commandLine, "keypress", this.onCommandLineKeyPress, true);
    },

    shutdown: function()
    {
        var commandLine = this.getSingleRowCommandLine();

        if (this.autoCompleter)
            this.autoCompleter.shutdown();

        if (this.commandHistory)
            this.commandHistory.detachListeners();

        Events.removeEventListener(commandLine, "input", this.onCommandLineInput, true);
        Events.removeEventListener(commandLine, "overflow", this.onCommandLineOverflow, true);
        Events.removeEventListener(commandLine, "keyup", this.onCommandLineKeyUp, true);
        Events.removeEventListener(commandLine, "keydown", this.onCommandLineKeyDown, true);
        Events.removeEventListener(commandLine, "keypress", this.onCommandLineKeyPress, true);
    },

    destroyContext: function(context, persistedState)
    {
        var panelState = Persist.getPersistedState(this, "console");
        panelState.commandLineText = context.commandLineText;

        var commandLine = this.getCommandLine(context);
        commandLine.value = "";

        this.autoCompleter.hide();
        Persist.persistObjects(this, panelState);
        // more of our work is done in the Console

        // All command line handlers should be removed at this moment.
        for (var handler in context.activeCommandLineHandlers)
        {
            FBTrace.sysout("commandLine.destroyContext; ERROR active commandlinehandler for: " +
                context.getName());
        }
    },

    showPanel: function(browser, panel)
    {
        var context = Firebug.currentContext;
        if (!context)
            return;

        // Warn that FireClosure is integrated and will conflict.
        if (Firebug.JSAutoCompleter && Firebug.JSAutoCompleter.transformScopeExpr &&
            !this.hasWarnedAboutFireClosure)
        {
            this.hasWarnedAboutFireClosure = true;
            // Use English because this only reaches ~200 users anyway.
            var msg = "FireClosure has been integrated into Firebug. To avoid conflicts, please uninstall it and restart your browser.";
            Firebug.Console.logFormatted([msg], context, "warn");
        }

        var panelState = Persist.getPersistedState(this, "console");
        if (panelState.commandLineText)
        {
            var value = panelState.commandLineText;
            var commandLine = this.getCommandLine(browser);
            context.commandLineText = value;

            commandLine.value = value;

            // We don't need the persistent value in this session/context any more. The showPanel
            // method is called every time the panel is selected and the text could have been
            // changed in this session/context already.
            delete panelState.commandLineText;
        }

        this.autoCompleter.hide();
    },

    updateOption: function(name, value)
    {
        if (name === "commandEditor")
            this.setMultiLine(value, Firebug.chrome);
        else if (name === "commandLineShowCompleterPopup")
            this.setAutoCompleter();
    },

    // Attach the command line. Currently called by evaluate() et al. and
    // watch onfocus (see chrome.js; probably unnecessary).
    isReadyElsePreparing: function(context, win)
    {
        return true;
        /*if (FBTrace.DBG_COMMANDLINE)
        {
            FBTrace.sysout("commandLine.isReadyElsePreparing " + context.getName() + " win: " +
                (win ? win.location : "not given"), context);
        }

        if (this.isSandbox(context))
            return;

        if (Xml.isXMLPrettyPrint(context, win))
            return false;

        if (win)
        {
            Firebug.CommandLine.injector.attachCommandLine(context, win);
        }
        else
        {
            Firebug.CommandLine.injector.attachCommandLine(context, context.window);
            for (var i=0; i<context.windows.length; i++)
                Firebug.CommandLine.injector.attachCommandLine(context, context.windows[i]);
        }

        var contentView = Wrapper.getContentView(context.window);
        if (!contentView)
        {
            if (FBTrace.DBG_ERRORS)
                FBTrace.sysout("CommandLine ERROR context.window invalid", context.window);
            return false;
        }

        // the attach is asynchronous, we can report when it is complete:
        return contentView._FirebugCommandLine;*/
    },

    onCommandLineKeyUp: function(event)
    {
    },

    onCommandLineKeyDown: function(event)
    {
        var context = Firebug.currentContext;

        this.autoCompleter.handleKeyDown(event, context);

        if (event.keyCode === KeyEvent.DOM_VK_H && Events.isControl(event))
        {
            event.preventDefault();
            this.autoCompleter.hide();
            this.commandHistory.show(Firebug.chrome.$("fbCommandLineHistoryButton"));
            return true;
        }

        // Parts of the code moved into key-press handler due to bug 613752
    },

    onCommandLineKeyPress: function(event)
    {
        var context = Firebug.currentContext;

        if (!this.autoCompleter.handleKeyPress(event, context))
        {
            this.handleKeyPress(event);
        }
    },

    handleKeyPress: function(event)
    {
        switch (event.keyCode)
        {
            case KeyEvent.DOM_VK_RETURN:
            case KeyEvent.DOM_VK_ENTER:
                event.preventDefault();

                if (!event.metaKey && !event.shiftKey)
                {
                    Firebug.CommandLine.enter(Firebug.currentContext);
                    this.commandHistory.hide();
                    return true;
                }
                else if(!event.metaKey && event.shiftKey)
                {
                    Firebug.CommandLine.enterInspect(Firebug.currentContext);
                    this.commandHistory.hide();
                    return true;
                }
                break;

            case KeyEvent.DOM_VK_UP:
                event.preventDefault();
                this.commandHistory.cycleCommands(Firebug.currentContext, -1);
                return true;

            case KeyEvent.DOM_VK_DOWN:
                event.preventDefault();
                this.commandHistory.cycleCommands(Firebug.currentContext, 1);
                return true;

            case KeyEvent.DOM_VK_ESCAPE:
                event.preventDefault();
                if (Firebug.CommandLine.cancel(Firebug.currentContext))
                    Events.cancelEvent(event);
                this.commandHistory.hide();
                return true;
        }

        if (this.commandHistory.isOpen && !event.metaKey && !event.ctrlKey && !event.altKey)
            this.commandHistory.hide();

        return false;
    },

    onCommandLineInput: function(event)
    {
        var context = Firebug.currentContext;

        this.autoCompleter.complete(context);
        this.update(context);
    },

    /*isAttached: function(context, win)
    {
        if (!context)
            return false;

        return Firebug.CommandLine.injector.isAttached(win ? win : context.window);
    },*/

    onPanelEnable: function(panelName)
    {
        Dom.collapse(Firebug.chrome.$("fbCommandBox"), true);
        Dom.collapse(Firebug.chrome.$("fbPanelSplitter"), true);
        Dom.collapse(Firebug.chrome.$("fbSidePanelDeck"), true);

        this.setMultiLine(Firebug.commandEditor, Firebug.chrome);
    },

    onPanelDisable: function(panelName)
    {
        if (panelName !== "console")  // we don't care about other panels
            return;

        Dom.collapse(Firebug.chrome.$("fbCommandBox"), true);
        Dom.collapse(Firebug.chrome.$("fbPanelSplitter"), true);
        Dom.collapse(Firebug.chrome.$("fbSidePanelDeck"), true);
    },

    getCommandLine: function(context)
    {
        return (!this.isInOtherPanel(context) && Firebug.commandEditor) ? 
                this.getCommandEditor():
                this.getSingleRowCommandLine();
    },

    isInOtherPanel: function(context)
    {
        // Command line on other panels is never multiline.
        var visible = Firebug.CommandLine.Popup.isVisible();
        return visible && context.panelName !== "console";
    },

    getExpression: function(context)
    {
        return (!this.isInOtherPanel(context) && Firebug.commandEditor) ? 
                this.getCommandEditor().getExpression() :
                this.getSingleRowCommandLine().value;
    },

    getCompletionBox: function()
    {
        return Firebug.chrome.$("fbCommandLineCompletion");
    },

    getSingleRowCommandLine: function()
    {
        return Firebug.chrome.$("fbCommandLine");
    },

    getCommandEditor: function()
    {
        return Firebug.CommandEditor;
    }
});

// ********************************************************************************************* //
// Shared Helpers

// xxxFlorent: looks like this can be commented, but first adapt console/consoleInjector.js
Firebug.CommandLine.CommandHandler = Obj.extend(Object,
{
    handle: function(event, api, win)
    {
        var methodName = Dom.getMappedData(win.document, "firebug-methodName");

        // We create this array in the page using JS, so we need to look on the
        // wrappedJSObject for it.
        var contentView = Wrapper.getContentView(win), hosed_userObjects;
        if (contentView)
            hosed_userObjects = contentView._FirebugCommandLine.userObjects;

        var userObjects = hosed_userObjects ? Arr.cloneArray(hosed_userObjects) : [];

        if (FBTrace.DBG_COMMANDLINE)
            FBTrace.sysout("commandLine.CommandHandler for " + Win.getWindowId(win) +
                ": method " + methodName + " userObjects:",  userObjects);

        var subHandler = api[methodName];
        if (!subHandler)
            return false;

        Dom.deleteMappedData(win.document, "firebug-retValueType");
        var result = subHandler.apply(api, userObjects);
        if (typeof result !== "undefined")
        {
            if (result instanceof window.Array)
            {
                Dom.setMappedData(win.document, "firebug-retValueType", "array");
                for (var item in result)
                    hosed_userObjects.push(result[item]);
            }
            else
            {
                hosed_userObjects.push(result);
            }
        }

        return true;
    }
});


// ********************************************************************************************* //
// CommandLine Injector

/*Firebug.CommandLine.injector =
{
    isAttached: function(win)
    {
        var contentView = Wrapper.getContentView(win);
        return contentView._FirebugCommandLine ? true : false;
    },

    attachCommandLine: function(context, win)
    {
        win = win ? win : context.window;
        if (win instanceof win.Window)
        {
            // If the command line is already attached then end.
            if (this.isAttached(win))
                return;

            var contentView = Wrapper.getContentView(win);
            contentView._FirebugCommandLine =
                Firebug.CommandLineExposed.createFirebugCommandLine(context, win);

            this.addCommandLineListener(context, win);
        }
        else if (Firebug.CommandLine.isSandbox(context))
        {
            if (FBTrace.DBG_COMMANDLINE)
            {
                FBTrace.sysout("commandLine.injector context.global " + context.global,
                    context.global);
            }
        }
        else
        {
            if (FBTrace.DBG_COMMANDLINE)
            {
                FBTrace.sysout("commandLine.injector, win: " + win +
                    " not a Window or Sandbox", win);
            }
        }
    },

    detachCommandLine: function(context, win)
    {
        win = win ? win : context.window;
        if (this.isAttached(win))
        {
            var contentView = Wrapper.getContentView(win);
            CommandLineExposed.detachCommandLine(contentView);

            this.removeCommandLineListener(context, win);
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Listener

    addCommandLineListener: function(context, win)
    {
        // Register listener for command-line execution events.
        var handler = new CommandLineHandler(context, win);
        var boundHandler = Obj.bind(handler.handleEvent, handler);

        if (!context.activeCommandLineHandlers)
            context.activeCommandLineHandlers = {};

        var consoleHandler = Firebug.Console.injector.getConsoleHandler(context, win);
        if (!consoleHandler)
        {
            if (FBTrace.DBG_ERRORS || FBTrace.DBG_COMMANDLINE)
                FBTrace.sysout("commandLine.addCommandLineListener; No console handler! " +
                    " Command line listener can't be created." +  context.getName());
            return;
        }

        context.activeCommandLineHandlers[consoleHandler.token] = boundHandler;

        Events.addEventListener(win.document, "firebugExecuteCommand", boundHandler, true);

        if (FBTrace.DBG_COMMANDLINE)
        {
            FBTrace.sysout("commandLine.addCommandLineListener to document in window" +
                win.location + " with console ");
        }
    },

    removeCommandLineListener: function(context, win)
    {
        var boundHandler = this.getCommandLineListener(context, win);
        if (boundHandler)
        {
            Events.removeEventListener(win.document, "firebugExecuteCommand", boundHandler, true);

            var consoleHandler = Firebug.Console.injector.getConsoleHandler(context, win);
            delete context.activeCommandLineHandlers[consoleHandler.token];

            if (FBTrace.DBG_COMMANDLINE)
            {
                FBTrace.sysout("commandLine.detachCommandLineListener " + boundHandler +
                    " in window with console " + win.location);
            }
        }
        else
        {
            if (FBTrace.DBG_ERRORS || FBTrace.DBG_COMMANDLINE)
            {
                FBTrace.sysout("commandLine.removeCommandLineListener; ERROR no handler! " +
                    "This could cause memory leaks, please report an issue if you see this. " +
                    context.getName());
            }
        }
    },

    getCommandLineListener: function(context, win)
    {
        if (context.activeCommandLineHandlers)
        {
            var consoleHandler = Firebug.Console.injector.getConsoleHandler(context, win);
            if (consoleHandler)
                return context.activeCommandLineHandlers[consoleHandler.token];

            if (FBTrace.DBG_CONSOLE)
            {
                FBTrace.sysout("getCommandLineListener no consoleHandler for " +
                    context.getName() + " win " + Win.safeGetWindowLocation(win));
            }
        }
    },
};*/

// ********************************************************************************************* //
// CommandLine Handler

/**
 * This object is responsible for handling commands executing in the page context.
 * When a command (CMD API) is being executed, the page sends a DOM event that is
 * handled by 'handleEvent' method.
 *
 * @param {Object} context
 * @param {Object} win is the window the handler is bound into
 */
/*function CommandLineHandler(context, win)
{
    this.handleEvent = function(event)
    {
        context.baseWindow = context.baseWindow || context.window;
        this.api = new FirebugCommandLineAPI(context);

        if (FBTrace.DBG_COMMANDLINE)
        {
            FBTrace.sysout("commandLine.handleEvent() " +
                (win && Dom.getMappedData(win.document, "firebug-methodName")) +
                " window: " + Win.safeGetWindowLocation(win), {win: win, ev: event});
        }

        // Appends variables into the api.
        var htmlPanel = context.getPanel("html", true);
        var vars = htmlPanel ? htmlPanel.getInspectorVars() : null;

        function createHandler(p)
        {
            return function()
            {
                if (FBTrace.DBG_COMMANDLINE)
                    FBTrace.sysout("commandLine.getInspectorHistory: " + p, vars);

                return Wrapper.unwrapObject(vars[p]);
            };
        }
        for (var prop in vars)
        {
            // XXXjjb should these be removed?
            this.api[prop] = createHandler(prop);
        }

        if (!Firebug.CommandLine.CommandHandler.handle(event, this.api, win))
        {
            var methodName = Dom.getMappedData(win.document, "firebug-methodName");
            Firebug.Console.log(Locale.$STRF("commandline.MethodNotSupported", [methodName]));
        }
    };
}*/

var getNoScript = function()
{
    // The wrappedJSObject here is not a security wrapper, it is a property set by the service.
    var noscript = Cc["@maone.net/noscript-service;1"] &&
        Cc["@maone.net/noscript-service;1"].getService().wrappedJSObject;
    getNoScript = function()
    {
        return noscript;
    };
    return noscript;
};


// ********************************************************************************************* //
// Registration

Firebug.registerModule(Firebug.CommandLine);

return Firebug.CommandLine;

// ********************************************************************************************* //
});
