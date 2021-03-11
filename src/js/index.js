import 'alpinejs';
import { data } from 'autoprefixer';
import * as d3 from 'd3';
import papa from 'papaparse';
import * as fc from 'd3fc'

window.app = function() {
    return {
        data: [],
        result: null,
        parse: function() {
            for (var i = 0; i<this.result.data.length; i++) {
                const item = this.result.data[i]
                this.data.push([item.dim_1, item.dim_2])
            }
        },
        webgltest: function() {
            const data = [4, 6, 8, 6, 0, 10];
            const canvas = d3.select("#chart").node()

            var width = d3.select("body").node().getBoundingClientRect().width
            var height = d3.select("body").node().getBoundingClientRect().height

            canvas.width = width
            canvas.height = height

            console.log(width)
            console.log(height)

            const xScale = d3.scaleLinear()
                .domain([0, data.length])
                .range([0, width]);

            const yScale = d3.scaleLinear()
                .domain([0, 10])
                .range([height, 0]);

            const ctx = canvas.getContext('webgl');

            const series = fc.seriesWebglPoint()
                .xScale(xScale)
                .yScale(yScale)
                .crossValue((_, i) => i)
                .mainValue((d) => d)
                .size(10)
                .context(ctx);

            series(data);
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

            const series = fc.seriesWebglPoint()
                .crossValue(d => d[0])
                .mainValue(d => d[1])
                .size(10)

            const chart = fc
                .chartCartesian(xScale, yScale)
                .webglPlotArea(series)

            d3.select("#chart")
                .datum(this.data)
                .call(chart);
        },
        load: function() {
            papa.parse("http://127.0.0.1:8000/weizmann/EhV/weizmann-ehv-metadata/representations/umap/HTR_Low_tp9_zscored_selected_samples_and_features_all.csv", {
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
}