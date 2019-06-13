import isDOMDetachedNode from "is-dom-detached";
import isDOMNode from "is-dom";
import voidElements from "void-elements";

export const getMaxHeight = element => getMax(element, METRIC_HEIGHT);
export const getMaxSize = element => getMax(element, METRIC_HEIGHT, METRIC_WIDTH);
export const getMaxWidth = element => getMax(element, METRIC_WIDTH);



// PRIVATE



const compute = (element, fixture, metrics, elementIsBody) =>
{
	const results = metrics.reduce((result, metric) =>
	{
		result[metric.toLowerCase()] = elementIsBody ? fixture[`offset${metric}`] : element[`offset${metric}`];
		return result;
	}, {});

	if (metrics.length === 1)
	{
		return results[metrics[0].toLowerCase()];
	}
	else
	{
		return results;
	}
};



const createFixture = (doc, metrics, elementIsBody) =>
{
	const styles =
	{
		"max-height": "none",
		"max-width": "none",
		opacity: "0",
		"pointer-events": "none"
	};

	metrics.forEach(metric => styles[metric.toLowerCase()] = `${1_000_000_000}px`);

	if (metrics.length === 1)
	{
		const otherMetric = metrics[0] === METRIC_HEIGHT ? METRIC_WIDTH : METRIC_HEIGHT;

		styles[otherMetric.toLowerCase()] = "0";
	}

	if (elementIsBody)
	{
		Object.assign(styles,
		{
			left: "0",
			position: "absolute",
			top: "0"
		});
	}

	const fixture = doc.createElement("div");
	fixture.dataset.sizingFixture = true; // for any CSS special-casing

	Object.entries(styles).forEach(([property, value]) => fixture.style.setProperty(property, value, "important"));

	return fixture;
};



const getMax = (element=document?.body, ...metrics) =>
{
	if (!isDOMNode(element) || element.nodeType!==Node.ELEMENT_NODE)
	{
		throw new TypeError("Element must be an HTMLElement");
	}
	else if (isDOMDetachedNode(element))
	{
		throw new TypeError("Element must be a attached to a DOM tree");
	}
	else if (element.tagName.toLowerCase() in voidElements)
	{
		throw new TypeError("Element must not be a void element");
	}
	else if (isDOMNode(element.shadowRoot))
	{
		throw new TypeError("Element must not have a shadowRoot");
	}
	else
	{
		const doc = element.ownerDocument;
		const elementIsBody = element === doc.body;

		const fixture = createFixture(doc, metrics, elementIsBody);
		element.prepend(fixture); // will consistently be firstChild, to avoid any `:first-child` CSS issues

		const result = compute(element, fixture, metrics, elementIsBody);

		fixture.remove();

		return result;
	}
};



// @todo use Symbol() ?
const METRIC_HEIGHT = "Height";
const METRIC_WIDTH = "Width";
