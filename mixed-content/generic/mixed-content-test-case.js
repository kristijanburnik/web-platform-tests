function MixedContentTestCase(scenario, description, sanityChecker) {
  var insecureProtocol = "http:"
  var secureProtocol = "https:"

  var sameOriginHost = location.hostname;
  var crossOriginHost = "{{domains[www1]}}";

  var insecurePort = normalizePort(parseInt("{{ports[http][0]}}"));
  var securePort = normalizePort(parseInt("{{ports[https][0]}}"));

  var resourcePath = "/mixed-content/generic/expect.py";

  var endpoint = {
    "same-origin":
      location.origin + resourcePath,
    "same-host-https":
      secureProtocol + "//" + sameOriginHost + securePort + resourcePath,
    "same-host-http":
      insecureProtocol + "//" + sameOriginHost + insecurePort + resourcePath,
    "cross-origin-https":
      secureProtocol + "//" + crossOriginHost + securePort + resourcePath,
    "cross-origin-http":
      insecureProtocol + "//" + crossOriginHost + insecurePort + resourcePath
  };

  var resourceInvoker = {
    "a-tag": queryAnchor,
    "area-tag": queryArea,
    "fetch-request": queryFetch,
    "form-tag": queryForm,
    "iframe-tag": queryIframe,
    "img-tag":  queryImage,
    "script-tag": queryScript,
    "worker-request": queryWorker,
    "xhr-request": queryXhr,
    "audio-tag": queryAudio,
    "video-tag": queryVideo,
    "picture-tag": queryPicture,
    "object-tag": queryObject,
    "link-css-tag": queryLinkStylesheet,
    "link-prefetch-tag": queryLinkPrefetch
  };

  sanityChecker.checkScenario(scenario, resourceInvoker);

  var contentType = {
    "a-tag": "application/json",
    "area-tag": "application/json",
    "fetch-request": "application/json",
    "form-tag": "text/html",
    "iframe-tag": "application/json",
    "img-tag":  "image/png",
    "script-tag": "application/javascript",
    "worker-request": "application/javascript",
    "xhr-request": "application/json",
    "audio-tag": "audio/mpeg",
    "video-tag": "video/mp4",
    "picture-tag": "image/png",
    "object-tag": "application/octet-stream",
    "link-css-tag": "text/css",
    "link-prefetch-tag": "text/html"
  };

  var assertInvoker = {
    blocked: function(response, value) {
      // When the resource is blocked, it cannot tear down the key in the server
      // store. Therefore we expect to get back the value we sent in our
      // resource request announcement.
      assert_equals(response.status, "success",
                    "Announced key/value pair should be intact.");
      assert_equals(response.result, value,
                    "The received value should be what we announced earlier.");
    },
    allowed: function(response, value) {
      // If the resource is allowed then it will tear down the key in the server
      // store. This means when we try to read it, we will get an error.
      assert_equals(response.status, "error",
                    "Announced key/value pair should be destroyed.");
      assert_equals(response.result, null,
                    "The received value should be destroyed by the resource " +
                    "request.");
    }
  };

  var mixed_content_test = async_test(description);

  var t = {
    start : function() {
      // Response time estimation.
      const kNumEstimationRequests = 3;
      estimateResponseTime(endpoint['same-origin'], kNumEstimationRequests)
        .then(function(r) {
          var estimatedResponseTime = r.stats.avg;
          var key = guid();
          var value = guid();
          var announceResourceRequestUrl = endpoint['same-origin'] +
                                           "?action=put&key=" + key +
                                           "&value=" + value;
          var assertResourceRequestUrl = endpoint['same-origin'] +
                                        "?action=take&key=" + key;
          var resourceRequestUrl = endpoint[scenario.origin] +
                                   "?action=purge&key=" + key +
                                   "&content_type=" +
                                   contentType[scenario.subresource];
          var queryResource = resourceInvoker[scenario.subresource];

          // We send out the expectation to fetch some resource.
          xhrRequest(announceResourceRequestUrl)
            .then(function(response) {
              // Send out the real resource request.
              // This should tear down the key if it's not blocked.
              queryResource(resourceRequestUrl);

              // Wait for an estimated response time.
              return timeoutPromise(estimatedResponseTime);
            })
            .then(function() {
              // Send request to check if the key has been torn down.
              return xhrRequest(assertResourceRequestUrl);
            }, function(error) {
              console.warn("Resource request error.", error)
              // When queryResource fails, we also check the key state.
              return xhrRequest(assertResourceRequestUrl);
            })
            .then(function(response) {
              // Now check if the value has been torn down. If it's still there,
              // we have blocked the request to mixed-content.
              mixed_content_test.step(function() {
                 assertInvoker[scenario.expectation](response, value);
              }, "Resource request check")

              mixed_content_test.done();
            }); // xhrRequest

        }); // estimateResponseTime
    } // start
  }; // t

  return t;
} // MixedContentTestCase
