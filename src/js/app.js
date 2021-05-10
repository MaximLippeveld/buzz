const csvBatch = require("csv-batch");
const fs = require("fs");

// const f = "/data/Experiment_data/weizmann/EhV/weizmann-ehv-metadata/representations/umap/Low/c8ba196c-0b22-4489-9f9c-1242f68dd7a5.csv"
const f ="/data/Experiment_data/weizmann/ctrl.csv" 

exports.loadData = function(csv, batchFunc) {
    const stream = fs.createReadStream(f);
    return csvBatch(stream, {
        batch: true,
        batchSize: 10000,
        header: false,
        batchExecution: batchFunc
    })
}
