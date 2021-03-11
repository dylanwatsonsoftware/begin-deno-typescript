import { _, sbd } from "../deps.ts";
import { ApiError } from "./error.ts";
import { WikiTextState, Section } from "./speakResponse.ts";

const getByTitle = async (locationText: string, stateName: string) => {
  console.log(`Getting wikipedia page for location: ${locationText}`);
  let wikiText: any = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages|extracts|info&pithumbsize=900&format=json&explaintext=true&exsectionformat=wiki&titles=${locationText}&redirects=true&inprop=url`
  );

  // not found - some places only have a state - lets try that
  if (wikiText.data.query.pages["-1"]) {
    console.log(`Locality not found, trying state: ${locationText}`);
    wikiText = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages|extracts|info&pithumbsize=900&format=json&explaintext=true&exsectionformat=wiki&titles=${stateName}&redirects=true&inprop=url`
    );
  }

  return wikiText;
};

const getAroundLocation = async (coords: string) => {
  console.log(`Getting wikipedia page for coords: ${coords}`);
  const wikiText = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&generator=geosearch&prop=coordinates|pageimages|extracts|info&ggscoord=${coords}&format=json&exsectionformat=wiki&pithumbsize=900&redirects=true&inprop=url`
  );

  return wikiText;
};

/**
 * @param {string} locationText
 * @param {any} page
 * @returns {}
 */
const transform = (locationText: string, page: any): WikiTextState => {
  console.log(`Transforming text for ${locationText}`);
  try {
    let text = page.extract;
    locationText = page.title || locationText;

    // &amp; to and
    text = replaceAmp(text);

    let sections = textToSections(text);

    // welcome to xxx
    sections = addWelcomeTo(locationText, sections);

    if (sectionsToText(sections).length > 3000) {
      // only use 2 sentences from each section
      sections = shortenContent(sections);

      // only use the first 3000 characters (polly limitation)
      sections = onlyUseTheFirst3000Characters(sections);

      // if the last sentence is a heading, don't write it
      sections = maybeRemoveLastHeading(sections);
    }

    return {
      locationText,
      sections,
      text: sectionsToText(sections),
      pageurl: page.fullurl,
    };
  } catch (err) {
    console.warn("error parsing wiki", err);
    throw new ApiError("error parsing wiki", 500, err);
  }
};

/**
 * @param {string} transformedText
 */
const replaceAmp = (transformedText: string) => transformedText.replace(/&amp;/g, "and").replace(/&/g, "and");

/**
 * @param {string} text
 * @returns {Section[]}
 */
const textToSections = (text: string): Section[] => {
  const sectionArray = text.split(/(=+\s[\w\s\-/]*\s=+)/);
  const sections = [];

  // overview
  sections.push(...transformSectionContent(sectionArray.shift() || ""));

  for (let i = 0; i < sectionArray.length; i += 2) {
    const [heading, content] = sectionArray.slice(i, i + 2);
    if (headingIsWanted(heading) && content.trim()) {
      sections.push(transformSectionHeading(heading));
      sections.push(...transformSectionContent(content));
    }
  }

  return sections;
};

/**
 * @param {string} transformedText
 */
const addSpacesAfterFullStops = (transformedText: string) => transformedText.replace(/\.([^\s\d])/g, ". $1");

/**
 * @param {string} transformedText
 */
const removeCarriageReturns = (transformedText: string) => transformedText.replace(/\n/g, " ");

/**
 * @param {string} transformedText
 */
const removeBrackets = (transformedText: string) => transformedText.replace(/\([^)]*\)/g, "");

/**
 * @param {string} content
 * @returns {string[]} sentences
 */
const contentToSentences = (content: string): string[] =>
  _.flow([addSpacesAfterFullStops, removeCarriageReturns, removeBrackets, sbd.sentences])(content);

/**
 * @param {string} content
 * @returns {Section[]}
 *
 */
const transformSectionContent = (content: string): Section[] => {
  let sentences = contentToSentences(content);

  // U. S. to U.S.
  sentences = sentences.map(fixAbbreviations);

  return sentences.map((text: string) => ({ type: "content", text }));
};

/**
 * @param {string} heading
 */
const headingIsWanted = (heading: string) => {
  const unwantedHeadings = [
    "Geography",
    "Climate",
    "Demographics",
    "Economy",
    "Notes",
    "See also",
    "Further reading",
    "References",
    "External links",
    "Health and education",
    "Major roads",
    "Geology",
  ];

  return !unwantedHeadings.some((badHeading) => heading.includes(badHeading));
};

/**
 * @param {string} heading
 */
const transformSectionHeading = (heading: string) => {
  // === heading 3 === is now heading 3.
  heading = `${heading.replace(/^=+|=+$/g, "").trim()}.`;

  return { type: "heading", text: heading };
};

/**
 * @param {string} transformedText
 */
const fixAbbreviations = (transformedText: string) =>
  transformedText.replace(/(\w\.( |$))+/g, (match) => `${match.replace(/ /g, "")} `).trim();

/**
 * @param {string} locationText
 * @param {any[]} sections
 */
const addWelcomeTo = (locationText: string, sections: Section[]) => [
  { type: "welcome", text: `Welcome to ${locationText}.` },
  ...sections,
];

/**
 * @param {any[]} sections
 */
const sectionsToText = (sections: Section[]) => sections.map((section) => section.text).join(" ");

/**
 * @param {Section[]} sections
 * @returns {Section[]}
 */
const shortenContent = (sections: Section[]) => {
  let contentCount = 0;
  return sections.filter((section) => {
    contentCount = section.type === "content" ? contentCount + 1 : 0;
    return contentCount <= 2;
  });
};

/**
 * @param {Section[]} sections
 * @returns {Section[]}
 */
const onlyUseTheFirst3000Characters = (sections: Section[]) => {
  const result = [];
  let textLength = -1;

  for (const section of sections) {
    textLength += section.text.length + 1;
    if (textLength > 3000) {
      return result;
    }
    result.push(section);
  }

  return result;
};

const maybeRemoveLastHeading = (sections: Section[]): Section[] => {
  const copy = [...sections];
  const last = copy.pop();
  return last?.type === "heading" ? copy : sections;
};

const _getByTitle = getByTitle;
export { _getByTitle as getByTitle };
const _transform = transform;
export { _transform as transform };
const _getAroundLocation = getAroundLocation;
export { _getAroundLocation as getAroundLocation };
