import 'alpinejs';
import * as d3 from 'd3';
import papa from 'papaparse';
import * as fc from 'd3fc'

const app = function() {
    return {
        load: function() {
            papa.parse("http://127.0.0.1:8000/weizmann/EhV/weizmann-ehv-metadata/representations/umap/Low/HTR_Low_tp9_zscored_selected_samples_and_features.csv", {
                download: true,
                header: true,
                dynamicTyping: true,
                worker: true,
                complete: function(result) {
                    const data = window.app.parse(result)
                    window.app.scatter(data)
                }
            })
        },
        parse: function(result) {
            let data = []
            for (var i = 0; i<result.data.length; i++) {
                const item = result.data[i]
                data.push([item.dim_1, item.dim_2, i])
            }
            return data
        },
        scatter: function(data) {
            const canvas = d3.select("#chart").node();
            var width = d3.select("body").node().getBoundingClientRect().width;
            var height = d3.select("body").node().getBoundingClientRect().height;
            canvas.width = width;
            canvas.height = height;

            const xScale = d3.scaleLinear()
  					.domain([d3.min(data, d => d[0]), d3.max(data, d => d[0])])
  
            const yScale = d3.scaleLinear()
  					.domain([d3.min(data, d => d[1]), d3.max(data, d => d[1])])

            const xScaleOriginal = xScale.copy();
            const yScaleOriginal = yScale.copy();

            const zoom = d3.zoom()
                .on("zoom", (event, d) => {
                    xScale.domain(event.transform.rescaleX(xScaleOriginal).domain());
                    yScale.domain(event.transform.rescaleY(yScaleOriginal).domain());

                    d3
                        .selectAll("p.annotation")
                        .style("transform", "translate(" + event.transform.x + "px," + event.transform.y + "px) scale(" + event.transform.k + ")");
                    redraw();
                })

            const quadtree = d3
                .quadtree()
                .x(d => d[0])
                .y(d => d[1])
                .addAll(data);
                        
            function annotation(x, y) {
                d3
                    .select("d3fc-group.cartesian-chart")
                    .append("p")
                    .text("test")
                    .classed("annotation absolute", true)
                    .style("top", y + "px")
                    .style("left", x + "px")
                    .style("transform-origin", "0 0");
            }

            const chart = fc
                .chartCartesian(xScale, yScale)
                .webglPlotArea(
                    fc
                        .seriesWebglMulti()
                        .series([
                            fc.seriesWebglPoint()
                                .equals((a, b) => a === b)
                                .crossValue(d => d[0])
                                .mainValue(d => d[1])
                                .size(1)
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
        
                            // "http://127.0.0.1:8000/VIB/Vulcan/Slava_PBMC/images_subset/pbmc+PI_00000000-3.png"

                    sel
                        .select("d3fc-canvas.plot-area")
                        .on("click", (event, d) => {
                            if (!event.ctrlKey) {
                                d3.select("div#chart").selectAll("p.annotation").remove()
                            }

                            const coord = d3.pointer(event);
                            const x = xScale.invert(coord[0]);
                            const y = yScale.invert(coord[1]);
                            const radius = Math.abs(x - xScale.invert(coord[0] - 20));
                            const c = quadtree.find(x, y, radius);

                            if(c != null) {
                                annotation(coord[0], coord[1])
                            }
                        });
                });

            const redraw = () => {
                d3.select("#chart")
                    .datum(data)
                    .call(chart);
            }

            redraw();
        },
    }
};

window.app = app;