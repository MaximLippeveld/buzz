import * as d3 from 'd3';
import * as fc from 'd3fc';
import {legend} from './util';

export const scatter = function(app) {
    const data = app.data;

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

    var dotSize = 1;
    const zoom = d3.zoom()
        .on("zoom", (event, d) => {
            xScale.domain(event.transform.rescaleX(xScaleOriginal).domain());
            yScale.domain(event.transform.rescaleY(yScaleOriginal).domain());

            app.annotations = [];
            
            d3.select('d3fc-group')
                .node()
                .requestRedraw();
        })

    const chart = fc
        .chartCartesian(xScale, yScale)
        .webglPlotArea(
            fc.seriesWebglMulti()
            .series([
                fc.seriesWebglPoint()
                    .equals((a, b) => a === b)
                    .crossValue(d => d.dim_1)
                    .mainValue(d => d.dim_2)
                    .type(d3.symbolCircle)
                    .size(dotSize)
                    .decorate((program) => {
                        app.fillColor(program);

                        const gl = program.context();
                        gl.enable(gl.BLEND);
                        gl.blendFuncSeparate(
                            gl.SRC_ALPHA,
                            gl.ONE_MINUS_DST_ALPHA,
                            gl.ONE,
                            gl.ONE_MINUS_SRC_ALPHA
                        );
            
                        // add colorscale for continuous features
                        const l = d3.select("#legend")
                        l.selectAll("svg").remove();
                        if (app.colorHue.type == "continuous") {
                            l
                                .append(() => legend({
                                    color: app.colorScale,
                                    title: app.colorHue.name
                                }))
                        }
                    })
            ])
            .mapping(data => data.series)
        )
        .decorate(sel => {
            sel
                .select('d3fc-svg.x-axis')
                .classed("invisible", true)
            sel
                .select('d3fc-svg.y-axis')
                .classed("invisible", true)
        });

    function redraw(data) {
        d3.select("#chart")
            .datum({
                series: data,
                brushedRange: [[0,0], [0,0]]
            })
            .call(chart);
    }
    redraw(data);

    function addInteractivity() {
        chart.svgPlotArea(
            fc.seriesSvgMulti()
            .series([
                fc.brush()
                    .handleSize(10)
                    .on("brush end", function(event) {
                        app.brushDomains = [
                            [event.xDomain[0], event.yDomain[0]],
                            [event.xDomain[1], event.yDomain[1]]
                        ]
                    })
            ])
            .mapping(data => data.brushedRange)
        ).decorate(sel => {
            
            sel
                .select('d3fc-svg.x-axis')
                .classed("invisible", true)
            sel
                .select('d3fc-svg.y-axis')
                .classed("invisible", true)

            // the brush SVG is hidden initially so that exploration is possible
            const brushArea = sel
                .select('d3fc-svg.svg-plot-area')
                .classed("hidden", true)

            // the user can press 'b' to enable brushing
            // pressing 'b' unhides the brush SVG, disabling exploration
            function toggleBrush() {
                    brushArea.classed("hidden", !brushArea.classed("hidden"))
                    app.brushEnabled = !app.brushEnabled
                    d3.select('d3fc-group')
                        .node()
                        .requestRedraw();
            }
            d3.select("body").on("keydown.enablebrush", event => { if (event.key == "b") toggleBrush() })
            d3.select("#brush-toggle").on("click", toggleBrush)

            // setup zooming and panning
            sel
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
                    // find closest point on the canvas
                    const coord = d3.pointer(event);
                    const x = xScale.invert(coord[0]);
                    const y = yScale.invert(coord[1]);
                    const radius = Math.abs(x - xScale.invert(coord[0] - 20));
                    const c = app.quadtree.find(x, y, radius);

                    // if a point is found, draw an annotation
                    if(c != null) {
                        app.annotation(coord[0], coord[1], c, app, event.ctrlKey)
                    }
                });
        })
    }

    return [redraw, addInteractivity];
}