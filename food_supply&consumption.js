function worldmaps(){
    var w = 600;
    var h = 300;

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

        d3.json("world_maps.json").then(function(json){


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

function supply1(){
    var svgWidth = 1000;   // Total SVG width including legend space
    var svgHeight = 600;   // Total SVG height including legend space and title
    var chartWidth = 600;  // Width of the bar chart area
    var chartHeight = 400; // Height of the bar chart area
    var padding = 80;      // Padding for the chart area, increased to make room for axis titles

    // Create scales
    var xScale = d3.scaleBand().range([padding, chartWidth - padding]).padding(0.1);
    var yScale = d3.scaleLinear().range([chartHeight - padding, padding]);
    var colorScale = d3.scaleOrdinal(d3.schemeCategory10); // Color scale for years

    var allData;

    // Load data
    d3.csv("csv/Calculate of Food Supply with Country in Year.csv").then(function(data) {
        allData = data; // Save all data for filtering

        // Populate country and year filters
        populateFilters(allData);

        // Initial render of chart
        updateChart(allData);
    });

    // Function to populate filters with "All Selected" option
    function populateFilters(data) {
        const countries = ["All Countries", ...new Set(data.map(d => d.Reference_area))];
        const years = ["2010 to 2021", ...new Set(data.map(d => d.TIME_PERIOD))];

        const countryFilter = d3.select("#chart1-countryFilter");
        countries.forEach(country => {
            countryFilter.append("option")
                .attr("value", country)
                .text(country);
        });

        const yearFilter = d3.select("#chart1-yearFilter");    

        years.forEach(year => {
            yearFilter.append("option")
                .attr("value", year)
                .text(year);
        });

        countryFilter.on("change", updateFilters);
        yearFilter.on("change", updateFilters);
    }

    // Function to update chart based on selected filters
    function updateFilters() {
        const selectedCountry = d3.select("#chart1-countryFilter").property("value");

        // Get selected years (returns an array)
        const selectedYears = Array.from(
            d3.select("#chart1-yearFilter").property("selectedOptions"),
            option => option.value
        );

        const filteredData = allData.filter(d =>
            (selectedCountry === "All Selected" || d.Reference_area === selectedCountry) &&
            (selectedYears.includes("2010 to 2021") || selectedYears.includes(d.TIME_PERIOD))
        );

        updateChart(filteredData);
    }

    // Function to update the chart
    function updateChart(data) {
        // Group data by supply type, then by year
        const aggregatedData = data.reduce((acc, d) => {
            const country = d.Reference_area;
            const supply = d.Measure;
            const year = d.TIME_PERIOD;
            const calories = +d.Calories;

            if (!acc[supply]) acc[supply] = {};
            if (!acc[supply][year]) acc[supply][year] = { supply, year, calories: 0, country };

            acc[supply][year].calories += calories;
            return acc;
        }, {});

        const finalData = Object.values(aggregatedData).flatMap(supply => Object.values(supply));

        xScale.domain([...new Set(finalData.map(d => d.supply))]);
        yScale.domain([0, d3.max(finalData, d => d.calories)]);
        colorScale.domain([...new Set(finalData.map(d => d.year))]); // Set color scale for years

        var svg = d3.select("#chart1").select("svg");
        if (svg.empty()) {
            svg = d3.select("#chart1")
                .append("svg")
                .attr("width", svgWidth)
                .attr("height", svgHeight)
                .attr("font-weight", "bold");
        } else {
            svg.selectAll("*").remove(); // Clear previous content
        }

        // Create tooltip
        const tooltip = d3.select("body")
                        .append("div")
                        .attr("class", "tooltip")
                        .style("position", "absolute")
                        .style("padding", "6px")
                        .style("background-color", "rgba(0, 0, 0, 0.7)")
                        .style("color", "#fff")
                        .style("border-radius", "4px")
                        .style("pointer-events", "none")
                        .style("display", "none");

        // Chart title
        const selectedCountry = d3.select("#chart1-countryFilter").property("value");
        const selectedYears = Array.from(
            d3.select("#chart1-yearFilter").property("selectedOptions"),
            option => option.value
        ).join(", ");

        svg.append("text")
            .attr("x", svgWidth - 650)
            .attr("y", padding - 60)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .attr("font-weight", "bold")
            .text(`Food Supply in Country: ${selectedCountry}, Year: ${selectedYears}`);

        // Draw grouped bars
        const barWidth = xScale.bandwidth() / colorScale.domain().length; // Width of each bar segment

        svg.selectAll("g.bar-group")
            .data(finalData)
            .enter()
            .append("rect")
            .attr("class", "bar-group")
            .attr("x", d => xScale(d.supply) + colorScale.domain().indexOf(d.year) * barWidth)
            .attr("y", d => yScale(d.calories))
            .attr("width", barWidth)
            .attr("height", d => chartHeight - padding - yScale(d.calories))
            .attr("fill", d => colorScale(d.year))
            .on("mouseover", function(event, d) {
                // Check if the selected country is "All Selected"
                const selectedCountry = d3.select("#chart1-countryFilter").property("value");
                const displayCountry = selectedCountry === "All Selected" ? "All Selected" : d.country;
                // Show tooltip on mouseover
                tooltip
                    .style("display", "block")
                    .html(`Country: ${displayCountry}<br>Measure: ${d.supply}<br>Year: ${d.year}<br>Calories: ${d.calories} kcal`);
            })
            .on("mousemove", function(event) {
                // Update tooltip position with mouse
                tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                // Hide tooltip on mouseout
                tooltip.style("display", "none");
            });

        // Add x-axis with title
        var xAxis = d3.axisBottom(xScale);
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + (chartHeight - padding) + ")")
            .call(xAxis);

        svg.append("text")
            .attr("class", "x axis-label")
            .attr("x", (chartWidth / 2) - 10)
            .attr("y", chartHeight - 30)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .attr("font-weight", "bold")
            .text("Food Supply Measure");

        // Add y-axis with title
        var yAxis = d3.axisLeft(yScale).tickFormat(d => `${d} kcal`);
        svg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(" + padding + ",0)")
            .call(yAxis);

        svg.append("text")
            .attr("class", "y axis-label")
            .attr("x", -chartHeight / 2)
            .attr("y", padding - 70)
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .attr("font-weight", "bold")
            .text("Calories (kcal)");

            // Wrap long x-axis labels
        svg.selectAll(".x.axis .tick text")
            .each(function() {
                var self = d3.select(this);
                var text = self.text();
                var maxLength = 10; // Set maximum length for each line

                if (text.length > maxLength) {
                    var words = text.split(" ");
                    var line = [];
                    var lineNumber = 0;
                    var lineHeight = 1.1; // ems
                    var y = self.attr("y");
                    var dy = parseFloat(self.attr("dy"));

                    self.text("").attr("font-weight", "bold");
                    words.forEach((word, i) => {
                        line.push(word);
                        self.text(line.join(" "));
                        if (self.node().getComputedTextLength() > maxLength * 6) {
                            line.pop();
                            self.text(line.join(" "));
                            line = [word];
                            self.append("tspan")
                                .attr("x", 0)
                                .attr("y", y)
                                .attr("dy", ++lineNumber * lineHeight + dy + "em")
                                .text(word);
                        }
                    });
                }
            });

        // Legend
        const legend = svg.selectAll(".legend")
            .data(colorScale.domain())
            .enter()
            .append("g")
            .attr("class", "legend")
            .attr("transform", (d, i) => `translate(${chartWidth - 30}, ${i * 20 + padding})`);

        legend.append("rect")
            .attr("x", 0)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", d => colorScale(d));

        legend.append("text")
            .attr("x", 25)
            .attr("y", 9)
            .attr("dy", ".35em")
            .text(d => d);

        // Log data for debugging
        console.table(finalData, ["supply", "year", "calories"]);
    }
}

function supply2(){
    var svgWidth = 700;
    var svgHeight = 600;
    var lineWidth = 600;
    var lineHeight = 400;
    var padding = 80;

    var xScale = d3.scaleTime().range([padding, lineWidth - padding]);
    var yScale = d3.scaleLinear().range([lineHeight - padding, padding]);
    var colorScale = d3.scaleOrdinal()
                       .domain(["Animal Protein", "Plant Protein"])
                       .range(["#ff7f0e", "#1f77b4"]); // Assign colors for each protein type

    var allData;

    d3.csv("csv/Daily Protein Supply from Plant and Animal Based Foods.csv").then(function(data) {
        data.forEach(d => {
            d.entity = d.Entity;
            d.year = d.Year; 
            d.Animal_Protein = +d.Animal_Protein;
            d.Plant_Protein = +d.Plant_Protein;
        });
        
        allData = data;

        populateFilters(allData);
        updateFilters();
    });

    function populateFilters(data) {
        const countries = [...new Set(data.map(d => d.Entity))];
        
        const countryFilter = d3.select("#chart2-countryFilter");
        countries.forEach(country => {
            countryFilter.append("option")
                .attr("value", country)
                .text(country);
        });

        countryFilter.property("value", "Afghanistan");
        countryFilter.on("change", updateFilters);

        // Add event listeners for the sliders to update chart on year range change
        const minYearSlider = d3.select("#chart2-minyearSlider");
        const maxYearSlider = d3.select("#chart2-maxyearSlider");

        minYearSlider.on("input", updateFilters);
        maxYearSlider.on("input", updateFilters);
    }

    function updateFilters() {
        const selectedCountry = d3.select("#chart2-countryFilter").property("value");
        const minYear = +d3.select("#chart2-minyearSlider").property("value");
        const maxYear = +d3.select("#chart2-maxyearSlider").property("value");

        // Ensure min year is less than max year
        if (minYear > maxYear) {
            d3.select("#chart2-minyearSlider").property("value", maxYear);
        }

        // Update the displayed years next to the sliders
        d3.select("#yearBegin").text(minYear);
        d3.select("#yearEnd").text(maxYear);

        const filteredData = allData.filter(d =>
            d.entity === selectedCountry && d.year >= minYear && d.year <= maxYear
        );

        updateChart(filteredData);
    }

    function updateChart(data) {
        const groupedData = d3.groups(data, d => d.year)
                              .map(([year, values]) => {
                                  return {
                                      year: year,
                                      animal_protein: values.map(v => v.Animal_Protein),
                                      plant_protein: values.map(v => v.Plant_Protein)
                                  };
                              });

        xScale.domain(d3.extent(groupedData, d => d.year));
        yScale.domain([0, d3.max(groupedData, d => Math.max(d.animal_protein, d.plant_protein))]);

        var svg = d3.select("#chart2").select("svg");
        if (svg.empty()) {
            svg = d3.select("#chart2")
                    .append("svg")
                    .attr("width", svgWidth)
                    .attr("height", svgHeight);
        } else {
            svg.selectAll("*").remove();
        }

        // Chart title (dynamically set based on selected country and year range)
        const selectedCountry = d3.select("#chart2-countryFilter").property("value");
        const selectedYears = `${d3.select("#chart2-minyearSlider").property("value")} - ${d3.select("#chart2-maxyearSlider").property("value")}`;

        svg.append("text")
            .attr("x", lineWidth / 2)
            .attr("y", padding - 60)
            .attr("text-anchor", "middle")
            .attr("font-size", "18px")
            .attr("font-weight", "bold")
            .text(`Animal and Plant Protein Supply in ${selectedCountry} from ${selectedYears}`);

        // Check if the selected year range is a single year (i.e., minYear == maxYear)
        const minYear = +d3.select("#chart2-minyearSlider").property("value");
        const maxYear = +d3.select("#chart2-maxyearSlider").property("value");

        if (minYear === maxYear) {
            // Display horizontal bar chart for the selected year
            const filteredData = groupedData.filter(d => d.year >= minYear && d.year <= maxYear);

            const barHeight = 30;
            const barSpacing = 40;

            // Set scales
            const xScale = d3.scaleLinear()
                            .domain([0, d3.max(filteredData, d => Math.max(d.animal_protein, d.plant_protein))])
                            .range([padding, svgWidth - padding]);

            const yScale = d3.scaleBand()
                            .domain(["Animal Protein", "Plant Protein"])
                            .range([padding, svgHeight * 0.5 + 20])
                            .padding(0.1);

            const colorScale = d3.scaleOrdinal()
                                .domain(["Animal Protein", "Plant Protein"])
                                .range(["#ff7f0e", "#1f77b4"]);

            const formatValue = d3.format(".2f");

            // Append bars for each year
            svg.append("g")
                .attr("fill", colorScale("Animal Protein"))
                .selectAll("rect")
                .data(filteredData)
                .join("rect")
                .attr("x", padding)
                .attr("y", d => yScale("Animal Protein")  - barHeight / 2 + 50)
                .attr("width", d => xScale(d.animal_protein) - padding)
                .attr("height", barHeight);

            svg.append("g")
                .attr("fill", colorScale("Animal Protein"))
                .selectAll("text")
                .data(filteredData)
                .join("text")
                .attr("x", d => xScale(d.animal_protein) - padding / 2 + 105)
                .attr("y", d => yScale("Animal Protein") - barHeight / 2 + 48 + barHeight / 2)
                .attr("dy", ".35em")
                .attr("text-anchor", "end")
                .text(d => formatValue(d.animal_protein) + " g");

            svg.append("g")
                .attr("fill", colorScale("Plant Protein"))
                .selectAll("rect")
                .data(filteredData)
                .join("rect")
                .attr("x", padding)
                .attr("y", d => yScale("Plant Protein") - barHeight / 2 + 50)
                .attr("width", d => xScale(d.plant_protein) - padding)
                .attr("height", barHeight);
            
            svg.append("g")
                .attr("fill", colorScale("Plant Protein"))
                .selectAll("text")
                .data(filteredData)
                .join("text")
                .attr("x", d => xScale(d.plant_protein) - padding /2 + 105)
                .attr("y", d => yScale("Plant Protein") - barHeight / 2 + 48 + barHeight / 2)
                .attr("dy", ".35em")
                .attr("text-anchor", "end")
                .text(d => formatValue(d.plant_protein) + " g");

            // Add axes
            svg.append("g")
                .attr("transform", `translate(${padding}, 0)`)
                .call(d3.axisLeft(yScale));
                

            // Create legend
            const legend = svg.selectAll(".legend")
                                .data(colorScale.domain())
                                .enter()
                                .append("g")
                                .attr("class", "legend")
                                .attr("transform", (d, i) => `translate(${i * 150 + padding + 250}, ${lineHeight / 2 - 162})`);  // Adjust spacing for separation

            legend.append("rect")
                    .attr("x", 0)
                    .attr("width", 18)
                    .attr("height", 18)
                    .style("fill", colorScale);

            legend.append("text")
                    .attr("x", 25)
                    .attr("y", 9)
                    .attr("dy", ".35em")
                    .text(d => d);
        } else {
            svg.append("path")
                .datum(groupedData)
                .attr("fill", "none")
                .attr("stroke", colorScale("Animal Protein"))
                .attr("stroke-width", 1.5)
                .attr("d", d3.line()
                                .x(d => xScale(d.year))
                                .y(d => yScale(d.animal_protein))
                );

            svg.append("path")
                .datum(groupedData)
                .attr("fill", "none")
                .attr("stroke", colorScale("Plant Protein"))
                .attr("stroke-width", 1.5)
                .attr("d", d3.line()
                                .x(d => xScale(d.year))
                                .y(d => yScale(d.plant_protein))
                );

            var xAxis = d3.axisBottom(xScale)
                            .tickFormat(d3.format("d"))
                            .tickValues(d3.range(
                                Math.floor(d3.min(groupedData, d => d.year)), // round down to the nearest decade
                                Math.ceil(d3.max(groupedData, d => d.year/ 10) * 10 + 1), // round up to the next decade
                                10)); // Every 10 years
            
            svg.append("g")
                .attr("transform", "translate(0," + (lineHeight - padding) + ")")
                .call(xAxis);

            svg.append("text")
                .attr("class", "x axis-label")
                .attr("x", lineWidth / 2)
                .attr("y", lineHeight - 40)
                .attr("text-anchor", "middle")
                .attr("font-size", "14px")
                .attr("font-weight", "bold")
                .text("Year");

            var yAxis = d3.axisLeft(yScale).tickFormat(d => `${d} g`);
            svg.append("g")
                .attr("transform", "translate(" + padding + ",0)")
                .call(yAxis);

            svg.append("text")
                .attr("class", "y axis-label")
                .attr("x", -lineHeight / 2)
                .attr("y", padding - 45)
                .attr("transform", "rotate(-90)")
                .attr("text-anchor", "middle")
                .attr("font-size", "14px")
                .attr("font-weight", "bold")
                .text("Daily Protein Supply (grams)");

            const legend = svg.selectAll(".legend")
                .data(colorScale.domain())
                .enter()
                .append("g")
                .attr("class", "legend")
                .attr("transform", (d, i) => `translate(${i * 150 + padding + 250}, ${lineHeight / 2 - 162})`);  // Adjust spacing for separation

            // Rectangle for the legend
            legend.append("rect")
                .attr("x", 0)
                .attr("width", 18)
                .attr("height", 18)
                .style("fill", colorScale);

            // Text for the legend
            legend.append("text")
                .attr("x", 25) 
                .attr("y", 9)  
                .attr("dy", ".35em") 
                .text(d => d); 
        }
    }
}

function init() {
    supply1();
    supply2();
    worldmaps();
}
window.onload = init;
