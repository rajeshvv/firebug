/* See license.txt for terms of usage */

define([
    "firebug/lib/trace",
    "firebug/lib/string",
    "firebug/lib/deprecated",
    "firebug/lib/function",
],
function(FBTrace, Str, Deprecated, Func) {
"use strict";
// xxxFlorent: TODO add that specific tag in jsdoc...

// ********************************************************************************************* //
// Constants

var Cu = Components.utils;

/**
 * @name Obj
 * @lib Utility for objects
 */
var Obj = {};

// ********************************************************************************************* //

// xxxFlorent: TODO: [REST]

Obj.bind = Deprecated.deprecated("Use either (depending on the case): Func.bindRight, "+
"Func.bindFixed or Function.prototype.bind instead", Func.bindRight);

Obj.bindFixed = Deprecated.deprecated("Please, use Func.bindFixed instead now", Func.bindFixed);

// xxxFlorent: [ES6-REST]
/**
 * Clones and extend the object (first parameters) with other objects (following parameters).
 *
 * @param {Object} parentObject The object to clone and extend
 * @param {Object} ...extensions the extensions
 *
 * @example
 * var parentObj = {foo: "foo" };
 * var newObj = Obj.extend(parentObj, {bar: "bar"}); // => {foo: "foo", bar: "bar"}
 */
Obj.extend = function(parentObject/*, ...extensions*/)
{
    if (arguments.length < 2)
    {
        FBTrace.sysout("object.extend; ERROR", arguments);
        throw new Error("Obj.extend on undefined object");
    }

    var extensions = Array.prototype.slice.call(arguments, 1);
    var newOb = Object.create(parentObject);

    extensions.forEach(function(extension)
    {
        for (var prop in extension)
        {
            // xxxFlorent: TODO copy also getters/setters
            // any clue ? (use getOwnPropertyDescriptor?)
            newOb[prop] = extension[prop];
        }
    });

    return newOb;
};

/**
 * Creates a new instance inheriting from a parent "class".
 * That class is then extended with child properties.
 *
 * @param {Object} protototypeParent The parent "class" prototype
 * @param {Object} childProperties The properties extending the new object
 *
 * @return {Object} the new object
 */
Obj.descend = function(prototypeParent, childProperties)
{
    function protoSetter() {};
    protoSetter.prototype = prototypeParent;
    var newOb = new protoSetter();
    for (var n in childProperties)
        newOb[n] = childProperties[n];
    return newOb;
};

// ************************************************************************************************

/**
 * Returns true if the passed object has any properties, otherwise returns false.
 *
 * @param {Object} ob Inspected object
 * @param {Object} nonEnumProps If set to true, check also non-enumerable properties (optional)
 * @param {Object} ownPropsOnly If set to true, only check own properties not inherited (optional)
 */
Obj.hasProperties = function(ob, nonEnumProps, ownPropsOnly)
{
    try
    {
        if (!ob)
            return false;

        try
        {
            // This is probably unnecessary in Firefox 19 or so.
            if ("toString" in ob && ob.toString() === "[xpconnect wrapped native prototype]")
                return true;
        }
        catch (exc) {}

        // The default case (both options false) is relatively simple.
        // Just use for..in loop.
        if (!nonEnumProps && !ownPropsOnly)
        {
            for (var name in ob)
                return true;
            return false;
        }

        var type = typeof(ob);
        if (type == "string" && ob.length)
            return true;

        if (type === "number" || type === "boolean" || type === "undefined" || ob === null)
            return false;

        if (nonEnumProps)
            props = Object.getOwnPropertyNames(ob);
        else
            props = Object.keys(ob);

        if (props.length)
            return true;

        // Not interested in inherited properties, bail out.
        if (ownPropsOnly)
            return false;

        // Climb prototype chain.
        var parent = Object.getPrototypeOf(ob);
        if (parent)
            return this.hasProperties(parent, nonEnumProps, ownPropsOnly);
    }
    catch (exc)
    {
        // Primitive (non string) objects will throw an exception when passed into
        // Object.keys or Object.getOwnPropertyNames APIs.
        // There are also many "security error" exceptions I guess none of which are really
        // necessary to display in the FBTrace console, so, remove the tracing for now.
        // if (FBTrace.DBG_ERRORS)
        //     FBTrace.sysout("lib.hasProperties(" + Str.safeToString(ob) + ") ERROR " + exc, exc);

        // workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=648560
        if (ob.wrappedJSObject)
            return true;
    }

    return false;
};

/**
 * Returns the prototype of an object, or null if the function fails to do so.
 *
 * @deprecated use <code>myObj.prototype</code> instead (plus clever checks before)
 */
Obj.getPrototype = Deprecated.deprecated("use myObj.prototype instead (+ clever checks before)",
function(ob)
{
    try
    {
        return ob.prototype;
    } catch (exc) {}
    return null;
});

/**
 * Returns a unique ID (random integer between 0 and 65536)
 *
 * @return {Number} the random number
 */
Obj.getUniqueId = function()
{
    return this.getRandomInt(0,65536);
};

/**
 * Returns a random integer between min and max
 *
 * @param {Number} min The minimum
 * @param {Number} max The maximum
 *
 * @return {Number} the random number
 */
Obj.getRandomInt = function(min, max)
{
    return Math.floor(Math.random() * (max - min + 1) + min);
};

// xxxFlorent: not sure it is true... But I couldn't find any case where `instanceof` 
//             didn't work correctly cross-window
/**
 * Cross Window instanceof
 *
 * @param {Object} obj The object to test
 * @param {*} type The type (local to this window)
 *
 * @returns {Boolean} true if the test succeeded, false otherwise
 *
 * @deprecated use <code>instanceof</code> instead
 */
Obj.XW_instanceof = Deprecated.deprecated("use `instanceof` instead", function(obj, type)
{
    if (obj instanceof type)
        return true;  // within-window test

    if (!type)
        return false;

    if (!obj)
        return (type == "undefined");

    // compare strings: obj constructor.name to type.name.
    // This is not perfect, we should compare type.prototype to object.__proto__,
    // but mostly code does not change the constructor object.
    do
    {
        // then the function that constructed us is the argument
        if (obj.constructor && obj.constructor.name == type.name)
            return true;
    }
    while(obj = obj.__proto__);  // walk the prototype chain.

    return false;

    // https://developer.mozilla.org/en/Core_JavaScript_1.5_Guide/Property_Inheritance_Revisited
    // /Determining_Instance_Relationships
});

/**
 * Tells if the given property of the provided object is a non-native getter or not.
 * This method depends on PropertyPanel.jsm module available in Firefox 5+
 * isNonNativeGetter has been introduced in Firefox 7
 * The method has been moved to WebConsoleUtils.jsm in Fx 18
 *
 * @param {object} obj The object that contains the property.
 * @param {string} propName The property you want to check if it is a getter or not.
 * @return {boolean} True if the given property is a getter, false otherwise.
 */
Obj.isNonNativeGetter = function(obj, propName)
{
    try
    {
        var scope = {};
        Cu.import("resource://gre/modules/devtools/WebConsoleUtils.jsm", scope);

        if (scope.WebConsoleUtils.isNonNativeGetter)
        {
            Obj.isNonNativeGetter = function(obj, propName)
            {
                return scope.WebConsoleUtils.isNonNativeGetter(obj, propName);
            };

            return Obj.isNonNativeGetter(obj, propName);
        }
    }
    catch (err)
    {
        if (FBTrace.DBG_ERRORS)
            FBTrace.sysout("Obj.isNonNativeGetter; EXCEPTION " + err, err);
    }

    // OK, the method isn't available let's use an empty implementation
    Obj.isNonNativeGetter = function()
    {
        if (FBTrace.DBG_ERRORS)
            FBTrace.sysout("Obj.isNonNativeGetter; ERROR built-in method not found!");
        return true;
    };

    return true;
};

// ********************************************************************************************* //

return Obj;

// ********************************************************************************************* //
});
