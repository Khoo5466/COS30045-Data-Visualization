function worldmap1() {
    var w = 600; // Set width to fit the container and screen
    var h = 400;

    var projection = d3.geoMercator()
                        .center([0, 20])
                        .translate([w / 2, h / 2])
                        .scale(150);  // Adjust scale for initial size to fit in each map

    var path = d3.geoPath().projection(projection);

    var svg = d3.select(`#worldmap1`)
                .append("svg")
                .attr("width", w)
                .attr("height", h)
                .call(d3.zoom()  // Add zoom and pan functionality
                    .scaleExtent([1, 8])
                    .on("zoom", zoomed))
                .append("g"); // Group to apply transformations

    var color = d3.scaleSequential(d3.interpolateOranges);

    // Load and process CSV and JSON data
    Promise.all([
        d3.csv("csv/Fruit Consumption by Country.csv"),
        d3.json("world_maps.json")
    ]).then(function([data, json]) {
        // Set the color scale domain based on min and max fruit consumption values
        color.domain([
            d3.min(data, d => +d.Fruit_Consumption_Value),
            d3.max(data, d => +d.Fruit_Consumption_Value)
        ]);

        // Create a lookup dictionary from CSV data
        var dataMap = {};
        data.forEach(d => {
            dataMap[d.Entity] = +d.Fruit_Consumption_Value;
        });

        // Join CSV data to GeoJSON by country name
        json.features.forEach(feature => {
            var countryName = feature.properties.name;
            feature.properties.value = dataMap[countryName] || null;
        });

        // Draw the map with color based on fruit consumption values
        svg.selectAll("path")
            .data(json.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", d => {
                var value = d.properties.value;
                return value ? color(value) : "white"; // Default color if no data
            })
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5);
    });

    function zoomed(event) {
        svg.attr("transform", event.transform);
    }
}

function worldmap2() {
    var w = 600; // Set width to fit the container and screen
    var h = 400;

    var projection = d3.geoMercator()
                        .center([0, 20])
                        .translate([w / 2, h / 2])
                        .scale(150);  // Adjust scale for initial size to fit in each map

    var path = d3.geoPath().projection(projection);

    var svg = d3.select(`#worldmap2`)
                .append("svg")
                .attr("width", w)
                .attr("height", h)
                .call(d3.zoom()  // Add zoom and pan functionality
                    .scaleExtent([1, 8])
                    .on("zoom", zoomed))
                .append("g"); // Group to apply transformations

    d3.json("world_maps.json").then(function(json) {
        svg.selectAll("path")
            .data(json.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", "lightgrey")
            .attr("stroke", "black")
            .attr("stroke-width", 0.5);
    });

    function zoomed(event) {
        svg.attr("transform", event.transform);
    }
}

function init() {
    worldmap1();
    worldmap2();
}

window.onload = init;