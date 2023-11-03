FROM btwiuse/arch:deno

WORKDIR /app

ADD ./* /app/

CMD ./smoldot-polkadot.ts
