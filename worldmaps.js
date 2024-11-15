function worldmap1() {
    var w = 1000;
    var h = 600;
    var mapW = 600;
    var mapH = 400;
    var barHeight = 20;
    var marginTop = 100;

    var projection = d3.geoMercator()
                        .center([0, 20])
                        .translate([mapW / 2, mapH / 2])
                        .scale(100);

    var path = d3.geoPath().projection(projection);

    var svg = d3.select(`#worldmap1`)
                .append("svg")
                .attr("width", w)
                .attr("height", h);

    var selectedYear = 2021;  // Set initial year

    var chartTitle = svg.append("text")
        .attr("x", mapW / 2 + 10 )  // Center the title horizontally
        .attr("y", 30)     // Position the title vertically
        .attr("text-anchor", "middle")  // Center the text horizontally
        .attr("font-size", "24px")      // Set font size
        .attr("font-weight", "bold")    // Make it bold
        .attr("fill", "black")          // Set font color
        .text(`Fruit Consumption by Country (${selectedYear})`);

    var color = d3.scaleSequential(d3.interpolateOranges).domain([0, 150]);

    var tooltip = d3.select("#worldmap1").append("div")
        .attr("id", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background-color", "white")
        .style("color", "black")
        .style("padding", "15px")
        .style("border-radius", "5px")
        .style("pointer-events", "none")
        .style("z-index", "1000")
        .style("max-width", "300px");

    var allData;
    var jsonData;

    const formatValue = d3.format(".2f");

    // Load CSV and JSON data
    Promise.all([ 
        d3.csv("csv/Fruit Consumption by Country.csv"),
        d3.json("world_maps.json")
    ]).then(function([data, json]) {
        allData = data;
        jsonData = json;

        data.forEach(d => {
            d.Entity = d.Entity;
            d.Year = +d.Year;
            d.Fruit_Consumption_Type = d.Fruit_Consumption_Type;
            d.Fruit_Consumption_Value = +d.Fruit_Consumption_Value;
        });

        populateFilters(allData, jsonData);
        updateFilters();
    });

    function populateFilters(allData, json) {
        const yearSlider = d3.select("#worldmap1-yearSlider");

        yearSlider.on("input", function() {
            selectedYear = +d3.select(this).property("value");
            updateFilters();

            chartTitle.text(`Fruit Consumption by Country (${selectedYear})`);
        });
    }

    function updateFilters() {
        const filteredData = allData.filter(d => d.Year === selectedYear);
        updateMap(filteredData, jsonData);
    }

    function updateMap(filteredData, json) {
        var dataMap = {};
        filteredData.forEach(d => {
            dataMap[d.Entity] = {
                value: d.Fruit_Consumption_Value,
                type: d.Fruit_Consumption_Type
            };
        });

        json.features.forEach(feature => {
            var countryName = feature.properties.name;
            if (dataMap[countryName]) {
                feature.properties.value = dataMap[countryName].value;
                feature.properties.type = dataMap[countryName].type;
            } else {
                feature.properties.value = null;
                feature.properties.type = null;
            }
        });

        svg.selectAll("path")
            .data(json.features)
            .join("path")
            .attr("d", path)
            .style("fill", d => {
                var value = d.properties.value;
                return value ? color(value) : "grey";
            })
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5)
            .attr("class", "country-path1")
            .attr("transform", `translate(0, ${marginTop})`)
            .on("mouseover", function(event, d) {
                var countryName = d.properties.name;
                var value = d.properties.value;
                var type = d.properties.type || "kilograms per year per capita";

                d3.select(this)
                    .attr("stroke", "black")
                    .attr("stroke-width", 2);

                highlightColorBar(value);

                var countryData = allData.filter(d => d.Entity === countryName && d.Year >= 1961 && d.Year <= 2021).sort((a, b) => a.Year - b.Year);

                // Define SVG dimensions and scales for the line chart
                var svgWidth = 250;  // Increased width for better readability
                var svgHeight = 120; // Increased height for better readability
                var xScale = d3.scaleTime()
                    .domain([new Date(1961, 0, 1), new Date(2021, 0, 1)])  // Dates for 1961 and 2021
                    .range([0, svgWidth - 40]);

                var yScale = d3.scaleLinear()
                    .domain([0, d3.max(countryData, d => d.Fruit_Consumption_Value)])
                    .range([svgHeight - 20, 0]);

                // Check if data exists for the country
                if (countryData.length === 0) {
                    tooltip.html(`
                        ${countryName}<br>
                        <span style="font-size: 12px;">${selectedYear}</span><br><hr>
                        No data available<br><br>
                    `);
                    tooltip.style("visibility", "visible")
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY + 10) + "px");
                    return;
                }
                
                var linePath = d3.line()
                    .x(d => xScale(new Date(d.Year, 0, 1)))  // Convert Year to Date for xScale
                    .y(d => yScale(d.Fruit_Consumption_Value))
                    .curve(d3.curveMonotoneX)(countryData);

                // Find the data point for the selected year
                var selectedData = countryData.find(d => d.Year === selectedYear);
                var pointerX = selectedData ? xScale(new Date(selectedData.Year, 0, 1)) : 0;
                var pointerY = selectedData ? yScale(selectedData.Fruit_Consumption_Value) : 0;

                // Find the max value in the country data
                var maxValue = d3.max(countryData, d => d.Fruit_Consumption_Value);
                var maxValueY = yScale(maxValue);

                // Use color scale to set line color based on value for the selected year
                var lineColor = value < 25 ? "orange" : (value ? color(value) : "lightgrey");

                // Generate the xAxis as part of the tooltip
                var xAxis = d3.axisBottom(xScale)
                    .tickValues([new Date(1961, 0, 1), new Date(2021, 0, 1)])  // Ticks for 1961 and 2021
                    .tickFormat(d3.timeFormat("%Y"));

                // Generate the inline SVG for the tooltip content (including x-axis)
                var inlineSvg = ` 
                    <svg width="${svgWidth}" height="${svgHeight}">
                        <g transform="translate(30, 0)">  <!-- Move the entire chart right -->
                            <path d="${linePath}" fill="none" stroke="${lineColor}" stroke-width="1.5"/>
                            ${selectedData ? ` 
                                <circle cx="${pointerX}" cy="${pointerY}" r="3" fill="red"/>
                                <line x1="${pointerX}" y1="0" x2="${pointerX}" y2="${svgHeight - 20}" stroke="grey" stroke-width="1"/>
                                <line x1="0" y1="${maxValueY}" x2="${svgWidth - 40}" y2="${maxValueY}" stroke="grey" stroke-width="1"/>
                                <text x="${svgWidth - 40}" y="${maxValueY - 5}" fill="blue" font-size="10" text-anchor="middle">${formatValue(maxValue)} kg</text>
                            ` : ''}
                            <g transform="translate(0, ${svgHeight - 20})">
                                ${d3.select(document.createElement('svg'))
                                    .append("g")
                                    .call(xAxis) // No extra translation here
                                    .node().outerHTML}
                            </g>
                        </g>
                    </svg>
                `;

                tooltip.html(`
                    ${countryName}<br>
                    <span style="font-size: 12px;">${selectedYear}</span><br><hr>
                    <span style="font-size: 12px; color: grey;">${type}</span><br>
                    ${value ? `${formatValue(value)} kg` : "No data"}<br><br>
                    ${inlineSvg}<br>
                `);

                tooltip.style("visibility", "visible")
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY + 10) + "px");
            })
            .on("mousemove", function(event) {
                tooltip.style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY + 10) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .attr("stroke", "#333")
                    .attr("stroke-width", 0.5);
                tooltip.style("visibility", "hidden");

                resetColorBarHighlight();
            });

        var breakpoints = ["No data", 0, 10, 25, 50, 75, 100, 125, 150, Infinity];
        var sectionWidth = (mapW - 30) / (breakpoints.length - 1);

        for (var i = 0; i < breakpoints.length - 1; i++) {
            svg.append("rect")
                .attr("x", 40 + sectionWidth * i)  // Adjust the starting point of the bar
                .attr("y", mapH - 40 + marginTop)
                .attr("width", sectionWidth)
                .attr("height", barHeight)
                .style("fill", breakpoints[i] === "No data" ? "grey" : color((breakpoints[i] + breakpoints[i + 1]) / 2))  // Grey for "No data"
                .attr("class", "color-bar-section")
                .on("mouseover", function(event, d) {
                    // Determine the hovered range
                    var hoveredIndex = d3.select(this).data()[0];
                    var hoveredRangeStart = breakpoints[hoveredIndex];
                    var hoveredRangeEnd = breakpoints[hoveredIndex + 1];
        
                    // Bold the hovered color bar section
                    d3.select(this)
                        .style("stroke", "black")
                        .style("stroke-width", 2);
        
                    highlightCountriesInRange(hoveredRangeStart, hoveredRangeEnd);
                })
                .on("mouseout", function() {
                    // Reset color bar section to normal state
                    d3.select(this)
                        .style("stroke", "none")
                        .style("stroke-width", 0);  // Reset the stroke width to none (remove bold)
        
                    // Reset country paths to normal state
                    svg.selectAll(".country-path1")
                        .style("opacity", 1)  // Reset all countries to full opacity
                        .attr("stroke", "#333")
                        .attr("stroke-width", 0.5);  // Reset stroke width to normal

                    resetCountriesHighlight();
                })
                .data([i]); // Store the index of the color bar section
        }

        for (var i = 0; i < breakpoints.length; i++) {
            svg.append("text")
                .attr("x", 40 + (i * sectionWidth))
                .attr("y", mapH - 5 + marginTop)
                .attr("text-anchor", i === 0 ? "start" : i === breakpoints.length - 1 ? "end" : "middle")
                .text(breakpoints[i] === Infinity ? "" : breakpoints[i]);
        }
    }
    function highlightColorBar(value) {
        var breakpoints = [0, 10, 25, 50, 75, 100, 125, 150];
        var sectionWidth = (mapW - 30) / (breakpoints.length - 1);
        
        var sectionIndex = breakpoints.findIndex(function(d, i) {
            return value >= d && value < (breakpoints[i + 1] || Infinity);
        });
        
        svg.selectAll(".color-bar-section").style("stroke", function(d, i) {
            return i === sectionIndex ? "black" : "none";
        });
    }

    function resetColorBarHighlight() {
        svg.selectAll(".color-bar-section").style("stroke", "none");
    }

    function highlightCountriesInRange(min, max) {
        svg.selectAll(".country-path1")
            .style("opacity", function(d) {
                var value = d.properties.value;
                if (value === null) {
                    return 0.3; 
                }
                return value >= min && value < max ? 1 : 0.3;
            });
    }

    function resetCountriesHighlight() {
        svg.selectAll(".country-path1")
            .style("opacity", 1);
    }
}

function worldmap2() {
    var w = 1000;
    var h = 600;
    var mapW = 600;
    var mapH = 400;
    var barHeight = 20;
    var marginTop = 100;

    var projection = d3.geoMercator()
                        .center([0, 20])
                        .translate([mapW / 2, mapH / 2])
                        .scale(100);

    var path = d3.geoPath().projection(projection);

    var svg = d3.select(`#worldmap2`)
                .append("svg")
                .attr("width", w)
                .attr("height", h);

    var selectedYear = 2021;  // Set initial year

    var chartTitle = svg.append("text")
        .attr("x", mapW / 2 + 10 )  // Center the title horizontally
        .attr("y", 30)     // Position the title vertically
        .attr("text-anchor", "middle")  // Center the text horizontally
        .attr("font-size", "24px")      // Set font size
        .attr("font-weight", "bold")    // Make it bold
        .attr("fill", "black")          // Set font color
        .text(`Vegetables Consumption by Country (${selectedYear})`);

    var color = d3.scaleSequential(d3.interpolateGreens).domain([0, 150]);

    var tooltip = d3.select("#worldmap2").append("div")
        .attr("id", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background-color", "white")
        .style("color", "black")
        .style("padding", "15px")
        .style("border-radius", "5px")
        .style("pointer-events", "none")
        .style("z-index", "1000")
        .style("max-width", "300px");

    var allData;
    var jsonData;

    const formatValue = d3.format(".2f");

    // Load CSV and JSON data
    Promise.all([ 
        d3.csv("csv/Vegetables Consumption by Country.csv"),
        d3.json("world_maps.json")
    ]).then(function([data, json]) {
        allData = data;
        jsonData = json;

        data.forEach(d => {
            d.Entity = d.Entity;
            d.Year = +d.Year;
            d.Vegetables_Consumption_Type = d.Vegetables_Consumption_Type;
            d.Vegetables_Consumption_Value = +d.Vegetables_Consumption_Value;
        });

        populateFilters(allData, jsonData);
        updateFilters();
    });

    function populateFilters(allData, json) {
        const yearSlider = d3.select("#worldmap2-yearSlider");

        yearSlider.on("input", function() {
            selectedYear = +d3.select(this).property("value");
            updateFilters();

            chartTitle.text(`Vegetables Consumption by Country (${selectedYear})`);
        });
    }

    function updateFilters() {
        const filteredData = allData.filter(d => d.Year === selectedYear);
        updateMap(filteredData, jsonData);
    }

    function updateMap(filteredData, json) {
        var dataMap = {};
        filteredData.forEach(d => {
            dataMap[d.Entity] = {
                value: d.Vegetables_Consumption_Value,
                type: d.Vegetables_Consumption_Type
            };
        });

        json.features.forEach(feature => {
            var countryName = feature.properties.name;
            if (dataMap[countryName]) {
                feature.properties.value = dataMap[countryName].value;
                feature.properties.type = dataMap[countryName].type;
            } else {
                feature.properties.value = null;
                feature.properties.type = null;
            }
        });

        svg.selectAll("path")
            .data(json.features)
            .join("path")
            .attr("d", path)
            .style("fill", d => {
                var value = d.properties.value;
                return value ? color(value) : "grey";
            })
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5)
            .attr("class", "country-path2")
            .attr("transform", `translate(0, ${marginTop})`)
            .on("mouseover", function(event, d) {
                var countryName = d.properties.name;
                var value = d.properties.value;
                var type = d.properties.type || "kilograms per year per capita";

                d3.select(this)
                    .attr("stroke", "black")
                    .attr("stroke-width", 2);

                highlightColorBar(value);

                var countryData = allData.filter(d => d.Entity === countryName && d.Year >= 1961 && d.Year <= 2021).sort((a, b) => a.Year - b.Year);

                // Define SVG dimensions and scales for the line chart
                var svgWidth = 250;  // Increased width for better readability
                var svgHeight = 120; // Increased height for better readability
                var xScale = d3.scaleTime()
                    .domain([new Date(1961, 0, 1), new Date(2021, 0, 1)])  // Dates for 1961 and 2021
                    .range([0, svgWidth - 40]);

                var yScale = d3.scaleLinear()
                    .domain([0, d3.max(countryData, d => d.Vegetables_Consumption_Value)])
                    .range([svgHeight - 20, 0]);

                // Check if data exists for the country
                if (countryData.length === 0) {
                    tooltip.html(`
                        ${countryName}<br>
                        <span style="font-size: 12px;">${selectedYear}</span><br><hr>
                        No data available<br><br>
                    `);
                    tooltip.style("visibility", "visible")
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY + 10) + "px");
                    return;
                }
                
                var linePath = d3.line()
                    .x(d => xScale(new Date(d.Year, 0, 1)))  // Convert Year to Date for xScale
                    .y(d => yScale(d.Vegetables_Consumption_Value))
                    .curve(d3.curveMonotoneX)(countryData);

                // Find the data point for the selected year
                var selectedData = countryData.find(d => d.Year === selectedYear);
                var pointerX = selectedData ? xScale(new Date(selectedData.Year, 0, 1)) : 0;
                var pointerY = selectedData ? yScale(selectedData.Vegetables_Consumption_Value) : 0;

                // Find the max value in the country data
                var maxValue = d3.max(countryData, d => d.Vegetables_Consumption_Value);
                var maxValueY = yScale(maxValue);

                // Use color scale to set line color based on value for the selected year
                var lineColor = value < 25 ? "green" : (value ? color(value) : "lightgrey");

                // Generate the xAxis as part of the tooltip
                var xAxis = d3.axisBottom(xScale)
                    .tickValues([new Date(1961, 0, 1), new Date(2021, 0, 1)])  // Ticks for 1961 and 2021
                    .tickFormat(d3.timeFormat("%Y"));

                // Generate the inline SVG for the tooltip content (including x-axis)
                var inlineSvg = ` 
                    <svg width="${svgWidth}" height="${svgHeight}">
                        <g transform="translate(30, 0)">  <!-- Move the entire chart right -->
                            <path d="${linePath}" fill="none" stroke="${lineColor}" stroke-width="1.5"/>
                            ${selectedData ? ` 
                                <circle cx="${pointerX}" cy="${pointerY}" r="3" fill="red"/>
                                <line x1="${pointerX}" y1="0" x2="${pointerX}" y2="${svgHeight - 20}" stroke="grey" stroke-width="1"/>
                                <line x1="0" y1="${maxValueY}" x2="${svgWidth - 40}" y2="${maxValueY}" stroke="grey" stroke-width="1"/>
                                <text x="${svgWidth - 40}" y="${maxValueY - 5}" fill="blue" font-size="10" text-anchor="middle">${formatValue(maxValue)} kg</text>
                            ` : ''}
                            <g transform="translate(0, ${svgHeight - 20})">
                                ${d3.select(document.createElement('svg'))
                                    .append("g")
                                    .call(xAxis) // No extra translation here
                                    .node().outerHTML}
                            </g>
                        </g>
                    </svg>
                `;

                tooltip.html(`
                    ${countryName}<br>
                    <span style="font-size: 12px;">${selectedYear}</span><br><hr>
                    <span style="font-size: 12px; color: grey;">${type}</span><br>
                    ${value ? `${formatValue(value)} kg` : "No data"}<br><br>
                    ${inlineSvg}<br>
                `);

                tooltip.style("visibility", "visible")
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY + 10) + "px");
            })
            .on("mousemove", function(event) {
                tooltip.style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY + 10) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .attr("stroke", "#333")
                    .attr("stroke-width", 0.5);
                tooltip.style("visibility", "hidden");

                resetColorBarHighlight();
            });

        var breakpoints = ["No data", 0, 10, 25, 50, 75, 100, 125, 150, Infinity];
        var sectionWidth = (mapW - 30) / (breakpoints.length - 1);

        for (var i = 0; i < breakpoints.length - 1; i++) {
            svg.append("rect")
                .attr("x", 40 + sectionWidth * i)  // Adjust the starting point of the bar
                .attr("y", mapH - 40 + marginTop)
                .attr("width", sectionWidth)
                .attr("height", barHeight)
                .style("fill", breakpoints[i] === "No data" ? "grey" : color((breakpoints[i] + breakpoints[i + 1]) / 2))  // Grey for "No data"
                .attr("class", "color-bar-section")
                .on("mouseover", function(event, d) {
                    // Determine the hovered range
                    var hoveredIndex = d3.select(this).data()[0];
                    var hoveredRangeStart = breakpoints[hoveredIndex];
                    var hoveredRangeEnd = breakpoints[hoveredIndex + 1];
        
                    // Bold the hovered color bar section
                    d3.select(this)
                        .style("stroke", "black")
                        .style("stroke-width", 2);
        
                    highlightCountriesInRange(hoveredRangeStart, hoveredRangeEnd);
                })
                .on("mouseout", function() {
                    // Reset color bar section to normal state
                    d3.select(this)
                        .style("stroke", "none")
                        .style("stroke-width", 0);  // Reset the stroke width to none (remove bold)
        
                    // Reset country paths to normal state
                    svg.selectAll(".country-path2")
                        .style("opacity", 1)  // Reset all countries to full opacity
                        .attr("stroke", "#333")
                        .attr("stroke-width", 0.5);  // Reset stroke width to normal

                    resetCountriesHighlight();
                })
                .data([i]); // Store the index of the color bar section
        }

        for (var i = 0; i < breakpoints.length; i++) {
            svg.append("text")
                .attr("x", 40 + (i * sectionWidth))
                .attr("y", mapH - 5 + marginTop)
                .attr("text-anchor", i === 0 ? "start" : i === breakpoints.length - 1 ? "end" : "middle")
                .text(breakpoints[i] === Infinity ? "" : breakpoints[i]);
        }
    }
    function highlightColorBar(value) {
        var breakpoints = [0, 10, 25, 50, 75, 100, 125, 150];
        var sectionWidth = (mapW - 30) / (breakpoints.length - 1);
        
        var sectionIndex = breakpoints.findIndex(function(d, i) {
            return value >= d && value < (breakpoints[i + 1] || Infinity);
        });
        
        svg.selectAll(".color-bar-section").style("stroke", function(d, i) {
            return i === sectionIndex ? "black" : "none";
        });
    }

    function resetColorBarHighlight() {
        svg.selectAll(".color-bar-section").style("stroke", "none");
    }

    function highlightCountriesInRange(min, max) {
        svg.selectAll(".country-path2")
            .style("opacity", function(d) {
                var value = d.properties.value;
                if (value === null) {
                    return 0.3; 
                }
                return value >= min && value < max ? 1 : 0.3;
            });
    }

    function resetCountriesHighlight() {
        svg.selectAll(".country-path2")
            .style("opacity", 1);
    }
}

function init() {
    worldmap1();
    worldmap2();
}

window.onload = init;
