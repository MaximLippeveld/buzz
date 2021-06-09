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

const aq = require("arquero");
const _ = require("lodash");

aq.addFunction("includes2", function(arr, i) {
    var idx = _.sortedIndexOf(arr, i)
    if (idx != -1) {
        arr = arr.splice(idx, 1)
        return true
    }
    return false
})

// const f = "/data/Experiment_data/weizmann/EhV/weizmann-ehv-metadata/representations/umap/Low/c8ba196c-0b22-4489-9f9c-1242f68dd7a5.csv"
const f ="/data/Experiment_data/weizmann/test.feather" 
            
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

    var header, descriptors, descriptor_idx;

    aq_options = {using: aq.fromArrow, as: 'arrayBuffer'}

    const dt = await aq.load(f, aq_options)

    header = dt.columnNames();
    [descriptors, descriptor_idx] = headers(header);

    return [header, dt, descriptor_idx, descriptors];
}

// https://stackoverflow.com/questions/28834835/readfile-in-base64-nodejs
exports.loadImages = function(url) {
    const fs = require('fs');
    const contents = fs.readFileSync(url, {encoding: 'base64'});
    console.log(contents);
}
