#!/usr/bin/env -S deno run -A
// Smoldot
// Copyright (C) 2019-2022  Parity Technologies (UK) Ltd.
// SPDX-License-Identifier: GPL-3.0-or-later WITH Classpath-exception-2.0

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

// This file launches a WebSocket server that exposes JSON-RPC functions.

// import * as smoldot from "https://deno.land/x/smoldot2/index-deno.js";
import * as smoldot from "https://github.com/btwiuse/smoldot/raw/main/wasm-node/javascript/dist/mjs/index-deno.js";
import polkadot from "https://github.com/smol-dot/smoldot/raw/main/demo-chain-specs/polkadot.json" assert {
  type: "json",
};
import vara from "https://github.com/gear-tech/gear/raw/master/node/res/vara.json" assert {
  type: "json",
};

// Load the chain spec file.
// const chainSpec = new TextDecoder("utf-8").decode(await Deno.readFile('../../../demo-chain-specs/polkadot.json'));
const chainSpec = JSON.stringify(polkadot);
// const chainSpec = JSON.stringify(vara);

const PORT = Deno.env.get("PORT") ?? "9944";

const client = smoldot.start({
  maxLogLevel: 3, // Can be increased for more verbosity
  forbidTcp: false,
  forbidWs: false,
  forbidNonLocalWs: false,
  forbidWss: false,
  cpuRateLimit: 0.5,
  logCallback: (_level, target, message) => {
    // As incredible as it seems, there is currently no better way to print the current time
    // formatted in a certain way.
    const now = new Date();
    const hours = ("0" + now.getHours()).slice(-2);
    const minutes = ("0" + now.getMinutes()).slice(-2);
    const seconds = ("0" + now.getSeconds()).slice(-2);
    const milliseconds = ("00" + now.getMilliseconds()).slice(-3);
    console.log(
      "[%s:%s:%s.%s] [%s] %s",
      hours,
      minutes,
      seconds,
      milliseconds,
      target,
      message,
    );
  },
});

// We add the chain ahead of time in order to preload it.
// Once a client connects, the chain is added again, but smoldot is smart enough to not connect
// a second time.
await client.addChain({ chainSpec, disableJsonRpc: false });

// Now spawn a WebSocket server in order to handle JSON-RPC clients.
console.log(`JSON-RPC server now listening on port ${PORT}`);
console.log(`Please visit: https://polkadot.js.org/apps?rpc=ws://127.0.0.1:${PORT}`);

let session = 0;

Deno.serve({ port: Number(PORT) }, async (req: Request) => {
  if ((req.headers.get("upgrade") || "").toLowerCase() !== "websocket") {
    console.log("(demo) ignoring http request", req.url);
    return new Response("Error: expected websocket request\n");
  }

  console.log("(demo) New JSON-RPC client connected.");
  const { socket, response } = Deno.upgradeWebSocket(req);

  const chain = await client.addChain({ chainSpec });

  let s = session;

  (async () => {
    try {
      while (true) {
        const response = await chain.nextJsonRpcResponse();
        console.log({ s, response });
        socket.send(response);
      }
    } catch (_error) {}
  })();

  socket.onmessage = (event: Deno.MessageEvent) => {
    if (typeof event.data === "string") {
      let request = event.data;
      console.log({ s, request });
      chain.sendJsonRpc(request);
    } else {
      socket.close(1002); // Protocol error
    }
  };

  socket.onclose = () => {
    console.log("(demo) JSON-RPC client disconnected.");
    chain.remove();
  };

  session += 1;
  console.log("(demo) upgrading to ws connection", response);
  return response;
});