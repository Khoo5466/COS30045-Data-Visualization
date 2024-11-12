const svg = d3.select("#chart3")
    .attr("viewBox", "0 0 800 800")
    .attr("width", 800)
    .attr("height", 800)
    .style("display", "block")
    .style("margin", "auto")
    .style("background-color", "#lightblue");

const pack = d3.pack()
    .size([800, 800])
    .padding(3);

const color = d3.scaleSequential([1, 10], d3.interpolateViridis);

// Tooltip setup
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "#333")
    .style("color", "#fff")
    .style("padding", "5px 10px")
    .style("border-radius", "5px")
    .style("pointer-events", "none")
    .style("font-size", "12px")
    .style("display", "none");

d3.csv("csv/child growth and malnutrition.csv").then(data => {
    // Convert flat CSV data to hierarchical structure
    const nestedData = Array.from(
        d3.group(data, d => d["Country Short Name"]),
        ([country, years]) => ({
            name: country,
            children: Array.from(
                d3.group(years, d => d.Year),
                ([year, values]) => ({
                    name: year,
                    children: values.map(d => ({
                        name: d["Country Short Name"],
                        severe_wasting: +d["Severe wasting"],
                        wasting: +d["Wasting"],
                        overweight: +d["Overweight"],
                        stunting: +d["Stunting"],
                        underweight: +d["Underweight"],
                        value: +d["Severe wasting"] + +d["Wasting"] + +d["Overweight"] + +d["Stunting"] + +d["Underweight"]
                    }))
                })
            )
        })
    );

    const root = d3.hierarchy({ name: "Root", children: nestedData })
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);

    pack(root);

    const node = svg.selectAll("g")
        .data(root.descendants())
        .join("g")
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .on("dblclick", (event, d) => zoom(event, d))
        .on("mouseover", (event, d) => {
            if (!d.children) {
                const metrics = `
                    Severe wasting: ${d.data.severe_wasting}<br>
                    Wasting: ${d.data.wasting}<br>
                    Overweight: ${d.data.overweight}<br>
                    Stunting: ${d.data.stunting}<br>
                    Underweight: ${d.data.underweight}
                `;

                tooltip.style("display", "block")
                    .html(`<strong>${d.data.name}</strong><br>${metrics}`);
            }
        })
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.style("display", "none"));

    node.append("circle")
        .attr("r", d => d.r)
        .attr("fill", d => d.children ? color(d.depth) : "#ff6347")
        .attr("stroke", "#000")
        .attr("stroke-width", 0.5);

    node.append("text")
        .attr("dy", "0.3em")
        .attr("font-size", d => d.r / 5)
        .text(d => d.children ? "" : d.data.name);

    let focus = root;

    function zoom(event, d) {
        focus = d; // Set focus to the clicked node
        const transition = svg.transition()
            .duration(750)
            .tween("zoom", () => {
                // Create a zoom interpolation based on the new focus
                const i = d3.interpolateZoom([focus.x, focus.y, focus.r * 2], [400, 400, 800]);
                return t => zoomTo(i(t));
            });
    }

    function zoomTo(v) {
        const k = 800 / v[2]; // Scale factor
        node.attr("transform", d => `translate(${(d.x - v[0]) * k + 400},${(d.y - v[1]) * k + 400})`);
        node.select("circle").attr("r", d => d.r * k);
    }

    svg.on("click", () => zoomTo([root.x, root.y, root.r * 2])); // Reset zoom on background click
});
