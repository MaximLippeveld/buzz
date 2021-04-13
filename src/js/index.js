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
        populations: [],
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
        }
    }
};

window.app = app;