function runTest() {
    var Obj = FW.Firebug.require("firebug/lib/object");

    FBTest.progress("Testing firebug/lib/object.js; START");

    // ****************************************************************************************** //
    FBTest.progress("== Testing Obj.bind + Obj.bindFixed ==");
    (function()
    {
        var getGenMessage = function(funcName, expected, actual)
        {
            return "["+funcName+"] "+actual+" === "+expected;
        };
        var thisObject = {};
        Obj.bind(function(_1, _2, _3, _4)
        {
            var getMessage = getGenMessage.bind(null, "Obj.bind");

            FBTest.compare(thisObject, this, getMessage("thisObject", "this"));
            FBTest.compare(1, _1, getMessage("1", "_1"));
            FBTest.compare(2, _2, getMessage("2", "_2"));
            FBTest.compare(3, _3, getMessage("3", "_3"));
            FBTest.compare(4, _4, getMessage("4", "_4"));
            FBTest.compare(4, arguments.length, getMessage("4", "arguments.length"));
        }, thisObject, 3, 4).call({}, 1, 2);

        Obj.bindFixed(function(_1, _2)
        {
            var getMessage = getGenMessage.bind(null, "Obj.bindFixed");

            FBTest.compare(thisObject, this, getMessage("thisObject", "this"));
            FBTest.compare(1, _1, getMessage("1", "_1"));
            FBTest.compare(2, _2, getMessage("2", "_2"));
            FBTest.compare(2, arguments.length, getMessage("2", "arguments.length"));
        }, thisObject, 1, 2).call({}, 3, 4);
    })();

    // ****************************************************************************************** //
    FBTest.progress("== Testing Obj.extend ==");
    (function()
    {
        // initialization:
        var parentObj = {prop1: {}, overridenProp: {}};
        var extension = {overridenProp: {}, prop2: {}, overridenProp2: {}};
        var extension2 = {prop3: {}, overridenProp2: function(){}};
        // call the function to test:
        var obj2test = Obj.extend(parentObj, extension, extension2);
        // compare:
        FBTest.compare(parentObj.prop1, obj2test.prop1, 
            "[Obj.extend] parentObj.prop1 === obj2test.prop1");

        FBTest.compare(extension.overridenProp, obj2test.overridenProp,
            "[Obj.extend] extension.overridenProp === obj2test.overridenProp");
        FBTest.compare(extension.prop2, obj2test.prop2, 
            "[Obj.extend] extension.prop2 === obj2test.prop2");

        FBTest.compare(extension2.prop3, obj2test.prop3,
            "[Obj.extend] extension2.prop3 === obj2test.prop3");
        FBTest.compare(extension2.overridenProp2, obj2test.overridenProp2,
            "[Obj.extend] extension2.overridenProp2 === obj2test.overridenProp2");
    })();

    // ****************************************************************************************** //
    FBTest.progress("== Testing Obj.descend ==");
    (function()
    {
        // initialization:
        var parentClass = Array;
        var childPropertyOne = { slice: function(){}, prop1: {}};
        var childPropertyTwo = { prop1: function(){}}; // should be ignored
        // call the function to test:
        var obj2test = Obj.descend(parentClass.prototype, childPropertyOne, childPropertyTwo);
        //compare: 
        FBTest.compare(parentClass.prototype.pop, obj2test.pop,
            "[Obj.descend] parentClass.prototype.pop === obj2test.pop");

        FBTest.compare(childPropertyOne.slice, obj2test.slice, 
            "[Obj.descend] childPropertyOne.slice === obj2test.slice");
        FBTest.compare(childPropertyOne.prop1, obj2test.prop1,
            "[Obj.descend] childPropertyOne.prop1 === obj2test.prop1");
    })();

    // ****************************************************************************************** //
    FBTest.progress("== Testing Obj.hasProperties ==");
    //xxxFlorent: TODO...
    FBTest.ok(false, "TODO");

    // ****************************************************************************************** //
    FBTest.progress("== Testing Obj.getPrototype ==");
    (function()
    {
        var test = (Obj.getPrototype(Array) === Array.prototype);
        FBTest.ok(test, "Obj.getPrototype(Array) should return Array.prototype");
    })();

    // ****************************************************************************************** //
    FBTest.progress("== Testing Obj.XW_instanceof ==");
    FBTest.ok(false, "TODO");


    // ****************************************************************************************** //
    FBTest.testDone("Testing firebug/lib/object.js; DONE");
}

