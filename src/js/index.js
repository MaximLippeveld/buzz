import 'alpinejs';
import * as d3 from 'd3';
import { scatter } from './scatter';
import { hashCode, search } from './util'
import { histogram } from './histogram';
import feather from 'feather-icons';
import * as _ from 'lodash';

window._ = _

const populationFeature = {"name": "selected", "selected": true, "loaded": true};
const populationColorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(d3.range(10));

const app = function() {
    return {
        currPopId: 1,
        currAnnotId: 1,
        populations: [],
        annotations: [],
        descriptors: [],
        colorScale: populationColorScale,
        colorHue: populationFeature,
        colorTransform: v => v,
        load: function() {
            feather.replace()

            const parent = this;
            d3.json("http://127.0.0.1:5000/feather/VIB/Vulcan/vib-vulcan-metadata/representations/umap/Slava_PBMC/data.feather").then(function(response) {
                parent.data = _.map(response.data, function(e) {
                    e.selected = 0;
                    return e
                });
                parent.quadtree = d3
                    .quadtree()
                    .x(d => d.dim_1)
                    .y(d => d.dim_2)
                    .addAll(parent.data);

                scatter(parent);
            
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
            })

        },
        brushed: function() {
            var found = search(this.currPopId, this.quadtree, this.brushDomains)

            if (found > 0) {
                const pop = {
                    "id": this.currPopId,
                    "size": found,
                    "brushDomains": this.brushDomains,
                    "active": false,
                    "color": populationColorScale(this.currPopId)
                };
                this.populations.push(pop);
                this.$nextTick(() => { 
                    feather.replace()
                    document.getElementById("population-"+pop.id).style.borderColor = pop.color 
                })
                this.currPopId++;

                this.selectFeature(populationFeature, null)
            }
        },
        removePopulation: function(popId) {
            var idx = _.findIndex(this.populations, e => e.id == popId)
            search(0, this.quadtree, this.populations[idx].brushDomains)
            this.populations.splice(idx, 1)
            this.redraw()
        },
        activePopulations: function() {
            return _.map(_.filter(this.populations, v => v.active), v => v.id)
        },
        activePopulationColors: function() {
            return _.flatMap(_.filter(this.populations, v => v.active), v => v.color)
        },
        reColor: function(type) {
            const featureName = this.colorHue.name;
            this.colorTransform = v => v
            switch(type) {
                case "nominal":
                    const uniques = new Set(_.flatMap(this.data, d=>d[featureName])).size
                    const scheme = uniques <= 10 ? d3.schemeCategory10 : d3.interpolateOrRd;
                    this.colorScale = d3.scaleSequential(scheme).domain(d3.range(uniques))

                    const value = this.data[0][featureName]
                    if (typeof value === 'string' || value instanceof String) {
                        if (!isFinite(Number(value))) {
                            this.colorTransform = v => hashCode(v) % uniques
                        } else {
                            this.colorTransform = v => Number(v) % uniques
                        }
                    } 
                    break;
                case "continuous":
                    this.colorScale = d3.scaleSequential(d3.interpolatePlasma).domain([
                        d3.min(this.data, d => d[featureName]),
                        d3.max(this.data, d => d[featureName])
                    ])
                    break;
                default:
                    this.colorScale = populationColorScale;
            }
            this.redraw();
        },
        redraw: function() {
            d3.select('d3fc-group')
                .node()
                .requestRedraw();
        },
        selectFeature: async function(feature, type) {
            this.colorHue.selected = false;
            
            feature.selected = true;
            if (!feature.loaded) {
                const response = await d3.json("http://127.0.0.1:5000/features/get/"+feature.name)
                this.data = _.map(this.data, function(value, index) {
                    value[feature.name] = response.data[index]
                    return value
                })
                feature.loaded = true
            }

            this.colorHue = feature
            this.reColor(type)
        },
        jsDivergence: async function() {
            const response = await d3.json("http://127.0.0.1:5000/features/js-divergence", {
                method:"POST",
                body: JSON.stringify({
                    populations: _.flatMap(this.data, v => v.selected)
                }),
                headers: {
                    "Content-type": "application/json; charset=UTF-8"
                }
            })
           
            const app = this; 
            _.each(response.data, function(value) {
                var feature = _.find(app.features, v => v.name == value)
                app.selectFeature(feature)
            })

            var histDiv = document.createElement("div")
            histDiv.setAttribute("id", "vega-hist")
            document.getElementById("visualizer").appendChild(histDiv)
            histogram(this, response.data[0], "vega-hist") 
        },
        selectedFeatures: function() {
            return _.map(_.filter(this.features, v => v.selected), v => v.name)
        },
        annotation: function(x, y, data, app, hold) {
            function post(annotations) {
                feather.replace()
                _.each(annotations, function(value) {
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
                app.$nextTick(() => post(app.annotations))
            });
        },
        cycleChannel: function(offset, channels, id, event) {
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
        }
    }
};

window.app = app;