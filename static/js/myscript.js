var sprintf = (str, ...argv) => !argv.length ? str :
    sprintf(str = str.replace(sprintf.token || "$", argv.shift()), ...argv)
var mapCenter = {lat: 52.011, lng: 4.3593};
var refreshIntervalId;
var currentLocation;
var locationMarker;
var routeButton = '<button class="btn btn-primary" id="navbutton">Routebeschrijving</button>'
var DestinationReachedDistance = 0.0001
var openInMapsLinkBase = 'https://www.google.com/maps/search/?api=1&query=47.5951518,-122.3316393&query_place_id=ChIJKxjxuaNqkFQR3CK6O1HNNqY'
var streetViewURL = 'https://maps.googleapis.com/maps/api/streetview?size=300x150&location=\$,\$&fov=110&heading=\$&pitch=10&key=AIzaSyA7g2inijoh5NVHqaoKjE7dgpR6kRXI6Ls'
var vm = new Vue({
  el: "#app",
  delimiters: ['[[', ']]'],
  data: {
    imageURL: '',
    map: null,
    destination: null,
    atDestination: false,
    directionsDisplay: null,
    directionsService: null,
    distanceService: null,
    selectedExhibit: null,
    currentLocationText: '',
    currentLocationAddress: '',
    exhibits: [],
    visited: []
  },
  computed: {

  },
  methods: {
    nextDestination: function() {
      activateClosestExhibitDistanceMatrix();
    }
  },
  mounted() {
    initMap()
    refreshIntervalId = setInterval(function () {
      updateLocation(false);
    }.bind(this), 1000);
  }
});


function activateClosestExhibitDistanceMatrix(skipamount = 0) {
  var locations = []
  var distances = []
  for (exhibit of vm.exhibits) {
    locations.push(exhibit.formatted_address)
  }
  for (var i = 0; i < locations.length; i + 25) {
    distanceService.getDistanceMatrix(
      {
        origins: [currentLocation],
        destinations: locations.splice(i, i + 25),
        travelMode: 'WALKING'
      }, function (response, status) {
        if (response) {
          distances = distances.concat(response.rows[0].elements);
          for (var j = 0; j < response.destinationAddresses.length; j++) {
            for (exhibit of vm.exhibits) {
              if (exhibit.formatted_address === response.destinationAddresses[j]) {
                exhibit['distance'] = response.rows[0].elements[j]
              }
            }
          }
          if (distances.length >= vm.exhibits.length) {
            // When distance array is filled up
            // var closest_exhibit = vm.exhibits[0]
            // for (exhibit of vm.exhibits) {
            //   if (!exhibit.distance) {
            //     // Not possible anymore due to length check
            //     console.error('MISSING DIST: ');
            //     console.log(exhibit);
            //   } else if (exhibit.distance.duration.value < closest_exhibit.distance.duration.value) {
            //     closest_exhibit = exhibit;
            //   }
            // }
            vm.exhibits.sort(function(a, b) {
              if (a.distance && b.distance)
              return a.distance.duration.value - b.distance.duration.value
              else
              return 999999999
            });

            setCurrentSelection(vm.exhibits[skipamount]);
            calculateAndDisplayRoute(directionsService, directionsDisplay, vm.exhibits[skipamount].location);
          }
        } else {
          console.error(status);
        }
      });
  }
}

function setCurrentSelection(exhibit) {
  vm.selectedExhibit = exhibit;
  vm.currentLocationAddress = exhibit.formatted_address;
  vm.currentLocationText = exhibit.infoText;
}

var infoWindow;
function initMap() {
  directionsService = new google.maps.DirectionsService();
  directionsDisplay = new google.maps.DirectionsRenderer();
  distanceService = new google.maps.DistanceMatrixService();
  map = new google.maps.Map(document.getElementById('map'), {
    center: mapCenter,
    zoom: 16
  });
  directionsDisplay.setMap(map);
  addMapMarkers();
}

function addMapMarkers() {
  axios.get('/locations').then(response => {
    vm.exhibits = response.data;
    for (exhibit of response.data) {
      (function(exhibit) {
        var marker = new google.maps.Marker({
          position: exhibit.location,
          map: map,
          title: exhibit.address
        });
        marker.addListener('click', function(event) {
          if (!infoWindow) infoWindow = new google.maps.InfoWindow();
          infoWindow.setOptions({
            content: '<div class="infoWindow">' + exhibit.formatted_address + "<br><br>" +
            exhibit.infoText + '<br>' +
            routeButton + '</div>',
            position: exhibit.location
          });
          //   var end = { lat: event.latLng.lat(), lng: event.latLng.lng() }
          setCurrentSelection(exhibit);
          infoWindow.open(map, this);
          var onChangeHandler = function() {
            calculateAndDisplayRoute(directionsService, directionsDisplay, exhibit.location);
          };
          document.getElementById('navbutton').addEventListener('click', onChangeHandler);
        });
      })(exhibit);
    }
    updateLocation(true);
  });
}

function calculateRoute(directionsService, end) {
  directionsService.route({
    origin: currentLocation,
    destination: end,
    travelMode: 'WALKING'
  }, function(response, status) {
    if (status === 'OK') {
      console.log(response.routes[0].legs[0]);
    } else {
      window.alert('Directions request failed due to ' + status);
    }
  });
}

function calculateAndDisplayRoute(directionsService, directionsDisplay, end) {
  vm.atDestination = false;
  directionsService.route({
    origin: currentLocation,
    destination: end,
    travelMode: 'WALKING'
  }, function(response, status) {
    if (status === 'OK') {
      directionsDisplay.setDirections(response);
      vm.destination = { lat: response.routes[0].legs[0].end_location.lat(), lng: response.routes[0].legs[0].end_location.lng() }
    } else {
      window.alert('Directions request failed due to ' + status);
    }
  });
}

function getStraightDistance (point1, point2) {
  return Math.sqrt(Math.pow(point1.lat-point2.lat, 2) + Math.pow(point1.lng-point2.lng, 2))
}

function updateLocation(centre) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      currentLocation = {
        lat: parseFloat(position.coords.latitude),
        lng: parseFloat(position.coords.longitude)
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
        activateClosestExhibitDistanceMatrix();
      }
      locationMarker.setPosition(currentLocation)

      if (!vm.atDestination && vm.selectedExhibit && getStraightDistance(vm.destination, currentLocation) < DestinationReachedDistance) {
        // Destination Reached
          console.log('reached destination ' + vm.exhibits.length);
          if (vm.exhibits.indexOf(vm.selectedExhibit) > -1) {
            vm.visited.push(vm.selectedExhibit);
            vm.exhibits.splice(vm.exhibits.indexOf(vm.selectedExhibit), 1);
          }
          console.log('reached destination ' + vm.exhibits.length);
          // activateClosestExhibitDistanceMatrix();
          vm.atDestination = true;
          reachedDestination(vm.selectedExhibit);
      }
      // if (vm.selectedExhibit)
      //   calculateRoute(directionsService, vm.selectedExhibit.location);
      if (centre)
        map.setCenter(currentLocation);
    },
    function() {
      // Location retrieval error
      if (!infoWindow) {
         infoWindow = new google.maps.InfoWindow
         handleLocationError(true, infoWindow, map.getCenter());
      }
    });
  } else {
    // Browser doesn't support Geolocation
    if (!infoWindow) {
       infoWindow = new google.maps.InfoWindow
       handleLocationError(false, infoWindow, map.getCenter());
    }
  }
}

function reachedDestination(destination) {
  var sub = { lat: destination.location.lat - currentLocation.lat, lng: destination.location.lng - currentLocation.lng };
  // var sub = { lat: destination.location.lat - vm.destination.lat, lng: destination.location.lng - vm.destination.lng };
  var angle = Math.atan2(sub.lng, sub.lat) * 180 / Math.PI
  console.log('angle: ' + angle)
  vm.imageURL = sprintf(streetViewURL, destination.location.lat, destination.location.lng, angle);
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
// window.eqfeed_callback = function(results) {
//   for (var i = 0; i < results.features.length; i++) {
//     var coords = results.features[i].geometry.coordinates;
//     var latLng = new google.maps.LatLng(coords[1],coords[0]);
//     var marker = new google.maps.Marker({
//       position: latLng,
//       map: map
//     });
//   }
// }
