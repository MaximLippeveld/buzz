// https://www.d3-graph-gallery.com/graph/histogram_basic.html

import * as d3 from 'd3';


export const histogram_d3 = async function(app, features) {
    
    const padding = 50
    const width = 350;
    const height = d3.select("#visualizer").node().getBoundingClientRect().height - 30;
    const binning = d3.bin()
      .value(d => d)
      .thresholds(50);
    var xScale = d3.scaleLinear().rangeRound([padding, width-padding]);
    var yScale = d3.scaleLinear().range([height-padding, padding]);

    const hist = function(feature, i) {
        const svg = d3.select(this);

        svg.selectAll("*").remove();

        svg.append("text")
            .attr("transform", "translate(" + (width/2) + "," + (padding / 2) + ")")
            .attr("text-anchor", "middle")
            .text(d => d)

        const populations = app.populations.filter(pop => pop.active);
        const populationIds = populations.map(p => p.id)
        const allValues = app.descriptor_data[feature].filter((v, i) => populationIds.includes(app.descriptor_data["selected"][i]))
        const domain = [d3.min(allValues), d3.max(allValues)];
        var allBins = [];
        var maxY = 0;
        populations.forEach(pop => {
            const feat = app.descriptor_data[feature].filter((v, i) => pop.id == app.descriptor_data["selected"][i])
            const bins = binning.domain(domain)(feat)
            maxY = d3.max([maxY, d3.max(bins, d => d.length)]);
            allBins = allBins.concat(bins.map(b => {
                const col = d3.color(pop.color);
                col.opacity = 0.5;
                b.color = col;
                return b;
            }));
        })

        svg.append("g")
            .attr("transform", "translate(0," + (height-padding) + ")")
            .call(d3.axisBottom(xScale.domain(domain)));

        svg.append("g")
            .attr("transform", "translate(" + padding + ", 0)")
            .call(d3.axisLeft(yScale.domain([0, maxY])));

        svg
            .selectAll("rect")
            .data(allBins)
            .enter()
            .append("rect")
                .attr("transform", d => "translate(" + xScale(d.x0) + "," + yScale(d.length) + ")")
                .attr("width", d => xScale(d.x1) - xScale(d.x0) -1)
                .attr("height", d => height - padding - yScale(d.length))
                .style("fill", d => d.color)
    }

    const join = d3.select("#visualizer")
        .selectAll("svg")
        .data(features)

    join
        .enter()
        .append("svg")
        .classed("flex-shrink-0 mr-5", true)
        .attr("width", width)
        .attr("height", height)
        .merge(join)
        .on('click', (event , d) => app.reColor(app.descriptors[d]))
        .each(hist)
}