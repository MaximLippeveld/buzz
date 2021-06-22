// Copyright (C) 2021 Maxim Lippeveld
// 
// This file is part of Buzz.
// 
// Buzz is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// Buzz is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with Buzz.  If not, see <http://www.gnu.org/licenses/>.

import 'alpinejs';
import * as d3 from 'd3';
import { scatter } from './scatter';
import { search, webglColor } from './util';
import * as fc from 'd3fc';
import { histogram_d3 } from './histogram';
import feather from 'feather-icons';
import * as _ from 'lodash';
            
window._ = _

const backend = require("public/app.js");

const populationFeature = {"name": "selected", "selected": true, "loaded": true, "type": "nominal"};
const baseBrushRange = [[0,0], [0,0]]
const keyMap = {"feature": 0, "meta": 1, "modal": 0, "dims": 0};

const app = function() {
    return {
        // functions
        liteRedraw() {
            console.log("redraw");
            d3.select('d3fc-group')
                .node()
                .requestRedraw();
        },
        updateFillColor() {
            this.fillColor = fc
                .webglFillColor()
                .value(r => webglColor(this.colorScale(r), 0.9))
                .data(this.descriptor_data.array(this.colorHue.name));
        },
        resetState() {

            if(("populations" in this) && (this.populations.length > 0)) {
                this.descriptor_data.derive({"selected": 0});
            }

            // placeholders
            this.meta = {size: 0, name: ""};
            this.data = [];
            this.currAnnotId = 1;
            this.populations = [];
            this.annotations = [];
            this.dotSize = 1;
            this.colorScale = null;
            this.colorHue = populationFeature;
            this.brushRange = baseBrushRange;
            this.currentPopulation = null;
            this.fillColor = null;
            this.redraw = null;
            this.decorate = null;
            this.descriptor_idx = [{"name": "feature", "idx": []}, {"name": "meta", "idx": []}];
            this.query_idx = {'modal': [], 'dims': []};
            this.dims = [null, null];
            this.i = 0;

            // boolean switches
            this.showFeaturesModal = false;
            this.showCredits = false;
            this.showDimsSelector = false;
            this.noDatasetLoaded = true;
            this.scatterLoading = false;
            this.visualizerLoading = false;
            this.visualizerActive = false;
            this.visualizerVisible = false;
            this.brushEnabled = false;
            this.jsDivergenceError = false;
            this.deleteAllowed = true;
            this.images = false;
        },
        setup() {
            this.resetState();
            feather.replace();
            
            var menu = new nw.Menu({ type: "menubar"});
            var fileMenu = new nw.Menu()
            fileMenu.append(new nw.MenuItem({
                label: "Open",
                click: () => {
                    this.$refs.fileSelector.click()
                }
            }));
            fileMenu.append(new nw.MenuItem({
                type: "separator",
            }))
            fileMenu.append(new nw.MenuItem({
                label: "Toggle fullscreen",
                click: () => nw.Window.get().toggleFullscreen()
            }))
            fileMenu.append(new nw.MenuItem({
                label: "Quit",
                click: () => nw.Window.get().close()
            }))
            menu.append(new nw.MenuItem({
                label: "File",
                submenu: fileMenu
            }));
            nw.Window.get().menu = menu;
        },
        async loadPreDimsSelect(event) {

            this.resetState();

            console.time("data");
            [
                this.header, 
                this.descriptor_data, 
                this.descriptor_idx, 
                this.descriptors,
            ] = await backend.loadData(event.target.files[0].path);
            console.timeEnd("data");
            
            this.meta["size"] = this.descriptor_data.numRows();
            this.meta["name"] = event.target.files[0].path;
            _.forEach(this.descriptors, (d, k) => d.loaded=true);
            this.descriptor_idx.forEach(d => this.query_idx[d.name] = d.idx);
            this.resetFeatureSelectors();
            this.query_idx['dims'] = this.descriptor_idx[0].idx;

            this.noDatasetLoaded = false;
            this.showDimsSelector = true;
        },
        loadPostDimsSelect() {
            this.showDimsSelector = false;
            this.scatterLoading = true;
            var mapping = {columns: {index: "id"}};
            mapping["columns"][this.dims[0]] = "dim_1";
            mapping["columns"][this.dims[1]] = "dim_2";

            this.$nextTick(async () => { 
                this.quadtree = d3
                    .quadtree()
                    .x(d => d.dim_1)
                    .y(d => d.dim_2)
                    .addAll(this.descriptor_data.objects(mapping));

                this.descriptor_data = this.descriptor_data.derive({"selected": 0});
                await this.reColor(populationFeature);
                this.runScatter();
                this.scatterLoading = false;
                this.noDatasetLoaded = false;
                console.log("Finished", this.descriptor_data.numRows());
            })
        },
        runScatter() {
            this.redraw = scatter.bind(this)();
            this.redraw();
        },
        selectDim(dim) {
            this.dims[this.i] = dim.name;
            this.i += 1;
            this.i %=2;
        },
        async brushed() {
            await this.reColor(populationFeature, false);
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
                    pop["idx"] = found.sort((a, b) => a - b);
                    pop["size"] = found.length;

                    this.descriptor_data = this.descriptor_data
                        .params({id: pop.id, arr: Array.from(pop["idx"])})
                        .derive({
                            "selected": (row, $) => sortedIncludesWithRemove($.arr, row.index) ? $.id : row.selected
                        })

                    this.brushRange = baseBrushRange;
                    this.reColor(populationFeature, true);

                    if (this.visualizerActive) {
                        this.histograms();
                    }
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
                this.liteRedraw();
            }
        },
        removePopulation(popId) {
            var i = _.findIndex(this.populations, e => e.id == popId)
            this.descriptor_data = this.descriptor_data
                .params({arr: Array.from(this.populations[i]["idx"])})
                .derive({
                    "selected": (row, $) => sortedIncludesWithRemove($.arr, row.index) ? 0 : row.selected
                })
            this.populations.splice(i, 1)
            this.reColor(populationFeature, true)

            if (this.visualizerActive) 
                this.histograms();
        },
        editPopulation(pop) {
            this.currentPopulation = pop;
            this.brushRange = pop.brushRange;
            this.brush(true);
            this.redraw();
            
            if (this.visualizerActive) 
                this.histograms();
        },
        showPopulation() {
            this.reColor(populationFeature, true)
        },
        togglePopulationActive(pop) {
            pop.active = !pop.active;
            if(this.visualizerActive) {
                this.histograms();
            }
        },
        async reColor(feature, redraw) {
            this.colorHue.selected = false;
            feature.selected = true;

            switch(feature.type) {
                case "nominal":
                    const uniques = Array.from(new Set(this.descriptor_data.column(feature.name)))
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
                    const arr = this.descriptor_data.column(feature.name);
                    this.colorScale = d3.scaleSequential(d3.interpolatePlasma).domain([
                        d3.quantile(arr, 0.05),
                        d3.quantile(arr, 0.95)
                    ])
                    break;
            }

            this.colorHue = feature
            this.updateFillColor();

            if (redraw) {
                this.liteRedraw();
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
        resetFeatureSelectors() {
            this.$refs.queryDims.value = "";
            this.$refs.queryModal.value = "";
            this.query_idx['modal'] = this.descriptor_idx[0].idx;
            this.query_idx['dims'] = this.descriptor_idx[0].idx;
            this.descriptor_idx[0].idx.forEach(i => this.descriptors[i].histogram = false)
        },
        query(event, key) {
            const q = event.target.value;
            this.query_idx[key] = this.descriptor_idx[keyMap[key]].idx.filter(idx => this.descriptors[idx].name.includes(q));
        },
        amountSelected() {
            return this.descriptor_idx[0].idx.filter(i => this.descriptors[i].histogram).length;
        },
        histograms() {
            this.deleteAllowed = false;
            this.visualizerLoading = true;
            this.visualizerActive = true;
            this.visualizerVisible = true;
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
        annotation(x, y, data, hold) {
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

            // d3.json("http://127.0.0.1:5000/image/" + data.meta_dir).then((response) => {
            //     if (!hold) app.annotations = []

            //     this.annotations.push({
            //         id: app.currAnnotId++, 
            //         images: response.data,
            //         pos: {x: x, y: y},
            //         width: response.width,
            //         height: response.height,
            //         channels: response.channels
            //     })
            //     this.$nextTick(() => post())
            // });
        }
    }
};

window.app = app;