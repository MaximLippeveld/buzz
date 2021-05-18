import 'alpinejs';
import * as d3 from 'd3';
import { scatter } from './scatter';
import { search, webglColor } from './util';
import * as fc from 'd3fc';
import { histogram_d3 } from './histogram';
import feather from 'feather-icons';
import * as _ from 'lodash';
            

window._ = _

const backend = require("src/js/app.js");

const populationFeature = {"name": "selected", "selected": true, "loaded": true, "type": "nominal"};
const baseBrushRange = [[0,0], [0,0]]

const app = function() {
    return {
        meta: {size: 0, name: ""},
        data: [],
        currAnnotId: 1,
        populations: [],
        annotations: [],
        scatterLoading: true,
        visualizerLoading: false,
        brushEnabled: false,
        jsDivergenceError: false,
        deleteAllowed: true,
        colorScale: null,
        colorHue: populationFeature,
        brushRange: baseBrushRange,
        currentPopulation: null,
        fillColor: null,
        redraw: null,
        decorate: null,
        descriptor_idx: [{"name": "feature", "idx": []}, {"name": "meta", "idx": []}],
        showFeaturesModal: false,
        query_idx: [],
        updateFillColor() {
            this.fillColor = fc
                .webglFillColor()
                .value(r => webglColor(this.colorScale(r), 0.9))
                .data(this.descriptor_data[this.colorHue.name]);
        },
        async load() {

            this.scatterLoading = true;

            console.time("data");
            [
                this.header, 
                this.descriptor_data, 
                this.data, 
                this.descriptor_idx, 
                this.descriptors
            ] = await backend.loadData("test");
            _.forEach(this.descriptors, (d, k) => d.loaded=true);
            console.timeEnd("data");
            
            this.quadtree = d3
                .quadtree()
                .x(d => d.dim_1)
                .y(d => d.dim_2)
                .addAll(this.data);

            this.descriptor_data["selected"] = new Array(this.data.length).fill(0);
            await this.reColor(populationFeature);
            this.redraw = scatter.bind(this)();
            this.scatterLoading = false;
            console.log("Finished", this.data.length);

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

                    found.forEach((f, i) => {
                        pop["idx"][i] = f.id;
                        this.descriptor_data["selected"][f.id] = pop.id;
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
            search(this.quadtree, this.populations[i].brushDomains).then(found => {
                found.forEach(f => this.descriptor_data["selected"][f.id] = 0)
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

            switch(feature.type) {
                case "nominal":
                    const uniques = Array.from(new Set(this.descriptor_data[feature.name]))
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
                    const arr = this.descriptor_data[feature.name];
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
        selectFeatures() {
            this.$refs.query.value = "";
            this.query_idx = this.descriptor_idx[0].idx;
            this.descriptor_idx[0].idx.forEach(i => this.descriptors[i].histogram = false)
            this.showFeaturesModal = true;
        },
        query(event) {
            const q = event.target.value;
            this.query_idx = this.descriptor_idx[0].idx.filter(idx => this.descriptors[idx].name.includes(q));
        },
        amountSelected() {
            return this.descriptor_idx[0].idx.filter(i => this.descriptors[i].histogram).length;
        },
        histograms() {
            this.deleteAllowed = false;
            this.visualizerLoading = true;
            this.$nextTick(() => {
                histogram_d3.bind(this)(
                    this.descriptor_idx[0].idx
                    .filter(i => this.descriptors[i].histogram)
                    .map(i => this.descriptors[i].name)
                );
                this.visualizerLoading = false;
                this.deleteAllowed = true;
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