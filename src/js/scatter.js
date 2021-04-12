import * as d3 from 'd3';
import * as fc from 'd3fc'
import feather from 'feather-icons';

export const scatter = function(data) {

    const canvas = d3.select("#chart").node();
    var width = d3.select("body").node().getBoundingClientRect().width;
    var height = d3.select("body").node().getBoundingClientRect().height;
    canvas.width = width;
    canvas.height = height;
    
    const quadtree = d3
        .quadtree()
        .x(d => d.dim_1)
        .y(d => d.dim_2)
        .addAll(data);

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

    var brushDomains = []
    const brush = fc.brush()
        .on("brush end", function(event) {
            brushDomains = [
                [event.xDomain[0], event.yDomain[0]],
                [event.xDomain[1], event.yDomain[1]]
            ]
        })

    function search([[x0, y0], [x3, y3]]) {
        quadtree.visit((node, x1, y1, x2, y2) => {
            if (!node.length) {
                do {
                    const d = node.data;
                    const x = node.data.dim_1;
                    const y = node.data.dim_2;
                    d.scanned = true;
                    d.selected = x >= x0 && x < x3 && y >= y0 && y < y3;
                } while ((node = node.next));
            }
            return x1 >= x3 || y1 >= y3 || x2 < x0 || y2 < y0;
        });
    }
    d3.select("body")
        .on("keydown.endbrush", function(event) {
            if (event.keyCode == 13) {
                search(brushDomains)
                d3.select('d3fc-group')
                    .node()
                    .requestRedraw();
            }
        })

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
                .html(feather.icons["chevron-left"].toSvg())
            
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
            fc.seriesWebglPoint()
                .equals((a, b) => a === b)
                .crossValue(d => d.dim_1)
                .mainValue(d => d.dim_2)
                .type(d3.symbolCircle)

                // TODO: correctly display selection
                .size(d => {
                    if (d.selected) {
                        return 20;
                    } else if (d.scanned) {
                        return 5;
                    } else {
                        return 1;
                    }
                })
                .decorate(program => {
                    fillColor(program)
                })
        )
        .svgPlotArea(brush)
        .decorate(sel => {

            // the brush SVG is hidden initially so that exploration is possible
            const brushArea = sel
                .enter()
                .select('d3fc-svg.svg-plot-area')
                .classed("hidden", true)

            // the user can press 'b' to enable brushing
            // pressing 'b' unhides the brush SVG, disabling exploration
            function toggleBrush() {
                    brushArea.classed("hidden", !brushArea.classed("hidden"))
                    d3.select('d3fc-group')
                        .node()
                        .requestRedraw();

                    // update toggle icon
                    if (brushArea.classed("hidden")) {
                        d3.select("#controls #brush-toggle .icon").attr("data-feather", "toggle-left")
                    } else {
                        d3.select("#controls #brush-toggle .icon").attr("data-feather", "toggle-right")
                    }
                    feather.replace()
            }
            d3.select("body").on("keydown.enablebrush", event => { if (event.key == "b") toggleBrush() })
            d3.select("#brush-toggle").on("click", toggleBrush)

            // setup zooming and panning
            sel
                .enter()
                .select('d3fc-canvas.webgl-plot-area')
                .on("measure.range", (event, d) => {
                    xScaleOriginal.range([0, event.detail.width]);
                    yScaleOriginal.range([event.detail.height, 0]);
                })
                .call(zoom)

            // setup annotations
            sel
                .select("d3fc-canvas.webgl-plot-area")
                .on("click", (event, d) => {

                    // clicking without holding ctrl, removes all current annotations
                    if (!event.ctrlKey) {
                        d3.select("div#chart").selectAll("div.annotation").remove()
                    }

                    // find closest point on the canvas
                    const coord = d3.pointer(event);
                    const x = xScale.invert(coord[0]);
                    const y = yScale.invert(coord[1]);
                    const radius = Math.abs(x - xScale.invert(coord[0] - 20));
                    const c = quadtree.find(x, y, radius);

                    // if a point is found, draw an annotation
                    if(c != null) {
                        annotation(coord[0], coord[1], c)
                    }
                });
        });

    d3.select("#chart")
        .datum(data)
        .call(chart);
}