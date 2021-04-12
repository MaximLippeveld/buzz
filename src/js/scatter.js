import * as d3 from 'd3';
import * as fc from 'd3fc'
import * as feather from 'feather-icons';

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

        const container = d3
            .select("d3fc-group.cartesian-chart")
            .append("div")
            .classed("annotation absolute p-1 bg-gray-100", true)
            .style("top", y + "px")
            .style("left", x + "px")
            .style("transform-origin", "0 0");

        const img_section = container
            .append("div")
            .classed("flex flex-nowrap items-center", true)

        // container
        //     .append("p")
        //     .text(data.meta_label)

        d3.json("http://127.0.0.1:5000/image/" + data.meta_dir).then(function(response) {
            img_section
                .append("div")
                .classed("cursor-pointer", true)
                .on("click", function(event, d) {
                    const leftMargin = Math.min(
                        0,
                        parseInt(img_container.style("margin-left"))+response.width
                    )
                    img_container
                        .style("margin-left", leftMargin + 'px')
                })
                .html(feather.icons["chevron-left"].toSvg(), {'width': 10, 'height': 15})
            
            const img_container = img_section
                .append("div")
                .style("width", response.width + "px")
                .style("height", response.height + "px")
                .classed("overflow-hidden", true)
                .append("div")
                .classed("flex flex-nowrap flex-row", true)

            img_section
                .append("div")
                .classed("cursor-pointer", true)
                .on("click", function(event, d) {
                    const leftMargin = Math.max(
                        -response.width*(response.channels-1),
                        parseInt(img_container.style("margin-left"))-response.width
                    )
                    img_container
                        .style("margin-left", leftMargin + 'px')
                })
                .html(feather.icons["chevron-right"].toSvg())

            img_container
                .selectAll("img")
                .data(response.data)
                .join("img")
                    .attr("src", (d, i) => d)
        });
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