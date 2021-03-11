const test = require("ava");
const sinon = require("sinon");

const speak = require("./speakController");
const wikiText = require("./lib/wikiText");
const metrics = require("./lib/metrics");

const axios = require("axios");

const AWS = speak.AWS;

const urlCachedInS3 = "url.com/cached-in-s3-ages-ago.mp3";
const justUploadedToS3 = "url.com/uploaded-to-s3-just-then.mp3";

const places = require("./speakController.fixtures").places;

let fakePolly;
let fakeUpload;
let fakeMetrics;

fakePolly = sinon.fake.resolves({
  AudioStream: Buffer.from(""),
});
sinon.replace(AWS.Polly, "synthesizeSpeech", fakePolly);

fakeUpload = sinon.fake.resolves({
  Location: justUploadedToS3,
});

fakeMetrics = sinon.fake.resolves({});
metrics.writeMetrics = fakeMetrics;

let sandbox;

test.beforeEach(() => {
  sandbox = sinon.createSandbox();
  metrics.writeMetrics = fakeMetrics;
});

test.afterEach(() => {
  sandbox.restore();
});

test("show an error when we cant get the place", async (t) => {
  const axiosStub = sandbox.stub(axios, "get");
  axiosStub.onCall(0).returns({
    data: {
      html_attributions: [],
      results: [],
      status: "INVALID_REQUEST",
    },
  });

  const e = await t.throwsAsync(() =>
    speak.speak({
      latitude: -28.215401,
      longitude: 152.0354923,
      voiceId: "Brian",
    })
  );

  t.is(axiosStub.callCount, 1);

  t.is(e.message, "Getting place");
  t.is(e.status, 500);
});

test("that the input parameters are correctly set for speech", async (t) => {
  const axiosStub = sandbox.stub(axios, "get");
  axiosStub.onCall(0).returns(places);
  AWS.S3.upload = fakeUpload;
  AWS.S3.client.getSignedUrl = sinon.fake.returns(undefined);
  AWS.S3.client.headObject = (params) => ({
    promise: () => {
      throw { code: "NotFound" };
    },
  });
  wikiText.getByTitle = sinon.fake.returns(buildWikiData("Gregerton"));

  const speakResult = await speak.speak({
    latitude: -28.215401,
    longitude: 152.0354923,
    voiceId: "Brian",
  });

  t.truthy(fakePolly.args[0], "Polly should have been called");
  t.is(
    fakePolly.args[0][0].Text,
    "<speak>Welcome to Gregerton, Gregtown. Gregerton is the coolest!!!</speak>"
  );

  t.is(speakResult.speechUrl, justUploadedToS3);
});

test("that the cache in S3 is used if it exists", async (t) => {
  const axiosStub = sandbox.stub(axios, "get");
  let placeClone = { ...places };
  placeClone.locality = "Cached";
  axiosStub.onCall(0).returns(placeClone);
  AWS.S3.client.getSignedUrl = sinon.fake.returns(urlCachedInS3);
  AWS.S3.client.headObject = (params) => ({
    promise: () => {
      return true;
    },
  });
  wikiText.getByTitle = sinon.fake.returns(buildWikiData("Cached"));

  const speakResult = await speak.speak({
    latitude: -28.215401,
    longitude: 152.0354923,
    voiceId: "Brian",
  });

  t.is(speakResult.speechUrl, urlCachedInS3);
});

function buildWikiData(name) {
  return {
    data: {
      query: {
        pages: {
          138056: {
            pageid: 138056,
            ns: 0,
            title: `${name}, Gregtown`,
            extract: `${name} is the coolest!!!`,
          },
        },
      },
    },
  };
}
