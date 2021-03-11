const dynamoose = require("dynamoose");
const { v4: uuidv4 } = require("uuid");

exports.writeMetrics = async (metrics) => {
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
    suffix: "-" + process.env.ENV,
  });

  metrics = { id: uuidv4(), ...metrics };

  return await new Metric(metrics).save();
};
