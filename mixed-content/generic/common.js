// TODO(kristijanburnik): Remove unused functions.

function appendIframeToBody(url) {
  var iframe = document.createElement("iframe");
  iframe.src = url;
  document.body.appendChild(iframe);

  return iframe;
}

function normalizePort(targetPort) {
  var defaultPorts = [80, 443];
  var isDefaultPortForProtocol = (defaultPorts.indexOf(targetPort) >= 0);

  return (targetPort == "" || isDefaultPortForProtocol) ?
          "" : ":" + targetPort;
}

function wrapResult(url, headers) {
  var result = {
    location: url,
    referrer: headers.referer,
    headers:headers
  };

  return result;
}

function queryIframe(url, callback) {
  var iframe = appendIframeToBody(url);
  var listener = function(event) {
    if (event.source != iframe.contentWindow)
      return;

    callback(event.data, url);
    window.removeEventListener("message", listener);
  }
  window.addEventListener("message", listener);
}

function queryImage(src, callback) {
  var image = new Image();
  image.crossOrigin = "Anonymous";
  image.onload = function() {
    callback(image);
  }
  image.src = src;
  document.body.appendChild(image)
}

function queryXhr(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = "json";
  xhr.onreadystatechange = function(e) {
    if (this.readyState == 4 && this.status == 200) {
      callback(this.response);
    }
  };
  xhr.send();
}

function queryWorker(url, callback) {
  var worker = new Worker(url);
  worker.onmessage = function(event) {
    callback(event.data);
  };
}

function queryFetch(url, callback) {
  try {
    fetch(url).then(function(response) {
        response.json().then(function(result) {
          callback(result);
        });
      }, function() {
        console.warn("Failed fetch of", url);
      }
    );
  } catch (ex) {
    console.log("Failed fetch ctor", ex);
  }
}

function queryNavigable(element, url, callback, attributes) {
  var navigable = element
  navigable.href = url;
  navigable.target = "helper-iframe";

  var helperIframe = document.createElement("iframe")
  helperIframe.name = "helper-iframe"
  document.body.appendChild(helperIframe)

  // Extend element with attributes. (E.g. "referrer_policy" or "rel")
  if (attributes) {
    for (var attr in attributes) {
      navigable[attr] = attributes[attr];
    }
  }

  var listener = function(event) {
    if (event.source != helperIframe.contentWindow)
      return;

    callback(event.data);
    window.removeEventListener("message", listener);
  }
  window.addEventListener("message", listener);

  navigable.click();
}

function queryLink(url, callback, referrer_policy) {
  var a = document.createElement("a");
  a.innerHTML = "Link to subresource";
  document.body.appendChild(a);
  queryNavigable(a, url, callback, referrer_policy)
}

function queryAreaLink(url, callback, referrer_policy) {
  var area = document.createElement("area");
  // TODO(kristijanburnik): Append to map and add image.
  document.body.appendChild(area);
  queryNavigable(area, url, callback, referrer_policy)
}

function queryScript(url, callback) {
  var script = document.createElement("script");
  script.src = url;

  var listener = function(event) {
    callback(event.data, url);
    window.removeEventListener("message", listener);
  }
  window.addEventListener("message", listener);

  document.body.appendChild(script);
}

function queryForm(url) {
  var helperIframe = document.createElement("iframe")
  helperIframe.name = "helper-iframe"
  document.body.appendChild(helperIframe)

  var form = document.createElement('form');
  form.action = url;
  form.target = helperIframe.name;

  form.submit();
}


function guid() {
  function s4() {
    return (Math.floor((Math.random() + 1.0) * 0x10000))
           .toString(16).substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() +
         s4() + s4();
}

function xhrRequest(url, responseType) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = responseType || "json";

    xhr.onerror = function() {
      reject(Error("Network Error"));
    };

    xhr.onload = function() {
      if (xhr.status != 200)
        return reject(Error(xhr.statusText));

      resolve(xhr.response);
    };

    xhr.send();
  });
}

function timeoutPromise(timeout) {
  return new Promise(function(resolve, reject) {
    setTimeout(resolve, timeout);
  })
}

function estimateResponseTime(url, numMeasurements) {

  function measureRoundtripTime(url, index) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      var startTime;

      xhr.onerror = function() {
        reject(Error("Network Error"));
      };

      xhr.onload = function() {
        if (xhr.status != 200)
          return reject(Error(xhr.statusText));

        var roundtrip_ms = (new Date()).getTime() - startTime;
        resolve({roundtrip_ms:roundtrip_ms, index:index});
      };

      startTime = (new Date()).getTime();
      xhr.send();
    });
  }

  function roundTo2Decimals(number) {
    return Math.round(number * 100.0) / 100.0;
  }

  function getStats(results) {
    var stats = {
      sum: 0,
      min: 100000,
      max: -100000,
      avg: 0,
      count: 0,
      stdev: 0,
    };

    for (var i in results) {
      stats.sum += results[i];
      stats.min = Math.min(stats.min, results[i]);
      stats.max = Math.max(stats.max, results[i]);
      ++stats.count;
    }

    // TODO(kristijanburnik): assert count > 0.
    stats.avg = roundTo2Decimals(stats.sum / stats.count);

    for (var i in results) {
      var delta = results[i] - stats.avg
      stats.stdev += delta * delta;
    }

    stats.stdev /= stats.count;
    stats.stdev = roundTo2Decimals(Math.sqrt(stats.stdev));

    return stats;
  }

  return new Promise(function(resolve, reject) {
    var results = [];
    var p = measureRoundtripTime(url, 0);

    for (var i = 0; i < numMeasurements - 1; ++i) {
      p = p.then(function(result) {
        results.push(result.roundtrip_ms);
        return measureRoundtripTime(url, result.index + 1);
      }, reject);
    }

    p.then(function() {
      resolve({
        results: results,
        stats: getStats(results)
      })
    });
  });
}

 // SanityChecker does nothing in release mode.
function SanityChecker() {}
SanityChecker.prototype.checkScenario = function() {};
