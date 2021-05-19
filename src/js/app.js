const fs = require("fs");
const papa = require("papaparse");

// const f = "/data/Experiment_data/weizmann/EhV/weizmann-ehv-metadata/representations/umap/Low/c8ba196c-0b22-4489-9f9c-1242f68dd7a5.csv"
const f ="/data/Experiment_data/weizmann/ctrl.csv" 
            
function headers(features) {
    var descriptor_idx = [{"name": "feature", "idx": []}, {"name": "meta", "idx": []}];
    var descriptors = {};
    features.forEach(value => {
        if (value.startsWith("feat")) {
            descriptors[value] = {
                "type": "continuous",
                "name": value, 
                "selected": false,
                "histogram": false,
                "loaded": false
            };
            descriptor_idx[0]["idx"].push(value);
        } else {
            descriptors[value] = {
                "type": "nominal", 
                "name": value, 
                "selected": false,
                "loaded": false
            };
            descriptor_idx[1]["idx"].push(value);
        }
    })
    return [descriptors, descriptor_idx];
}

exports.loadData = async function(csv) {
    const stream = fs.createReadStream(f);

    var header, data, descriptor_data, descriptors, descriptor_idx, count, first;
    descriptor_data = {};
    data = [];
    count = 0;
    first = true;
    
    var images = false;

    await new Promise((resolve, reject) => {

        papa.parse(stream, {
            header: false,
            dynamicTyping: true,
            complete: (results, file) => {

                var batch = results.data;

                console.time("batch")
                
                if (first) {
                    [descriptors, descriptor_idx] = headers(batch[0]);
                    header = batch[0];
                    for(let i = 0; i<header.length; i++) descriptor_data[header[i]] = [];

                    // remove first row
                    batch.splice(0, 1);
                    
                    first = false;
                }

                for (let i = 0; i<header.length; i++) {
                    descriptor_data[header[i]].length += batch.length;
                }

                const l = data.length;
                data.length += batch.length;
                const idxDim1 = header.indexOf("feat_umap_0");
                const idxDim2 = header.indexOf("feat_umap_1");
                const idxImage = header.indexOf("meta_image");

                if (idxImage != -1) images = true;

                for(let i = 0; i<batch.length; i++) {
                    data[l+i] = {
                        id: count++,
                        dim_1: batch[i][idxDim1],
                        dim_2: batch[i][idxDim2]
                    }
                    if(images) {
                        data[l+i]["image"] = batch[i][idxImage];
                    }
                    for (let j = 0; j<batch[i].length; j++) {
                        descriptor_data[header[j]][l+i] = batch[i][j];
                    }
                }
                
                console.timeEnd("batch");

                resolve();
            }
        })
    })

    return [header, descriptor_data, data, descriptor_idx, descriptors, images];
}

// https://stackoverflow.com/questions/28834835/readfile-in-base64-nodejs
exports.loadImages = function(url) {
    const fs = require('fs');
    const contents = fs.readFileSync(url, {encoding: 'base64'});
    console.log(contents);
}
