@app
begin-app

@http
get /
get /speak/:iId/:vId/:lat/:lon

@tables
data
  scopeID *String
  dataID **String
  ttl TTL
