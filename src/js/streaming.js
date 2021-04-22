
const jsonChunckedParser = () => {
  const textDecoder = new TextDecoder("utf-8");
  let input = "";

  return {
    parseChunk(chunk) {
        const decoded = textDecoder.decode(chunk);
        input += decoded

        if (input.endsWith("}]}")) {
            try {
                const payload = JSON.parse(input);
                input = "";
                return payload;
            } catch (error) {
                console.log(error, input)
            }
        }

        return null;
    }
  };
};


onmessage = async ({data: url}) => {

    let totalBytes = 0;
    const jsonParser = jsonChunckedParser();
    const response = await fetch(url, {
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })

    const streamedResponse = new Response(
        new ReadableStream({
            start(controller) {
                const reader = response.body.getReader();
                
                const read = async () => {
                    const { done, value } = await reader.read();
                    if (done) {
                        controller.close();
                        return;
                    }
                    totalBytes += value.byteLength;

                    var payload = jsonParser.parseChunk(value)
                    if (payload != null) {
                        postMessage({payload, totalBytes});
                    }

                    controller.enqueue(value);
                    read();
                };

                read();
            }
        })
    )

    const data = await streamedResponse.text();
    postMessage({ payload: {data:[]}, totalBytes: data.length, finished: true });
}