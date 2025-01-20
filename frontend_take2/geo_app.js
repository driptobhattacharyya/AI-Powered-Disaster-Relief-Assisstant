var map,
  datasource,
  popup,
  searchInput,
  resultsPanel,
  searchInputLength,
  centerMapOnResults;

// Your Azure Maps client id for accessing your Azure Maps account.
fetch("config.json")
  .then((response) => response.text())
  .then((key) => {
    const azureMapsClientId = key.trim();

    // Initialize Azure Maps here using azureMapsClientId
  })
  .catch((error) => {
    console.error("Error loading config:", error);
  });

// URL to your authentication service that retrieves an Microsoft Entra ID Token.
var tokenServiceUrl = "https://samples.azuremaps.com/api/GetAzureMapsToken";

// The minimum number of characters needed in the search input before a search is performed.
var minSearchInputLength = 3;

// The number of ms between key strokes to wait before performing a search.
var keyStrokeDelay = 150;

// Function to retrieve an Azure Maps access token.
function getToken(resolve, reject, map) {
  fetch(tokenServiceUrl)
    .then((response) => {
      if (response.ok) {
        return response.text();
      }
      throw new Error("Failed to retrieve Azure Maps token.");
    })
    .then((token) => resolve(token))
    .catch((error) => reject(error));
}

function getMap() {
  // Initialize a map instance.
  map = new atlas.Map("myMap", {
    center: [88.3938, 22.4984],
    zoom: 14,
    view: "Auto",

    // Add authentication details for connecting to Azure Maps.
    authOptions: {
      // Use Microsoft Entra ID authentication.
      // authType: 'anonymous',
      // clientId: azureMapsClientId,
      // getToken: getToken

      // Alternatively, use an Azure Maps key.
      // Get an Azure Maps key at https://azure.com/maps.
      // NOTE: The primary key should be used as the key.
      authType: "subscriptionKey",
      subscriptionKey:
        "Azure-maps-key",
    },
  });

  //Store a reference to the Search Info Panel.
  resultsPanel = document.getElementById("results-panel");

  //Add key up event to the search box.
  searchInput = document.getElementById("search-input");
  searchInput.addEventListener("keyup", searchInputKeyup);

  //Create a popup which we can reuse for each result.
  popup = new atlas.Popup();

  //Wait until the map resources are ready.
  map.events.add("ready", function () {
    //Add the zoom control to the map.
    map.controls.add(new atlas.control.ZoomControl(), {
      position: "top-right",
    });

    //Create a data source and add it to the map.
    datasource = new atlas.source.DataSource();
    map.sources.add(datasource);
    datasource2 = new atlas.source.DataSource();
    map.sources.add(datasource2);

    //Add a layer for rendering the results.
    var searchLayer = new atlas.layer.SymbolLayer(datasource, null, {
      iconOptions: {
        image: "pin-round-darkblue",
        anchor: "center",
        allowOverlap: true,
      },
    });
    map.layers.add(searchLayer);

    //Add a click event to the search layer and show a popup when a result is clicked.
    map.events.add("click", searchLayer, function (e) {
      //Make sure the event occurred on a shape feature.
      if (e.shapes && e.shapes.length > 0) {
        showPopup(e.shapes[0]);
      }
    });

    //Add a layer for rendering the route lines and have it render under the map labels.
    map.layers.add(
      new atlas.layer.LineLayer(datasource2, null, {
        strokeColor: "#2272B9",
        strokeWidth: 5,
        lineJoin: "round",
        lineCap: "round",
      }),
      "labels"
    );

    //Add a layer for rendering point data.
    map.layers.add(
      new atlas.layer.SymbolLayer(datasource2, null, {
        iconOptions: {
          image: ["get", "icon"],
          allowOverlap: true,
        },
        textOptions: {
          textField: ["get", "title"],
          offset: [0, 1.2],
        },
        filter: [
          "any",
          ["==", ["geometry-type"], "Point"],
          ["==", ["geometry-type"], "MultiPoint"],
        ], //Only render Point or MultiPoints in this layer.
      })
    );

    var startPosition = [88.3920091997523, 22.44436844837157];
    var startPoint = new atlas.data.Feature(
      new atlas.data.Point(startPosition),
      {
        title: "My Home",
        iconImage: "pin-blue",
      }
    );

    var endPosition = [88.4152518, 22.4436806];
    var endPoint = new atlas.data.Feature(new atlas.data.Point(endPosition), {
      title: "FIEM",
      iconImage: "pin-red",
    });

    // Add the data to the data source.
    datasource.add([startPoint, endPoint]);

    // Fit the map window to the bounding box defined by the start and end positions.
    map.setCamera({
      bounds: atlas.data.BoundingBox.fromPositions([
        startPosition,
        endPosition,
      ]),
      padding: 50,
    });

    // Create the route request with the query being the start and end point in the format 'startLongitude,startLatitude:endLongitude,endLatitude'.
    var routeRequestURL = routeUrl.replace(
      "{query}",
      `${startPosition[1]},${startPosition[0]}:${endPosition[1]},${endPosition[0]}`
    );

    // Process the request and render the route result on the map.
    processRequest(routeRequestURL).then((directions) => {
      // Extract the first route from the directions.
      const route = directions.routes[0];

      // Combine all leg coordinates into a single array.
      const routeCoordinates = route.legs.flatMap((leg) =>
        leg.points.map((point) => [point.longitude, point.latitude])
      );

      // Create a LineString from the route path points.
      const routeLine = new atlas.data.LineString(routeCoordinates);

      // Add it to the data source.
      datasource2.add(routeLine);
    });
  });
}

function quickSearch(query) {
  // Set the search input field value to the selected query for consistency.
  searchInput.value = query;

  // Perform the search.
  centerMapOnResults = true; // Ensure the map centers on results for quick searches.
  search();
}

function searchInputKeyup(e) {
  centerMapOnResults = false;
  if (searchInput.value.length >= minSearchInputLength) {
    if (e.keyCode === 13) {
      centerMapOnResults = true;
    }
    //Wait 100ms and see if the input length is unchanged before performing a search.
    //This will reduce the number of queries being made on each character typed.
    setTimeout(function () {
      if (searchInputLength == searchInput.value.length) {
        search();
      }
    }, keyStrokeDelay);
  } else {
    resultsPanel.innerHTML = "";
  }
  searchInputLength = searchInput.value.length;
}
function search() {
  //Remove any previous results from the map.
  datasource.clear();
  popup.close();
  resultsPanel.innerHTML = "";

  //Use MapControlCredential to share authentication between a map control and the service module.
  var pipeline = atlas.service.MapsURL.newPipeline(
    new atlas.service.MapControlCredential(map)
  );

  //Construct the SearchURL object
  var searchURL = new atlas.service.SearchURL(pipeline);

  var query = document.getElementById("search-input").value;
  searchURL
    .searchPOI(atlas.service.Aborter.timeout(10000), query, {
      lon: map.getCamera().center[0],
      lat: map.getCamera().center[1],
      maxFuzzyLevel: 4,
      view: "Auto",
    })
    .then((results) => {
      //Extract GeoJSON feature collection from the response and add it to the datasource
      var data = results.geojson.getFeatures();
      datasource.add(data);

      if (centerMapOnResults) {
        map.setCamera({
          bounds: data.bbox,
        });
      }
      console.log(data);
      //Create the HTML for the results list.
      var html = [];
      for (var i = 0; i < data.features.length; i++) {
        var r = data.features[i];
        html.push(
          "<li onclick=\"itemClicked('",
          r.id,
          "')\" onmouseover=\"itemHovered('",
          r.id,
          "')\">"
        );
        html.push('<div class="title">');
        if (r.properties.poi && r.properties.poi.name) {
          html.push(r.properties.poi.name);
        } else {
          html.push(r.properties.address.freeformAddress);
        }
        html.push(
          '</div><div class="info">',
          r.properties.type,
          ": ",
          r.properties.address.freeformAddress,
          "</div>"
        );
        if (r.properties.poi) {
          if (r.properties.phone) {
            html.push(
              '<div class="info">phone: ',
              r.properties.poi.phone,
              "</div>"
            );
          }
          if (r.properties.poi.url) {
            html.push(
              '<div class="info"><a href="http://',
              r.properties.poi.url,
              '">http://',
              r.properties.poi.url,
              "</a></div>"
            );
          }
        }
        html.push("</li>");
        resultsPanel.innerHTML = html.join("");
      }
    });
}

function toggleChat() {
  const chatbotBody = document.getElementById("chatbot-body");
  chatbotBody.style.display =
    chatbotBody.style.display === "none" ? "flex" : "none";
}

function sendMessage() {
  const chatInput = document.getElementById("chat-input");
  const chatWindow = document.getElementById("chat-window");
  const userMessage = chatInput.value;

  if (!userMessage.trim()) return;

  // Display user message in chat window
  const userBubble = document.createElement("div");
  userBubble.textContent = userMessage;
  userBubble.style.textAlign = "right";
  chatWindow.appendChild(userBubble);

  chatInput.value = "";

  // Send user message to the backend
  fetch("http://localhost:5000/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: userMessage }),
  })
    .then((response) => response.json())
    .then((data) => {
      // Display chatbot response in chat window
      const botBubble = document.createElement("div");
      botBubble.textContent = data.reply;
      botBubble.style.textAlign = "left";
      chatWindow.appendChild(botBubble);

      chatWindow.scrollTop = chatWindow.scrollHeight; // Auto-scroll to the bottom
    })
    .catch((err) => console.error("Error:", err));
}

document.getElementById("myLocationButton").addEventListener("click", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userPosition = [
          position.coords.longitude,
          position.coords.latitude,
        ];
        map.setCamera({
          center: userPosition,
          zoom: 14,
        });
        // Optionally, add a marker at the user's location
        const userMarker = new atlas.HtmlMarker({
          position: userPosition,
          htmlContent: '<div style="color: #0078d4; font-size: 14px;">📍</div>',
        });
        map.markers.add(userMarker);
      },
      (error) => {
        console.error("Error obtaining location:", error);
        alert("Unable to retrieve your location.");
      }
    );
  } else {
    alert("Geolocation is not supported by your browser.");
  }
});

function itemHovered(id) {
  //Show a popup when hovering an item in the result list.
  var shape = datasource.getShapeById(id);
  showPopup(shape);
}
function itemClicked(id) {
  //Center the map over the clicked item from the result list.
  var shape = datasource.getShapeById(id);
  map.setCamera({
    center: shape.getCoordinates(),
    zoom: 17,
  });
}
function showPopup(shape) {
  var properties = shape.getProperties();
  //Create the HTML content of the POI to show in the popup.
  var html = ['<div class="poi-box">'];
  //Add a title section for the popup.
  html.push('<div class="poi-title-box"><b>');

  if (properties.poi && properties.poi.name) {
    html.push(properties.poi.name);
  } else {
    html.push(properties.address.freeformAddress);
  }
  html.push("</b></div>");
  //Create a container for the body of the content of the popup.
  html.push('<div class="poi-content-box">');
  html.push(
    '<div class="info location">',
    properties.address.freeformAddress,
    "</div>"
  );
  if (properties.poi) {
    if (properties.poi.phone) {
      html.push('<div class="info phone">', properties.phone, "</div>");
    }
    if (properties.poi.url) {
      html.push(
        '<div><a class="info website" href="http://',
        properties.poi.url,
        '">http://',
        properties.poi.url,
        "</a></div>"
      );
    }
  }
  html.push("</div></div>");
  popup.setOptions({
    position: shape.getCoordinates(),
    content: html.join(""),
  });
  popup.open(map);
}
