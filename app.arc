@app
begin-app

@http
get /
get /speak/:iId/:voiceId/:lat/:lon

@tables
data
  scopeID *String
  dataID **String
  ttl TTL
