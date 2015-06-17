function normalizePort(targetPort) {
  var defaultPorts = [80, 443];
  var isDefaultPortForProtocol = (defaultPorts.indexOf(targetPort) >= 0);

  return (targetPort == "" || isDefaultPortForProtocol) ?
          "" : ":" + targetPort;
}

function setAttributes(el, attrs) {
  attrs = attrs || {}
  for (var attr in attrs)
    el[attr] = attrs[attr];
}

function createElement(tagName, attrs, parent) {
  var el = document.createElement(tagName);
  setAttributes(el, attrs);
  if (parent && parent.appendChild)
    parent.appendChild(el);

  return el;
}

function createHelperIframe(name) {
  return createElement("iframe", {"name": name}, document.body);
}

function queryIframe(url) {
  createElement("iframe", {"src": url}, document.body);
}

function queryImage(url) {
  createElement("img", {"src": url}, document.body)
}

function queryXhr(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = "json";
  xhr.send();
}

function queryWorker(url) {
  var worker = new Worker(url);
  console.log("worker", url);
  worker.postMessage();
}

function queryFetch(url) {
  try {
    fetch(url);
  } catch (ex) {
    console.error("Failed: fetch constructor.", ex);
  }
}

function queryNavigable(element, url) {
  var navigable = element
  setAttributes(navigable,
                {"href": url,
                 "target": createHelperIframe("helper-iframe").name});
  navigable.click();
}

function queryAnchor(url) {
  var a = createElement("a", {"innerHTML": "Link to resource"}, document.body);
  queryNavigable(a, url)
}

function queryArea(url) {
  var area = createElement("area", {}, document.body);
  queryNavigable(area, url)
}

function queryScript(url) {
  var script = createElement("script", {"src": url}, document.body);
}

function queryForm(url) {
  var form = createElement("form",
                           {"action": url,
                            "method": "POST",
                            "target": createHelperIframe("helper-iframe").name},
                           document.body);
  form.submit();
}

function queryLinkStylesheet(url) {
  createElement("link", {"rel": "stylesheet", "href": url}, document.head);
}

function queryLinkPrefetch(url) {
  createElement("link", {"rel": "prefetch", "href": url}, document.head);
}

function queryMedia(type, media_attrs, source_attrs) {
  var mediaElement = createElement(type, media_attrs, document.body);
  var sourceElement = createElement("source", source_attrs, mediaElement)
  return mediaElement;
}

function queryVideo(url) {
  queryMedia("video", {}, {type: "video/mp4", src: url});
}

function queryAudio(url) {
  queryMedia("audio", {}, {type: "audio/mpeg", src: url});
}

function queryPicture(url) {
 var picture = queryMedia("picture", {}, {"srcset": url, "type": "image/png"});
 createElement("img", {"src": url}, picture);
}

function queryObject(url) {
  createElement("object", {"data": url}, document.body);
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
