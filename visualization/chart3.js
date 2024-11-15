d3.csv("csv/dbo-foodconsumptionscores(modified).csv").then(function(data) {
  // Initialize a nested map to hold the summed values
  const nestedData = {};

  // Iterate over the rows of the CSV
  data.forEach(function(d) {
      // Parse the values to ensure they are numbers
      const country = d.ADM0_NAME;
      const year = d.FCS_Year;
      const poor = parseFloat(d.FCS_poor) || 0;
      const borderline = parseFloat(d.FCS_Borderline) || 0;
      const acceptable = parseFloat(d.FCS_Acceptable) || 0;

      // Initialize nested structure if it doesn't exist
      if (!nestedData[country]) {
          nestedData[country] = {};
      }
      if (!nestedData[country][year]) {
          nestedData[country][year] = { FCS_poor: 0, FCS_Borderline: 0, FCS_Acceptable: 0 };
      }

      // Sum the values for each health indicator by country and year
      nestedData[country][year].FCS_poor += poor;
      nestedData[country][year].FCS_Borderline += borderline;
      nestedData[country][year].FCS_Acceptable += acceptable;
  });

  // Convert the nested data into a structure suitable for the sunburst chart
  let sunburstData = [];
  for (const country in nestedData) {
      const countryNode = {
          name: country,
          children: []
      };

      for (const year in nestedData[country]) {
          const yearNode = {
              name: `${year}`,
              children: [
                  { name: "FCS poor", value: nestedData[country][year].FCS_poor },
                  { name: "FCS Borderline", value: nestedData[country][year].FCS_Borderline },
                  { name: "FCS Acceptable", value: nestedData[country][year].FCS_Acceptable }
              ]
          };

          countryNode.children.push(yearNode);
      }

      sunburstData.push(countryNode);
  }

  // Create the sunburst chart
  const width = 928;
  const height = width;
  const radius = width / 12;

  const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, sunburstData.length + 1));

  const hierarchy = d3.hierarchy({ name: "root", children: sunburstData })
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);

  const root = d3.partition()
      .size([2 * Math.PI, hierarchy.height + 1])
      (hierarchy);

  root.each(d => d.current = d);

  const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius * 1.5)
      .innerRadius(d => d.y0 * radius)
      .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1));

  const svg = d3.create("svg")
  .attr("viewBox", [-width / 2, -height / 3, width , height ])  // Adjust viewBox to fit better
  .style("font", "10px sans-serif");

  // Append the arcs
  const path = svg.append("g")
      .selectAll("path")
      .data(root.descendants().slice(1))
      .join("path")
      .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data.name); })
      .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
      .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none")
      .attr("d", d => arc(d.current));

  // Make them clickable if they have children
  path.filter(d => d.children)
      .style("cursor", "pointer")
      .on("click", clicked);

  const format = d3.format(",d");
  path.append("title")
      .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\n${format(d.value)}`);

  const label = svg.append("g")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .style("user-select", "none")
      .selectAll("text")
      .data(root.descendants().slice(1))
      .join("text")
      .attr("dy", "0.35em")
      .attr("fill-opacity", d => +labelVisible(d.current))
      .attr("transform", d => labelTransform(d.current))
      .text(d => d.data.name)
      .style("font-size", "8px");


  const parent = svg.append("circle")
      .datum(root)
      .attr("r", radius)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("click", clicked);

  // Append the SVG to the chart container in the HTML
  const chartContainer = document.getElementById("chart3");
  if (chartContainer) {
      chartContainer.appendChild(svg.node());
  } else {
      console.error("No chart4 container found.");
  }

  // Handle zoom on click
  function clicked(event, p) {
      parent.datum(p.parent || root);

      root.each(d => d.target = {
          x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          y0: Math.max(0, d.y0 - p.depth),
          y1: Math.max(0, d.y1 - p.depth)
      });

      const t = svg.transition().duration(750);

      path.transition(t)
          .tween("data", d => {
              const i = d3.interpolate(d.current, d.target);
              return t => d.current = i(t);
          })
          .filter(function(d) {
              return +this.getAttribute("fill-opacity") || arcVisible(d.target);
          })
          .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0)
          .attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none")
          .attrTween("d", d => () => arc(d.current));

      label.filter(function(d) {
          return +this.getAttribute("fill-opacity") || labelVisible(d.target);
      }).transition(t)
          .attr("fill-opacity", d => +labelVisible(d.target))
          .attrTween("transform", d => () => labelTransform(d.current));
  }

  function arcVisible(d) {
      return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
  }

  function labelVisible(d) {
      return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
  }

  function labelTransform(d) {
      const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
      const y = (d.y0 + d.y1) / 2 * radius;
      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  }

}).catch(function(error) {
  console.error("Error loading data: ", error);
});
