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

        d3.json("https://raw.githubusercontent.com/Khoo5466/COS30045-Data-Visualization/refs/heads/main/world_maps.json").then(function(json){


            for(var i = 0; i < data.length; i++){
                var dataRegion = data[i].Entity;
                var dataValue = parseFloat(data[i].Fruit_Consumption_Value);
    
                for(var j = 0; j < json.features.length; j++){
                    var jsonRegion = json.features[j].properties.name;
    
                    if(dataRegion == jsonRegion){
                        json.features[j].properties.value = dataValue;
                        break;
                    }
                }
            }
            
            // Draw the map
            svg.selectAll("path")
            .data(json.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", function(d) {
                var value = d.properties.value;
                if(value){
                    return color(value);
                }else{
                    return '#ccc';
                }
            })
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5);
        });
    });
}
window.onload = init;