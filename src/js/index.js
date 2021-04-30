import 'alpinejs';
import * as d3 from 'd3';
import { scatter } from './scatter';
import { hashCode, search, webglColor } from './util'
import * as fc from 'd3fc'
import { histogram_d3 } from './histogram';
import feather from 'feather-icons';
import * as _ from 'lodash';

window._ = _

const populationFeature = {"name": "selected", "selected": true, "loaded": true, "type": "pop"};
const populationColorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(d3.range(10));

const app = function() {
    return {
        data: [],
        currPopId: 1,
        currAnnotId: 1,
        populations: [],
        annotations: [],
        descriptors: {},
        descriptor_data: {"selected": []},
        descriptor_idx: [{"name": "feature", "idx": []}, {"name": "meta", "idx": []}],
        scatterLoading: true,
        brushEnabled: false,
        jsDivergenceError: false,
        deleteAllowed: true,
        colorScale: populationColorScale,
        colorHue: populationFeature,
        colorTransform: v => v,
        fillColor: null,
        async updateFillColor() {
            const selectedFill = f => webglColor(this.colorScale(this.colorTransform(f)), 0.9)
            this.fillColor = fc.webglFillColor().value(selectedFill).data(this.descriptor_data[this.colorHue.name]);
        },
        load() {
            feather.replace()

            const parent = this;
            d3.json("http://127.0.0.1:5000/features/list").then(function(response) {
                response.features.forEach((value) => {
                    parent.descriptors[value] = {
                        "type": "continuous",
                        "name": value, 
                        "selected": false,
                        "loaded": false
                    };
                    parent.descriptor_idx[0]["idx"].push(value);
                })
                response.meta.forEach((value) => {
                    parent.descriptors[value] = {
                        "type": "nominal", 
                        "name": value, 
                        "selected": false,
                        "loaded": false
                    };
                    parent.descriptor_idx[1]["idx"].push(value);
                })
            })

            var barheight = 20;
            var progress = [{c: "white", s: "black", value: 1}, {c: "black", s: "black", value: 0}]
            const loadingDiv = d3.select("#loading").classed("z-50", true);
            const width = loadingDiv.node().getBoundingClientRect().width
            const progressScale = d3.scaleLinear().range([0, width]).domain([0, 1])
            const svg = loadingDiv.select("svg")
                .attr("width", width)
                .attr("height", barheight)
            svg
                .selectAll("rect")
                .data(progress)
                .enter()
                .append("rect")
                .attr("width", d => progressScale(d.value))
                .attr("height", barheight)
                .attr("fill", d => d.c)
                .attr("stroke", d => d.s)
                .attr("stroke-width", 4)
            
            const streamingLoaderWorker = new Worker("/bin/streaming.js", {type: "module"})
            let first = true;
            let redraw, addBrush;
            let count = 0;
            streamingLoaderWorker.onmessage = ({data: {payload, totalBytes, total, finished}}) => {
                if(payload.length > 0) {
                    parent.data = parent.data.concat(payload.map((d) => {
                        d.id = count++;
                        return d
                    }))
                    parent.descriptor_data["selected"] = parent.descriptor_data["selected"].concat(
                        new Array(payload.length).fill(0))
                }

                if (finished) {
                    parent.quadtree = d3
                        .quadtree()
                        .x(d => d.dim_1)
                        .y(d => d.dim_2)
                        .addAll(parent.data);
                    parent.updateFillColor();
                    addBrush();
                    parent.scatterLoading = false;
                    console.log("Finished", parent.data.length);
                }

                if (first) {
                    parent.updateFillColor();
                    [redraw, addBrush] = scatter(parent);
                    first = false;
                } else {
                    parent.updateFillColor();
                    redraw(parent.data);
                }

                progress[1].value = parent.data.length / total;
                svg
                    .selectAll("rect")
                    .data(progress)
                    .transition()
                    .duration(1000)
                    .attr("width", d => progressScale(d.value))
            }
            streamingLoaderWorker.postMessage("http://127.0.0.1:5000/feather/VIB/Vulcan/vib-vulcan-metadata/representations/umap/Slava_PBMC/data.feather");
        },
        brushed() {
            const app = this;
            search(this.quadtree, this.brushDomains).then(found => {
                if (found.length > 0) {
                    const pop = {
                        "id": app.currPopId,
                        "size": found.length,
                        "brushDomains": app.brushDomains,
                        "active": true,
                        "color": populationColorScale(app.currPopId)
                    };
                    app.populations.push(pop);
                    app.$nextTick(() => { 
                        feather.replace()
                        document.getElementById("population-"+pop.id).style.borderColor = pop.color 
                    })
                    found.forEach((f) => {
                        app.descriptor_data["selected"][f.id] = app.currPopId;
                    })

                    app.currPopId++;
                    app.reColor(populationFeature)
                }
            })
        },
        removePopulation(popId) {
            var idx = _.findIndex(this.populations, e => e.id == popId)
            const app = this;
            search(this.quadtree, this.populations[idx].brushDomains).then(found => {
                found.forEach(f => app.descriptor_data["selected"][f.id] = 0)
            })
            this.populations.splice(idx, 1)
            this.reColor(populationFeature)
        },
        activePopulations() {
            return _.map(_.filter(this.populations, v => v.active), v => v.id)
        },
        activePopulationColors() {
            return _.flatMap(_.filter(this.populations, v => v.active), v => v.color)
        },
        reColor(feature) {
            this.colorHue.selected = false;
            feature.selected = true;

            const app = this;
            this.loadFeatures([feature]).then(() => {
                app.colorTransform = v => v
                switch(feature.type) {
                    case "nominal":
                        const uniques = new Set(app.descriptor_data[feature.name]).size
                        const scheme = uniques <= 10 ? d3.schemeCategory10 : d3.interpolateOrRd;
                        app.colorScale = d3.scaleSequential(scheme).domain(d3.range(uniques))

                        const value = app.descriptor_data[feature.name][0]
                        if (typeof value === 'string' || value instanceof String) {
                            if (!isFinite(Number(value))) {
                                app.colorTransform = v => hashCode(v) % uniques
                            } else {
                                app.colorTransform = v => Number(v) % uniques
                            }
                        } 
                        break;
                    case "continuous":
                        const arr = app.descriptor_data[feature.name];
                        app.colorScale = d3.scaleSequential(d3.interpolatePlasma).domain([
                            d3.quantile(arr, 0.05),
                            d3.quantile(arr, 0.95)
                        ])
                        break;
                    default:
                        app.colorScale = populationColorScale;
                }

                app.colorHue = feature
                app.updateFillColor().then(() => app.redraw());
            })
        },
        async redraw() {
            d3.select('d3fc-group')
                .node()
                .requestRedraw();
        },
        showPopulation() {
            this.reColor(populationFeature, null)
        },
        async loadFeatures(features) {
            const app = this;

            features = features.filter((f) => !f.loaded)

            // load all requested features in parallel
            return Promise.allSettled(features.map(async (f) => {
                const d = await d3.json("http://127.0.0.1:5000/features/get/"+f.name)
                f.loaded = true;
                app.descriptor_data[f.name] = d.data
            }))
        },
        async jsDivergence() {
            this.deleteAllowed = false;

            const ids = this.activePopulations();
            if (ids.length != 2) {
                this.jsDivergenceError = true;
                setTimeout(() => this.jsDivergenceError = false, 1000)
                return 
            }

            const app = this;
            d3.json("http://127.0.0.1:5000/features/js-divergence", {
                method:"POST",
                body: JSON.stringify({
                    populations: app.descriptor_data["selected"],
                    selected: ids 
                }),
                headers: {
                    "Content-type": "application/json; charset=UTF-8"
                }
            }).then((response) => {
                const features = response.data.map(value => app.descriptors[value]);

                this.loadFeatures(features)
                .then(() => histogram_d3(app, response.data))
                .then(() => app.deleteAllowed = true)
            })
           
        },
        selectedFeatures() {
            return _.map(_.filter(this.features, v => v.selected), v => v.name)
        },
        cycleChannel(offset, channels, id, event) {
            function cycleOne(id) {
                const el = document.getElementById("im-"+id);
                const newMargin = parseInt(el.style.marginLeft) + offset;
                const low = -Math.abs(offset)*(channels-1);
                if ((low <= newMargin) && (newMargin <= 0)) {
                    el.style.marginLeft = newMargin + "px";
                }
            }
            if (event.shiftKey) {
                _.each(this.annotations, value => cycleOne(value.id))
            } else {
                cycleOne(id)
            }
        },
        annotation(x, y, data, app, hold) {
            function post() {
                feather.replace()
                _.each(app.annotations, function(value) {
                    const el = document.getElementById("annotation-" + value.id);
                    el.style.top = value.pos.y + "px";
                    el.style.left = value.pos.x + "px";
                    const el2 = document.getElementById("wrap-" + value.id)
                    el2.style.width = value.width + "px";
                    el2.style.height = value.height + "px";
                })
            }

            d3.json("http://127.0.0.1:5000/image/" + data.meta_dir).then(function(response) {
                if (!hold) app.annotations = []

                app.annotations.push({
                    id: app.currAnnotId++, 
                    images: response.data,
                    pos: {x: x, y: y},
                    width: response.width,
                    height: response.height,
                    channels: response.channels
                })
                app.$nextTick(() => post())
            });
        }
    }
};

window.app = app;