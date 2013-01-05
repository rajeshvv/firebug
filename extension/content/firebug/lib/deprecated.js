/* See license.txt for terms of usage */

define([
    "firebug/lib/trace"
],
function(FBTrace) {
"use strict";

// ********************************************************************************************* //
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

var consoleService = Cc["@mozilla.org/consoleservice;1"].getService(Ci["nsIConsoleService"]);

var naggedCache = new WeakMap();

// ********************************************************************************************* //
// Module implementation

/**
 * @name Deprecated
 * @lib Utility to warn and manage deprecations
 */
var Deprecated = {};

/**
 * Wraps a function to display a deprecation warning message
 * each time that function is called.
 *
 * @param {string} msg The message to display
 * @param {function} fnc The function to wrap
 * @param {Array or Array-like Object} [args] The arguments to pass to the wrapped function
 *
 * @returns {function} The wrapped function
 */
Deprecated.deprecated = function(msg, fnc, args)
{
    return function deprecationWrapper()
    {
        if (!naggedCache.has(fnc))
        {
            log(msg, Components.stack.caller);

            naggedCache.set(fnc, true);
        }

        return fnc.apply(this, args || arguments);
    }
};

/**
 * displays a message for deprecation
 *
 * @param {String} msg The message to display
 */
Deprecated.log = function(msg)
{
    return log(msg, Components.stack.caller);
}

// xxxFlorent: might have to be improved. Don't hesitate to tell what you think about it
/**
 * define and marks a property as deprecated. The defined property is read-only.
 *
 * @param {object} obj The object for  which we define the new property
 * @param {string} propName The name of the property
 * @param {string} msg The deprecation message
 * @param {*} value The value returned when accessing the property
 *
 */
Deprecated.deprecatedROProp = function(obj, propName, msg, value)
{
    var descriptor = {
        get: Deprecated.deprecated(msg, function(){ return value; }),
    };

    Object.defineProperty(obj, propName, descriptor);
};


// ********************************************************************************************* //
// Local helpers

function log(msg, caller)
{
    var explain = "Deprecated function, " + msg;

    if (FBTrace)
        FBTrace.sysout(explain, getStackDump(caller));

    if (consoleService)
        consoleService.logStringMessage(explain + " " + caller.toString());
}

function getStackDump(startFrame)
{
    var lines = [];

    for (var frame = startFrame; frame; frame = frame.caller)
        lines.push(frame.filename + " (" + frame.lineNumber + ")");

    return lines.join("\n");
};

// ********************************************************************************************* //
// Registration

return Deprecated;

// ********************************************************************************************* //
});
