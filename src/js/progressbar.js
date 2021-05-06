import * as d3 from 'd3';

export const progress = function({
    el, 
    message = "Loading...",
    height = 20,
}) {
    return {
        el: el,
        message: message,
        progress: [{c: "white", s: "black", value: 1}, {c: "black", s: "black", value: 0}],
        scale: null,
        height: height,
        total: null,
        value: null,
        init() {
            el
                .append("p")
                .text(message)

            const width = el.node().getBoundingClientRect().width
            this.scale = d3.scaleLinear().range([0, width]).domain([0, 1]);
            el
                .append("svg")
                .attr("width", width)
                .attr("height", this.height)
                .selectAll("rect")
                .data(this.progress)
                .enter()
                .append("rect")
                .attr("width", d => this.scale(d.value))
                .attr("height", this.height)
                .attr("fill", d => d.c)
                .attr("stroke", d => d.s)
                .attr("stroke-width", 4)
        },
        update(value) {
            this.value += value;
            this.progress[1].value = this.value / this.total;
            el
                .select("svg")
                .selectAll("rect")
                .data(this.progress)
                .attr("width", d => this.scale(d.value));
        }
    }
}