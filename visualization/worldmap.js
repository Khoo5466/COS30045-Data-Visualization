function init(){
    var w = 1000;
    var h = 800;

    var projection = d3.geoMercator()
                        .center([0, 20])
                        .translate([w/2, h/2])
                        .scale(3000);

    var path = d3.geoPath().projection(projection);

    var svg = d3.select("#worldmap")
                .append("svg")
                .attr("width", w)
                .attr("height", h)
                .style("background-color", "#f0f0f0");

    // Define a color scale for consumption values
    var color = d3.scaleSequential(d3.interpolateYlGnBu);



    d3.csv("csv/Fruit Consumption by Country.csv").then(function(data){
        color.domain([
            d3.min(data, function(d){return +d.Fruit_Consumption_Value;}),
            d3.max(data, function(d){return +d.Fruit_Consumption_Value;})
        ]);

        d3.json("https://raw.githubusercontent.com/Khoo5466/COS30045-Data-Visualization/refs/heads/main/world_maps.json?token=GHSAT0AAAAAACWNTOKAE4E5FHNQLXXLF6YMZZGDPYA").then(function(json){

            // Match CSV data to GeoJSON by region name and add the value as a property
            data.forEach(function(d) {
                var dataRegion = d.Entity;
                var dataValue = +d.Fruit_Consumption_Value;

                // Match region name in JSON and CSV
                json.features.forEach(function(feature) {
                    var jsonRegion = feature.properties.name;

                    if (dataRegion === jsonRegion) {
                        feature.properties.value = dataValue;
                    }
                });
            });
            
    
            // Draw the map
            svg.selectAll("path")
            .data(json.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", function(d) {
                var value = d.properties.value;
                return value ? color(value) : '#ccc';
            })
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5);
        });
    });
}
window.onload = init;