const axios = require("axios");

// https://docs.mapbox.com/api/search/#data-types
const FEATURE_TYPES = ["locality", "place", "region"].join(",");
const TOKEN =
  "pk.eyJ1IjoiY2FtcGJla2kiLCJhIjoiY2tlOXhkcGpjMWl4aTJ6cG93c2NzdTBwOCJ9.qK7bephdrHnG47KETeN0jA";

/**
 * Reverse geocodes a location
 *
 * @param latitude
 * @param longitude
 * @returns {Promise<{locality: string, place: string, state: string, wikidata: string}|null>}
 */
const reverseGeocode = async function ({ latitude, longitude }) {
  const result = await axios.get(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?types=${FEATURE_TYPES}&access_token=${TOKEN}`
  );

  const data = result.data;
  if (!data.features) {
    console.info("No features found in Mapbox response", data);
    return null;
  }

  return parse(data);
};

/**
 * Parses a mapbox response
 *
 * @param res the Mapbox response
 * @returns {{locality: *, place: *, state: *, wikidata: *}|null}
 */
const parse = function (res) {
  if (!res) return null;

  // Find the state
  const region = res.features.find((f) => f.place_type.includes("region"));
  if (!region) return null;

  // Find location info in the locality (suburb) or place (city). Favour locality as it's more specific.
  for (const type of ["locality", "place"]) {
    const feature = res.features.find((f) => f.place_type.includes(type));
    if (feature) {
      return {
        place: feature.place_name,
        locality: feature.text,
        state: region.text,
        wikidata: feature.properties.wikidata,
      };
    }
  }

  return null;
};

exports.reverseGeocode = reverseGeocode;
exports.parse = parse;
