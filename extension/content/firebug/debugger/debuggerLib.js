/* See license.txt for terms of usage */

define([
    "firebug/lib/dom"
],
function(Dom) {
"use strict";
// ********************************************************************************************* //
// Constants

var Cu = Components.utils;
var dglobalWeakMap = new WeakMap();
var debuggerSingleton = null;

var DebuggerLib = {};

/**
 * Unwraps the value of a debuggee object.
 *
 * @param obj {Debugger.Object} The debuggee object to unwrap
 * @param global {Window} The unwrapped global (window)
 * @param dglobal {Debugger.Object} The debuggee global object
 *
 * @return {object} the unwrapped object
 */
DebuggerLib.unwrapDebuggeeValue = function(obj, global, dglobal)
{
    // If not a debuggee object, return it immediately.
    if (typeof obj !== "object")
        return obj;

    // Define a new property to get the debuggee value.
    dglobal.defineProperty("_firebugUnwrappedDebuggerObject", {
        value: obj,
        writable: true,
        configurable: true
    });

    // Get the debuggee value using the property through the unwrapped global object.
    return global._firebugUnwrappedDebuggerObject;
};

/**
 * Gets or creates the Inactive Debugger instance for the given context (singleton).
 *
 * @param context {*}
 *
 * @return {Debugger} The Debugger instance
 */
DebuggerLib.getInactiveDebuggerForContext = function(context)
{
    var DebuggerClass;
    var scope = {};

    if (context.inactiveDebugger)
        return context.inactiveDebugger;

    try
    {
        Cu.import("resource://gre/modules/jsdebugger.jsm", scope);
        scope.addDebuggerToGlobal(window);
        DebuggerClass = window.Debugger;
    }
    catch (exc)
    {
        if (FBTrace.DBG_ERROR)
            FBTrace.sysout("DebuggerLib.getInactiveDebuggerForContext; Debugger not found", exc);
    }
    finally
    {
        delete window.Debugger;
    }

    // If the Debugger Class was not found, make this function no-op.
    if (!DebuggerClass)
        DebuggerLib.getInactiveDebuggerForContext = function() {};

    var dbg = new DebuggerClass();
    dbg.enabled = false;
    context.inactiveDebugger = dbg;
    return dbg;
};

/**
 * Gets or creates the debuggee global for the given global object
 *
 * @param {Window} global The global object
 * @param {*} context The Firebug context
 *
 * @return {Debuggee Window} The debuggee global
 */
DebuggerLib.getDebuggeeGlobal = function(global, context)
{
    var dglobal_key = "dglobal";
    var dbg;
    var dglobal = dglobalWeakMap.get(global);
    if (!dglobal)
    {
        dbg = DebuggerLib.getInactiveDebuggerForContext(context);
        if (!dbg)
            return;

        dglobal = dbg.addDebuggee(global);
        dbg.removeDebuggee(global);
        dglobalWeakMap.set(global, dglobal);
    }
    return dglobal;
};


// ********************************************************************************************* //

return DebuggerLib;

// ********************************************************************************************* //


});
