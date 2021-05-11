const csvBatch = require("csv-batch");
const fs = require("fs");
const d3 = require("d3");
const _ = require("lodash");

// const f = "/data/Experiment_data/weizmann/EhV/weizmann-ehv-metadata/representations/umap/Low/c8ba196c-0b22-4489-9f9c-1242f68dd7a5.csv"
const f ="/data/Experiment_data/weizmann/ctrl.csv" 

exports.loadData = function(csv, batchFunc) {
    const stream = fs.createReadStream(f);
    return csvBatch(stream, {
        batch: true,
        batchSize: 50000,
        header: false,
        batchExecution: batchFunc
    })
}

exports.test = function(data) {
    console.time("test")
    var vec;
    for (let i = 0; i<data[0].length; i++) {
        vec = new Array(data.length);
        _.forEach(data, (el, index) => vec[index] = el[i]);
    }
    console.timeEnd("test");
}
