import 'alpinejs';
import papa from 'papaparse';
import { scatter } from './scatter.js'

const app = function() {
    return {
        load: function() {

            const parse = this.parse;

            papa.parse("http://127.0.0.1:8000/VIB/Vulcan/vib-vulcan-metadata/representations/umap/Slava_PBMC/data.csv", {
                download: true,
                header: true,
                dynamicTyping: true,
                worker: true,
                complete: function(result) {
                    scatter(result.data)
                }
            })
        }
    }
};

window.app = app;