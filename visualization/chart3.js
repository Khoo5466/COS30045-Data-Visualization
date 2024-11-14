// Tooltip setup using the new .tooltip3 class
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip3")
  .style("position", "absolute")
  .style("opacity", 0); // Initial opacity set to 0

// Load the CSV file
d3.csv("csv/child growth and malnutrition.csv").then(data => {
  const nestedData = {
    name: "Health Data",
    children: []
  };

  // Group data by Country
  const countries = d3.groups(data, d => d["Country Short Name"]);
  countries.forEach(([country, countryData]) => {
    const countryEntry = {
      name: country,
      children: []
    };

    // Group data by Year within each Country
    const years = d3.groups(countryData, d => d["Year"]);
    years.forEach(([year, yearData]) => {
      const yearSums = yearData.reduce((acc, curr) => {
        acc["Severe wasting"] += parseFloat(curr["Severe wasting"]) || 0;
        acc["Wasting"] += parseFloat(curr["Wasting"]) || 0;
        acc["Overweight"] += parseFloat(curr["Overweight"]) || 0;
        acc["Stunting"] += parseFloat(curr["Stunting"]) || 0;
        acc["Underweight"] += parseFloat(curr["Underweight"]) || 0;
        return acc;
      }, { "Severe wasting": 0, "Wasting": 0, "Overweight": 0, "Stunting": 0, "Underweight": 0 });

      const yearEntry = {
        name: year,
        children: [
          { name: "Severe wasting", value: yearSums["Severe wasting"] },
          { name: "Wasting", value: yearSums["Wasting"] },
          { name: "Overweight", value: yearSums["Overweight"] },
          { name: "Stunting", value: yearSums["Stunting"] },
          { name: "Underweight", value: yearSums["Underweight"] }
        ]
      };
      countryEntry.children.push(yearEntry);
    });

    nestedData.children.push(countryEntry);
  });

  const width = 932;
  const height = width;
  const color = d3.scaleLinear().domain([0, 5]).range(["#d3d3d3", "#69b3a2"]);

  // Pack the data
  const pack = data => d3.pack()
    .size([width - 2, height - 2])
    .padding(3)(d3.hierarchy(data).sum(d => d.value).sort((a, b) => b.value - a.value));

  const root = pack(nestedData);
  const svg = d3.create("svg")
    .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)  // Default without zoom
    .style("display", "block")
    .style("background", "rgb(173, 216, 230)")
    .style("cursor", "pointer")
    .on("click", () => zoom(root));

  // Apply the initial zoom-out by adjusting the viewBox
  function zoomTo(v) {
    const k = width / v[2];
    view = v;

    const scaleFactor = 0.8;  // Apply zoom-out factor

    label.attr("transform", d => `translate(${(d.x - v[0]) * k * scaleFactor},${(d.y - v[1]) * k * scaleFactor})`);
    node.attr("transform", d => `translate(${(d.x - v[0]) * k * scaleFactor},${(d.y - v[1]) * k * scaleFactor})`);
    node.attr("r", d => d.r * k * scaleFactor);
  }

  let focus = root;
  let view;

  // Create the circles and labels for each node
  const node = svg.append("g")
    .selectAll("circle")
    .data(root.descendants().slice(1)) // Skip the root node
    .join("circle")
    .attr("fill", d => d.children ? color(d.depth) : "white")
    .attr("pointer-events", d => !d.children ? "none" : null)
    .on("mouseover", function(event, d) {
      d3.select(this).attr("stroke", "#000");
      tooltip.transition().duration(200).style("opacity", .9);

      let tooltipText = "";
      if (d.depth === 1) {
        // Country level
        tooltipText = `<strong>Country:</strong> ${d.data.name}`;
      } else if (d.depth === 2) {
        // Year level
        tooltipText = `<strong>Year:</strong> ${d.data.name}<br><strong>Country:</strong> ${d.parent.data.name}`;
      } else if (d.depth === 3) {
        // Health indicator level
        tooltipText = `<strong>Indicator:</strong> ${d.data.name}<br><strong>Value:</strong> ${d.value}<br><strong>Country:</strong> ${d.parent.parent.data.name}<br><strong>Year:</strong> ${d.parent.data.name}`;
      }
      tooltip.html(tooltipText)
             .style("left", (event.pageX + 10) + "px")
             .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).attr("stroke", null);
      tooltip.transition().duration(500).style("opacity", 0);
    })
    .on("click", (event, d) => focus !== d && (zoom(d), event.stopPropagation()));

  const label = svg.append("g")
    .style("font", "12px sans-serif")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .selectAll("text")
    .data(root.descendants())
    .join("text")
    .style("fill-opacity", d => d.parent === root ? 1 : 0)
    .style("display", d => d.parent === root ? "inline" : "none")
    .text(d => d.depth === 3 ? `${d.data.name}: ${d.value.toFixed(2)}` : d.data.name);  // Label health indicators with sum value

  function zoom(d) {
    focus = d;
    const transition = svg.transition()
      .duration(750)
      .tween("zoom", d => {
        const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
        return t => zoomTo(i(t));
      });

    label
      .filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
      .transition(transition)
      .style("fill-opacity", d => d.parent === focus ? 1 : 0)
      .on("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
      .on("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });
  }

  // Handle mouse scroll zooming inside the viewBox container
  svg.on("wheel", function(event) {
    event.preventDefault(); // Prevent default scroll behavior

    const scaleFactor = 1.1; // Adjust the zoom sensitivity
    const zoomDirection = event.deltaY > 0 ? 1 : -1; // Reverse the zoom direction (scroll up to zoom in)

    // Get mouse position relative to the SVG
    const [mouseX, mouseY] = d3.pointer(event);

    const zoomScale = zoomDirection > 0 ? scaleFactor : 1 / scaleFactor;

    // Get the current viewBox values
    const currentViewBox = svg.attr("viewBox").split(" ");
    const currentX = parseFloat(currentViewBox[0]);
    const currentY = parseFloat(currentViewBox[1]);
    const currentWidth = parseFloat(currentViewBox[2]);
    const currentHeight = parseFloat(currentViewBox[3]);

    const newWidth = currentWidth * zoomScale;
    const newHeight = currentHeight * zoomScale;
    const newX = currentX + (currentWidth - newWidth) * (mouseX / currentWidth);
    const newY = currentY + (currentHeight - newHeight) * (mouseY / currentHeight);

    // Update the viewBox with the new zoomed scale and position
    svg.attr("viewBox", `${newX} ${newY} ${newWidth} ${newHeight}`);
  });

  // Apply the initial zoom state
  zoomTo([root.x, root.y, root.r * 2]);

  // Add SVG to the body
  document.body.append(svg.node());
});
