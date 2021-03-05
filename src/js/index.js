import alpinejs from 'alpinejs';
import d3 from 'd3';
import papa from 'papaparse';

window.app = function() {
    return {
        dataFile: "test!!!!",
        load: function() {
            papa.parse(this.$refs.inputter.files[0], {
                worker: true,
                header: true,
                complete: function(result) {
                    console.log(result)
                }
            })
        },
    }
}