import 'alpinejs';
import papa from 'papaparse';
import * as d3 from 'd3';
import { scatter } from './scatter';
import { search } from './util'
import feather from 'feather-icons';
import * as _ from 'lodash';

const app = function() {
    return {
        currPopId: 1,
        currAnnotId: 1,
        populations: [],
        annotations: [],
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

                    scatter(parent.data, parent);
                }
            })
        },
        brushed: function() {
            var found = search(this.currPopId, this.quadtree, this.brushDomains)

            if (found > 0) {
                this.populations.push({
                    "id": this.currPopId++,
                    "size": found,
                    "brushDomains": this.brushDomains
                })
                this.$nextTick(() => feather.replace())
                d3.select('d3fc-group')
                    .node()
                    .requestRedraw();
            }
        },
        removePopulation: function(popId) {
            var idx = _.findIndex(this.populations, e => e.id == popId)
            search(0, this.quadtree, this.populations[idx].brushDomains)
            this.populations.splice(idx, 1)
            d3.select('d3fc-group')
                .node()
                .requestRedraw();
        },
        annotation: function(x, y, data, app, hold) {
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
                app.postAnnotation();
            });
        },
        postAnnotation: function() {
            this.$nextTick(() => {
                feather.replace()

                _.each(this.annotations, function(value) {
                    const el = document.getElementById("annotation-" + value.id);
                    el.style.top = value.pos.y + "px";
                    el.style.left = value.pos.x + "px";
                    const el2 = document.getElementById("wrap-" + value.id)
                    el2.style.width = value.width + "px";
                    el2.style.height = value.height + "px";
                })
            })
        },
        cycleChannel: function(offset, channels, id) {
            const el = document.getElementById("im-"+id);
            const newMargin = parseInt(el.style.marginLeft) + offset;
            const low = -Math.abs(offset)*(channels-1);
            if ((low <= newMargin) && (newMargin <= 0)) {
                el.style.marginLeft = newMargin + "px";
            }
        }
    }
};

window.app = app;