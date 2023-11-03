#!/usr/bin/env -S deno run -A
import {
  ApiPromise,
  WsProvider,
} from "https://deno.land/x/polkadot@0.2.43/api/index.ts";
import { u8aToHex } from "https://deno.land/x/polkadot@0.2.43/util/index.ts";

async function initApi() {
  const PROVIDER = Deno.env.get("PROVIDER") ?? "wss://rpc.vara-network.io";
  const provider = new WsProvider(PROVIDER);
  return await ApiPromise.create({
    provider,
  });
}

console.log("api is initializing. Please hold on...");

const api = await initApi();

console.log(api.isConnected);

let snapshot = await api.query.electionProviderMultiPhase.snapshot();
let snapshotPath = "snapshot.hex";
Deno.writeTextFileSync(
  snapshotPath,
  u8aToHex(snapshot.unwrap().toU8a(), -1, false),
);
console.log("INFO", `snapshot written to disk: ${snapshotPath}`);
Deno.exit(0);
