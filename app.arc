@app
begin-app

@http
get /
get /speak/:instanceId/:voiceId/:latitude/:longitude

@tables
data
  scopeID *String
  dataID **String
  ttl TTL