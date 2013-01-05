/* See license.txt for terms of usage */

define([
    "firebug/lib/trace",
],
function(FBTrace) {
"use strict";

// ********************************************************************************************* //
// Constants

/**
 * @name Func
 * @lib Utility for Functions
 */
var Func = {};

// ********************************************************************************************* //


/**
 * Creates a new function that, when called, uses the provided <code>this</code> value 
 * and appends the provided arguments. Note that it differs from Function.prototype.bind which 
 * prepends the provided arguments (that is why this function is called bindRight).
 *
 * @param {function} fn The function to bind
 * @param {*} thisObject The object to pass as the <code>this</code> value
 * @param {*} ...args the series of parameters to pass to the new function
 *
 * @return {function} the new function
 */
Func.bindRight = function(fn, thisObject/*, ...origArgs*/)
{
    var origArgs = Array.prototype.slice.call(arguments, 2);
    return function(/*...additionalArgs*/)
    {
        var additionalArgs = Array.prototype.slice.call(arguments);
        return fn.apply(thisObject, additionalArgs.concat(origArgs));
    };
}

// xxxFlorent: TODO: [REST]
/**
 * Creates a new function that, when called, uses the provided <code>this</code> value and arguments.
 * At the contrary of <code>Function.prototype.bind</code>, any parameter provided at the call is
 * ignored.
 *
 * @param {function} fn The function to bind
 * @param {*} thisObject The object to pass as the `this` value
 * @param {*} ...args the series of parameters to pass to the new function
 *
 * @return {function} the new Function
 */
Func.bindFixed = function(fn, thisObject/*, ...args*/)
{
    var args = Array.prototype.slice.call(arguments, 2);
    return function() { return fn.apply(thisObject, args); };
}


// ********************************************************************************************* //

Object.freeze(Func);
Object.seal(Func);

return Func;

// ********************************************************************************************* //
});
