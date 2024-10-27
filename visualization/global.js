function worldmaps(){
    var w = 500;
    var h = 500;

    var projection = d3.geoMercator()
                        .center([145, -36.5])
                        .translate([w/2, h/2])
                        .scale(3000);

    var path = d3.geoPath()
                .projection(projection);

    var color = d3.scaleQuantize()
                    .range(['rgb(242,240,247)','rgb(203,201,226)',
                        'rgb(158,154,200)','rgb(117,107,177)','rgb(84,39,143)']);

    var svg = d3.select("#worldmap")
                .append("svg")
                .attr("width", w)
                .attr("height", h)
                .attr("fill", "grey");

    d3.json("world_maps.json").then(function(json){
        svg.selectAll("path")
            .data(json.features)
            .enter()
            .append("path")
            .attr("d", path);
    });
}


function init(){
    worldmaps();
}
window.onload = init;