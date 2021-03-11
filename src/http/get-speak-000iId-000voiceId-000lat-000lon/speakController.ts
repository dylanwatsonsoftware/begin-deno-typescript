
import * as wikiText from "../../shared/lib/wikiText.ts";
import wikidata from "../../shared/lib/wikidata.service.ts";
import mapbox from "../../shared/lib/mapbox.service.ts";

import AWS from "../../shared/lib/whereami-aws.ts";
import metrics from "../../shared/lib/metrics.ts";

import { ApiError } from "../../shared/lib/error.ts";
import {
  GatherWikiImagesOutput,
  GatherWikiTextOutput,
  GetPlaceInput,
  GetPlaceOutput,
  SpeakResponse,
  StateError,
  SynthesizeSpeechInput,
  SynthesizeSpeechOutput,
} from "./speakResponse.ts";

export const getPlace = async (input: GetPlaceInput): Promise<{ state: GetPlaceOutput } | { error: StateError }> => {
  const { latitude, longitude } = input;
  console.log("Getting Place for", latitude, longitude);

  try {
    const geocoded = await mapbox.reverseGeocode({ latitude, longitude });

    if (!geocoded) {
      return {
        error: {
          message: "Getting place",
          err: `Nothing found for latitude: ${latitude}, longitude: ${longitude}.`,
        },
      };
    }

    return {
      state: {
        ...input,
        state: geocoded.state,
        locality: geocoded.locality,
        place: geocoded.place,
        wikidata: geocoded.wikidata,
      },
    };
  } catch (err) {
    return {
      error: {
        message: "Getting place",
        err: err.message,
        status: err.response && err.response.status,
      },
    };
  }
};

/**
 * @param {GetPlaceOutput} input
 * @returns {Promise<{state: GatherWikiTextOutput}|{ error: StateError }>}
 */
const gatherWikiText = async (
  input: GetPlaceOutput
): Promise<{ state: GatherWikiTextOutput } | { error: StateError }> => {
  const locationText = (await wikidata.getWikipediaArticleTitle(input.wikidata)) || input.locality + ", " + input.state;

  const rawWikiText = await getRawWikiText(locationText, input.state, input.latitude + "|" + input.longitude);

  if (!rawWikiText.extract) {
    return {
      error: {
        message: "Getting place information",
        err: "Looks like the place doesn't exist",
        status: 404,
      },
    };
  }

  const textFromWiki = await wikiText.transform(locationText, rawWikiText);

  return { state: { ...input, textFromWiki } };
};

/**
 * @param {GatherWikiTextOutput} input
 * @returns {Promise<{state: GatherWikiImagesOutput}|{ error: StateError }>}
 */
const gatherWikiImages = async (
  input: GatherWikiTextOutput
): Promise<{ state: GatherWikiImagesOutput } | { error: StateError }> => {
  const images = await wikidata.getImages({
    wikipediaTitle: input.textFromWiki.locationText,
    wikidataId: input.wikidata,
  });

  return { state: { ...input, thumbnail: images[0] } }; // TODO: Use all the images!
};

/**
 * @param {string} locationText
 * @param {string} stateName
 * @param {string} coords
 */
export async function getRawWikiText(locationText: string, stateName: string, coords: string) {
  try {
    return getPage(await wikiText.getByTitle(locationText, stateName));
  } catch (e) {
    console.warn("Failed to get location", e);
    return getPage(await wikiText.getAroundLocation(coords));
  }
}

/**
 * @param {any} textFromWiki
 */
export const getPage = (textFromWiki: any) => {
  const { pages } = textFromWiki.data.query;

  if (!pages) {
    throw new ApiError("No pages found to speak");
  }

  const page = Object.keys(pages).map((key) => pages[key])[0];

  if (!page) {
    throw new ApiError("No page found to speak");
  }

  return page;
};

async function synthesizeSpeech(
  input: SynthesizeSpeechInput
): Promise<{ state: SynthesizeSpeechOutput } | { error: StateError }> {
  const voiceId = input.voiceId || "Brian";

  const mp3FileName = input.textFromWiki.locationText?.replace(", ", "") + voiceId + ".mp3";

  const urlFromS3 = await tryGetMp3FromS3(mp3FileName);
  if (urlFromS3) {
    console.log("Used mp3 cached from S3", urlFromS3);
    return {
      state: {
        ...input,
        speechUrl: urlFromS3,
        cacheHit: true,
        filename: mp3FileName,
      },
    };
  }

  const ssml = `<speak>${input.textFromWiki.text}</speak>`;
  console.log({ ssml });

  console.log(`Generating ${voiceId} polly speech for ${input.textFromWiki.locationText}`);

  const pollyResponse = await AWS.Polly.synthesizeSpeech({
    Engine: "neural",
    TextType: "ssml",
    Text: ssml,
    OutputFormat: "mp3",
    VoiceId: voiceId, // https://docs.aws.amazon.com/polly/latest/dg/voicelist.html
  });

  console.log("polly data: ", pollyResponse);

  let speechUrl = "";
  if (pollyResponse.AudioStream) {
    const s3Params = {
      Bucket: "whereami-speech",
      Key: mp3FileName,
      Body: pollyResponse.AudioStream,
      ACL: "public-read",
    };

    const s3Result = await AWS.S3.upload(s3Params);

    speechUrl = s3Result.Location;
  }

  return {
    state: { ...input, speechUrl, cacheHit: false, filename: mp3FileName },
  };
}

/**
 * @param {string} filename
 */
async function tryGetMp3FromS3(filename: string) {
  const params = {
    Bucket: "whereami-speech",
    Key: filename,
  };

  return AWS.S3.tryGetUrl(params);
}

/**
 * Get a function that maps the current state to the next state by calling the
 * given mapping function, unless there has been an error in which case it
 * skips calling the mapping function and just returns that error.
 *
 * https://medium.com/@naveenkumarmuguda/railway-oriented-programming-a-powerful-functional-programming-pattern-ab454e467f31
 *
 * @template CurrentState
 * @template NextState
 * @param {function(CurrentState): Promise<{state: NextState}|{ error: StateError }>} mapping
 * @returns {function({state: CurrentState, error?: StateError}): Promise<{state: NextState, error: StateError }>}
 */
function chooChoo<CurrentState, NextState>(
  mapping: (arg0: CurrentState) => Promise<{ state: NextState } | { error: StateError }>
): (arg0: { state: CurrentState; error?: StateError }) => Promise<{ state: NextState; error: StateError }> {
  return async (input) => {
    // @ts-ignore
    const { state, error } = input;
    const expressTrain = !!error;
    const output = expressTrain ? { error } : await mapping(state);
    // @ts-ignore
    return { state: output.state, error: output.error };
  };
}

/**
 * @param {{ instanceId: string, latitude: number, longitude: number, voiceId: string }} speakingDetails
 * @returns {Promise<SpeakResponse>}
 */
export const speak = async (speakingDetails: {
  instanceId: string;
  latitude: number;
  longitude: number;
  voiceId: string;
}): Promise<SpeakResponse> => {
  const voiceId = speakingDetails.voiceId ? speakingDetails.voiceId.replace(/[^\w\s]/gi, "") : "Brian";

  try {
    const result = await Promise.resolve({
      state: {
        latitude: speakingDetails.latitude,
        longitude: speakingDetails.longitude,
        voiceId: voiceId,
      },
    })
      .then(chooChoo(getPlace))
      .then(chooChoo(gatherWikiText))
      .then(chooChoo(gatherWikiImages))
      .then(chooChoo(synthesizeSpeech));

    const error = result.error;
    if (error) {
      if (error.status === 404) {
        await metrics.writeMetrics({
          instanceId: speakingDetails.instanceId,
          locationRequestTime: new Date().getTime(),
          latitude: speakingDetails.latitude,
          longitude: speakingDetails.longitude,
          locality: undefined,
          stateName: undefined,
          voice: voiceId,
          filename: undefined,
          cacheHit: undefined,
          locationMiss: true,
        });
      }

      throw new ApiError(error.message, error.status || 500, error.err);
    }
    const state = result.state;

    await metrics.writeMetrics({
      instanceId: speakingDetails.instanceId,
      locationRequestTime: new Date().getTime(),
      latitude: speakingDetails.latitude,
      longitude: speakingDetails.longitude,
      locality: state.locality,
      stateName: state.state,
      voice: voiceId,
      filename: state.filename,
      cacheHit: state.cacheHit,
      locationMiss: false,
    });

    return {
      locality: state.locality,
      stateName: state.state,
      speechUrl: state.speechUrl,
      thumbnail: state.thumbnail ? state.thumbnail.source : undefined,
      pageurl: state.textFromWiki.pageurl,
      sections: state.textFromWiki.sections,
    };
  } catch (err) {
    if (err.name === "ApiError") {
      throw err;
    }

    console.error("error generating speech", err);
    throw new ApiError(err.message, 500, err);
  }
};
