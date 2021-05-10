import 'alpinejs';
import * as d3 from 'd3';
import { scatter } from './scatter';
import { search, webglColor } from './util';
import { progress } from './progressbar'; 
import * as fc from 'd3fc';
import { histogram_d3 } from './histogram';
import feather from 'feather-icons';
import * as _ from 'lodash';

window._ = _

const populationFeature = {"name": "selected", "selected": true, "loaded": true, "type": "nominal"};
const baseBrushRange = [[0,0], [0,0]]
const url = "http://127.0.0.1:5000/feather/VIB/Vulcan/vib-vulcan-metadata/representations/umap/Slava_PBMC/data.feather";

const app = function() {
    return {
        meta: {size: 0, name: ""},
        data: [],
        currAnnotId: 1,
        populations: [],
        annotations: [],
        descriptors: {},
        header: null,
        descriptor_data: [],
        descriptor_idx: [{"name": "feature", "idx": []}, {"name": "meta", "idx": []}],
        scatterLoading: true,
        visualizerLoading: false,
        brushEnabled: true,
        jsDivergenceError: false,
        deleteAllowed: true,
        colorScale: null,
        colorHue: populationFeature,
        brushRange: baseBrushRange,
        currentPopulation: null,
        fillColor: null,
        redraw: null,
        decorate: null,
        updateFillColor() {
            const idx = this.header.indexOf(this.colorHue.name);
            this.fillColor = fc.webglFillColor().value(r => webglColor(this.colorScale(r[idx]), 0.9)).data(this.descriptor_data);
        },
        load() {

            function headers(features) {
                features.forEach(value => {
                    if (value.startsWith("feat")) {
                        this.descriptors[value] = {
                            "type": "continuous",
                            "name": value, 
                            "selected": false,
                            "loaded": false
                        };
                        this.descriptor_idx[0]["idx"].push(value);
                    } else {
                        this.descriptors[value] = {
                            "type": "nominal", 
                            "name": value, 
                            "selected": false,
                            "loaded": false
                        };
                        this.descriptor_idx[1]["idx"].push(value);
                    }
                })
            }
                
            const loadingDiv = d3.select("#scatter-loading");
            const backend = require("src/js/app.js");
            var first = true;
            var count = 0;
            backend.loadData("test", async batch => {
                console.log(count);
                
                if (first) {
                    first = false;
                    headers.bind(this)(batch[0])
                    this.header = batch[0];
                    this.header.push("selected")

                    // remove first row
                    batch.splice(0, 1);
                            
                    // await this.reColor(populationFeature);
                    // this.redraw = scatter.bind(this)();
                } else {
                    // this.updateFillColor()
                    // this.redraw();
                }
                
                var d = new Array(batch.length);
                for(let i = 0; i<d.length; i++) {
                    batch[i].push(0);
                    d[i] = {
                        id: count++,
                        dim_1: batch[i][this.header.indexOf("feat_umap_0")],
                        dim_2: batch[i][this.header.indexOf("feat_umap_1")]
                    }
                }
                this.data = this.data.concat(d)
                this.descriptor_data = this.descriptor_data.concat(batch)
            })
            .then(async () => { 
                this.quadtree = d3
                    .quadtree()
                    .x(d => d.dim_1)
                    .y(d => d.dim_2)
                    .addAll(this.data);
                await this.reColor(populationFeature);
                this.redraw = scatter.bind(this)();
                // this.redraw();
                this.scatterLoading = false;
                console.log("Finished", this.data.length);
            });

            feather.replace()
        },
        brushed() {
            search(this.quadtree, this.brushDomains).then(found => {
                if (found.length > 0) {
                    var pop;
                    if(this.currentPopulation == null) {
                        const id = this.populations.length == 0 ? 1 : _.maxBy(this.populations, "id").id + 1;
                        pop = {
                            "id": id,
                            "active": true
                        };
                        
                        pop["color"] = this.colorScale(pop.id);
                        
                        this.populations.push(pop);
                        this.$nextTick(() => { 
                            feather.replace()
                            document.getElementById("population-"+pop.id).style.borderColor = pop.color 
                        })
                    } else {
                        pop = this.currentPopulation;
                        this.currentPopulation = null;
                    }

                    pop["brushDomains"] = this.brushDomains;
                    pop["brushRange"] = this.brushRange;
                    pop["idx"] = new Array(found.length);
                    pop["size"] = found.length;

                    var idx = this.header.indexOf("selected");
                    found.forEach((f, i) => {
                        pop["idx"][i] = f.id;
                        this.descriptor_data[f.id][idx] = pop.id;
                    })

                    this.brushRange = baseBrushRange;
                    this.reColor(populationFeature);
                    this.redraw();
                }
            })
        },
        brush(enable, event) {

            // if keydown event, check if 'b' is pressed
            if ((event) && (event.type == "keydown") && (event.code != "KeyB")) {
                return;
            }

            d3
                .select('d3fc-svg.svg-plot-area')
                .classed("hidden", !enable);
            this.brushEnabled = enable;

            if (event) {
                d3.select('d3fc-group')
                    .node()
                    .requestRedraw();
            }
        },
        removePopulation(popId) {
            var i = _.findIndex(this.populations, e => e.id == popId)
            var j = this.header.indexOf("selected");
            search(this.quadtree, this.populations[i].brushDomains).then(found => {
                found.forEach(f => this.descriptor_data[f.id][j] = 0)
            })
            this.populations.splice(i, 1)
            this.reColor(populationFeature, true)
        },
        editPopulation(pop) {
            this.currentPopulation = pop;
            this.brushRange = pop.brushRange;
            this.brush(true);
            this.redraw();
        },
        showPopulation() {
            this.reColor(populationFeature, true)
        },
        async reColor(feature, redraw) {
            this.colorHue.selected = false;
            feature.selected = true;

            const idx = this.header.indexOf(feature.name)
            await this.loadFeatures([feature]);
            switch(feature.type) {
                case "nominal":
                    const s = new Set()
                    this.descriptor_data.forEach(r => s.add(r[idx]))
                    const uniques = Array.from(s);
                    const scale = (uniques.length < 10 ?
                        d3.scaleOrdinal().range(d3.schemeCategory10) : 
                        d3.scaleOrdinal().range(d3.quantize(d3.interpolateOrRd, uniques.length+1))
                    );

                    var domain;
                    const value = uniques[0]
                    if (typeof value === 'string' || value instanceof String) {
                        domain = uniques;
                    } else {
                        domain = d3.range(d3.max(uniques)+1);
                    }

                    this.colorScale = scale.domain(domain);

                    break;
                case "continuous":
                    const arr = this.descriptor_data.map(r => r[idx]);
                    this.colorScale = d3.scaleSequential(d3.interpolatePlasma).domain([
                        d3.quantile(arr, 0.05),
                        d3.quantile(arr, 0.95)
                    ])
                    break;
            }

            this.colorHue = feature
            this.updateFillColor();

            if (redraw) {
                d3.select('d3fc-group')
                    .node()
                    .requestRedraw();
            }
        },
        async loadFeatures(features, progress) {
            features = features.filter((f) => !f.loaded)

            // load all requested features in parallel
            if(progress) progress.total = features.length;
            return Promise.allSettled(features.map(async f => {
                const d = await d3.json("http://127.0.0.1:5000/features/get/"+f.name)
                f.loaded = true;
                this.descriptor_data[f.name] = d.data
                if (progress) progress.update(1)
            }))
        },
        async jsDivergence() {
            this.deleteAllowed = false;

            const ids = _.map(_.filter(this.populations, v => v.active), v => v.id);
            if (ids.length != 2) {
                this.jsDivergenceError = true;
                setTimeout(() => this.jsDivergenceError = false, 1000)
                return 
            }
            
            this.visualizerLoading = true;
            var prog;
            this.$nextTick(() => {
                const loadingDiv = d3.select("#visualizer-loading");

                prog = progress({el: loadingDiv, message: "Loading JS Divergence"})
                if (loadingDiv.select("svg").empty()) {
                    prog.init();
                } 
            })

            d3.json("http://127.0.0.1:5000/features/js-divergence", {
                method:"POST",
                body: JSON.stringify({
                    populations: this.descriptor_data["selected"],
                    selected: ids 
                }),
                headers: {
                    "Content-type": "application/json; charset=UTF-8"
                }
            }).then((response) => {
                const features = response.data.map(value => this.descriptors[value]);

                this.loadFeatures(features, prog)
                .then(() => { 
                    this.visualizerLoading = false;
                    this.$nextTick(() => histogram_d3.bind(this)(response.data))
                })
                .then(() => this.deleteAllowed = true)
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

            d3.json("http://127.0.0.1:5000/image/" + data.meta_dir).then((response) => {
                if (!hold) app.annotations = []

                this.annotations.push({
                    id: app.currAnnotId++, 
                    images: response.data,
                    pos: {x: x, y: y},
                    width: response.width,
                    height: response.height,
                    channels: response.channels
                })
                this.$nextTick(() => post())
            });
        }
    }
};

window.app = app;