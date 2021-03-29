import 'alpinejs';
import * as d3 from 'd3';
import papa from 'papaparse';
import * as fc from 'd3fc'
import * as d3Annotation from 'd3-svg-annotation'

const app = function() {
    return {
        load: function() {
            papa.parse("http://127.0.0.1:8000/weizmann/EhV/weizmann-ehv-metadata/representations/umap/Low/HTR_Low_tp9_zscored_selected_samples_and_features_all.csv", {
                download: true,
                header: true,
                dynamicTyping: true,
                worker: false,
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

            const zoom = d3
                .zoom()
                .on("zoom", (event, d) => {
                    xScale.domain(event.transform.rescaleX(xScaleOriginal).domain());
                    yScale.domain(event.transform.rescaleY(yScaleOriginal).domain());
                    redraw();
                });

            const quadtree = d3
                .quadtree()
                .x(d => d[0])
                .y(d => d[1])
                .addAll(data);

            const createAnnotationData = (title, x, y) => ({
                note: {
                    title,
                    label: "Lorem ipsum, lorem ipsum"
                },
                // annotation location
                x, y,
                // offset from annotated point
                dx: 20, dy: 20
            });
            const annotations =[]
            const makeAnnotations = d3Annotation.annotation()
                .notePadding(15)
                .accessors({
                    x: d => d.x,
                    y: d => d.y
                })
                .annotations(annotations)

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
                        .mapping(d => d.data)
                )
                .decorate(sel => {

                    sel
                        .enter()
                        // additionally add a d3fc-svg element for the axis
                        .append('d3fc-svg')
                        .attr("class", "plot-area")
                        .select("svg")
                        .append("g")
                        .attr("class", "annotation-group")
                        .call(makeAnnotations)

                    sel
                    .enter()
                    .select("d3fc-canvas.plot-area")
                    .on("measure.range", (event, d) => {
                        xScaleOriginal.range([0, event.detail.width]);
                        yScaleOriginal.range([event.detail.height, 0]);
                    })
                    .on("click", (event, d) => {
                        const xy = d3.pointer(event);
                        const x = xScale.invert(xy[0]);
                        const y = yScale.invert(xy[1]);
                        const radius = Math.abs(x - (x - 20));
                        const closestDatum = quadtree.find(x, y, radius);
                        
                        // add annotation
                        annotations.push(makeAnnotations("title", 100, 100))
                        redraw();
                    })
                    .call(zoom)
                });

            const redraw = () => {
                d3.select("#chart")
                    .datum({ data, annotations })
                    .call(chart);
            }

            redraw();
        },
    }
};

window.app = app;