import { speak } from "./speakController.ts";

export async function handler(req: { pathParameters: any }) {
  try {
    if (
      !req.pathParameters.instanceId &&
      !req.pathParameters.voiceId &&
      !req.pathParameters.latitude &&
      !req.pathParameters.longitude
    ) {
      console.error("Missing parameters", req.pathParameters);
      return {
        status: 500,
      };
    }

    const instanceId = req.pathParameters.instanceId;
    const voiceId = req.pathParameters.voiceId ? req.pathParameters.voiceId.replace(/[^\w\s]/gi, "") : "Amy";
    const latitude = parseFloat(req.pathParameters.latitude);
    const longitude = parseFloat(req.pathParameters.longitude);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new Error("Invalid coordinates");
    }

    console.log(`${voiceId} is speaking at ${latitude}:${longitude}`);
    const result = await speak({
      instanceId,
      latitude,
      longitude,
      voiceId,
    });
    return {
      status: 200,
      body: {
        latitude,
        longitude,
        status: 200,
        // ...result,
      },
    };
  } catch (error) {
    console.error(error);
    return {
      status: error.status || 500,
      body: {
        latitude: req.pathParameters.latitude,
        longitude: req.pathParameters.longitude,
        status: error.status || 500,
        error: error.message,
      },
    };
  }
  //   let body = `
  // <!doctype html>
  // <html lang=en>
  //     ${req.pathParameters.instanceId}/${req.pathParameters.voiceId}/${req.pathParameters.latitude}/${req.pathParameters.longitude}
  // </html>
  // `;

  //   return {
  //     statusCode: 200,
  //     headers: {
  //       "content-type": "text/html; charset=utf8",
  //       "cache-control": "no-cache, no-store, must-revalidate, max-age=0, s-maxage=0",
  //     },
  //     body,
  //   };
}

// Example responses

/* Forward requester to a new path
export async function handler (req: object) {
  return {
    statusCode: 302,
    headers: {
      'location': '/about',
      'cache-control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0'
    }
  }
}
*/

/* Respond with successful resource creation
export async function handler (req: object) {
  return {
    statusCode: 201,
    headers: {
      'content-type': 'application/json; charset=utf8',
      'cache-control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0'
    },
    body: JSON.stringify({ok: true})
  }
}
*/

/* Deliver client-side JS
export async function handler (req: object) {
  return {
    headers: {
      'content-type': 'text/javascript; charset=utf8',
      'cache-control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0'
    },
    body: 'console.log("Hello world!")',
  }
}
*/
