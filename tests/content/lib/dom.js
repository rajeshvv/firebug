function runTest() {
    FBTest.openNewTab(basePath+"lib/dom.html", function(win)
    {
        var Dom = FW.Firebug.require("firebug/lib/dom");
        var doc = win.document;

        // some helpers:
        var $id = doc.getElementById.bind(doc);

        // xxxFlorent: [IFRAME-SRCDOC]
        var initXMLIFrame = function(iframe)
        {
            iframe.src = "data:text/xml;charset=utf-8,"+iframe.innerHTML.trim();
        }

        FBTest.progress("Testing firebug/lib/dom.js; START");

        var deepEquals = function(arr1, arr2)
        {
            return Array.every(arr1, function(el1, i)
            {
                var el2 = arr2[i];
                var test = (el1 === el2);
                if (!test)
                    FBTest.compare(el1, el2, "the two arrays should equal at index "+i);
                return el1 === el2;
            });
        }

        // ****************************************************************************************** //
        FBTest.progress("== Testing Dom.getChildByClass ==");

        (function()
        {
            var parent = $id("getChildByClass");
            var child1 = parent.querySelector(".child1");
            var child2 = child1.querySelector(".child2");
            var child3 = child2.querySelector(".child3");
            var child2Direct = parent.querySelector(".child2.direct");
            FBTest.compare(null, Dom.getChildByClass(null), "[Dom.getChildByClass] if no parent, "+
                "the function should return null");

            FBTest.compare(child3, Dom.getChildByClass(parent, "child1", "child2", "child3"),
                "[Dom.getChildByClass] a good chain of children classnames should return child3");

            FBTest.compare(null, Dom.getChildByClass(parent, "child1", "child3"),
                "[Dom.getChildByClass] a wrong chain of children classnames should return null");

            FBTest.compare(child2Direct, Dom.getChildByClass(parent, "child2"),
                "[Dom.getChildByClass] should return a direct child matching the class-name");

            FBTest.compare(null, Dom.getChildByClass(parent, "wrongClassName"),
                "[Dom.getChildByClass] should return null if the first class-name matches no child");
        })();

        // ****************************************************************************************** //
        FBTest.progress("== Testing Dom.getAncestorByClass + Dom.getAncestorByTagName ==");

        (function()
        {
            var parent = $id("getAncestorByClass");
            var [parent1, parent2, child] = parent.querySelectorAll(".parent1, .parent2, .child");

            FBTest.progress("1");
            FBTest.compare(null, Dom.getAncestorByClass(child, null), "[Dom.getAncestorByClass] if no "+
                "parent, the function should return null");
            FBTest.progress("1");

            FBTest.compare(null, Dom.getAncestorByClass(child, "notfound"), "[Dom.getAncestorByClass] "+
                "if the parent cannot be found, the function should return null");
            FBTest.progress("1");

            FBTest.compare(parent1, Dom.getAncestorByClass(child, "parent1"), "[Dom.getAncestorByClass]"+
                " should return the direct or the indirect parent matching the specified class name");
            FBTest.progress("1");

            FBTest.compare(parent1, Dom.getAncestorByClass(parent2, "parent1"), "[Dom.getAncestorByClass]"+
                " should return the direct or the indirect parent matching the specified class name (2)");

            FBTest.compare(parent2, Dom.getAncestorByClass(parent2, "parent2"), "[Dom.getAncestorByClass]"+
                " can return the given node if the latter matches the class name");

            FBTest.compare(null, Dom.getAncestorByTagName(child, null), "[Dom.getAncestorByTagName]"+
                " if no parent, the function should return null");

            FBTest.compare(null, Dom.getAncestorByTagName(child, "nowhere"), "[Dom.getAncestorByTagName]"+
                " if the parent cannot be found, the function should return null");

            FBTest.compare(parent2, Dom.getAncestorByTagName(child, "article"),
                "[Dom.getAncestorByTagName] should return the first parent matching the tag name");

            FBTest.compare(parent1, Dom.getAncestorByTagName(parent2, "div"),
                "[Dom.getAncestorByTagName] should return the first parent matching the tag name (2)");

            FBTest.compare(parent2, Dom.getAncestorByTagName(parent2, "article"),
                "[Dom.getAncestorByTagName] can return the given node if the latter matches the tag name");
        })();

        // ****************************************************************************************** //
        FBTest.progress("== Testing Dom.getElement(s)ByClass ==");

        (function()
        {
            var parent = $id("getElementsByClass");
            var all = doc.querySelectorAll(".alpha, .beta");
            var [alpha1, beta1, alpha2, beta2, alpha_beta] = all;
            var ok;

            FBTest.compare(alpha1, Dom.getElementByClass(parent, "alpha"), "[Dom.getElementByClass] "+
                "should return the first element matching the given class name");

            ok = deepEquals([alpha1, alpha2, alpha_beta], Dom.getElementsByClass(parent, "alpha"));
            FBTest.ok(ok, "[Dom.getElementsByClass] should return all the elements matching the given "+
                "class name");

            var ok = deepEquals([alpha_beta], Dom.getElementsByClass(parent, "alpha", "beta"));
            FBTest.ok(ok, "[Dom.getElementsByClass] should return all the elements matching every "+
                "given class names");

            FBTest.compare(0, Dom.getElementsByClass(parent, "bla").length, "[Dom.getElementsByClass] "+
                "should return an empty array if nothing has been found");
        })();

        // ****************************************************************************************** //
        FBTest.progress("== Testing Dom.getElementsByAttribute ==");

        (function()
        {
            var parent = $id("getElementsByAttribute");
            var expected = parent.querySelectorAll("[data-test='ok']");

            FBTest.ok(deepEquals(expected, Dom.getElementsByAttribute(parent, "data-test", "ok")),
                "[Dom.getElementsByAttribute] should return the element matching the attribute name"+
                +" and the attribute value");

            FBTest.compare(0, Dom.getElementsByAttribute(parent, "data-test", "ko").length,
                "[Dom.getElementsByAttribute] should return null when the attribute value "+
                "does not match");

            FBTest.compare(0, Dom.getElementsByAttribute(parent, "data-foo", "ok").length,
                "[Dom.getElementsByAttribute] should return null when the attribute name "+
                "does not match");

        })();

        // ****************************************************************************************** //
        FBTest.progress("== Testing Dom.markupToDocFragment ==");

        (function()
        {
            var html = "<div><p>ok</p></div>";
            var parent = $id("markupToDocFragment");
            var docFrag = Dom.markupToDocFragment(html, parent);

            FBTest.compare(document.DOCUMENT_FRAGMENT_NODE, docFrag.nodeType,
                "[Dom.markupToDocFragment] the returned node should be a DocumentFragment");

            FBTest.compare(html, docFrag.firstChild.outerHTML,
                "[Dom.markupToDocFragment] should create a document fragment with html markups");
        })();

        // ****************************************************************************************** //
        // asynchronous tests:

        var tasks = new FBTest.TaskList();

        // ****************************************************************************************** //
        FBTest.progress("== Testing Dom.appendInnerHTML ==");

        tasks.push(function(callback)
        {
            var parent = $id("appendInnerHTML");
            var html_parent = parent.querySelector(".html");
            var html_ref = html_parent.querySelector(".elementChild");
            var html_textNode = html_ref.nextSibling;

            var test = function(parent, ref, textNode, mode)
            {
                var div1 = Dom.appendInnerHTML(parent, "<div class='generated'></div>", ref);

                var div2 = Dom.appendInnerHTML(parent, "<div class='generated'></div>");

                FBTest.ok(deepEquals([div1, ref, textNode, div2], parent.childNodes),
                    "[Dom.appendInnerHTML] should generate the elements at the right positions "
                    +"("+mode+" version)");
            }
            // test for the HTML version:
            test(html_parent, html_ref, html_textNode, "HTML");

            // test for the XML version:
            var iframe = parent.querySelector("iframe.xml");
            initXMLIFrame(iframe);

            iframe.addEventListener("load", function()
            {
                var xml_parent = iframe.contentDocument.querySelector("root");
                var xml_ref = xml_parent.querySelector("refNode");
                var xml_textNode = xml_ref.nextSibling;
                test(xml_parent, xml_ref, xml_textNode, "XML");

                callback();
            });

        });

        tasks.run(function()
        {
            FBTest.testDone("Testing firebug/lib/dom.js; DONE");
        });
    });
}

