// Copyright (C) 2021 Maxim Lippeveld
// 
// This file is part of Buzz.
// 
// Buzz is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// Buzz is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with Buzz.  If not, see <http://www.gnu.org/licenses/>.

// https://www.d3-graph-gallery.com/graph/histogram_basic.html

import { op } from 'arquero';
import * as d3 from 'd3';


export const histogram_d3 = async function(features) {

    console.time("histogram_3d")

    const padding = 50
    const width = 350;
    const height = d3.select("#visualizer").node().getBoundingClientRect().height;
    const binning = d3.bin()
      .value(d => d)
      .thresholds(30);
    var xScale = d3.scaleLinear().range([padding, width]);
    var yScale = d3.scaleLinear().range([height-padding, padding]).domain([0,1]);
    const populations = this.populations.filter(pop => pop.active);
    const popIds = populations.map(pop => pop.id);

    const descriptor_data = this.descriptor_data;
    
    var grouped = this.descriptor_data
    .params({"pops": popIds})
    .filter((r, $) => includes($.pops, r.selected))
    .groupby("selected");

    var groups = grouped.groups();
    var parts = grouped.partitions();

    const hist = function(feature) {
        const svg = d3.select(this);

        svg.selectAll("*").remove();

        svg.append("text")
            .attr("transform", "translate(" + (width/2) + "," + (padding / 2) + ")")
            .attr("text-anchor", "middle")
            .text(d => d)

        var domain = descriptor_data
        .rollup({max: op.max(feature), min: op.min(feature)})
        .objects()[0];
        domain = [domain["min"], domain["max"]];
        const diff = domain[1] - domain[0];
        domain[0] -= diff*0.05;
        domain[1] += diff*0.05;

        var popId, col;
        var getter = descriptor_data.getter(feature);

        var feat = descriptor_data.array(feature);
        var bins = binning.domain(domain)(feat);
        var allBins = bins.map(b => {
            b.color = d3.color("lightgrey");
            b.opacity = 0.2;
            b.height = b.length/descriptor_data.numRows();
            return b;
        });

        parts.forEach((part, idx) => {

            popId = groups.get[0](groups.rows[idx])
            col = d3.color(populations[popIds.indexOf(popId)].color);
            col.opacity = 0.4;

            feat = part.map(getter)
            bins = binning.domain(domain)(feat)
            allBins = allBins.concat(bins.map(b => {
                b.color = col;
                b.height = b.length/part.length;
                return b;
            }));
        })

        svg.append("g")
            .attr("transform", "translate(0," + (height-padding) + ")")
            .call(d3.axisBottom(xScale.domain(domain)).ticks(5));

        svg.append("g")
            .attr("transform", "translate(" + padding + ", 0)")
            .call(d3.axisLeft(yScale));

        svg
            .selectAll("rect")
            .data(allBins)
            .enter()
            .append("rect")
                .attr("transform", d => "translate(" + xScale(d.x0) + "," + yScale(d.height) + ")")
                .attr("width", d => xScale(d.x1) - xScale(d.x0) -1)
                .attr("height", d => height - padding - yScale(d.height))
                .style("fill", d => d.color)
    }

    const join = d3.select("#visualizer")
        .selectAll("svg.histogram")
        .data(features)

    join
        .exit()
        .remove();

    join
        .enter()
        .insert("svg", "div")
        .classed("flex-shrink-0 mr-5 histogram cursor-color-picker", true)
        .attr("width", width)
        .attr("height", height)
        .merge(join)
        .on('click', (event , d) => this.reColor(this.descriptors[d], true))
        .each(hist)
    
    console.timeEnd("histogram_3d")
}