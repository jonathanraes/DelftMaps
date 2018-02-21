var refreshIntervalId;
var currentLocation;
var locationMarker;
var routeButton = '<button class="btn" id="navbutton">Routebeschrijving</button>'
var vm = new Vue({
  el: "#app",
  delimiters: ['[[', ']]'],
  data: {
    map: null,
    directionsDisplay: null,
    directionsService: null
  },
  computed: {

  },
  methods: {
    navigate: function() {
      console.error('navigate pressed!');
    }
  },
  mounted() {
    initMap()
    updateLocation(true);
    refreshIntervalId = setInterval(function () {
      updateLocation(false);
    }.bind(this), 1000);
  }
});

var infoWindow = new google.maps.InfoWindow;
function initMap() {
  directionsService = new google.maps.DirectionsService();
  directionsDisplay = new google.maps.DirectionsRenderer();
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 52.011, lng: 4.3593},
    zoom: 16
  });
  map.data.loadGeoJson('static/data.json');
    // Create a <script> tag and set the USGS URL as the source.
    // var script = document.createElement('script');
    // This example uses a local copy of the GeoJSON stored at
    // http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojsonp
    // script.src = 'https://developers.google.com/maps/documentation/javascript/examples/json/earthquake_GeoJSONP.js';
    // document.getElementsByTagName('head')[0].appendChild(script);
  // var marker = new google.maps.Marker({
  //   position: {lat: 52.011, lng: 4.3593},
  //   map: map,
  //   title: 'Uluru (Ayers Rock)'
  // });
  // marker.addListener('click', function() {
  //   infowindow.open(map, marker);
  // });
  map.data.addListener('click', function(event) {
    var infowindow = new google.maps.InfoWindow({
      content: event.feature.f.name + "<br><br>" +
               event.feature.f.info + '<br>' +
               routeButton,
      position: {lat: event.latLng.lat(), lng: event.latLng.lng()}
    });
    var end = { lat: event.latLng.lat(), lng: event.latLng.lng() }
    infowindow.open(map, this);
    var onChangeHandler = function() {
      calculateAndDisplayRoute(directionsService, directionsDisplay, end);
    };
    document.getElementById('navbutton').addEventListener('click', onChangeHandler);
  });
  directionsDisplay.setMap(map);
}

function calculateAndDisplayRoute(directionsService, directionsDisplay, end) {
  directionsService.route({
    origin: currentLocation,
    destination: end,
    travelMode: 'WALKING'
  }, function(response, status) {
    if (status === 'OK') {
      directionsDisplay.setDirections(response);
    } else {
      window.alert('Directions request failed due to ' + status);
    }
  });
}

function updateLocation(centre) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      if (!locationMarker) {
        console.log('create locationMarker')
        locationMarker = new google.maps.Marker({
            clickable: false,
            icon: new google.maps.MarkerImage('//maps.gstatic.com/mapfiles/mobile/mobileimgs2.png',
                                                            new google.maps.Size(22,22),
                                                            new google.maps.Point(0,18),
                                                            new google.maps.Point(11,11)),
            shadow: null,
            zIndex: 999,
            position: currentLocation,
            map: map
        });
      }
      locationMarker.setPosition(currentLocation)

      if (centre)
        map.setCenter(currentLocation);
    }, function() {
      handleLocationError(true, infoWindow, map.getCenter());
    });
  } else {
    // Browser doesn't support Geolocation
    handleLocationError(false, infoWindow, map.getCenter());
  }
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(browserHasGeolocation ?
                        'Error: The Geolocation service failed.' :
                        'Error: Your browser doesn\'t support geolocation.');
  infoWindow.open(map);
}

  // Loop through the results array and place a marker for each
  // set of coordinates.
window.eqfeed_callback = function(results) {
  for (var i = 0; i < results.features.length; i++) {
    var coords = results.features[i].geometry.coordinates;
    var latLng = new google.maps.LatLng(coords[1],coords[0]);
    var marker = new google.maps.Marker({
      position: latLng,
      map: map
    });
  }
}

function retrievePrices() {
  axios.get('/getprices').then(response => {
    vm.products = response.data;
  });
}

function loadOrders(tag_id) {
  axios.get('/orders/' + tag_id).then(response => {
    vm.loading = false;
    vm.orders = response.data;
  });
}
