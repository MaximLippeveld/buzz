import 'alpinejs';
import * as d3 from 'd3';
import papa from 'papaparse';
import * as fc from 'd3fc'

const app = function() {
    return {
        data: [],
        result: null,
        parse: function() {
            for (var i = 0; i<this.result.data.length; i++) {
                const item = this.result.data[i]
                this.data.push([item.dim_1, item.dim_2, i])
            }
        },
        scatter: function() {
            const canvas = d3.select("#chart").node();
            var width = d3.select("body").node().getBoundingClientRect().width;
            var height = d3.select("body").node().getBoundingClientRect().height;
            canvas.width = width;
            canvas.height = height;
            
            const xScale = d3.scaleLinear()
  					.domain([d3.min(this.data, d => d[0]), d3.max(this.data, d => d[0])])
  
            const yScale = d3.scaleLinear()
  					.domain([d3.min(this.data, d => d[1]), d3.max(this.data, d => d[1])])

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
                .addAll(this.data);

            const series = fc.seriesWebglPoint()
                .crossValue(d => d[0])
                .mainValue(d => d[1])
                .size(1)

            // const annotationSeries = fc.seriesSvgAnnotation()
            //     .notePadding(15)
            //     .type(d3.annotationCallout);

            const annotations = [];
            const chart = fc
                .chartCartesian(xScale, yScale)
                .webglPlotArea(series)
                // .svgPlotArea(
                //     fc
                //     .seriesSvgMulti()
                //     .series([annotationSeries])
                //     .mapping(d => d.annotations)
                // )
                .decorate(sel =>
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
                    })
                    .call(zoom)
                );

            const redraw = () => {
                d3.select("#chart")
                    .datum(this.data)
                    .call(chart);
            }

            redraw();
        },
        load: function() {
            papa.parse("http://127.0.0.1:8000/weizmann/EhV/weizmann-ehv-metadata/representations/umap/Low/HTR_Low_tp9_zscored_selected_samples_and_features_all.csv", {
                download: true,
                header: true,
                dynamicTyping: true,
                worker: true,
                complete: function(result) {
                    window.app.result = result
                    window.app.parse()
                    window.app.scatter()
                }
            })
        },
    }
};

window.app = app;