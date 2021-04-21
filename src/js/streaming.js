onmessage = async ({data: url}) => {
    const response = await fetch(url, {
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
    .then(response => response.body)
    .then(rb => {
        const reader = rb.getReader();
        const dec = new TextDecoder()
        let totalBytes = 0;
        let previousChunk = "";
        return new ReadableStream({
            start(controller) {
                const read = async () => {
                    const { done, value } = await reader.read();
                    if (done) {
                        controller.close();
                        return;
                    }

                    totalBytes += value.byteLength;
                    try {
                        const payload = JSON.parse(previousChunk+dec.decode(value));
                        previousChunk = "";
                        postMessage({payload, totalBytes});
                    } catch (error) {
                        previousChunk = dec.decode(value);
                    }

                    controller.enqueue(value);
                    read();
                };

                read();
            }
        })
    })
    .then(stream => {
        return new Response(stream, { headers: { "Content-Type": "application/json" } }).text();
    })
    .then(data => postMessage({ payload: [], totalBytes: data.length, finished: true }));
}