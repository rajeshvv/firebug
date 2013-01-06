function runTest() {
    var Arr = FW.Firebug.require("firebug/lib/array");

    FBTest.progress("Testing firebug/lib/array.js; START");

    // ****************************************************************************************** //
    FBTest.progress("== Testing Arr.isArrayLike ==");
    (function()
    {
        // xxxFlorent: miss jQuery test... Does it matter much??
        var xhtmlNS = "http://www.w3.org/1999/xhtml";
        var okArray = Arr.isArrayLike([]);
        var okArguments = Arr.isArrayLike(arguments);
        var okHTMLCollection = Arr.isArrayLike(document.getElementsByTagName("*"));
        var okNodeList = Arr.isArrayLike(document.querySelectorAll("p"));
        var okDOMTokenList = Arr.isArrayLike(document.createElementNS(xhtmlNS, "p").classList);

        FBTest.ok(okArray, "[Arr.isArrayLike] test with Array");
        FBTest.ok(okArguments, "[Arr.isArrayLike] test with Arguments");
        FBTest.ok(okHTMLCollection, "[Arr.isArrayLike] test with HTMLCollection");
        FBTest.ok(okNodeList, "[Arr.isArrayLike] test with NodeList");
        FBTest.ok(okDOMTokenList, "[Arr.isArrayLike] test with DOMTokenList");
    })();

    // ****************************************************************************************** //
    FBTest.progress("== Testing Arr.keys ==");
    (function()
    {
        var list = Arr.keys(document.documentElement);
        // style is not included in the list of keys, when using Object.keys
        // but it is when using Arr.keys:
        var okKeys = list.indexOf("style") >= 0;

        FBTest.ok(okKeys, "[Arr.keys] Arr.keys(document.documentElement).indexOf('style') >= 0");
    })();

    // ****************************************************************************************** //
    FBTest.progress("== Testing Arr.values ==");
    (function()
    {
        var listValues = Arr.values({"a":1, 'b':1, 'c':2});

        FBTest.compare(3, listValues.length, "[Arr.values] listValues.length == 3");
        FBTest.compare(1, listValues[0], "[Arr.values] listValues[0] == 1");
        FBTest.compare(1, listValues[1], "[Arr.values] listValues[1] == 1");
        FBTest.compare(2, listValues[2], "[Arr.values] listValues[2] == 2");
    })();

    // ****************************************************************************************** //
    FBTest.progress("== Testing Arr.remove ==");
    (function()
    {
        var array = [0,1,1,2];
        // remove the first occurrence of 1 in the array
        Arr.remove(array, 1);
        // now the array should equal to [0,1,2]:
        FBTest.compare(3, array.length, "[Arr.remove] array.length === 3");
        [0,1,2].forEach(function(el, i)
        {
            if (i >= array.length)
                return;
            FBTest.compare(el, array[i], "[Arr.remove] array["+i+"] === "+el);
        });
    })();

    // ****************************************************************************************** //
    FBTest.progress("== Testing Arr.removeAll ==");
    if (!Arr.removeAll)
        FBTest.sysout("Arr.removeAll does not exists in this version");
    else
    {
        (function()
        {
            var array = [0,1,1,2];
            Arr.removeAll(array, 1);
            FBTest.compare(0, array[0], "[Arr.removeAll] array[0] === 0");
            FBTest.compare(2, array[1], "[Arr.removeAll] array[1] === 2");
        })();
    }
    // xxxFlorent: not testing Arr.sliceArray

    // ****************************************************************************************** //
    FBTest.progress("== Testing Arr.cloneArray ==");
    (function()
    {
        var orig = [0,1,2,{}];
        var cloned = Arr.cloneArray(orig);
        // NOTE: ({}+3) === 3
        var clonedMapped = Arr.cloneArray(orig, function(e){ return e+1; });

        FBTest.compare(orig, cloned, "[Arr.cloneArray] cloned !== orig", true);
        FBTest.compare(orig, clonedMapped, "[Arr.cloneArray] clonedMapped !== orig", true);
        orig.forEach(function(el, i)
        {
            FBTest.compare(el, cloned[i], "[Arr.cloneArray] orig["+i+"] === cloned["+i+"]");
            FBTest.compare(el+1, clonedMapped[i],
                "[Arr.cloneArray] orig["+i+"] === clonedMapped["+i+"]+1");
        });
    })();

    // ****************************************************************************************** //
    FBTest.progress("== Testing Arr.extendArray ==");
    (function()
    {
        var arr = Arr.extendArray([1,2,3], [4,5,6]);
        FBTest.compare(6, arr.length, "[Arr.extendArray] arr.length === 6");
        FBTest.compare(1, arr[0], "[Arr.extendArray] arr[0] === 1");
        FBTest.compare(6, arr[5], "[Arr.extendArray] arr[5] === 6");
    })();
    // ****************************************************************************************** //
    FBTest.testDone("Testing firebug/lib/array.js; STOP");

}

