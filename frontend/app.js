// Initialize the Azure Maps Map
var map = new atlas.Map("myMap", {
  center: [88.392142, 22.572645], // Default coordinates (e.g., home)
  zoom: 10,
  authOptions: {
    authType: "subscriptionKey",
    subscriptionKey:
      "551kCyW9q2Ipw4XZEULUrJ0KOK7Cc3tiFXIbMIDLaW7zrxEJMgWoJQQJ99ALACYeBjF7GlPQAAAgAZMP3Y8d", // Replace with your actual subscription key
  },
});

// Wait for the map to be ready
map.events.add("ready", function () {
  // Initialize a data source
  const dataSource = new atlas.source.DataSource();
  map.sources.add(dataSource);

  // Create a SymbolLayer to display the markers
  const symbolLayer = new atlas.layer.SymbolLayer(dataSource, null, {
    iconOptions: {
      image: "pin-round-darkblue", // Azure Maps built-in marker style
      allowOverlap: true,
    },
    textOptions: {
      textField: ["get", "name"], // Display the name above each marker
      offset: [0, -1.2], // Adjust the position of the label
    },
  });
  map.layers.add(symbolLayer);

  // Function to add resources to the layer
  function addMarkersToLayer(resources) {
    const features = resources.map((resource) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [resource.position.lon, resource.position.lat],
      },
      properties: {
        name: resource.poi.name, // Add name as a property
        location: `${resource.position.lat}, ${resource.position.lon}`,
      },
    }));

    // Clear existing data and add new features
    dataSource.setShapes(features);
  }

  // Function to update search results
  function updateSearchResults(resources) {
    const searchResults = document.getElementById("searchResults");
    searchResults.innerHTML = ""; // Clear previous results

    resources.forEach((resource) => {
      const resultItem = document.createElement("div");
      resultItem.classList.add("result-item");
      resultItem.textContent = `${resource.poi.name} - ${resource.position.lat}, ${resource.position.lon}`;
      resultItem.onclick = () => {
        map.setCamera({
          center: [resource.position.lon, resource.position.lat],
          zoom: 14,
        });
      };

      searchResults.appendChild(resultItem);
    });
  }

  // Handle "My Location" button
  function getMyLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLon = position.coords.longitude;

          // Center the map on user's location
          map.setCamera({
            center: [userLon, userLat],
            zoom: 14,
          });

          // Add a marker for the user's location
          const userMarker = new atlas.HtmlMarker({
            position: [userLon, userLat],
            color: "blue",
            text: "You",
          });
          map.markers.add(userMarker);
        },
        (error) => {
          alert("Unable to retrieve your location. Please check permissions.");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }

  // Handle search form submission
  document
    .getElementById("searchForm")
    .addEventListener("submit", function (event) {
      event.preventDefault();
      const query = document.getElementById("query").value || "shelter";

      // Fetch POI data from the Flask backend
      fetch(
        `http://127.0.0.1:5000/api/resources?lat=22.572645&lon=88.392142&query=${query}`
      )
        .then((response) => response.json())
        .then((data) => {
          //   addMarkersToLayer(data);
          updateSearchResults(data);
        })
        .catch((error) => alert("Error fetching resources:", error));
    });

  // Handle side panel toggle
  document
    .getElementById("toggleSidePanelBtn")
    .addEventListener("click", function () {
      const sidePanel = document.getElementById("sidePanel");
      sidePanel.classList.toggle("-translate-x-full");
    });

  // Add event listener to the "My Location" button
  document
    .getElementById("myLocationBtn")
    .addEventListener("click", getMyLocation);
});
