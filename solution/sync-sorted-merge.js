"use strict";
const heapJs = require("heap-js");
const LogNode = require("./log-node");

// Print all entries, across all of the sources, in chronological order.
//
/*
 * Assuming that the problem can be seen as merging & sorting a N arrays,
 * my initial approach was just to merge them into one and then sort
 * [1,11,2,21,3,31,4,41,5,51] [10,20,30,40,50]
 * [1,11,2,21,3,31,4,41,5,51,10,20,30,40,50] and then sort
 * [1,2,3,4,5,10,11,20,21,30,31,40,41,50,51]
 * but based on the AC "source could contain millions of entries and be exabytes in size!", this will make the server run out of memory
 *
 * Looking for solutions on how to merge "extremely large arrays" I found a data Structure that handles the order called minHeap
 * which makes the merge a bit simpler
 *
 */
module.exports = (logSources, printer) => {
    const customPriorityComparator = (a, b) => a.log.date - b.log.date;
    // Min Heap by default
    const minHeap = new heapJs.Heap(customPriorityComparator);
    logSources.forEach((element, index) => {
        minHeap.push(new LogNode(index, element.pop()));
    });

    while (!minHeap.isEmpty()) {
        let logEntry = minHeap.pop();
        printer.print(logEntry.log);
        let nextLog = logSources[logEntry.index].pop();
        if (nextLog) {
            minHeap.push(new LogNode(logEntry.index, nextLog));
        }
    }
    printer.done();
    return console.log("Sync sort complete.");
};
