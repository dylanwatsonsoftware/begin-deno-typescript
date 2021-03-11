import * as dynamoose from "dynamoose";
import { v4 } from "uuid";

export const writeMetrics = async (metrics: any) => {
  const metricSchema = new dynamoose.Schema(
    {
      instanceId: String,
      locationRequestTime: Number,
      latitude: Number,
      longitude: Number,
      locality: String,
      stateName: String,
      voice: String,
      filename: String,
      cacheHit: Boolean,
      locationMiss: Boolean,
    },
    {
      saveUnknown: true,
      timestamps: false,
    }
  );

  const Metric = dynamoose.model("youareheremetrics", metricSchema, {
    create: false,
    suffix: "-" + Deno.env.get('ENV'),
  });

  metrics = { id: uuidv4(), ...metrics };

  return await new Metric(metrics).save();
};
