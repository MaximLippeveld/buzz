import 'alpinejs';
import * as d3 from 'd3';
import { scatter } from './scatter';
import { hashCode, search, webglColor } from './util'
import * as fc from 'd3fc'
import { histogram } from './histogram';
import feather from 'feather-icons';
import * as _ from 'lodash';

window._ = _

const populationFeature = {"name": "selected", "selected": true, "loaded": true};
const populationColorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(d3.range(10));

const app = function() {
    return {
        data: [],
        currPopId: 1,
        currAnnotId: 1,
        populations: [],
        annotations: [],
        descriptors: [],
        brushEnabled: false,
        jsDivergenceError: false,
        deleteAllowed: true,
        colorScale: populationColorScale,
        colorHue: populationFeature,
        colorTransform: v => v,
        fillColor: null,
        async updateFillColor() {
            const selectedFill = d => webglColor(this.colorScale(this.colorTransform(d[this.colorHue.name])), 0.9)
            this.fillColor = fc.webglFillColor().value(selectedFill).data(this.data);
        },
        load() {
            feather.replace()

            const parent = this;
            d3.json("http://127.0.0.1:5000/features/list").then(function(response) {
                parent.descriptors.push({
                    "name": "features", 
                    "type": "continuous", 
                    "list": _.map(response.features, function(value) {
                        return {
                            "name": value,
                            "selected": false,
                            "loaded": false
                        }
                    })
                })
                parent.descriptors.push({
                    "name": "meta",
                    "type": "nominal", 
                    "list": _.map(response.meta, function(value) {
                        return {
                            "name": value,
                            "selected": false,
                            "loaded": false
                        }
                    })
                })
            })
            
            const streamingLoaderWorker = new Worker("/bin/streaming.js", {type: "module"})
            let first = true;
            let chart = null;
            streamingLoaderWorker.onmessage = ({data: {payload, totalBytes, finished}}) => {
                parent.data = parent.data.concat(_.map(payload.data, function(e) {
                    e.selected = 0;
                    return e
                }));

                if (finished) {
                    parent.quadtree = d3
                        .quadtree()
                        .x(d => d.dim_1)
                        .y(d => d.dim_2)
                        .addAll(parent.data);
                    parent.updateFillColor();
                }

                if (first) {
                    parent.updateFillColor();
                    chart = scatter(parent);
                    first = false;
                }
                parent.updateFillColor();
                chart(parent.data);
            }
            streamingLoaderWorker.postMessage("http://127.0.0.1:5000/feather/VIB/Vulcan/vib-vulcan-metadata/representations/umap/Slava_PBMC/data.feather");
        },
        brushed() {
            const app = this;
            search(this.currPopId, this.quadtree, this.brushDomains).then((found) => {
                if (found > 0) {
                    const pop = {
                        "id": app.currPopId,
                        "size": found,
                        "brushDomains": app.brushDomains,
                        "active": false,
                        "color": populationColorScale(app.currPopId)
                    };
                    app.populations.push(pop);
                    app.$nextTick(() => { 
                        feather.replace()
                        document.getElementById("population-"+pop.id).style.borderColor = pop.color 
                    })
                    app.currPopId++;
                    app.reColor(populationFeature, null)
                }
            })
        },
        removePopulation(popId) {
            var idx = _.findIndex(this.populations, e => e.id == popId)
            search(0, this.quadtree, this.populations[idx].brushDomains)
            this.populations.splice(idx, 1)
            this.reColor(populationFeature, null)
        },
        activePopulation() {
            return _.map(_.filter(this.populations, v => v.active), v => v.id)
        },
        activePopulationColors() {
            return _.flatMap(_.filter(this.populations, v => v.active), v => v.color)
        },
        reColor(feature, type) {
            this.colorHue.selected = false;
            feature.selected = true;

            const app = this;
            this.loadFeature(feature).then(() => {
                app.colorTransform = v => v
                switch(type) {
                    case "nominal":
                        const uniques = new Set(_.flatMap(app.data, d=>d[feature.name])).size
                        const scheme = uniques <= 10 ? d3.schemeCategory10 : d3.interpolateOrRd;
                        app.colorScale = d3.scaleSequential(scheme).domain(d3.range(uniques))

                        const value = app.data[0][feature.name]
                        if (typeof value === 'string' || value instanceof String) {
                            if (!isFinite(Number(value))) {
                                app.colorTransform = v => hashCode(v) % uniques
                            } else {
                                app.colorTransform = v => Number(v) % uniques
                            }
                        } 
                        break;
                    case "continuous":
                        const arr = _.flatMap(app.data, d => d[feature.name]);
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
        async loadFeature(feature) {
            if (!feature.loaded) {
                const response = await d3.json("http://127.0.0.1:5000/features/get/"+feature.name)
                this.data = _.map(this.data, function(value, index) {
                    value[feature.name] = response.data[index]
                    return value
                })
                feature.loaded = true
            }
        },
        async jsDivergence() {
            this.deleteAllowed = false;

            const ids = this.activePopulations();
            if (ids.length != 2) {
                this.jsDivergenceError = true;
                setTimeout(() => this.jsDivergenceError = false, 1000)
                return 
            }
            const colors = this.activePopulationColors();

            const app = this;
            d3.json("http://127.0.0.1:5000/features/js-divergence", {
                method:"POST",
                body: JSON.stringify({
                    populations: _.flatMap(this.data, v => ids.includes(v.selected) ? v.selected: 0)
                }),
                headers: {
                    "Content-type": "application/json; charset=UTF-8"
                }
            }).then((response) => {
                Promise.all(response.data.map((value) => {
                    var feature = _.find(app.descriptors[0].list, v => v.name == value)
                    return app.loadFeature(feature)
                })).then(() => {
                    histogram(app, ids, colors, response.data, 'visualizer')
                    app.deleteAllowed = true;
                })
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