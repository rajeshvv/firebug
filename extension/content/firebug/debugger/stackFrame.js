/* See license.txt for terms of usage */

define([
    "firebug/lib/trace",
    "firebug/lib/url",
    "firebug/lib/locale",
    "firebug/lib/string",
    "firebug/debugger/sourceLink",
    "firebug/debugger/grips",
],
function (FBTrace, Url, Locale, Str, SourceLink, Grips) {

// ********************************************************************************************* //
// Constants

var TraceError = FBTrace.to("DBG_ERRORS");

// ********************************************************************************************* //
// Stack Frame

// xxxHonza: should be derived from Grip
function StackFrame(sourceFile, lineNo, functionName, args, nativeFrame, pc, context, newestFrame)
{
    // Essential fields
    this.sourceFile = sourceFile;
    this.line = lineNo;

    //var fn = StackFrame.getDisplayName(nativeFrame ? nativeFrame.scope : null);
    //this.fn = fn || functionName;  // cache?
    this.fn = functionName;  // cache?

    this.context = context;

    // the newest frame in the stack containing 'this' frame
    this.newestFrame = (newestFrame ? newestFrame : this);

    // optional
    this.args = args;

    // Derived from sourceFile
    this.href = sourceFile.href;

    // Mozilla
    this.nativeFrame = nativeFrame;
    this.pc = pc;
    this.script = nativeFrame ? nativeFrame.script : null;  // TODO-XB
};

StackFrame.prototype =
{
    getURL: function()
    {
        return this.href;
    },

    getCompilationUnit: function()
    {
        return this.context.getCompilationUnit(this.href);
    },

    getStackNewestFrame: function()
    {
        return this.newestFrame;
    },

    getFunctionName: function()
    {
        return this.fn;
    },

    toSourceLink: function()
    {
        return new SourceLink.SourceLink(this.sourceFile.href, this.line, "js");
    },

    toString: function()
    {
        return this.fn + ", " +
            (this.sourceFile ? this.sourceFile.href : "no source file") +
            "@" + this.line;
    },

    setCallingFrame: function(caller, frameIndex)
    {
        this.callingFrame = caller;
        this.frameIndex = frameIndex;
    },

    getCallingFrame: function()
    {
        if (FBTrace.DBG_STACK)
            FBTrace.sysout("getCallingFrame "+this, this);

        if (!this.callingFrame && this.nativeFrame && this.nativeFrame.isValid)
        {
            var nativeCallingFrame = this.nativeFrame.callingFrame;
            if (nativeCallingFrame)
                this.callingFrame = StackFrame.getStackFrame(nativeCallingFrame, this.context,
                    this.newestFrame);
        }
        return this.callingFrame;
    },

    getFrameIndex: function()
    {
        return this.frameIndex;
    },

    getLineNumber: function()
    {
        return this.line;
    },

    destroy: function()
    {
        if (FBTrace.DBG_STACK)
            FBTrace.sysout("StackFrame destroyed:"+this.uid+"\n");

        this.script = null;
        this.nativeFrame = null;
        this.context = null;
    },

    signature: function()
    {
        return this.getActor();
    },

    getActor: function()
    {
        return this.nativeFrame.actor;
    },

    getScopes: function()
    {
        if (this.scopes)
            return this.scopes;

        this.scopes = [];

        var cache = this.context.gripCache;

        // Append 'this' as the first scope. This is not a real 'scope',
        // but useful for debugging.
        var thisScope = Grips.Factory.createGrip(this.nativeFrame["this"], cache);
        thisScope.name = "this";
        this.scopes.push(thisScope);

        // Now iterate all parent scopes. This represents the chain of scopes
        // in the Watch panel.
        var scope = this.nativeFrame.environment;
        while (scope)
        {
            this.scopes.push(Grips.Factory.createScope(scope, cache));
            scope = scope.parent;
        }

        return this.scopes;
    },

    getTopScope: function()
    {
        var scopes = this.getScopes();
        return (scopes.length > 1) ? scopes[1] : null;
    }
};

// ********************************************************************************************* //
// Static Methods

StackFrame.getStackDump = function()
{
    var lines = [];
    for (var frame = Components.stack; frame; frame = frame.caller)
        lines.push(frame.filename + " (" + frame.lineNumber + ")");

    return lines.join("\n");
};

StackFrame.getStackSourceLink = function()
{
    for (var frame = Components.stack; frame; frame = frame.caller)
    {
        if (frame.filename && frame.filename.indexOf("://firebug/") > 0)
        {
            for (; frame; frame = frame.caller)
            {
                var firebugComponent = "/modules/firebug-";
                if (frame.filename && frame.filename.indexOf("://firebug/") < 0 &&
                    frame.filename.indexOf(firebugComponent) == -1)
                    break;
            }
            break;
        }
    }
    return StackFrame.getFrameSourceLink(frame);
}

StackFrame.buildStackFrame = function(frame, context)
{
    if (!frame)
    {
        TraceError.sysout("stackFrame.buildStackFrame; ERROR no frame!");
        return;
    }

    var sourceFile = context.sourceFileMap[frame.where.url];
    if (!sourceFile)
        sourceFile = {href: frame.where.url};

    var args = [];
    var arguments = frame.arguments;
    for (var i=0; i<arguments.length; i++)
    {
        args.push({
            name: getArgName(arguments[i]),
            value: getArgValue(frame.arguments[i])
        });
    }

    return new StackFrame(sourceFile, frame.where.line, frame.callee.name,
        args, frame, 0, context);
};

// ********************************************************************************************* //
// Helpers

function getArgName(arg)
{
    for (var p in arg)
        return p;
}

function getArgValue(arg)
{
    return arg["class"] ? arg["class"] : arg;
}

// ********************************************************************************************* //
// Registration

return StackFrame;

// ********************************************************************************************* //
});