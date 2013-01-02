/* See license.txt for terms of usage */

define([
    "firebug/lib/deprecated",
],
function(Deprecated) {

// ********************************************************************************************* //

// xxxFlorent:  used in extension/content/firebug/bti/inProcess/javascripttool.js
//              so it should be moved in that file since that is only used there (I hope :s)

var FirebugTool = function(name)
{
    this.toolName = name;
    this.active = false;
};

FirebugTool.prototype =
{
    getName: function()
    {
        return this.toolName;
    },
    getActive: function()
    {
        return this.active;
    },
    setActive: function(active)
    {
        this.active = !!active;
    }
}
// ********************************************************************************************* //

return FirebugTool;

// ********************************************************************************************* //
});
