#!/usr/local/bin/node

var fs = require('fs'),
    async = require('async'),
    request = require('request'),
    steden = require('./steden.json'),
    colors = require('colors'),
    yearRange = [new Date("1700-01-01"), new Date("1800-01-01")],
    features = [];

async.eachSeries(steden, function(stad, callback) {
    // Roep voor alle steden api.histograph.io aan
    var url = "http://api.histograph.io/search?name=" + stad + "&type=hg:Plaats";
    request(url, function (error, response, body) {
      console.log("Calling api.histograph.io for city: '" + stad + "':");
      if (!error && response.statusCode == 200) {
        var geojson = JSON.parse(body);
        if (geojson.features && geojson.features.length > 0) {
          var concept = geojson.features[0];

          var geometryIndices = concept.properties.pits
              .filter(function(pit) {
                return pit.source == "tgn" || pit.source == "geonames";
              })
              .map(function(pit) {
                return pit.geometryIndex;
              });

          var pits = concept.properties.pits
              .filter(function(pit) {
                if (pit.hasBeginning || pit.hasEnd) {
                  var dateBeginning = new Date(-8640000000000000),
                      dateEnd = new Date(8640000000000000);

                  if (pit.hasBeginning) {
                    dateBeginning = new Date(pit.hasBeginning);
                  }

                  if (pit.hasEnd) {
                    dateEnd = new Date(pit.hasEnd);
                  }

                  return (yearRange[0] <= dateEnd)  &&  (yearRange[1] >= dateBeginning);

                } else {
                  return false;
                }
              });

          if (pits.length > 0 && geometryIndices.length > 0 ) {
            var name = pits.map(function(pit) { return pit.name; }).sort(function(a, b) { return b.length - a.length;})[0];
            features.push({
              type: "Feature",
              properties: {
                name: name
              },
              geometry: concept.geometry.geometries[geometryIndices[0]]
            });
            console.log("  " + name.green)
          }
        } else {
          console.log("  Nothing found...".red);
        }
      }
      callback();
    });
  },
  function (err) {
    fs.writeFileSync("./steden-1800.json", JSON.stringify({
      type: "FeatureCollection",
      features: features
    }, null, 4));

    console.log('Done!');
  }
)
