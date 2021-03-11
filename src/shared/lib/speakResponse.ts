export interface GetPlaceInput {
  voiceId: string;
  latitude: number;
  longitude: number;
}

export interface GetPlaceOutput extends GetPlaceInput {
  place: string;
  locality: string;
  state: string;
  wikidata?: string;
}

export type GatherWikiTextInput = GetPlaceOutput;

export interface GatherWikiTextOutput extends GatherWikiTextInput {
  textFromWiki: {
    text: string;
    thumbnail?: string;
    sections: { type: string; text: string }[];
    locationText?: string;
    pageurl: string;
  };
}

export type GatherWikiImagesInput = GatherWikiTextOutput;

export interface GatherWikiImagesOutput extends GatherWikiImagesInput {
  thumbnail?: {
    source: string;
    width: string;
    height: string;
  };
}

export type SynthesizeSpeechInput = GatherWikiImagesOutput;

export interface SynthesizeSpeechOutput extends SynthesizeSpeechInput {
  speechUrl: string;
  cacheHit: boolean;
  filename: string;
}

export interface SpeakResponse {
  speechUrl: string;
  locality: string;
  stateName: string;
  thumbnail?: string;
  pageurl: string;
  sections: { type: string; text: string }[];
}

export interface StateError {
  message: string;
  status?: number;
  err: any;
}

export interface WikiTextState {
  locationText: string;
  sections: Section[];
  text: string;
  pageurl: string;
}

export interface Section {
  type: string;
  text: string;
}
