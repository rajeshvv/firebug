/* See license.txt for terms of usage */

define([
    "firebug/lib/object",
    "firebug/lib/xpcom",
    "firebug/lib/locale",
    "firebug/lib/events",
    "firebug/lib/options",
    "firebug/lib/deprecated",
    "firebug/lib/wrapper",
    "firebug/lib/url",
    "firebug/js/sourceLink",
    "firebug/js/stackFrame",
    "firebug/lib/css",
    "firebug/lib/dom",
    "firebug/lib/http",
    "firebug/chrome/window",
    "firebug/lib/search",
    "firebug/lib/xpath",
    "firebug/lib/string",
    "firebug/lib/xml",
    "firebug/lib/persist",
    "firebug/lib/array",
    "firebug/lib/system",
    "firebug/lib/json",
    "firebug/lib/fonts",
    "firebug/chrome/menu",
    "firebug/dom/toggleBranch",
    "firebug/trace/debug",
    "firebug/lib/keywords",
    "firebug/chrome/firefox"
],
function(Obj, Xpcom, Locale, Events, Options, Deprecated, Wrapper, Url, SourceLink,
    StackFrame, Css, Dom, Http, Win, Search, Xpath, Str, Xml, Persist, Arr, System, Json,
    Fonts, Menu, ToggleBranch, Debug, Keywords, Firefox) {
// xxxFlorent: Check with  JSHint
"use strict";
// ********************************************************************************************* //

var FBL = window.FBL || {};  // legacy.js adds top.FBL, FIXME, remove after iframe version 

// ********************************************************************************************* //
// xxxHonza: all deprecated API should be removed from 1.9+
// All properties and methods of FBL namespace are deprecated.

// Backward compatibility with extensions
// deprecated

// xxxFlorent: add a page in the wiki explaining how to use AMD in Firebug-related projects
const deprecationMessage = "Don't use FBL anymore. Please, use AMD instead";

var libs = [Obj, Xpcom, Locale, Events, Wrapper, Url, StackFrame, Css, Dom, Http, Win, Search,
Xpath, Str, Xml, Persist, Arr, System, Json, Fonts, Menu, ToggleBranch, Debug, Keywords, Firefox, 
Deprecated];

libs.forEach(function(lib)
{
    for (var p in lib)
        FBL[p] = Deprecated.deprecated(deprecationMessage, lib[p]);
});

Deprecated.deprecatedROProp(FBL, "SourceLink", deprecationMessage, SourceLink.SourceLink);

//FBL.ErrorCopy = FirebugReps.ErrorCopy;
//FBL.ErrorMessageObj = FirebugReps.ErrorMessageObj;
//FBL.EventCopy = Dom.EventCopy;
//FBL.PropertyObj = FirebugReps.PropertyObj;

// deprecated
FBL.$ = Deprecated.deprecated("Use document.getElementById(id) instead", function(id, doc)
{
    if (doc)
        return doc.getElementById(id);
    else
        return document.getElementById(id);
});

// deprecated
var jsd = Components.classes["@mozilla.org/js/jsd/debugger-service;1"].
    getService(Components.interfaces.jsdIDebuggerService);

Deprecated.deprecatedROProp(FBL, "jsd", "Access to JSD through Components.classes", jsd);

// ********************************************************************************************* //
// Constants

try
{
    Components.utils["import"]("resource://gre/modules/PluralForm.jsm");
    Components.utils["import"]("resource://firebug/firebug-service.js");

    // deprecated

    Deprecated.deprecatedROProp(FBL, "fbs", "Access to Firebug Service (FBS) through "+
        "Components.utils", fbs);
}
catch (err)
{
}

// deprecated
// FBL.reUpperCase = /[A-Z]/;
Deprecated.deprecatedROProp(FBL, "reUpperCase", "Use the following RegExp instead: /[A-Z]/",
    /[A-Z]/);

// ********************************************************************************************* //
// Registration

return FBL;

// ********************************************************************************************* //
});
