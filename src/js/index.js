import 'alpinejs';
import papa from 'papaparse';
import * as d3 from 'd3';
import { scatter } from './scatter';
import { search } from './util'
import { histogram } from './histogram';
import feather from 'feather-icons';
import * as _ from 'lodash';

const app = function() {
    return {
        currPopId: 1,
        currAnnotId: 1,
        populations: [],
        annotations: [],
        colorScale: d3.scaleOrdinal(d3.schemeCategory10).domain(d3.range(10)),
        load: function() {
            feather.replace()

            const parent = this;
            papa.parse("http://127.0.0.1:8000/VIB/Vulcan/vib-vulcan-metadata/representations/umap/Slava_PBMC/data.csv", {
                download: true,
                header: true,
                dynamicTyping: true,
                worker: true,
                complete: function(result) {
                    parent.data = _.map(result.data, function(e) {
                        e.selected = 0;
                        return e
                    });
                    parent.quadtree = d3
                        .quadtree()
                        .x(d => d.dim_1)
                        .y(d => d.dim_2)
                        .addAll(parent.data);

                    scatter(parent);
                }
            })
        },
        brushed: function() {
            var found = search(this.currPopId, this.quadtree, this.brushDomains)

            if (found > 0) {
                const pop = {
                    "id": this.currPopId,
                    "size": found,
                    "brushDomains": this.brushDomains,
                    "active": true,
                    "color": this.colorScale(this.currPopId)
                };
                this.populations.push(pop);
                this.$nextTick(() => { 
                    feather.replace()
                    document.getElementById("population-"+pop.id).style.borderColor = pop.color 
                })
                this.currPopId++;

                this.populationChange()
            }
        },
        removePopulation: function(popId) {
            var idx = _.findIndex(this.populations, e => e.id == popId)
            search(0, this.quadtree, this.populations[idx].brushDomains)
            this.populations.splice(idx, 1)
            this.populationChange()
        },
        activePopulations: function() {
            return _.map(_.filter(this.populations, v => v.active), v => v.id)
        },
        activePopulationColors: function() {
            return _.flatMap(_.filter(this.populations, v => v.active), v => v.color)
        },
        populationChange: function() {
            histogram(this, "vega-hist")
            d3.select('d3fc-group')
                .node()
                .requestRedraw();
        },
        visualize: function() {
            var histDiv = document.createElement("div")
            histDiv.setAttribute("id", "vega-hist")
            document.getElementById("visualizer").appendChild(histDiv)
            histogram(this, "vega-hist") 
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