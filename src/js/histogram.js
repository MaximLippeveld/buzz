// https://www.d3-graph-gallery.com/graph/histogram_basic.html

import * as d3 from 'd3';


export const histogram_d3 = function(app, features) {
    
    const padding = 30
    const width = 400;
    const height = d3.select("#visualizer").node().getBoundingClientRect().height;
    const binning = d3.bin()
      .value(d => d)
      .thresholds(50);
    const xScale = d3.scaleLinear().rangeRound([padding, width-padding]);
    const yScale = d3.scaleLinear().range([height-padding, padding]);

    const hist = function(feature, i) {
        const svg = d3.select(this);

        svg.append("g")
            .attr("transform", "translate(0," + (height-padding) + ")")
            .call(d3.axisBottom(xScale.domain([d3.min(app.descriptor_data[feature]), d3.max(app.descriptor_data[feature])])));

        var bins = binning.domain(xScale.domain())(app.descriptor_data[feature])

        svg.append("g")
            .attr("transform", "translate(" + padding + ", 0)")
            .call(d3.axisLeft(yScale.domain([0, d3.max(bins, function(d) { return d.length; })])));

        svg.selectAll("rect")
            .data(bins)
            .enter()
            .append("rect")
                .attr("x", 1)
                .attr("transform", function(d) { return "translate(" + xScale(d.x0) + "," + yScale(d.length) + ")"; })
                .attr("width", function(d) { return xScale(d.x1) - xScale(d.x0) -1 ; })
                .attr("height", function(d) { return height - padding - yScale(d.length); })
                .style("fill", "#69b3a2")
    }

    d3.select("#visualizer")
        .selectAll("svg")
        .data(features)
        .enter()
        .append("svg")
        .classed("flex-shrink-0 mr-5", true)
        .attr("width", width)
        .attr("height", height)
        .each(hist)
}