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
    "firebug/lib/domplate",
    "firebug/chrome/firefox"
],
function(Obj, Xpcom, Locale, Events, Options, Deprecated, Wrapper, Url, SourceLink,
    StackFrame, Css, Dom, Http, Win, Search, Xpath, Str, Xml, Persist, Arr, System, Json,
    Fonts, Menu, ToggleBranch, Debug, Keywords, Domplate, Firefox) {
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

// This object defines explicitly what functions or properties to include in FBL, 
// so we avoid collisions:

var FBLExtension = {
    // Obj:
    "bind": Obj.bind,
    "bindFixed": Obj.bindFixed,
    "extend": Obj.extend,
    "descend": Obj.descend,
    "hasProperties": Obj.hasProperties,
    "getPrototype": Obj.getPrototype,
    "getUniqueId": Obj.getUniqueId,
    "getRandomInt": Obj.getRandomInt,
    "XW_instanceof": Obj.XW_instanceof,
    "isNonNativeGetter": Obj.isNonNativeGetter,


    // Xpcom:
    "CCSV": Xpcom.CCSV,
    "CCIN": Xpcom.CCIN,
    "QI": Xpcom.QI,


    // Locale:
    "$STR": Locale.$STR,
    "$STRF": Locale.$STRF,
    "$STRP": Locale.$STRP,
    "internationalize": Locale.internationalize,
    "internationalizeElements": Locale.internationalizeElements,
    "registerStringBundle": Locale.registerStringBundle,
    "getStringBundle": Locale.getStringBundle,
    "getDefaultStringBundle": Locale.getDefaultStringBundle,
    "getPluralRule": Locale.getPluralRule,
    "stringBundle": Locale.stringBundle,
    "defaultStringBundle": Locale.defaultStringBundle,


    // Events:
    "dispatch": Events.dispatch,
    "dispatch2": Events.dispatch2,
    "cancelEvent": Events.cancelEvent,
    "isLeftClick": Events.isLeftClick,
    "isMiddleClick": Events.isMiddleClick,
    "isRightClick": Events.isRightClick,
    "isSingleClick": Events.isSingleClick,
    "isDoubleClick": Events.isDoubleClick,
    "noKeyModifiers": Events.noKeyModifiers,
    "isControlClick": Events.isControlClick,
    "isShiftClick": Events.isShiftClick,
    "isControl": Events.isControl,
    "isAlt": Events.isAlt,
    "isAltClick": Events.isAltClick,
    "isControlShift": Events.isControlShift,
    "isControlAlt": Events.isControlAlt,
    "isShift": Events.isShift,
    "getEventTypes": Events.getEventTypes,
    "isEventFamily": Events.isEventFamily,
    "getEventFamily": Events.getEventFamily,
    "attachAllListeners": Events.attachAllListeners,
    "detachAllListeners": Events.detachAllListeners,
    "attachFamilyListeners": Events.attachFamilyListeners,
    "detachFamilyListeners": Events.detachFamilyListeners,
    "addEventListener": Events.addEventListener,
    "removeEventListener": Events.removeEventListener,


    // Wrapper:
    "getContentView": Wrapper.getContentView,
    "unwrapObject": Wrapper.unwrapObject,
    "wrapObject": Wrapper.wrapObject,
    "isDeadWrapper": Wrapper.isDeadWrapper,
    "unwrapIValue": Wrapper.unwrapIValue,
    "unwrapIValueObject": Wrapper.unwrapIValueObject,
    "ignoreVars": Wrapper.ignoreVars,
    "shouldIgnore": Wrapper.shouldIgnore,


    // Url:
    "reCSS": Url.reCSS,
    "reJavascript": Url.reJavascript,
    "reFile": Url.reFile,
    "reChrome": Url.reChrome,
    "reDataURL": Url.reDataURL,
    "getFileName": Url.getFileName,
    "getProtocol": Url.getProtocol,
    "splitURLBase": Url.splitURLBase,
    "splitDataURL": Url.splitDataURL,
    "splitURLTrue": Url.splitURLTrue,
    "getFileExtension": Url.getFileExtension,
    "isSystemURL": Url.isSystemURL,
    "isSystemPage": Url.isSystemPage,
    "isSystemStyleSheet": Url.isSystemStyleSheet,
    "getURIHost": Url.getURIHost,
    "isLocalURL": Url.isLocalURL,
    "isDataURL": Url.isDataURL,
    "getLocalPath": Url.getLocalPath,
    "getLocalSystemURI": Url.getLocalSystemURI,
    "getLocalOrSystemPath": Url.getLocalOrSystemPath,
    "getLocalOrSystemFile": Url.getLocalOrSystemFile,
    "getURLFromLocalFile": Url.getURLFromLocalFile,
    "getDataURLForContent": Url.getDataURLForContent,
    "getDomain": Url.getDomain,
    "getURLPath": Url.getURLPath,
    "getPrettyDomain": Url.getPrettyDomain,
    "getBaseURL": Url.getBaseURL,
    "absoluteURL": Url.absoluteURL,
    "absoluteURLWithDots": Url.absoluteURLWithDots,
    "normalizeURL": Url.normalizeURL,
    "denormalizeURL": Url.denormalizeURL,
    "parseURLParams": Url.parseURLParams,
    "parseURLEncodedText": Url.parseURLEncodedText,
    "reEncodeURL": Url.reEncodeURL,
    "extractFromCSS": Url.extractFromCSS,
    "makeURI": Url.makeURI,
    "resourceToFile": Url.resourceToFile,


    // StackFrame:
    "getStackTrace": StackFrame.getStackTrace,
    "getCorrectedStackTrace": StackFrame.getCorrectedStackTrace,
    "getStackFrame": StackFrame.getStackFrame,
    "StackFrame": StackFrame.StackFrame,
    "parseToStackFrame": StackFrame.parseToStackFrame,
    "parseToStackTrace": StackFrame.parseToStackTrace,
    "cleanStackTraceOfFirebug": StackFrame.cleanStackTraceOfFirebug,
    "getStackDump": StackFrame.getStackDump,
    "getJSDStackDump": StackFrame.getJSDStackDump,
    "getStackSourceLink": StackFrame.getStackSourceLink,
    "getFrameSourceLink": StackFrame.getFrameSourceLink,
    "getStackFrameId": StackFrame.getStackFrameId,
    "StackTrace": StackFrame.StackTrace,
    "traceToString": StackFrame.traceToString,
    "buildStackTrace": StackFrame.buildStackTrace,
    "getFunctionName": StackFrame.getFunctionName,
    "getDisplayName": StackFrame.getDisplayName,
    "guessFunctionName": StackFrame.guessFunctionName,
    "guessFunctionNameFromLines": StackFrame.guessFunctionNameFromLines,
    "getFunctionArgValues": StackFrame.getFunctionArgValues,
    "getArgumentsFromObjectScope": StackFrame.getArgumentsFromObjectScope,
    "getArgumentsFromCallScope": StackFrame.getArgumentsFromCallScope,
    "suspendShowStackTrace": StackFrame.suspendShowStackTrace,
    "resumeShowStackTrace": StackFrame.resumeShowStackTrace,


    // Css:
    "getCSSKeywordsByProperty": Css.getCSSKeywordsByProperty,
    "getCSSPropertyNames": Css.getCSSPropertyNames,
    "getCSSShorthandCategory": Css.getCSSShorthandCategory,
    "parseCSSProps": Css.parseCSSProps,
    "isColorKeyword": Css.isColorKeyword,
    "isImageRule": Css.isImageRule,
    "copyTextStyles": Css.copyTextStyles,
    "copyBoxStyles": Css.copyBoxStyles,
    "readBoxStyles": Css.readBoxStyles,
    "getBoxFromStyles": Css.getBoxFromStyles,
    "getElementCSSSelector": Css.getElementCSSSelector,
    "getElementCSSPath": Css.getElementCSSPath,
    "hasClass": Css.hasClass,
    "setClass": Css.setClass,
    "getClassValue": Css.getClassValue,
    "removeClass": Css.removeClass,
    "toggleClass": Css.toggleClass,
    "obscure": Css.obscure,
    "setClassTimed": Css.setClassTimed,
    "cancelClassTimed": Css.cancelClassTimed,
    "safeGetCSSRules": Css.safeGetCSSRules,
    "isValidStylesheet": Css.isValidStylesheet,
    "shouldIgnoreSheet": Css.shouldIgnoreSheet,
    "createStyleSheet": Css.createStyleSheet,
    "addStyleSheet": Css.addStyleSheet,
    "appendStylesheet": Css.appendStylesheet,
    "getStyleSheetByHref": Css.getStyleSheetByHref,
    "createStyleSheetMap": Css.createStyleSheetMap,
    "getAllStyleSheets": Css.getAllStyleSheets,
    "getURLForStyleSheet": Css.getURLForStyleSheet,
    "getInstanceForStyleSheet": Css.getInstanceForStyleSheet,
    "getDocumentForStyleSheet": Css.getDocumentForStyleSheet,
    "stripUnits": Css.stripUnits,
    "extractURLs": Css.extractURLs,
    "rgbToHex": Css.rgbToHex,
    "rgbToHSL": Css.rgbToHSL,
    "cssInfo": Css.cssInfo,
    "multiValuedProperties": Css.multiValuedProperties,
    "unitlessProperties": Css.unitlessProperties,
    "cssKeywords": Css.cssKeywords,
    "charsets": Css.charsets,
    "pseudoClasses": Css.pseudoClasses,
    "pseudoElements": Css.pseudoElements,
    "nonEditableTags": Css.nonEditableTags,
    "innerEditableTags": Css.innerEditableTags,
    "nonDeletableTags": Css.nonDeletableTags,


    // Dom:
    "domUtils": Dom.domUtils,
    "getChildByClass": Dom.getChildByClass,
    "getAncestorByClass": Dom.getAncestorByClass,
    "getAncestorByTagName": Dom.getAncestorByTagName,
    "getElementByClass": Dom.getElementByClass,
    "getElementsByClass": Dom.getElementsByClass,
    "getElementsByAttribute": Dom.getElementsByAttribute,
    "isAncestor": Dom.isAncestor,
    "getNextElement": Dom.getNextElement,
    "getPreviousElement": Dom.getPreviousElement,
    "getBody": Dom.getBody,
    "insertAfter": Dom.insertAfter,
    "addScript": Dom.addScript,
    "setOuterHTML": Dom.setOuterHTML,
    "markupToDocFragment": Dom.markupToDocFragment,
    "appendInnerHTML": Dom.appendInnerHTML,
    "insertTextIntoElement": Dom.insertTextIntoElement,
    "collapse": Dom.collapse,
    "isCollapsed": Dom.isCollapsed,
    "hide": Dom.hide,
    "clearNode": Dom.clearNode,
    "eraseNode": Dom.eraseNode,
    "isNode": Dom.isNode,
    "isElement": Dom.isElement,
    "isRange": Dom.isRange,
    "hasChildElements": Dom.hasChildElements,
    "getNextByClass": Dom.getNextByClass,
    "getPreviousByClass": Dom.getPreviousByClass,
    "findNextDown": Dom.findNextDown,
    "findPreviousUp": Dom.findPreviousUp,
    "findNext": Dom.findNext,
    "findPrevious": Dom.findPrevious,
    "getClientOffset": Dom.getClientOffset,
    "getLTRBWH": Dom.getLTRBWH,
    "getOffsetSize": Dom.getOffsetSize,
    "getOverflowParent": Dom.getOverflowParent,
    "isScrolledToBottom": Dom.isScrolledToBottom,
    "scrollToBottom": Dom.scrollToBottom,
    "move": Dom.move,
    "resize": Dom.resize,
    "linesIntoCenterView": Dom.linesIntoCenterView,
    "scrollTo": Dom.scrollTo,
    "scrollIntoCenterView": Dom.scrollIntoCenterView,
    "scrollMenupopup": Dom.scrollMenupopup,
    "getMappedData": Dom.getMappedData,
    "setMappedData": Dom.setMappedData,
    "deleteMappedData": Dom.deleteMappedData,
    "getDOMMembers": Dom.getDOMMembers,
    "isDOMMember": Dom.isDOMMember,
    "isDOMConstant": Dom.isDOMConstant,
    "isInlineEventHandler": Dom.isInlineEventHandler,
    "EventCopy": Dom.EventCopy,
    "domConstantMap": Dom.domConstantMap,
    "domInlineEventHandlersMap": Dom.domInlineEventHandlersMap,


    // Http:
    "readFromStream": Http.readFromStream,
    "readPostTextFromPage": Http.readPostTextFromPage,
    "getResource": Http.getResource,
    "readPostTextFromRequest": Http.readPostTextFromRequest,
    "removeHeadersFromPostText": Http.removeHeadersFromPostText,
    "getHeadersFromPostText": Http.getHeadersFromPostText,
    "getInputStreamFromString": Http.getInputStreamFromString,
    "getWindowForRequest": Http.getWindowForRequest,
    "getRequestLoadContext": Http.getRequestLoadContext,
    "getRequestWebProgress": Http.getRequestWebProgress,
    "safeGetRequestName": Http.safeGetRequestName,
    "safeGetURI": Http.safeGetURI,
    "safeGetContentType": Http.safeGetContentType,
    "safeGetXHRResponseText": Http.safeGetXHRResponseText,
    "safeGetLocalAddress": Http.safeGetLocalAddress,
    "safeGetLocalPort": Http.safeGetLocalPort,
    "safeGetRemoteAddress": Http.safeGetRemoteAddress,
    "safeGetRemotePort": Http.safeGetRemotePort,
    "isXHR": Http.isXHR,
    "getStateDescription": Http.getStateDescription,
    "getStatusDescription": Http.getStatusDescription,
    "getLoadFlagsDescription": Http.getLoadFlagsDescription,
    "BaseProgressListener": Http.BaseProgressListener,


    // Win:
    "getWindowProxyIdForWindow": Win.getWindowProxyIdForWindow,
    "getTabForWindow": Win.getTabForWindow,
    "getTabIdForWindow": Win.getTabIdForWindow,
    "iterateWindows": Win.iterateWindows,
    "getRootWindow": Win.getRootWindow,
    "openNewTab": Win.openNewTab,
    "iterateBrowserWindows": Win.iterateBrowserWindows,
    "iterateBrowserTabs": Win.iterateBrowserTabs,
    "getBrowserByWindow": Win.getBrowserByWindow,
    "getWindowId": Win.getWindowId,
    "safeGetWindowLocation": Win.safeGetWindowLocation,


    // Search:
    "finder": Search.finder,
    "TextSearch": Search.TextSearch,
    "SourceBoxTextSearch": Search.SourceBoxTextSearch,
    "ReversibleIterator": Search.ReversibleIterator,
    "LiteralRegExp": Search.LiteralRegExp,
    "ReversibleRegExp": Search.ReversibleRegExp,


    // Xpath:
    "getElementXPath": Xpath.getElementXPath,
    "getElementTreeXPath": Xpath.getElementTreeXPath,
    "cssToXPath": Xpath.cssToXPath,
    "getElementsBySelector": Xpath.getElementsBySelector,
    "getElementsByXPath": Xpath.getElementsByXPath,
    "evaluateXPath": Xpath.evaluateXPath,
    "getRuleMatchingElements": Xpath.getRuleMatchingElements,


    // Str:
    "entityConversionLists": Str.entityConversionLists,
    "escapeGroupsForEntities": Str.escapeGroupsForEntities,
    "escapeForTextNode": Str.escapeForTextNode,
    "escapeForElementAttribute": Str.escapeForElementAttribute,
    "escapeForHtmlEditor": Str.escapeForHtmlEditor,
    "escapeForCss": Str.escapeForCss,
    "deprecateEscapeHTML": Str.deprecateEscapeHTML,
    "deprecatedUnescapeHTML": Str.deprecatedUnescapeHTML,
    "escapeHTML": Str.escapeHTML,
    "unescapeHTML": Str.unescapeHTML,
    "escapeForSourceLine": Str.escapeForSourceLine,
    "unescapeForTextNode": Str.unescapeForTextNode,
    "unescapeForURL": Str.unescapeForURL,
    "escapeNewLines": Str.escapeNewLines,
    "stripNewLines": Str.stripNewLines,
    "escapeSingleQuoteJS": Str.escapeSingleQuoteJS,
    "reverseString": Str.reverseString,
    "escapeJS": Str.escapeJS,
    "cropString": Str.cropString,
    "cropStringEx": Str.cropStringEx,
    "lineBreak": Str.lineBreak,
    "cropMultipleLines": Str.cropMultipleLines,
    "isWhitespace": Str.isWhitespace,
    "splitLines": Str.splitLines,
    "trim": Str.trim,
    "trimLeft": Str.trimLeft,
    "trimRight": Str.trimRight,
    "hasPrefix": Str.hasPrefix,
    "endsWith": Str.endsWith,
    "wrapText": Str.wrapText,
    "insertWrappedText": Str.insertWrappedText,
    "cleanIndentation": Str.cleanIndentation,
    "formatNumber": Str.formatNumber,
    "formatSize": Str.formatSize,
    "formatTime": Str.formatTime,
    "formatIP": Str.formatIP,
    "convertToUnicode": Str.convertToUnicode,
    "convertFromUnicode": Str.convertFromUnicode,
    "safeToString": Str.safeToString,


    // Xml:
    "getElementType": Xml.getElementType,
    "getElementSimpleType": Xml.getElementSimpleType,
    "isElementHTML": Xml.isElementHTML,
    "isElementXHTML": Xml.isElementXHTML,
    "isElementMathML": Xml.isElementMathML,
    "isElementSVG": Xml.isElementSVG,
    "isElementXUL": Xml.isElementXUL,
    "getNodeName": Xml.getNodeName,
    "getLocalName": Xml.getLocalName,
    "selfClosingTags": Xml.selfClosingTags,
    "isSelfClosing": Xml.isSelfClosing,
    "getElementHTML": Xml.getElementHTML,
    "getElementXML": Xml.getElementXML,
    "isXMLPrettyPrint": Xml.isXMLPrettyPrint,
    "isVisible": Xml.isVisible,
    "invisibleTags": Xml.invisibleTags,


    // Persist:
    "persistObjects": Persist.persistObjects,
    "persistObject": Persist.persistObject,
    "restoreLocation": Persist.restoreLocation,
    "restoreSelection": Persist.restoreSelection,
    "restoreObjects": Persist.restoreObjects,
    "getPersistedState": Persist.getPersistedState,


    // Arr:
    "isArray": Arr.isArray,
    "isArrayLike": Arr.isArrayLike,
    "_isDOMTokenList": Arr._isDOMTokenList,
    "keys": Arr.keys,
    "values": Arr.values,
    "remove": Arr.remove,
    "sliceArray": Arr.sliceArray,
    "cloneArray": Arr.cloneArray,
    "extendArray": Arr.extendArray,
    "arrayInsert": Arr.arrayInsert,
    "unique": Arr.unique,
    "sortUnique": Arr.sortUnique,
    "merge": Arr.merge,


    // System:
    "getPlatformName": System.getPlatformName,
    "beep": System.beep,
    "launchProgram": System.launchProgram,
    "getIconURLForFile": System.getIconURLForFile,
    "copyToClipboard": System.copyToClipboard,
    "getStringDataFromClipboard": System.getStringDataFromClipboard,
    "checkFirebugVersion": System.checkFirebugVersion,


    // Json:
    "parseJSONString": Json.parseJSONString,
    "parseJSONPString": Json.parseJSONPString,


    // Fonts:
    "getFonts": Fonts.getFonts,
    "getFontsUsedInContext": Fonts.getFontsUsedInContext,
    "getFontInfo": Fonts.getFontInfo,


    // Menu:
    "createMenu": Menu.createMenu,
    "createMenuPopup": Menu.createMenuPopup,
    "createMenuItems": Menu.createMenuItems,
    "createMenuItem": Menu.createMenuItem,
    "setItemIntoElement": Menu.setItemIntoElement,
    "createMenuHeader": Menu.createMenuHeader,
    "createMenuSeparator": Menu.createMenuSeparator,
    "optionMenu": Menu.optionMenu,


    // ToggleBranch:
    "ToggleBranch": ToggleBranch.ToggleBranch,


    // Debug:
    "ERROR": Debug.ERROR,
    "traceObservers": Debug.traceObservers,


    // Keywords:
    "jsKeywords": Keywords.jsKeywords,
    "isJavaScriptKeyword": Keywords.isJavaScriptKeyword,


    // Firefox:
    "getElementById": Firefox.getElementById,
    "$": Firefox.$,
    "getTabBrowser": Firefox.getTabBrowser,
    "getCurrentBrowser": Firefox.getCurrentBrowser,
    "getBrowsers": Firefox.getBrowsers,
    "selectTabByWindow": Firefox.selectTabByWindow,
    "getCurrentURI": Firefox.getCurrentURI,
    "getBrowserForWindow": Firefox.getBrowserForWindow,
    "openWindow": Firefox.openWindow,
    "viewSource": Firefox.viewSource,


    // Deprecated:
    "deprecated": Deprecated.deprecated,


    // Domplate:
    "DomplateTag": Domplate.DomplateTag,
    "domplate": Domplate.domplate,
    "TAG": Domplate.TAG,
    "FOR": Domplate.FOR,
    "A": Domplate.A,
    "BUTTON": Domplate.BUTTON,
    "BR": Domplate.BR,
    "CANVAS": Domplate.CANVAS,
    "COL": Domplate.COL,
    "COLGROUP": Domplate.COLGROUP,
    "DIV": Domplate.DIV,
    "FIELDSET": Domplate.FIELDSET,
    "FORM": Domplate.FORM,
    "H1": Domplate.H1,
    "H2": Domplate.H2,
    "H3": Domplate.H3,
    "HR": Domplate.HR,
    "IMG": Domplate.IMG,
    "INPUT": Domplate.INPUT,
    "LABEL": Domplate.LABEL,
    "LEGEND": Domplate.LEGEND,
    "LI": Domplate.LI,
    "OL": Domplate.OL,
    "OPTGROUP": Domplate.OPTGROUP,
    "OPTION": Domplate.OPTION,
    "P": Domplate.P,
    "PRE": Domplate.PRE,
    "SELECT": Domplate.SELECT,
    "B": Domplate.B,
    "SPAN": Domplate.SPAN,
    "STRONG": Domplate.STRONG,
    "TABLE": Domplate.TABLE,
    "TBODY": Domplate.TBODY,
    "TD": Domplate.TD,
    "TEXTAREA": Domplate.TEXTAREA,
    "TFOOT": Domplate.TFOOT,
    "TH": Domplate.TH,
    "THEAD": Domplate.THEAD,
    "TR": Domplate.TR,
    "TT": Domplate.TT,
    "UL": Domplate.UL,
    "IFRAME": Domplate.IFRAME,
    "CODE": Domplate.CODE,
    "STYLE": Domplate.STYLE,
    "ARTICLE": Domplate.ARTICLE,
    "ASIDE": Domplate.ASIDE,
    "AUDIO": Domplate.AUDIO,
    "BB": Domplate.BB,
    "COMMAND": Domplate.COMMAND,
    "DATAGRID": Domplate.DATAGRID,
    "DATALIST": Domplate.DATALIST,
    "DETAILS": Domplate.DETAILS,
    "DIALOG": Domplate.DIALOG,
    "EMBED": Domplate.EMBED,
    "EVENTSOURCE": Domplate.EVENTSOURCE,
    "FIGURE": Domplate.FIGURE,
    "FOOTER": Domplate.FOOTER,
    "KEYGEN": Domplate.KEYGEN,
    "MARK": Domplate.MARK,
    "METER": Domplate.METER,
    "NAV": Domplate.NAV,
    "OUTPUT": Domplate.OUTPUT,
    "PROGRESS": Domplate.PROGRESS,
    "RUBY": Domplate.RUBY,
    "RP": Domplate.RP,
    "RT": Domplate.RT,
    "SECTION": Domplate.SECTION,
    "SOURCE": Domplate.SOURCE,
    "TIME": Domplate.TIME,
    "VIDEO": Domplate.VIDEO,

    // SourceLink:
    "SourceLink": SourceLink.SourceLink,


};

for (var i in FBLExtension)
    FBL[i] = FBLExtension[i];

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
