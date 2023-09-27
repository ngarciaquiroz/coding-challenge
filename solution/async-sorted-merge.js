"use strict";
const heapJs = require("heap-js");
const LogNode = require("./log-node");
// Print all entries, across all of the *async* sources, in chronological order.

module.exports = (logSources, printer) => {
    return new Promise((resolve, reject) => {
        mergePrefetchAsync(logSources, printer).then((res) =>
            resolve(console.log("Async sort complete."))
        );
    });
};

/**
 * This is an approach just like we did for the sync but handling the
 * first set of log in parallel and wating for all the promises to fisnish
 * then following the same behaviour
 */
async function mergeAsync(logSources, printer) {
    const customPriorityComparator = (a, b) => a.log.date - b.log.date;
    // Min Heap by default
    const minHeap = new heapJs.Heap(customPriorityComparator);
    let promises = [];

    logSources.forEach((element, index) => {
        promises.push(
            element.popAsync().then((log) => {
                minHeap.push(new LogNode(index, log));
            })
        );
    });
    await Promise.all(promises);
    while (!minHeap.isEmpty()) {
        let log = minHeap.pop();
        printer.print(log.log);
        await logSources[log.index].popAsync().then((nextLog) => {
            if (nextLog) {
                minHeap.push(new LogNode(log.index, nextLog));
            }
        });
    }
    printer.done();
}

/**
 * This is approach is trying to prefetch some of the data that's going
 * to be required for the next iterations, this can help a bit with
 * the performance but, we will hit the bottle neck again, if the
 * process of geting the next popAsync it's slower
 */
async function mergePrefetchAsync(logSources, printer) {
    let nextLogEntries = logSources.map(() => []);
    const customPriorityComparator = (a, b) => a.log.date - b.log.date;

    async function updatePrefetch(index) {
        await logSources[index].popAsync().then((nextLog) => {
            if (nextLog) {
                nextLogEntries[index].push(new LogNode(index, nextLog));
            }
        });
    }

    async function prefetch(logSources) {
        for (let i = 0; i < 5; i++) {
            let promises = [];
            logSources.forEach((element, index) => {
                promises.push(
                    element.popAsync().then((log) => {
                        nextLogEntries[index].push(new LogNode(index, log));
                    })
                );
            });
            await Promise.all(promises);
        }
    }

    const minHeap = new heapJs.Heap(customPriorityComparator);
    let promises = [];

    logSources.forEach((element, index) => {
        promises.push(
            element.popAsync().then((log) => {
                minHeap.push(new LogNode(index, log));
            })
        );
    });

    await Promise.all(promises);
    await prefetch(logSources);
    while (!minHeap.isEmpty()) {
        let log = minHeap.pop();
        printer.print(log.log);
        let nextLog = nextLogEntries[log.index].shift();
        if (nextLog) {
            minHeap.push(nextLog);
            await updatePrefetch(nextLog.index);
        }
    }
    printer.done();
}
