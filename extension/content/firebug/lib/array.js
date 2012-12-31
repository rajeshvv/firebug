/* See license.txt for terms of usage */

define([
    "firebug/lib/trace",
    "firebug/lib/deprecated",
],
function(FBTrace, Deprecated) {
"use strict";
/**
 * @util Utility for Arrays
 */

// ********************************************************************************************* //
// Constants

const Ci = Components.interfaces;

var Arr = {};
/** @lends Firebug.Arr */

// Array Generic methods
// use them to call Array methods with Array-Like objects (arguments, String, NodeList...)
// example: var firstArg = Array.forEach(nodeList, func);
//
// 1. xxxFlorent: should be deprecated as soon Array generics are standardized in ES5 or ES6
// 2. xxxFlorent: BTW, can we consider Array generic methods as safe to be used?? What would happen if it is eventually abandoned?
var ArrayGen = {};
(function()
{
    var methods = [
        'join', 'reverse', 'sort', 'push', 'pop', 'shift', 'unshift',
        'splice', 'concat', 'slice', 'indexOf', 'lastIndexOf',
        'forEach', 'map', 'reduce', 'reduceRight', 'filter',
        'some', 'every'
    ];

    methods.forEach(function(methodName)
    {
        // xxxFlorent: TODO: [REST]
        ArrayGen[methodName] = function(thisObj/*, ...args*/)
        {
            var args = Array.prototype.slice.call(arguments, 1);
            return Array.prototype[methodName].apply(thisObj, args);
        };
    });
})();

Object.seal(ArrayGen);
Object.freeze(ArrayGen);

Arr.ArrayGen = ArrayGen;

// ********************************************************************************************* //
// Arrays

Arr.isArray = Deprecated.deprecated("Use Array.isArray instead", Array.isArray);
/**
 * Return true if the given object is an Array or an Array-Like object
 *
 * @param obj {?} the object
 * @return true if it is an array-like object or false otherwise
 */
Arr.isArrayLike = function(obj)
{
    try
    {
        if (typeof obj !== "object")
            return false;
        if (!isFinite(obj.length))
            return false;
        if (Array.isArray(obj))
            return true;
        if (typeof obj.callee === "function") // arguments
            return true;
        if (typeof obj.splice === "function") // jQuery etc.
            return true;
        if (obj instanceof Ci.nsIDOMHTMLCollection)
            return true;
        if (obj instanceof Ci.nsIDOMNodeList)
            return true;
        if (obj instanceof Ci.nsIDOMDOMTokenList)
            return true;
    }
    catch (exc) {}
    return false;
};

/**
 * @deprecated Use Object.keys instead
 * see https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/keys
 */
Arr.keys = Deprecated.deprecated("Use Object.keys instead", function(map)
{
    var keys = [];
    try
    {
        for (var name in map)  // enumeration is safe
            keys.push(name);   // name is string, safe
    }
    catch (exc)
    {
        // Sometimes we get exceptions trying to iterate properties
    }

    return keys;  // return is safe
});

/**
 * Returns the values of an object
 *
 * @param map {?} the object
 *
 * @return {Array} the values
 */
Arr.values = function(map)
{
    var values = [];
    try
    {
        for (var name in map)
        {
            try
            {
                values.push(map[name]);
            }
            catch (exc)
            {
                // Sometimes we get exceptions trying to access properties
                if (FBTrace.DBG_ERRORS)
                    FBTrace.dumpPropreties("lib.values FAILED ", exc);
            }
        }
    }
    catch (exc)
    {
        // Sometimes we get exceptions trying to iterate properties
        if (FBTrace.DBG_ERRORS)
            FBTrace.dumpPropreties("lib.values FAILED ", exc);
    }

    return values;
};

/**
 * Removes an item from an array or an array-like object
 *
 * @param list {Array or Array-Like object} the array
 * @param item {?} the item to remove from the object
 *
 * @return true if an item as been removed, false otherwise
 */
Arr.remove = function(list, item)
{
    var index = ArrayGen.indexOf(list, item);
    if (index >= 0)
    {
        ArrayGen.splice(list, index, 1);
        return true;
    }
    return false;
};
/**
 * Same as Arr.remove but removes all the occurences of item
 *
 * @param list {Array or Array-Like object} the array
 * @param item {?} the item to remove from the object
 *
 * @return true if an item as been removed, false otherwise
 */
Arr.removeAll = function(list, item)
{
    var iter = 0;

    while (Arr.remove(list, item))
        iter++;

    return (iter > 0);
}

Arr.sliceArray = Deprecated.deprecated("use Array.prototype.slice or Array.slice instead",
function(array, index)
{
    var slice = [];
    for (var i = index; i < array.length; ++i)
        slice.push(array[i]);

    return slice;
});

/**
 * @deprecated Use either Array.slice(array) or Array.map(array, fn) instead. 
 * see https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Array
 *
 * Clone an array. If a function is given as second parameter, the function is called for each
 * elements of the passed array and the results are put in the new one.
 *
 * @param array {Array or Array-Like object} the array
 * @param fn {Function} the function (optional)
 *
 */
Arr.cloneArray = Deprecated.deprecated("use either Array.slice or Array.map instead",
function(array, fn)
{
    if (fn)
        return ArrayGen.map(array, fn);
    else
        return ArrayGen.slice(array);
});

/**
 * @deprecated Use Array.concat(array, array2) or array.concat(array2) instead
 */
Arr.extendArray = Deprecated.deprecated("use Array.prototype.concat or Array.concat instead",
function(array, array2)
{
   return array.concat(array2);
});

/**
 * insert elements at a specific index
 * NOTE: that method modifies the array passed as the first parameter
 *
 * @param array {Array or Array-Like object} the array in which we insert elements
 * @param index {Integer} the index
 * @param other {Array or Array-Like object} the elements to insert
 *
 * @return the updated array
 */
Arr.arrayInsert = function(array, index, other)
{
    var splice = ArrayGen.splice.bind(Array, array, index, 0);
    splice.apply(null, other);
    return array;
}

/**
 * Filter out unique values of an array, saving only the first occurrence of
 * every value. In case the array is sorted, a faster path is taken.
 *
 * @param {Array or Array-Like object} ar the array
 * @param {Boolean} if set to true, use the faster path
 *
 * @return {Array} the array deprived of duplication
 */
Arr.unique = function(ar, sorted)
{
    var ret = [], len = ar.length;
    if (sorted)
    {
        for (var i = 0; i < len; ++i)
        {
            // Skip duplicated entries
            if (i && ar[i-1] === ar[i])
                continue;
            ret.push(ar[i]);
        }
    }
    else
    {
        // Keep a map whose ","-prefixed keys represent the values that have
        // occurred so far in the array (this avoids overwriting e.g. __proto__).
        var map = {};
        for (var i = 0; i < len; ++i)
        {
            if (!map.hasOwnProperty("," + ar[i]))
            {
                ret.push(ar[i]);
                map["," + ar[i]] = 1;
            }
        }
    }
    return ret;
};

/**
 * Sort an array and eliminate duplicates from it.
 *
 * @param {Array or Array-Like object} ar the array
 * @param {Function} sortFunc the function used to sort the array (optional)
 *
 * @return {Array} the sorted array
 */
Arr.sortUnique = function(ar, sortFunc)
{
    // make a clone of the array so the original one is preserved
    var arCopy = ArrayGen.slice(ar);
    return Arr.unique(arCopy.sort(sortFunc), true);
};

/**
 * @deprecated use Arr.sortUnique and/or Array.prototype.concat instead
 * Merge together two arrays, sort the result, and eliminate any duplicates.
 * Deprecated.
 */
Arr.merge = Deprecated.deprecated("use Arr.sortUnique and/or Array.prototype.concat instead",
function(arr1, arr2, sortFunc)
{
    return Arr.sortUnique(arr1.concat(arr2), sortFunc);
});

// ********************************************************************************************* //

return Arr;

// ********************************************************************************************* //
});
