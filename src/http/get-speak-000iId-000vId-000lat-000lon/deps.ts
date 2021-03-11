export { S3 as AWSS3 } from "https://deno.land/x/aws_sdk@v3.6.0.0/client-s3/S3.ts";
export { Polly as AWSPolly } from "https://deno.land/x/aws_sdk@v3.6.0.0/client-polly/Polly.ts";

import * as _sbd from "https://unpkg.com/sbd@1.0.18/dist/sbd.js";
import * as _lodash from "https://deno.land/x/lodash@4.17.19/lodash.js";

export const sbd = {
  ..._sbd,
};

export const _ = {
  ..._lodash,
};
