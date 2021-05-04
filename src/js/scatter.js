import * as d3 from 'd3';
import * as fc from 'd3fc';
import {legend, swatches} from './util';

export const scatter = function() {

    const canvas = d3.select("#chart").node();
    var width = d3.select("body").node().getBoundingClientRect().width;
    var height = d3.select("body").node().getBoundingClientRect().height;
    canvas.width = width;
    canvas.height = height;
    
    const xScale = d3.scaleLinear()
            .domain(d3.extent(this.data, d => d.dim_1));

    const yScale = d3.scaleLinear()
            .domain(d3.extent(this.data, d => d.dim_2));

    const xScaleOriginal = xScale.copy();
    const yScaleOriginal = yScale.copy();

    var dotSize = 1;
    const zoom = d3.zoom()
        .on("zoom", function(event, d) {
            xScale.domain(event.transform.rescaleX(xScaleOriginal).domain());
            yScale.domain(event.transform.rescaleY(yScaleOriginal).domain());

            this.annotations = [];
            
            d3.select('d3fc-group')
                .node()
                .requestRedraw();
        }.bind(this))

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
                    .decorate(function(program) {
                        this.fillColor(program);

                        const gl = program.context();
                        gl.enable(gl.BLEND);
                        gl.blendFuncSeparate(
                            gl.SRC_ALPHA,
                            gl.ONE_MINUS_DST_ALPHA,
                            gl.ONE,
                            gl.ONE_MINUS_SRC_ALPHA
                        );
                        
                        // add colorscale for continuous features
                        const leg = d3.select("#legend svg")
                        if (this.colorHue.type == "continuous") {
                            leg.selectAll("*").remove();
                            leg
                                .append(() => {
                                    return legend({
                                        color: this.colorScale,
                                        title: this.colorHue.name
                                    })
                                });
                        } else if (this.colorHue.name == "selected") {
                            leg.selectAll("*").remove();
                        } else if (this.colorHue.type == "nominal") {
                            leg.select("svg").remove();
                            leg.call(swatches, this.colorScale, this.colorHue);
                        }
                    }.bind(this))
            ])
            .mapping(data => data.series)
        )
        .decorate(function(sel) {
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

    function addInteractivity() {
        chart.svgPlotArea(
            fc.seriesSvgMulti()
            .series([
                fc.brush()
                    .handleSize(10)
                    .on("brush end", function(event) {
                        this.brushDomains = [
                            [event.xDomain[0], event.yDomain[0]],
                            [event.xDomain[1], event.yDomain[1]]
                        ]
                    }.bind(this))
            ])
            .mapping(data => data.brushedRange)
        ).decorate(function(sel) {
            
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
                this.brushEnabled = !this.brushEnabled
                d3.select('d3fc-group')
                    .node()
                    .requestRedraw();
            }
            toggleBrush = toggleBrush.bind(this);

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
                .on("click", function(event, d) {
                    // find closest point on the canvas
                    const coord = d3.pointer(event);
                    const x = xScale.invert(coord[0]);
                    const y = yScale.invert(coord[1]);
                    const radius = Math.abs(x - xScale.invert(coord[0] - 20));
                    const c = this.quadtree.find(x, y, radius);

                    // if a point is found, draw an annotation
                    if(c != null) {
                        this.annotation(coord[0], coord[1], c, app, event.ctrlKey)
                    }
                }.bind(this));
        }.bind(this))
    }
    
    redraw(this.data);

    return [redraw, addInteractivity.bind(this)];
}