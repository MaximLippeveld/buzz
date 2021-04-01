import * as d3 from 'd3';
import * as fc from 'd3fc'

export const scatter = function(data) {

    const canvas = d3.select("#chart").node();
    var width = d3.select("body").node().getBoundingClientRect().width;
    var height = d3.select("body").node().getBoundingClientRect().height;
    canvas.width = width;
    canvas.height = height;

    const xScale = d3.scaleLinear()
            .domain([d3.min(data, d => d.dim_1), d3.max(data, d => d.dim_1)])

    const yScale = d3.scaleLinear()
            .domain([d3.min(data, d => d.dim_2), d3.max(data, d => d.dim_2)])

    const xScaleOriginal = xScale.copy();
    const yScaleOriginal = yScale.copy();

    const zoom = d3.zoom()
        .on("zoom", (event, d) => {
            xScale.domain(event.transform.rescaleX(xScaleOriginal).domain());
            yScale.domain(event.transform.rescaleY(yScaleOriginal).domain());
            d3.selectAll("div.annotation").remove();
            
            d3.select('d3fc-group')
                .node()
                .requestRedraw();
        })

    const quadtree = d3
        .quadtree()
        .x(d => d.dim_1)
        .y(d => d.dim_2)
        .addAll(data);
                
    function annotation(x, y, data) {
        const src = "http://127.0.0.1:8000/VIB/Vulcan/Slava_PBMC/images_subset/pbmc+PI_00000000-3.png";
        
        const container = d3
            .select("d3fc-group.cartesian-chart")
            .append("div")
            .classed("annotation absolute p-1 bg-gray-100", true)
            .style("top", y + "px")
            .style("left", x + "px")
            .style("transform-origin", "0 0");

        container
            .append("p")
            .text(data.meta_label)

        container
            .append("img")
            .attr("src", src)
    }

    function hashCode(s) {
        if (s == null) {
            return 0
        }
        const code =  s.split("").reduce((a, b) => {
            a = (a << 5) - a + b.charCodeAt(0);
            return a & a;
        }, 0);
        return code
    }
    const labelColorScale = d3.scaleOrdinal(d3.schemeCategory10);
    function webglColor(color) {
        const { r, g, b, opacity } = d3.color(color).rgb();
        return [r / 255, g / 255, b / 255, opacity];
    };
    const labelFill = d => webglColor(labelColorScale(hashCode(d.meta_label) % 10));
    const fillColor = fc.webglFillColor().value(labelFill).data(data);

    const chart = fc
        .chartCartesian(xScale, yScale)
        .webglPlotArea(
            fc
                .seriesWebglMulti()
                .series([
                    fc.seriesWebglPoint()
                        .equals((a, b) => a === b)
                        .crossValue(d => d.dim_1)
                        .mainValue(d => d.dim_2)
                        .type(d3.symbolCircle)
                        .size(3)
                        .decorate(program => {
                            fillColor(program)
                        })
                ])
                .mapping(d => d)
        )
        .decorate(sel => {

            sel
                .enter()
                .select('d3fc-canvas.plot-area')
                .on("measure.range", (event, d) => {
                    xScaleOriginal.range([0, event.detail.width]);
                    yScaleOriginal.range([event.detail.height, 0]);
                })
                .call(zoom)

            sel
                .select("d3fc-canvas.plot-area")
                .on("click", (event, d) => {
                    if (!event.ctrlKey) {
                        d3.select("div#chart").selectAll("div.annotation").remove()
                    }

                    const coord = d3.pointer(event);
                    const x = xScale.invert(coord[0]);
                    const y = yScale.invert(coord[1]);
                    const radius = Math.abs(x - xScale.invert(coord[0] - 20));
                    const c = quadtree.find(x, y, radius);

                    if(c != null) {
                        annotation(coord[0], coord[1], c)
                    }
                });
        });

    d3.select("#chart")
        .datum(data)
        .call(chart);
}