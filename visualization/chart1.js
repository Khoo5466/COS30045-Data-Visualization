function init() {
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
    d3.csv("Calculate of Food Supply with Country in Year.csv").then(function(data) {
        allData = data; // Save all data for filtering

        // Populate country and year filters
        populateFilters(allData);

        // Initial render of chart
        updateChart(allData);
    });

    // Function to populate filters with "All Selected" option
    function populateFilters(data) {
        const countries = ["All Selected", ...new Set(data.map(d => d.Reference_area))];
        const years = ["All Selected", ...new Set(data.map(d => d.TIME_PERIOD))];

        const countryFilter = d3.select("#countryFilter");
        countries.forEach(country => {
            countryFilter.append("option")
                .attr("value", country)
                .text(country);
        });

        const yearFilter = d3.select("#yearFilter");
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
        const selectedCountry = d3.select("#countryFilter").property("value");
        const selectedYear = d3.select("#yearFilter").property("value");

        const filteredData = allData.filter(d =>
            (selectedCountry === "All Selected" || d.Reference_area === selectedCountry) &&
            (selectedYear === "All Selected" || d.TIME_PERIOD === selectedYear)
        );

        updateChart(filteredData);
    }

    // Function to update the chart
    function updateChart(data) {
        // Group data by supply type, then by year
        const aggregatedData = data.reduce((acc, d) => {
            const supply = d.Measure;
            const year = d.TIME_PERIOD;
            const calories = +d.Calories;

            if (!acc[supply]) acc[supply] = {};
            if (!acc[supply][year]) acc[supply][year] = { supply, year, calories: 0 };

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
                .attr("height", svgHeight);
        } else {
            svg.selectAll("*").remove(); // Clear previous content
        }

        // Chart title
        const selectedCountry = d3.select("#countryFilter").property("value");
        const selectedYear = d3.select("#yearFilter").property("value");
        svg.append("text")
            .attr("x", svgWidth - 650)
            .attr("y", padding - 60)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .attr("font-weight", "bold")
            .text(`Food Supply and Consumption in ${selectedCountry}, Year: ${selectedYear}`);

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
            .attr("fill", d => colorScale(d.year));

        // Add x-axis with title
        var xAxis = d3.axisBottom(xScale);
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + (chartHeight - padding) + ")")
            .call(xAxis);

        svg.append("text")
            .attr("class", "x axis-label")
            .attr("x", (chartWidth / 2) - 10)
            .attr("y", chartHeight - 40)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .attr("font-weight", "bold")
            .text("Food Supply Measure");

        // Add y-axis with title
        var yAxis = d3.axisLeft(yScale);
        svg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(" + padding + ",0)")
            .call(yAxis);

        svg.append("text")
            .attr("class", "y axis-label")
            .attr("x", -chartHeight / 2)
            .attr("y", padding - 60)
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .attr("font-weight", "bold")
            .text("Calories");

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
window.onload = init;
