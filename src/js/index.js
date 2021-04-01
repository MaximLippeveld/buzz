import 'alpinejs';
import papa from 'papaparse';
import { scatter } from './scatter.js'

const app = function() {
    return {
        load: function() {

            const parse = this.parse;

            papa.parse("http://127.0.0.1:8000/weizmann/EhV/weizmann-ehv-metadata/representations/umap/Low/HTR_Low_tp9_zscored_selected_samples_and_features_all.csv", {
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