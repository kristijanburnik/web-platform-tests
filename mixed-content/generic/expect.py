import json

def main(request, response):
  if "action" in request.GET:
    content_type = "application/json"
    if "content_type" in request.GET:
      content_type = request.GET["content_type"]

    response.add_required_headers = False
    response.writer.write_status(200)
    response.writer.write_header("content-type", content_type)
    response.writer.write_header("cache-control", "no-cache; must-revalidate")
    response.writer.end_headers()

    key = request.GET["key"]

    if request.GET["action"] == "put":
      value = request.GET["value"]
      request.server.stash.take(key=key)
      request.server.stash.put(key=key, value=value)
      response_json = json.dumps({"status": "success", "result": key})
    elif request.GET["action"] == "take":
      value = request.server.stash.take(key=key)
      if value is None:
        status = "error"
      else:
        status = "success"
      response_json = json.dumps({"status": status, "result": value})
    elif request.GET["action"] == "purge":
      value = request.server.stash.take(key=key)
      response_json = ""

    response.writer.write(response_json)

