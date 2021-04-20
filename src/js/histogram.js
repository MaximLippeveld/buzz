// https://www.d3-graph-gallery.com/graph/histogram_basic.html

import * as d3 from 'd3';
import embed from 'vega-embed'

export const histogram = function(app, activePopulations, activePopulationColors, features, id) {
    var spec = {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        data: { values: app.data },
        transform: [
            {"filter": {"field": "selected", "oneOf": activePopulations}}
        ],
        repeat: features,
        config: {
            legend: {disable: true}
        },
        spec: {
            mark: 'bar',
            encoding: {
                x: {
                    bin: {"maxbins": 50},
                    field: {repeat: "repeat"}
                },
                y: {
                    aggregate: "count",
                    stack: null
                },
                color: {
                    field: "selected",
                    type: "nominal",
                    scale: {"range": activePopulationColors},
                    opacity: 0.7
                }
            }
        }
      };

    embed('#'+id, spec, {actions: false}).then((result) => {
        result.view.addEventListener('click', function(event, item) {
            var f = item.mark.name.replace("child__", "").replace("_group", "")
            var feature = _.find(app.descriptors[0].list, v => v.name == f)
            console.log(f)
            console.log(feature)
            app.reColor(feature, "continuous")
        });
    })
}

export const histogram_d3 = function(app) {
    const data = app.data;

    const padding = 30
    const width = 400;
    const height = d3.select("#visualizer").node().getBoundingClientRect().height;
    const svg = d3.select("#visualizer")
        .append("svg")
        .attr("width", width)
        .attr("height", height)

    const feature = "feat_eccentricity_0"

    const xScale = d3.scaleLinear()              
    	.domain([d3.min(data, function(d) { return d[feature] }), d3.max(data, function(d) { return d[feature] })])   
        .rangeRound([padding, width-padding]);
    svg.append("g")
        .attr("transform", "translate(0," + (height-padding) + ")")
        .call(d3.axisBottom(xScale));

    var binning = d3.bin()
      .value(d => d[feature])
      .domain(xScale.domain())
      .thresholds(50);

    var bins = binning(data)
    app.bins = bins

    var yScale = d3.scaleLinear()
        .range([height-padding, padding])
        .domain([0, d3.max(bins, function(d) { return d.length; })]);
    svg.append("g")
        .attr("transform", "translate(" + padding + ", 0)")
        .call(d3.axisLeft(yScale));

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