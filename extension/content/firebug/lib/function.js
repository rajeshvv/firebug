/* See license.txt for terms of usage */

define([
    "firebug/lib/trace",
],
function(FBTrace) {
"use strict";
/**
 * @util Utility for Functions
 */

// ********************************************************************************************* //
// Constants

var Func = {};
/** @lends Func */

// ********************************************************************************************* //


/**
 * Creates a new function that, when called, uses the provided `this` value and appends the provided
 * arguments. Note that it differs from Function.prototype.bind which prepends the provided 
 * arguments (that is why this function is called bindRight).
 *
 * @param {Function} fn the function to bind
 * @param {?} thisObject the object to pass as the `this` value
 * @param {?} ...args the series of parameters to pass to the new function
 *
 * @return {Function} the new function
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
 * Creates a new function that, when called, uses the provided `this` value and arguments.
 * At the contrary of `Function.prototype.bind`, any parameter provided at the call is ignored.
 *
 * @param {Function} fn the function to bind
 * @param {?} thisObject the object to pass as the `this` value
 * @param {?} ...args the series of parameters to pass to the new function
 *
 * @return {Function} the new Function
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
