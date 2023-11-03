```
export PORT=$RANDOM

./smoldot-polkadot.ts

env PROVIDER=ws://127.0.0.1:$PORT deno run -A dump.ts

pgrep ufo | sed 1d  | xargs kill
```
