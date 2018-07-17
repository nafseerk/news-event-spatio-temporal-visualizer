$(document).ready(function(){

$(".table").hide();

/*#################################################
	              Commons
###################################################*/

function formatDate(date) {
	return d3.time.format("%Y-%m-%d %H:%M:%S").parse(date);
}

function getColorFromScore(score) {
	score = parseInt(score)
	switch(score) {
    	case -1:
        	return "#FF0000"
    	case 0:
    		return "#808080"
        case 1:
        	return "#00FF00"	
    	default:
        	console.log("Invalid Sentiment Score. Cannot determine color");
	}
}

function getCircleRadius(curMapZoomLevel) {

	if(curMapZoomLevel < 4) {
		return 3
	}else if(curMapZoomLevel < 7) {
		return 4
	}else if(curMapZoomLevel < 12) {
		return 5
	}else {
		return 6
	}
}

function convertTimestampToUTCDate(timestampInSeconds) {
	var targetTime = new Date(timestampInSeconds*1000);
	return new Date(targetTime.getUTCFullYear(), targetTime.getUTCMonth(), targetTime.getUTCDate(),  targetTime.getUTCHours(), targetTime.getUTCMinutes(), targetTime.getUTCSeconds());
}

/*#################################################
		         Map
###################################################*/
 

var mapZoomLevel = 2; // 2 = Full World view 
var initialPosition = [0, 0]; // (0, 0) is center of earth 

var map = L.map('map').setView(initialPosition, mapZoomLevel),
		  maplink = L.tileLayer('http://{s}.{base}.maps.cit.api.here.com/maptile/2.1/maptile/{mapID}/normal.day.grey/{z}/{x}/{y}/256/png8?app_id={app_id}&app_code={app_code}', 
		  						{
									attribution: 'Map &copy; 1987-2014 <a href="http://developer.here.com">HERE</a>',
									subdomains: '1234',
									mapID: 'newest',
									app_id: 'DemoAppId01082013GAL',
									app_code: 'AJKnXv84fjrb0KIHawS0Tg',
									base: 'base',
									minZoom: 0,
									maxZoom: 15
							    }).addTo(map);

// Initialize the SVG layer
map._initPathRoot();

/*#################################################
		    D3
###################################################*/

data_file_path = 'csv/TRADEWAR_2018-07-10_historic_filtered_parsed_scored.csv'

d3.csv(data_file_path, function(collection) {

	var spatialPoints = [];
	var minDate = Infinity
	var maxDate = -Infinity
	collection.forEach(function(d) {

		if(d.timestamp < minDate){
			minDate = d.timestamp
		}
		if(d.timestamp > maxDate){
			maxDate = d.timestamp
		}
		spatialPoints.push({
			tweet_id: parseInt(d.tweet_id),
			coordinates: new L.LatLng(d.lat, d.lng),
			date: convertTimestampToUTCDate(d.timestamp),
			score: parseInt(d.score)
		});
	});

	var startDate = minDate;
	var endDate = (parseInt(minDate) + parseInt((maxDate - minDate) / 10)).toString();
	
	// Convert dates from timestamp to UTC
	minDate = convertTimestampToUTCDate(minDate)
	maxDate = convertTimestampToUTCDate(maxDate)
	startDate = convertTimestampToUTCDate(startDate)
	endDate = convertTimestampToUTCDate(endDate)
	
	$("#slider").dateRangeSlider({
		bounds: {min: minDate, max: maxDate},
		defaultValues: {min: startDate, max: endDate},
		wheelMode: "scroll",
		wheelSpeed: 10,
		step: {
			minutes: 5
		},
		formatter: function(val) {
			var format = d3.time.format("%d %a. %H:%M");
			return format(val);
		},
		scales: [{
					first: function(value) { return value; },
		  			end: function(value) {return value; },
		  			next: function(value) {
		    		var next = new Date(value);
		    		return new Date(next.setDate(value.getDate() + 1));
		  		 	},
		  			label: function(value){
		  			var next = new Date(value);
		    		return next.getDate();
		  		    },
		  			format: function(tickContainer, tickStart, tickEnd){
		    		tickContainer.addClass("myCustomClass");
		  			}
		         }, 
				 {
		    		first: function(value) { return value; },
		  			end: function(value) {return value; },
		  			next: function(value) {
		    		var next = new Date(value);
		    		return new Date(next.setHours(value.getHours() + 6));
		  			},
		  			label: function(value){
		    		return null;
		  			},
		  			format: function(tickContainer, tickStart, tickEnd){
		    		tickContainer.addClass("myCustomClass");
		  			}
				}]
	});

	$("#slider").bind("valuesChanging", function(e, data){
		updatePointsWithRange([data.values.min, data.values.max]);
	});

	// CROSSFILTER
	var spatial = crossfilter(spatialPoints),
		all = spatial.groupAll(),
		dateDimension = spatial.dimension(function (d) { return d.date; }),
		tweetsDimension = spatial.dimension(function(d) { return d.tweet_id; });

	// Count total number of points
	var n = all.reduceCount().value();

	$("#total_points").text(n.toString())
	
	var tweets = [];
	tweetsDimension.top(Infinity).forEach(function (d) {
		tweets.push({tweet_id: d.tweet_id, score: d.score});
	});

	// Pick up the SVG from the map object
	var svg = d3.select("#map").select("svg");
	var mapPoints = svg.append("g");

	// Use Leaflet to implement a D3 geometric transformation.
	function projectPoint(x, y) {
		var point = map.latLngToLayerPoint(new L.LatLng(x, y));
		this.stream.point(point.x, point.y);
	}

	var transform = d3.geo.transform({point: projectPoint});
	var	path = d3.geo.path().projection(transform);


	// Points
	
	var entities = {};
	function filterSpatialPointsWithRange(range) {
		entities = {};
		dateDimension.filterRange(range);
		var global_score = 0;
		dateDimension.top(Infinity).forEach(function (d) {
			global_score += d.score
			
			// First time
			if (!entities[d.tweet_id]) {
				entities[d.tweet_id] = [];
			}
			// Add point to entity
			entities[d.tweet_id].push(d.coordinates);
		});
		
		$('.inner').stop().fadeTo('slow', 1);
		/*setTimeout(function() {
			$('.inner').fadeTo('slow', 0.4);
		}, 1000);*/
		if(global_score > 0){
			$("#global_perception").text('Positive')
			$("#global_perception").css('color', '#00FF00');
		}
		else if(global_score < 0){
			$("#global_perception").text('Negative')
			$("#global_perception").css('color', 'red');
		}
		else{
			$("#global_perception").text('Positive')
			$("#global_perception").css('color', 'black');
		}

		$(".table").show();
	}

	filterSpatialPointsWithRange([startDate, endDate]);

	var pointers = mapPoints
		.selectAll("circle")
		.data(tweets)
		.enter()
		.append("circle")
		.attr("r", getCircleRadius(map.getZoom()))
		.attr("fill", function (d) { return getColorFromScore(d.score); })
		.attr("fill-opacity", 1)
		.attr("stroke", "black")
		.attr("stroke-width", 2)
		.attr("stroke-opacity", 1)
		.attr("opacity", 1)
		;

	function render() {
		pointers.attr("transform", function (d) {
			var coordinates = entities[d.tweet_id];
			if (coordinates && coordinates.length>0) {
				var header = coordinates[0];
				return "translate("+
					map.latLngToLayerPoint(header).x +","+
					map.latLngToLayerPoint(header).y +")";
			} else {
				return "translate(-5,-5)";
			}
		});
		pointers.attr("r", getCircleRadius(map.getZoom()))
	}

	function updateOnResize() {
		render();
	}

	function updatePointsWithRange(range) {
		filterSpatialPointsWithRange(range);
		render();
	}

	function convertToArrayXY(coordinates) {
		var array = [];
		coordinates.forEach(function(d) {
			array.push([d.lat, d.lng]);
		});
		return array;
	}

	map.on("viewreset", updateOnResize);
	updateOnResize();

	$(".loading").hide();
	$(".description").show();

});


});
