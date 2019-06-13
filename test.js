"use strict";
const {after, afterEach, before, beforeEach, it} = require("mocha");
const puppeteer = require("puppeteer");
const puppeteerCoverage = require("puppeteer-to-istanbul");
const voidElements = require("void-elements");

const runInBrowser = func => () => page.evaluate(func);

let browser, page;



// @todo also use npmjs.com/puppeteer-firefox
before(async () =>
{
	browser = await puppeteer.launch({ args: ["--no-sandbox"] });
	page = await browser.newPage();

	page.on("console", async msg => console[msg._type](...await Promise.all(msg.args().map(arg => arg.jsonValue()))));
	page.on("pageerror", console.error);

	await Promise.all(
	[
		page.addScriptTag({ path: "node_modules/chai/chai.js" }),
		page.addScriptTag({ path: "temp.js" }),

		// @todo https://github.com/istanbuljs/puppeteer-to-istanbul/issues/18
		// @todo https://github.com/GoogleChrome/puppeteer/issues/3570
		page.coverage.startJSCoverage({ reportAnonymousScripts: true })
	]);

	await page.evaluate(voidElementsMap =>
	{
		window.expect = chai.expect;
		delete window.chai; // cleanup

		// Helper function
		window.appendProblematicStyles = (target=document.body, selectorPrefix=target.tagName) =>
		{
			const style = document.createElement("style");
			style.append(`
				${selectorPrefix} > *:first-child {
					max-height: 1px;
					max-width: 1px;
				}
			`);

			target.append(style);
		};

		// Helper function
		window.html = string =>
		{
			const template = document.createElement("template");
			template.innerHTML = string;
			return template.content;
		};

		// Helper function
		window.prependRandomChildren = (target = document.body) =>
		{
			const randomNumber = (min, max) => Math.round(Math.random() * (max - min) + min);

			const fragment = document.createDocumentFragment();
			const length = randomNumber(5, 20);

			Array.from({length}).forEach(() =>
			{
				const child = document.createElement("div");
				const grandchild = document.createElement("div");
				grandchild.style.height = `${randomNumber(100, 500)}px`;
				grandchild.style.width = `${randomNumber(100, 500)}px`;
				child.append(grandchild);
				fragment.append(child);
			});

			target.prepend(fragment);
		};

		window.fixtureSelector = "[data-sizing-fixture]";
		window.voidElements = Object.keys(voidElementsMap);

		if (window.DOMMaxSize)
		{
			window.getMaxHeight = DOMMaxSize.getMaxHeight;
			window.getMaxSize = DOMMaxSize.getMaxSize;
			window.getMaxWidth = DOMMaxSize.getMaxWidth;
		}
	}, voidElements);
});



afterEach(runInBrowser(() => document.body.childNodes.forEach(child => child.remove())));



after(async () =>
{
	let coverage = await page.coverage.stopJSCoverage();

	// Exclude tools
	coverage = coverage.filter(({url}) => !url.includes("chai"));

	puppeteerCoverage.write(coverage);

	browser.close();
});



it("is a (bundled) object of functions", runInBrowser(() =>
{
	expect(window.DOMMaxSize).to.be.an("object");
	expect(window.DOMMaxSize).to.have.all.keys("getMaxHeight", "getMaxSize", "getMaxWidth");
	expect(window.DOMMaxSize.getMaxHeight).to.be.a("function");
	expect(window.DOMMaxSize.getMaxSize).to.be.a("function");
	expect(window.DOMMaxSize.getMaxWidth).to.be.a("function");
}));



describe("Arguments", () =>
{
	it("accepts no value", runInBrowser(() =>
	{
		expect(() => getMaxHeight()).not.to.throw();
		expect(() => getMaxSize()).not.to.throw();
		expect(() => getMaxWidth()).not.to.throw();
	}));



	it("accepts an HTMLElement", runInBrowser(() =>
	{
		["a", "b", "div"].forEach(tagName =>
		{
			const element = document.createElement(tagName);
			document.body.prepend(element);

			expect(() => getMaxHeight(element)).not.to.throw();
			expect(() => getMaxSize(element)).not.to.throw();
			expect(() => getMaxWidth(element)).not.to.throw();
		});
	}));



	it("rejects a non-HTMLElement", runInBrowser(() =>
	{
		const nodes =
		[
			"HTMLElement",
			Symbol("HTMLElement"),
			{},
			[],
			/regex/,
			true,
			1,
			null,
			// `undefined` would result in the default value
			document.createComment("data"),
			document.createDocumentFragment(),
			document.createProcessingInstruction("target", "data"),
			document.createTextNode("data"),
			document.implementation.createDocument("namespaceURI", "qualifiedNameStr"),
			document.implementation.createDocument("namespaceURI", "qualifiedNameStr").createCDATASection("data"),
			document.implementation.createDocumentType("qualifiedNameStr", "publicId", "systemId"),
			document.implementation.createHTMLDocument("title")
		];

		nodes.forEach(node =>
		{
			expect(() => getMaxHeight(node)).to.throw(TypeError);
			expect(() => getMaxSize(node)).to.throw(TypeError);
			expect(() => getMaxWidth(node)).to.throw(TypeError);
		});
	}));



	it("rejects a detached element", runInBrowser(() =>
	{
		const element = document.createElement("div");

		expect(() => getMaxHeight(element)).to.throw(TypeError);
		expect(() => getMaxSize(element)).to.throw(TypeError);
		expect(() => getMaxWidth(element)).to.throw(TypeError);
	}));



	it("rejects a void element", runInBrowser(() =>
	{
		voidElements.forEach(tagName =>
		{
			const element = document.createElement(tagName);
			document.body.prepend(element);

			expect(() => getMaxHeight(element)).to.throw(TypeError);
			expect(() => getMaxSize(element)).to.throw(TypeError);
			expect(() => getMaxWidth(element)).to.throw(TypeError);
		});
	}));



	it("rejects an element with a shadowRoot", runInBrowser(() =>
	{
		const element = document.createElement("div");
		element.attachShadow({mode: "open"});
		document.body.prepend(element);

		expect(() => getMaxHeight(element)).to.throw(TypeError);
		expect(() => getMaxSize(element)).to.throw(TypeError);
		expect(() => getMaxWidth(element)).to.throw(TypeError);
	}));
});



describe("HTMLBodyElement", () =>
{
	it("is supported", runInBrowser(() =>
	{
		expect(getMaxHeight()).to.be.above(10000);
		expect(getMaxSize()).to.have.a.property("height").that.is.above(10000);
		expect(getMaxSize()).to.have.a.property("width").that.is.above(10000);
		expect(getMaxWidth()).to.be.above(10000);
	}));


	it("is supported with children and a problematic stylesheet", runInBrowser(() =>
	{
		prependRandomChildren();
		appendProblematicStyles();

		expect(getMaxHeight()).to.be.above(10000);
		expect(getMaxSize()).to.have.a.property("height").that.is.above(10000);
		expect(getMaxSize()).to.have.a.property("width").that.is.above(10000);
		expect(getMaxWidth()).to.be.above(10000);
	}));



	it("has its fixture removed", runInBrowser(() =>
	{
		Object.keys(DOMMaxSize).forEach(func =>
		{
			window[func]();
			expect(document.querySelectorAll(fixtureSelector)).to.be.empty;
		});
	}));
});



describe("HTMLElement", () =>
{
	beforeEach(runInBrowser(() => document.body.prepend(html`
		<div
			id="target"
			style="max-height:100px; max-width:100px"
		></div>
	`)));



	describe("(unnested)", () =>
	{
		it("is supported", runInBrowser(() =>
		{
			const element = document.getElementById("target");

			expect(getMaxHeight(element)).to.equal(100);
			expect(getMaxSize(element)).to.have.a.property("height").that.equals(100);
			expect(getMaxSize(element)).to.have.a.property("width").that.equals(100);
			expect(getMaxWidth(element)).to.equal(100);
		}));



		it("is supported with children and a problematic stylesheet", runInBrowser(() =>
		{
			prependRandomChildren();
			appendProblematicStyles();

			const element = document.getElementById("target");

			expect(getMaxHeight(element)).to.equal(100);
			expect(getMaxSize(element)).to.have.a.property("height").that.equals(100);
			expect(getMaxSize(element)).to.have.a.property("width").that.equals(100);
			expect(getMaxWidth(element)).to.equal(100);
		}));



		it("has its fixture removed", runInBrowser(() =>
		{
			const element = document.getElementById("target");

			Object.keys(DOMMaxSize).forEach(func =>
			{
				window[func](element);
				expect(document.querySelectorAll(fixtureSelector)).to.be.empty;
			});
		}));
	});



	describe("(nested)", () =>
	{
		beforeEach(runInBrowser(() => document.body.prepend(html`
			<div style="display:flex; max-height:100px">
				<div
					id="target"
					style="max-width:100px"
				></div>
			</div>
		`)));



		it("is supported", runInBrowser(() =>
		{
			const element = document.getElementById("target");

			expect(getMaxHeight(element)).to.equal(100);
			expect(getMaxSize(element)).to.have.a.property("height").that.equals(100);
			expect(getMaxSize(element)).to.have.a.property("width").that.equals(100);
			expect(getMaxWidth(element)).to.equal(100);
		}));



		it("is supported with children and a problematic stylesheet", runInBrowser(() =>
		{
			prependRandomChildren();
			appendProblematicStyles();

			const element = document.getElementById("target");

			expect(getMaxHeight(element)).to.equal(100);
			expect(getMaxSize(element)).to.have.a.property("height").that.equals(100);
			expect(getMaxSize(element)).to.have.a.property("width").that.equals(100);
			expect(getMaxWidth(element)).to.equal(100);
		}));



		it("has its fixture removed", runInBrowser(() =>
		{
			const element = document.getElementById("target");

			Object.keys(DOMMaxSize).forEach(func =>
			{
				window[func](element);
				expect(document.querySelectorAll(fixtureSelector)).to.be.empty;
			});
		}));
	});
});



describe("Sizing Fixture", () =>
{
	it("can be selected explicitly", runInBrowser(() => new Promise((resolve, reject) =>
	{
		const callback = (mutations, observer) =>
		{
			let error;

			try
			{
				const fixtures = mutations.reduce((result, {addedNodes}) =>
				{
					addedNodes = Array.from(addedNodes);
					result.push(...addedNodes.filter(node => node.matches(fixtureSelector)));
					return result;
				}, []);

				expect(fixtures).not.to.be.empty;
			}
			catch(_error)
			{
				error = _error;
			}
			finally
			{
				observer.disconnect();

				if (error)
				{
					reject(error);
				}
				else
				{
					resolve();
				}
			}
		};

		new MutationObserver(callback).observe(document.body, {childList: true});

		getMaxSize();
	})));



	it("cannot have its critical styles overridden", runInBrowser(() =>
	{
		document.body.prepend(html`
			<style>
				${fixtureSelector} {
					height: 0 !important;
					max-height: 0 !important;
					max-width: 0 !important;
					width: 0 !important;
				}
			</style>
		`);

		expect(getMaxHeight()).to.be.above(10000);
		expect(getMaxSize()).to.have.a.property("height").that.is.above(10000);
		expect(getMaxSize()).to.have.a.property("width").that.is.above(10000);
		expect(getMaxWidth()).to.be.above(10000);
	}));
});
