import { performance } from 'node:perf_hooks';

// Simulate the old way
async function oldDelete(objects, deleteFn) {
    for (const object of objects) {
        await deleteFn(object.key);
    }
}

// Simulate the new way
async function newDelete(objects, deleteFn) {
    const promises = objects.map(object => deleteFn(object.key));
    await Promise.all(promises);
}

async function run() {
    const objects = Array.from({ length: 1000 }, (_, i) => ({ key: `file-${i}` }));
    const mockDelete = async (key) => new Promise(resolve => setTimeout(resolve, 1));

    console.log("Benchmarking Sequential Deletion...");
    const start1 = performance.now();
    await oldDelete(objects, mockDelete);
    const end1 = performance.now();
    const oldTime = end1 - start1;
    console.log(`Sequential Duration: ${oldTime.toFixed(2)} ms`);

    console.log("\nBenchmarking Promise.all Deletion...");
    const start2 = performance.now();
    await newDelete(objects, mockDelete);
    const end2 = performance.now();
    const newTime = end2 - start2;
    console.log(`Promise.all Duration: ${newTime.toFixed(2)} ms`);

    console.log(`\nImprovement: ${((oldTime - newTime) / oldTime * 100).toFixed(2)}% faster`);
}

run().catch(console.error);
