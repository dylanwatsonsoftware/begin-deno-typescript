const axios = require("axios");

const SUPPORTED_IMAGES_TYPES = ["jpg", "jpeg", "png"];

const WIKIPEDIA = "http://en.wikipedia.org";
const WIKIDATA = "https://www.wikidata.org";

const IMAGE_SIZE = 400;

/**
 * Retrieves the title of the wikipedia article for the given wikidata ID
 *
 * @param wikidata wikidata ID
 * @returns {Promise<string | undefined>} title or undefined if the article was not found
 */
const getWikipediaArticleTitle = async (wikidata) => {
  if (!wikidata) {
    return;
  }

  try {
    const result = await axios.get(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks&ids=${wikidata}&sitefilter=enwiki`
    );

    const entities = result.data.entities;
    if (!entities || !entities[wikidata]) {
      console.info(`No wikidata found for ID ${wikidata}`);
      return;
    }

    const sitelinks = entities[wikidata].sitelinks;
    return sitelinks["enwiki"].title;
  } catch (err) {
    console.error(
      `Failed to get wikipedia article for wikidata ID ${wikidata}`,
      err
    );
  }
};

/**
 * Retrieves all images available for the given wikidata/wikipedia article
 *
 * @param wikidataId wikidata ID
 * @param wikipediaTitle wikipedia title
 * @returns {Promise<[{width: *, source: *, height: *}] | undefined>}
 */
const getImages = async ({ wikidataId, wikipediaTitle }) => {
  const images = [];

  if (wikidataId) {
    images.push(...(await getWikiImages(WIKIDATA, wikidataId)));
  }

  if (wikipediaTitle) {
    images.push(...(await getWikiImages(WIKIPEDIA, wikipediaTitle)));
  }

  return images;
};

/**
 * Retrieves the images for a MediaWiki service
 *
 * @param wikiUrl base URL for the service
 * @param title image title/identifier
 * @returns {Promise<{width: *, source: *, height: *} | undefined>} image source or undefined if no image was found
 */
async function getWikiImages(wikiUrl, title) {
  try {
    const result = await axios.get(
      `${wikiUrl}/w/api.php?action=query&prop=images&format=json&titles=${title}`
    );

    const pages = result.data.query.pages;

    const imageTitles = [];
    for (const page of Object.keys(pages)) {
      const images = pages[page].images || [];
      imageTitles.push(...images.map((image) => image.title));
    }

    const urls = await Promise.all(
      imageTitles
        .filter(isSupportedImage)
        .map((title) => getImageSource(wikiUrl, title))
    );
    return urls.filter((url) => url);
  } catch (err) {
    console.warn(`Failed to get wikidata image`, err);
    return [];
  }
}

/**
 * Retrieves the URL for a MediaWiki image
 *
 * @param wikiUrl wiki base URL
 * @param title image title/identifier
 * @returns {Promise<{width: *, source: *, height: *} | undefined>} image source or undefined if no image was found
 */
async function getImageSource(wikiUrl, title) {
  try {
    const result = await axios.get(
      `${wikiUrl}/w/api.php?action=query&format=json&formatversion=2&prop=pageimages|pageterms&piprop=thumbnail&pithumbsize=${IMAGE_SIZE}&titles=${title}`
    );

    const pages = result.data.query.pages;
    for (const page of Object.keys(pages)) {
      const thumbnail = pages[page].thumbnail;

      if (thumbnail) {
        return {
          source: thumbnail.source,
          width: thumbnail.width,
          height: thumbnail.height,
        };
      }
    }
  } catch (err) {
    console.warn(`Failed to get Wikidata image URL for ${title}`, err);
  }
}

function isSupportedImage(title) {
  for (const fileType of SUPPORTED_IMAGES_TYPES) {
    if (title.endsWith(fileType)) {
      return true;
    }
  }

  return false;
}

exports.getImages = getImages;
exports.getWikipediaArticleTitle = getWikipediaArticleTitle;
